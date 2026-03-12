import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('kakao')
  kakaoLogin(@Res() res: Response) {
    const redirectUri = `${process.env.KAKAO_REDIRECT_URI || 'http://localhost:4000/auth/kakao/callback'}`;
    const url = this.authService.getKakaoAuthUrl(redirectUri);
    return res.redirect(url);
  }

  @Get('kakao/callback')
  async kakaoCallback(@Query('code') code: string, @Res() res: Response) {
    const redirectUri = `${process.env.KAKAO_REDIRECT_URI || 'http://localhost:4000/auth/kakao/callback'}`;
    const result = await this.authService.kakaoLogin(code, redirectUri);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const params = new URLSearchParams({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
    return res.redirect(`${frontendUrl}/auth/callback?${params.toString()}`);
  }

  @Post('refresh')
  async refresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.refresh(refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@CurrentUser() user: { userId: string }) {
    return this.authService.logout(user.userId);
  }

  @Delete('withdraw')
  @UseGuards(JwtAuthGuard)
  async withdraw(@CurrentUser() user: { userId: string }) {
    return this.authService.withdraw(user.userId);
  }
}
