import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CreateChannelDto } from './dto/create-channel.dto';

const MAX_CHAT_MESSAGES = 50;

export type ChatSystemMessageType = 'enhance' | 'dungeon-invite' | 'dungeon-start' | 'join';

export interface ChatMessage {
  userId: string;
  nickname: string;
  message: string;
  timestamp: number;
  type?: ChatSystemMessageType;
  data?: Record<string, unknown>;
}

@Injectable()
export class ChannelService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /** 채널 목록 조회 (WAITING 상태만) */
  async getChannels() {
    return this.prisma.channel.findMany({
      where: { status: 'WAITING' },
      include: {
        members: {
          include: { user: { select: { id: true, nickname: true, level: true, profileImageUrl: true } } },
        },
        dungeon: { select: { id: true, name: true, minLevel: true, maxLevel: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** 채널 검색 (이름으로, WAITING 상태만) */
  async searchChannels(name: string) {
    return this.prisma.channel.findMany({
      where: {
        status: 'WAITING',
        name: { contains: name, mode: 'insensitive' },
      },
      include: {
        members: {
          include: { user: { select: { id: true, nickname: true, level: true, profileImageUrl: true } } },
        },
        dungeon: { select: { id: true, name: true, minLevel: true, maxLevel: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  /** 채널 상세 조회 */
  async getChannel(channelId: string) {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
      include: {
        members: {
          include: { user: { select: { id: true, nickname: true, level: true, profileImageUrl: true } } },
        },
        dungeon: { select: { id: true, name: true, minLevel: true, maxLevel: true } },
      },
    });

    if (!channel) {
      throw new NotFoundException('채널을 찾을 수 없습니다.');
    }

    return channel;
  }

  /** 채널 생성 */
  async createChannel(userId: string, dto: CreateChannelDto) {
    const channel = await this.prisma.channel.create({
      data: {
        name: dto.name,
        maxMembers: dto.maxMembers ?? 10,
        members: {
          create: { userId, role: 'HOST' },
        },
      },
      include: {
        members: {
          include: { user: { select: { id: true, nickname: true, level: true, profileImageUrl: true } } },
        },
      },
    });

    return channel;
  }

  /** 채널 입장 */
  async joinChannel(channelId: string, userId: string) {
    // 이미 이 채널에 참가 중인지 확인
    const alreadyMember = await this.prisma.channelMember.findUnique({
      where: { channelId_userId: { channelId, userId } },
    });
    if (alreadyMember) {
      throw new BadRequestException('이미 이 채널에 참가 중입니다.');
    }

    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
      include: { members: true },
    });

    if (!channel) {
      throw new NotFoundException('채널을 찾을 수 없습니다.');
    }

    if (channel.status !== 'WAITING') {
      throw new BadRequestException('현재 입장할 수 없는 채널입니다.');
    }

    if (channel.members.length >= channel.maxMembers) {
      throw new BadRequestException('채널이 가득 찼습니다.');
    }

    await this.prisma.channelMember.create({
      data: { channelId, userId, role: 'MEMBER' },
    });

    return this.getChannel(channelId);
  }

  /** 채널 퇴장 */
  async leaveChannel(channelId: string, userId: string) {
    const member = await this.prisma.channelMember.findUnique({
      where: { channelId_userId: { channelId, userId } },
    });

    if (!member) {
      throw new BadRequestException('이 채널에 참가하고 있지 않습니다.');
    }

    await this.prisma.channelMember.delete({
      where: { id: member.id },
    });

    // 방장이 나가면 채널 삭제 또는 방장 위임
    if (member.role === 'HOST') {
      const remaining = await this.prisma.channelMember.findFirst({
        where: { channelId },
        orderBy: { joinedAt: 'asc' },
      });

      if (!remaining) {
        // 아무도 없으면 채널 삭제 + 채팅 기록 삭제
        await this.prisma.channel.delete({ where: { id: channelId } });
        await this.redis.del(`channel:${channelId}:chat`);
        return { deleted: true };
      }

      // 가장 먼저 들어온 사람에게 방장 위임
      await this.prisma.channelMember.update({
        where: { id: remaining.id },
        data: { role: 'HOST' },
      });
    }

    return this.getChannel(channelId);
  }

  /** 채팅 메시지 저장 (Redis, 최신 50개 유지) */
  async addChatMessage(
    channelId: string,
    userId: string,
    message: string,
  ): Promise<ChatMessage> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { nickname: true },
    });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    const chatMessage: ChatMessage = {
      userId,
      nickname: user.nickname,
      message,
      timestamp: Date.now(),
    };

    await this.pushChannelMessage(channelId, chatMessage);

    return chatMessage;
  }

  /** 시스템 메시지 저장 (Redis, 최신 50개 유지) */
  async addSystemMessage(
    channelId: string,
    userId: string,
    type: ChatSystemMessageType,
    data: Record<string, unknown>,
    message = '',
  ): Promise<ChatMessage> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { nickname: true },
    });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    const systemMessage: ChatMessage = {
      userId,
      nickname: user.nickname,
      message,
      timestamp: Date.now(),
      type,
      data,
    };

    await this.pushChannelMessage(channelId, systemMessage);

    return systemMessage;
  }

  /** 채팅 기록 조회 */
  async getChatHistory(channelId: string): Promise<ChatMessage[]> {
    const raw = await this.redis.getList(`channel:${channelId}:chat`);
    return raw.map((r) => JSON.parse(r) as ChatMessage);
  }

  /** 유저가 참가 중인 채널 목록 조회 */
  async getUserChannels(userId: string) {
    return this.prisma.channelMember.findMany({
      where: { userId },
      include: {
        channel: {
          include: {
            members: {
              include: { user: { select: { id: true, nickname: true, level: true, profileImageUrl: true } } },
            },
            dungeon: { select: { id: true, name: true, minLevel: true, maxLevel: true } },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });
  }

  /** 특정 채널의 멤버 조회 */
  async getChannelMember(channelId: string, userId: string) {
    return this.prisma.channelMember.findUnique({
      where: { channelId_userId: { channelId, userId } },
    });
  }

  private async pushChannelMessage(
    channelId: string,
    message: ChatMessage,
  ): Promise<void> {
    await this.redis.pushWithLimit(
      `channel:${channelId}:chat`,
      JSON.stringify(message),
      MAX_CHAT_MESSAGES,
    );
  }
}
