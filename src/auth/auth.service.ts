import {
  Injectable,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import axios from 'axios';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  private generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET || 'default-secret',
      expiresIn: '1h',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret',
      expiresIn: '7d',
    });

    return { accessToken, refreshToken };
  }

  private buildUserResponse(user: {
    id: string;
    email: string;
    nickname: string;
    level: number;
  }) {
    const tokens = this.generateTokens(user.id, user.email, 'USER');
    return {
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        level: user.level,
      },
      ...tokens,
    };
  }

  async register(registerDto: RegisterDto) {
    const { loginId, email, password, nickname } = registerDto;

    const existingUser = await this.prisma.user.findFirst({
      where: { OR: [{ loginId }, { email }, { nickname }] },
    });

    if (existingUser) {
      if (existingUser.loginId === loginId) {
        throw new ConflictException('이미 사용 중인 로그인 ID입니다.');
      }
      if (existingUser.email === email) {
        throw new ConflictException('이미 사용 중인 이메일입니다.');
      }
      throw new ConflictException('이미 사용 중인 닉네임입니다.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        loginId,
        email,
        password: hashedPassword,
        nickname,
        level: 1,
        exp: 0,
        hp: 100,
        maxHp: 100,
        mp: 50,
        maxMp: 50,
        attack: 10,
        defense: 5,
        criticalRate: 0.05,
        gold: 1000,
      },
    });

    return this.buildUserResponse(user);
  }

  async login(loginDto: LoginDto) {
    const { loginId, password } = loginDto;

    // 어드민 하드코딩 로그인
    if (loginId === 'spectrum' && password === 'Skrbxo123!@#') {
      const tokens = this.generateTokens('admin', 'admin@spectrum.com', 'ADMIN');
      return {
        user: {
          id: 'admin',
          loginId: 'spectrum',
          nickname: 'Admin',
          role: 'ADMIN',
        },
        ...tokens,
      };
    }

    const user = await this.prisma.user.findUnique({
      where: { loginId },
    });

    if (!user || !user.password) {
      throw new UnauthorizedException('로그인 ID 또는 비밀번호가 올바르지 않습니다.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('로그인 ID 또는 비밀번호가 올바르지 않습니다.');
    }

    return this.buildUserResponse(user);
  }

  getKakaoAuthUrl(redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: process.env.KAKAO_CLIENT_ID || '',
      redirect_uri: redirectUri,
      response_type: 'code',
    });
    return `https://kauth.kakao.com/oauth/authorize?${params.toString()}`;
  }

  async kakaoLogin(code: string, redirectUri: string) {
    if (!code) {
      throw new BadRequestException('카카오 인가 코드가 없습니다.');
    }

    const clientId = process.env.KAKAO_CLIENT_ID || '';
    if (!clientId) {
      throw new InternalServerErrorException('KAKAO_CLIENT_ID가 설정되지 않았습니다.');
    }

    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      redirect_uri: redirectUri,
      code,
    });

    const clientSecret = process.env.KAKAO_CLIENT_SECRET;
    if (clientSecret && clientSecret.trim().length > 0) {
      tokenParams.set('client_secret', clientSecret);
    }

    // 1. 인가코드로 카카오 토큰 발급
    let tokenResponse: { data: { access_token?: string } };
    try {
      tokenResponse = await axios.post(
        'https://kauth.kakao.com/oauth/token',
        tokenParams.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
          },
        },
      );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const details =
          (error.response?.data as { error_description?: string; error?: string } | undefined)
            ?.error_description ||
          (error.response?.data as { error?: string } | undefined)?.error ||
          error.message;
        throw new BadRequestException(`카카오 토큰 요청 실패: ${details}`);
      }
      throw error;
    }

    const kakaoAccessToken = tokenResponse.data.access_token;
    if (!kakaoAccessToken) {
      throw new BadRequestException('카카오 액세스 토큰이 응답에 없습니다.');
    }

    // 2. 카카오 사용자 정보 조회
    let userInfoResponse: { data: any };
    try {
      userInfoResponse = await axios.get(
        'https://kapi.kakao.com/v2/user/me',
        {
          headers: {
            Authorization: `Bearer ${kakaoAccessToken}`,
            'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
          },
        },
      );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const details =
          (error.response?.data as { msg?: string; code?: number } | undefined)?.msg ||
          error.message;
        throw new BadRequestException(`카카오 사용자 정보 조회 실패: ${details}`);
      }
      throw error;
    }

    const kakaoUser = userInfoResponse.data;
    const kakaoId = String(kakaoUser.id);
    const email =
      kakaoUser.kakao_account?.email || `kakao_${kakaoId}@kakao.com`;
    const nickname =
      kakaoUser.kakao_account?.profile?.nickname || `모험가${kakaoId.slice(-6)}`;

    // 3. 기존 회원 조회 또는 신규 가입
    let user = await this.prisma.user.findUnique({
      where: { kakaoId },
    });

    if (!user) {
      // 이메일 중복 체크
      const existingEmail = await this.prisma.user.findUnique({
        where: { email },
      });

      // 닉네임 중복 시 랜덤 suffix 추가
      let finalNickname = nickname.slice(0, 14);
      const existingNickname = await this.prisma.user.findUnique({
        where: { nickname: finalNickname },
      });
      if (existingNickname) {
        const suffix = Math.random().toString(36).slice(2, 7);
        finalNickname = `${finalNickname.slice(0, 9)}_${suffix}`;
      }

      user = await this.prisma.user.create({
        data: {
          email: existingEmail
            ? `kakao_${kakaoId}_${Date.now()}@kakao.com`
            : email,
          kakaoId,
          nickname: finalNickname,
          level: 1,
          exp: 0,
          hp: 100,
          maxHp: 100,
          mp: 50,
          maxMp: 50,
          attack: 10,
          defense: 5,
          criticalRate: 0.05,
          gold: 1000,
        },
      });
    }

    return this.buildUserResponse(user);
  }

  async logout(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('유효하지 않은 사용자입니다.');
    }

    // 카카오 유저인 경우 카카오 로그아웃 (Admin Key 방식)
    if (user.kakaoId) {
      try {
        await axios.post(
          'https://kapi.kakao.com/v1/user/logout',
          `target_id_type=user_id&target_id=${user.kakaoId}`,
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              Authorization: `KakaoAK ${process.env.KAKAO_ADMIN_KEY}`,
            },
          },
        );
      } catch {
        // 카카오 로그아웃 실패해도 서버 로그아웃은 진행
      }
    }

    return { message: '로그아웃 되었습니다.' };
  }

  async withdraw(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('유효하지 않은 사용자입니다.');
    }

    // 카카오 유저인 경우 카카오 연결 끊기 (unlink)
    if (user.kakaoId) {
      try {
        await axios.post(
          'https://kapi.kakao.com/v1/user/unlink',
          `target_id_type=user_id&target_id=${user.kakaoId}`,
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              Authorization: `KakaoAK ${process.env.KAKAO_ADMIN_KEY}`,
            },
          },
        );
      } catch {
        // 카카오 unlink 실패해도 회원 탈퇴는 진행
      }
    }

    // 관련 데이터 삭제 (순서 중요: FK 의존성)
    await this.prisma.$transaction([
      this.prisma.channelMember.deleteMany({ where: { userId } }),
      this.prisma.battleLog.deleteMany({ where: { userId } }),
      this.prisma.inventory.deleteMany({ where: { userId } }),
      this.prisma.user.delete({ where: { id: userId } }),
    ]);

    return { message: '회원 탈퇴가 완료되었습니다.' };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret',
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('유효하지 않은 토큰입니다.');
      }

      const tokens = this.generateTokens(user.id, user.email, user.role);
      return tokens;
    } catch {
      throw new UnauthorizedException('유효하지 않은 리프레시 토큰입니다.');
    }
  }
}
