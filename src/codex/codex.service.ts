import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CodexService {
  constructor(private readonly prisma: PrismaService) {}

  async getItems(userId: string) {
    const [allItems, userItemIds] = await Promise.all([
      this.prisma.item.findMany({
        select: { id: true, name: true, type: true, rarity: true, imageUrl: true },
        orderBy: [{ type: 'asc' }, { rarity: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.inventory.findMany({
        where: { userId },
        select: { itemId: true },
        distinct: ['itemId'],
      }),
    ]);

    const discoveredSet = new Set(userItemIds.map((i) => i.itemId));

    return allItems.map((item) => ({
      ...item,
      discovered: discoveredSet.has(item.id),
    }));
  }

  async getItemDetail(userId: string, itemId: string) {
    const item = await this.prisma.item.findUnique({
      where: { id: itemId },
      include: {
        dropTables: {
          include: {
            monster: {
              include: { dungeon: { select: { name: true } } },
            },
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException('아이템을 찾을 수 없습니다.');
    }

    const hasItem = await this.prisma.inventory.findFirst({
      where: { userId, itemId },
      select: { id: true },
    });

    const shopAvailable = item.buyPrice !== null && item.buyPrice > 0;

    return {
      id: item.id,
      name: item.name,
      category: item.category,
      description: item.description,
      type: item.type,
      rarity: item.rarity,
      baseAttack: item.baseAttack,
      baseDefense: item.baseDefense,
      baseHp: item.baseHp,
      imageUrl: item.imageUrl,
      sellPrice: item.sellPrice,
      buyPrice: item.buyPrice,
      discovered: !!hasItem,
      shopAvailable,
      dropSources: item.dropTables.map((dt) => ({
        monsterId: dt.monsterId,
        monsterName: dt.monster.name,
        dungeonName: dt.monster.dungeon.name,
        dropRate: dt.dropRate,
      })),
    };
  }

  async getMonsters(userId: string) {
    const [allMonsters, userDungeonIds] = await Promise.all([
      this.prisma.monster.findMany({
        include: { dungeon: { select: { name: true } } },
        orderBy: [{ dungeon: { minLevel: 'asc' } }, { name: 'asc' }],
      }),
      this.prisma.battleLog.findMany({
        where: { userId },
        select: { dungeonId: true },
        distinct: ['dungeonId'],
      }),
    ]);

    const visitedDungeons = new Set(userDungeonIds.map((b) => b.dungeonId));

    return allMonsters.map((monster) => ({
      id: monster.id,
      name: monster.name,
      imageUrl: monster.imageUrl,
      dungeonName: monster.dungeon.name,
      encountered: visitedDungeons.has(monster.dungeonId),
    }));
  }

  async getMonsterDetail(userId: string, monsterId: string) {
    const monster = await this.prisma.monster.findUnique({
      where: { id: monsterId },
      include: {
        dungeon: {
          select: { id: true, name: true, minLevel: true, maxLevel: true },
        },
        dropTables: {
          include: {
            item: {
              select: { id: true, name: true, rarity: true, imageUrl: true },
            },
          },
        },
      },
    });

    if (!monster) {
      throw new NotFoundException('몬스터를 찾을 수 없습니다.');
    }

    const hasEncountered = await this.prisma.battleLog.findFirst({
      where: { userId, dungeonId: monster.dungeonId },
      select: { id: true },
    });

    return {
      id: monster.id,
      name: monster.name,
      dungeonId: monster.dungeonId,
      hp: monster.hp,
      attack: monster.attack,
      defense: monster.defense,
      expReward: monster.expReward,
      goldReward: monster.goldReward,
      imageUrl: monster.imageUrl,
      encountered: !!hasEncountered,
      dungeon: monster.dungeon,
      drops: monster.dropTables.map((dt) => ({
        itemId: dt.item.id,
        itemName: dt.item.name,
        itemRarity: dt.item.rarity,
        itemImageUrl: dt.item.imageUrl,
        dropRate: dt.dropRate,
      })),
    };
  }
}
