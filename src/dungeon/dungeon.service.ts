import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';

export interface BattleLogEntry {
  message: string;
  type: 'player_attack' | 'enemy_attack' | 'critical' | 'info' | 'reward' | 'system';
  damage?: number;
  timestamp: number;
}

export interface BattleRewards {
  exp: number;
  gold: number;
  items: string[];
}

export interface BattleSession {
  id: string;
  userId: string;
  dungeonId: string;
  startedAt: number;
  expiresAt: number;
  monster: {
    id: string;
    name: string;
    imageUrl?: string | null;
    hp: number;
    attack: number;
    defense: number;
    expReward: number;
    goldReward: number;
  };
  playerHp: number;
  playerMaxHp: number;
  playerMp: number;
  playerMaxMp: number;
  playerAttack: number;
  playerDefense: number;
  playerCriticalRate: number;
  enemyHp: number;
  enemyMaxHp: number;
  isPlayerTurn: boolean;
  log: BattleLogEntry[];
  result: 'VICTORY' | 'DEFEAT' | 'ESCAPE' | null;
  rewards: BattleRewards | null;
}

// Shared in-memory battle store
export const battleStore = new Map<string, BattleSession>();
export const BATTLE_SESSION_TTL_MS = 60 * 60 * 1000; // 1 hour

export function getBattleSessionFromStore(userId: string): BattleSession | null {
  const key = `battle:${userId}`;
  const session = battleStore.get(key);
  if (!session) return null;

  if (Date.now() > session.expiresAt) {
    battleStore.delete(key);
    return null;
  }

  return session;
}

@Injectable()
export class DungeonService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.dungeon.findMany({
      orderBy: { minLevel: 'asc' },
    });
  }

  async findOne(id: string) {
    const dungeon = await this.prisma.dungeon.findUnique({
      where: { id },
      include: {
        monsters: {
          include: {
            dropTables: {
              include: { item: true },
            },
          },
        },
      },
    });

    if (!dungeon) {
      throw new NotFoundException('던전을 찾을 수 없습니다.');
    }

    return dungeon;
  }

  async enter(userId: string, dungeonId: string) {
    // If user already has an active battle
    const existingBattle = getBattleSessionFromStore(userId);
    if (existingBattle) {
      // If battle already ended, clean up and allow new entry
      if (existingBattle.result) {
        battleStore.delete(`battle:${userId}`);
      } else {
        // Return existing active battle info
        return {
          battleId: existingBattle.id,
          monster: {
            name: existingBattle.monster.name,
            imageUrl: existingBattle.monster.imageUrl,
            hp: existingBattle.monster.hp,
            attack: existingBattle.monster.attack,
            defense: existingBattle.monster.defense,
          },
          dungeon: { name: '' },
          playerHp: existingBattle.playerHp,
          playerMaxHp: existingBattle.playerMaxHp,
          existing: true,
        };
      }
    }

    const dungeon = await this.prisma.dungeon.findUnique({
      where: { id: dungeonId },
      include: { monsters: true },
    });

    if (!dungeon) {
      throw new NotFoundException('던전을 찾을 수 없습니다.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    if (user.level < dungeon.minLevel) {
      throw new BadRequestException(
        `레벨이 부족합니다. 최소 레벨: ${dungeon.minLevel}`,
      );
    }

    if (dungeon.monsters.length === 0) {
      throw new BadRequestException('이 던전에는 몬스터가 없습니다.');
    }

    // Pick a random monster
    const randomIndex = Math.floor(Math.random() * dungeon.monsters.length);
    const monster = dungeon.monsters[randomIndex];

    // Get equipment bonuses
    const equippedItems = await this.prisma.inventory.findMany({
      where: { userId, isEquipped: true },
      include: { item: true },
    });

    let bonusAttack = 0;
    let bonusDefense = 0;
    let bonusHp = 0;

    for (const inv of equippedItems) {
      const enhanceMultiplier = 1 + inv.enhanceLevel * 0.1;
      bonusAttack += Math.floor(inv.item.baseAttack * enhanceMultiplier);
      bonusDefense += Math.floor(inv.item.baseDefense * enhanceMultiplier);
      bonusHp += Math.floor(inv.item.baseHp * enhanceMultiplier);
    }

    const battleId = randomUUID();
    const startedAt = Date.now();
    const session: BattleSession = {
      id: battleId,
      userId,
      dungeonId,
      startedAt,
      expiresAt: startedAt + BATTLE_SESSION_TTL_MS,
      monster: {
        id: monster.id,
        name: monster.name,
        imageUrl: monster.imageUrl,
        hp: monster.hp,
        attack: monster.attack,
        defense: monster.defense,
        expReward: monster.expReward,
        goldReward: monster.goldReward,
      },
      playerHp: user.maxHp + bonusHp,
      playerMaxHp: user.maxHp + bonusHp,
      playerMp: user.maxMp,
      playerMaxMp: user.maxMp,
      playerAttack: user.attack + bonusAttack,
      playerDefense: user.defense + bonusDefense,
      playerCriticalRate: user.criticalRate,
      enemyHp: monster.hp,
      enemyMaxHp: monster.hp,
      isPlayerTurn: true,
      log: [{ message: `${dungeon.name}에서 ${monster.name}을(를) 만났다!`, type: 'system' as const, timestamp: Date.now() }],
      result: null,
      rewards: null,
    };

    battleStore.set(`battle:${userId}`, session);

    return {
      battleId,
      monster: {
        name: monster.name,
        imageUrl: monster.imageUrl,
        hp: monster.hp,
        attack: monster.attack,
        defense: monster.defense,
      },
      dungeon: {
        name: dungeon.name,
      },
      playerHp: session.playerHp,
      playerMaxHp: session.playerMaxHp,
    };
  }
}
