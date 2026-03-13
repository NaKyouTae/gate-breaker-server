import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ChannelService } from './channel.service';
import { EnhanceService } from '../enhance/enhance.service';
import { DungeonService } from '../dungeon/dungeon.service';
import { PrismaService } from '../prisma/prisma.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

interface DungeonInvite {
  id: string;
  channelId: string;
  dungeonId: string;
  dungeonName: string;
  minLevel: number;
  hostUserId: string;
  hostNickname: string;
  participants: { userId: string; nickname: string }[];
  status: 'waiting' | 'started' | 'cancelled';
  createdAt: number;
}

@WebSocketGateway({
  namespace: '/channel',
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || [
      'http://localhost:3000',
      'http://localhost:3001',
    ],
    credentials: true,
  },
})
export class ChannelGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  /** socketId → userId 매핑 */
  private socketUserMap = new Map<string, string>();

  /** 던전 초대 저장 (inviteId → DungeonInvite) */
  private dungeonInvites = new Map<string, DungeonInvite>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly channelService: ChannelService,
    private readonly enhanceService: EnhanceService,
    private readonly dungeonService: DungeonService,
    private readonly prisma: PrismaService,
  ) {}

  /** 연결 시 JWT 인증 */
  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET || 'default-secret',
      });

      client.userId = payload.sub;
      this.socketUserMap.set(client.id, payload.sub);
      console.log(`Channel connected: ${client.id} (user: ${payload.sub})`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    const userId = this.socketUserMap.get(client.id);
    this.socketUserMap.delete(client.id);
    console.log(`Channel disconnected: ${client.id} (user: ${userId})`);
  }

  /** 채널 입장 — Socket.io Room에 join */
  @SubscribeMessage('channel:join')
  async handleJoinChannel(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { channelId: string },
  ) {
    const userId = client.userId;
    if (!userId) return;

    try {
      // 이미 채널 멤버인지 확인 (채널 생성자 등)
      const existingMember =
        await this.channelService.getChannelMember(data.channelId, userId);

      let channel;
      if (existingMember) {
        // 이미 멤버면 DB join 없이 채널 정보만 조회
        channel = await this.channelService.getChannel(data.channelId);
      } else {
        // 새 멤버면 DB에 추가
        channel = await this.channelService.joinChannel(
          data.channelId,
          userId,
        );

        // 채널 입장 알림을 다른 멤버에게 전송
        client.to(data.channelId).emit('channel:member-joined', {
          channelId: data.channelId,
          channel,
        });
      }

      // Socket.io Room에 join
      client.join(data.channelId);

      // 입장한 유저에게 채팅 기록 전송
      const chatHistory = await this.channelService.getChatHistory(
        data.channelId,
      );

      // 활성 던전 초대 목록도 전달
      const activeInvites = this.getActiveInvites(data.channelId);

      return {
        event: 'channel:joined',
        data: { channel, chatHistory, activeInvites },
      };
    } catch (error: any) {
      return {
        event: 'channel:error',
        data: { message: error.message },
      };
    }
  }

  /** 채널 퇴장 */
  @SubscribeMessage('channel:leave')
  async handleLeaveChannel(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { channelId: string },
  ) {
    const userId = client.userId;
    if (!userId) return;

    try {
      const result = await this.channelService.leaveChannel(
        data.channelId,
        userId,
      );
      client.leave(data.channelId);

      // 남은 멤버에게 퇴장 알림
      this.server.to(data.channelId).emit('channel:member-left', {
        channelId: data.channelId,
        userId,
        channel: (result as any).deleted ? null : result,
      });

      return { event: 'channel:left', data: { channelId: data.channelId } };
    } catch (error: any) {
      return {
        event: 'channel:error',
        data: { message: error.message },
      };
    }
  }

  /** 채팅 메시지 전송 */
  @SubscribeMessage('channel:chat')
  async handleChat(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { channelId: string; message: string },
  ) {
    const userId = client.userId;
    if (!userId) return;

    if (!data.message || data.message.length > 200) {
      return {
        event: 'channel:error',
        data: { message: '메시지는 1~200자 이내로 입력하세요.' },
      };
    }

    try {
      const chatMessage = await this.channelService.addChatMessage(
        data.channelId,
        userId,
        data.message,
      );

      // 채널의 모든 멤버에게 메시지 브로드캐스트 (본인 포함)
      this.server.to(data.channelId).emit('channel:chat', {
        channelId: data.channelId,
        ...chatMessage,
      });

      return { event: 'channel:chat-sent', data: chatMessage };
    } catch (error: any) {
      return {
        event: 'channel:error',
        data: { message: error.message },
      };
    }
  }

  // ──────────────────────────────────────
  // 강화 시스템
  // ──────────────────────────────────────

  /** 채널 내 강화 시도 */
  @SubscribeMessage('channel:enhance')
  async handleEnhance(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { channelId: string; inventoryId: string },
  ) {
    const userId = client.userId;
    if (!userId) return;

    try {
      const result = await this.enhanceService.enhance(userId, {
        inventoryId: data.inventoryId,
      });

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { gold: true },
      });

      const systemMessage = await this.channelService.addSystemMessage(
        data.channelId,
        userId,
        'enhance',
        {
          success: result.success,
          message: result.message,
          enhanceLevel: result.enhanceLevel,
          itemName: result.item.name,
          goldCost: result.goldCost,
          remainingGold: user?.gold ?? 0,
          destroyed: (result as any).destroyed ?? false,
        },
      );

      this.server.to(data.channelId).emit('channel:system', {
        channelId: data.channelId,
        ...systemMessage,
      });

      return { event: 'channel:enhance-done', data: result };
    } catch (error: any) {
      return {
        event: 'channel:error',
        data: { message: error.message },
      };
    }
  }

  /** 강화 가능한 장비 목록 조회 */
  @SubscribeMessage('channel:enhance-list')
  async handleEnhanceList(
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const userId = client.userId;
    if (!userId) return;

    try {
      const items = await this.prisma.inventory.findMany({
        where: {
          userId,
          item: {
            type: { in: ['WEAPON', 'ARMOR', 'GLOVE', 'SHOE', 'RING', 'NECKLACE'] },
          },
        },
        include: { item: true },
        orderBy: { createdAt: 'desc' },
      });

      const list = items.map((inv) => ({
        inventoryId: inv.id,
        itemName: inv.item.name,
        itemType: inv.item.type,
        rarity: inv.item.rarity,
        enhanceLevel: inv.enhanceLevel,
        isEquipped: inv.isEquipped,
      }));

      client.emit('channel:enhance-list', list);
    } catch (error: any) {
      client.emit('channel:enhance-list', []);
    }
  }

  // ──────────────────────────────────────
  // 던전 초대 시스템
  // ──────────────────────────────────────

  /** 던전 목록 조회 */
  @SubscribeMessage('channel:dungeon-list')
  async handleDungeonList(
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const userId = client.userId;
    if (!userId) return;

    try {
      const dungeons = await this.dungeonService.findAll();
      client.emit('channel:dungeon-list', dungeons);
    } catch (error: any) {
      client.emit('channel:dungeon-list', []);
    }
  }

  /** 던전 초대 생성 */
  @SubscribeMessage('channel:dungeon-invite')
  async handleDungeonInvite(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { channelId: string; dungeonId: string },
  ) {
    const userId = client.userId;
    if (!userId) return;

    try {
      // 이미 이 채널에 활성 초대가 있는지 확인
      const existing = this.getActiveInvites(data.channelId);
      if (existing.length > 0) {
        return {
          event: 'channel:error',
          data: { message: '이미 진행 중인 던전 초대가 있습니다.' },
        };
      }

      const dungeon = await this.dungeonService.findOne(data.dungeonId);
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { nickname: true },
      });

      const inviteId = `invite-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const invite: DungeonInvite = {
        id: inviteId,
        channelId: data.channelId,
        dungeonId: data.dungeonId,
        dungeonName: dungeon.name,
        minLevel: dungeon.minLevel,
        hostUserId: userId,
        hostNickname: user?.nickname ?? '???',
        participants: [{ userId, nickname: user?.nickname ?? '???' }],
        status: 'waiting',
        createdAt: Date.now(),
      };

      this.dungeonInvites.set(inviteId, invite);

      // 채널에 던전 초대 시스템 메시지 전송
      const systemMessage = await this.channelService.addSystemMessage(
        data.channelId,
        userId,
        'dungeon-invite',
        invite as unknown as Record<string, unknown>,
      );

      this.server.to(data.channelId).emit('channel:system', {
        channelId: data.channelId,
        ...systemMessage,
      });

      return { event: 'channel:dungeon-invite-created', data: invite };
    } catch (error: any) {
      return {
        event: 'channel:error',
        data: { message: error.message },
      };
    }
  }

  /** 던전 초대 참여 */
  @SubscribeMessage('channel:dungeon-join')
  async handleDungeonJoin(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { channelId: string; inviteId: string },
  ) {
    const userId = client.userId;
    if (!userId) return;

    const invite = this.dungeonInvites.get(data.inviteId);
    if (!invite || invite.status !== 'waiting') {
      return {
        event: 'channel:error',
        data: { message: '유효하지 않은 초대입니다.' },
      };
    }

    // 이미 참여중인지 확인
    if (invite.participants.some((p) => p.userId === userId)) {
      return {
        event: 'channel:error',
        data: { message: '이미 참여 중입니다.' },
      };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { nickname: true, level: true },
    });

    if (!user) return;

    if (user.level < invite.minLevel) {
      return {
        event: 'channel:error',
        data: { message: `레벨이 부족합니다. 최소 레벨: ${invite.minLevel}` },
      };
    }

    invite.participants.push({ userId, nickname: user.nickname });

    // 업데이트된 초대 정보 브로드캐스트
    this.server.to(data.channelId).emit('channel:dungeon-update', {
      channelId: data.channelId,
      invite,
    });

    return { event: 'channel:dungeon-joined', data: invite };
  }

  /** 던전 초대 취소 */
  @SubscribeMessage('channel:dungeon-cancel')
  async handleDungeonCancel(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { channelId: string; inviteId: string },
  ) {
    const userId = client.userId;
    if (!userId) return;

    const invite = this.dungeonInvites.get(data.inviteId);
    if (!invite || invite.hostUserId !== userId) {
      return {
        event: 'channel:error',
        data: { message: '초대를 취소할 권한이 없습니다.' },
      };
    }

    invite.status = 'cancelled';
    this.dungeonInvites.delete(data.inviteId);

    this.server.to(data.channelId).emit('channel:dungeon-update', {
      channelId: data.channelId,
      invite,
    });

    return { event: 'channel:dungeon-cancelled', data: invite };
  }

  /** 던전 입장 시작 (호스트만) */
  @SubscribeMessage('channel:dungeon-start')
  async handleDungeonStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { channelId: string; inviteId: string },
  ) {
    const userId = client.userId;
    if (!userId) return;

    const invite = this.dungeonInvites.get(data.inviteId);
    if (!invite || invite.hostUserId !== userId) {
      return {
        event: 'channel:error',
        data: { message: '던전을 시작할 권한이 없습니다.' },
      };
    }

    if (invite.status !== 'waiting') {
      return {
        event: 'channel:error',
        data: { message: '이미 시작되었거나 취소된 초대입니다.' },
      };
    }

    try {
      invite.status = 'started';

      // 참여자 각각에 대해 던전 입장 처리
      const results: { userId: string; nickname: string; battleId: string }[] = [];
      const errors: { userId: string; nickname: string; error: string }[] = [];

      for (const participant of invite.participants) {
        try {
          const enterResult = await this.dungeonService.enter(
            participant.userId,
            invite.dungeonId,
          );
          results.push({
            userId: participant.userId,
            nickname: participant.nickname,
            battleId: enterResult.battleId,
          });
        } catch (err: any) {
          errors.push({
            userId: participant.userId,
            nickname: participant.nickname,
            error: err.message,
          });
        }
      }

      this.dungeonInvites.delete(data.inviteId);

      const systemMessage = await this.channelService.addSystemMessage(
        data.channelId,
        userId,
        'dungeon-start',
        {
          dungeonName: invite.dungeonName,
          hostNickname: invite.hostNickname,
          totalParticipants: invite.participants.length,
          successCount: results.length,
          failCount: errors.length,
          results,
          errors,
        },
      );

      this.server.to(data.channelId).emit('channel:system', {
        channelId: data.channelId,
        ...systemMessage,
      });

      // 던전 시작 알림 브로드캐스트
      this.server.to(data.channelId).emit('channel:dungeon-started', {
        channelId: data.channelId,
        invite,
        results,
        errors,
      });

      return {
        event: 'channel:dungeon-start-done',
        data: { results, errors },
      };
    } catch (error: any) {
      return {
        event: 'channel:error',
        data: { message: error.message },
      };
    }
  }

  /** 채널에 시스템 메시지 브로드캐스트 (다른 서비스에서 호출용) */
  emitToChannel(channelId: string, event: string, data: unknown) {
    this.server.to(channelId).emit(event, data);
  }

  /** 채널의 활성 던전 초대 목록 */
  private getActiveInvites(channelId: string): DungeonInvite[] {
    const invites: DungeonInvite[] = [];
    for (const invite of this.dungeonInvites.values()) {
      if (invite.channelId === channelId && invite.status === 'waiting') {
        invites.push(invite);
      }
    }
    return invites;
  }
}
