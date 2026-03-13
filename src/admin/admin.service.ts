import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDungeonDto } from './dto/create-dungeon.dto';
import { UpdateDungeonDto } from './dto/update-dungeon.dto';
import { CreateMonsterDto } from './dto/create-monster.dto';
import { UpdateMonsterDto } from './dto/update-monster.dto';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { CreateDropTableDto } from './dto/create-drop-table.dto';
import { UpdateDropTableDto } from './dto/update-drop-table.dto';
import { UpdateShopDto } from './dto/update-shop.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  // ============ DASHBOARD ============

  async getDashboard() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalUsers, activeToday, battlesToday, totalItems] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.user.count({
          where: { updatedAt: { gte: today } },
        }),
        this.prisma.battleLog.count({
          where: { createdAt: { gte: today } },
        }),
        this.prisma.item.count(),
      ]);

    return { totalUsers, activeToday, battlesToday, totalItems };
  }

  // ============ USERS ============

  async getUsers(search?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = search
      ? {
          OR: [
            { nickname: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        nickname: true,
        level: true,
        gold: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });
  }

  async getUserDetail(id: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id },
      include: {
        inventory: { include: { item: true } },
        battleLogs: {
          include: { dungeon: true },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });
  }

  async toggleBanUser(id: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id },
    });
    return { message: 'Ban toggled', userId: user.id };
  }

  // ============ BATTLE LOGS ============

  async getBattleLogs(result?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = result ? { result: result as any } : {};

    const logs = await this.prisma.battleLog.findMany({
      where,
      include: {
        user: { select: { id: true, nickname: true } },
        dungeon: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    return logs.map((log) => ({
      id: log.id,
      result: log.result,
      earnedGold: log.goldEarned,
      earnedExp: log.expEarned,
      createdAt: log.createdAt,
      player: log.user,
      dungeon: log.dungeon,
    }));
  }

  // ============ DUNGEONS ============

  async getDungeons() {
    return this.prisma.dungeon.findMany({
      include: { _count: { select: { monsters: true } } },
      orderBy: { minLevel: 'asc' },
    });
  }

  async createDungeon(dto: CreateDungeonDto) {
    return this.prisma.dungeon.create({ data: dto });
  }

  async updateDungeon(id: string, dto: UpdateDungeonDto) {
    return this.prisma.dungeon.update({ where: { id }, data: dto });
  }

  async deleteDungeon(id: string) {
    return this.prisma.dungeon.delete({ where: { id } });
  }

  // ============ MONSTERS ============

  async getMonsters() {
    return this.prisma.monster.findMany({
      include: { dungeon: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async getMonsterById(id: string) {
    return this.prisma.monster.findUnique({ where: { id } });
  }

  async createMonster(dto: CreateMonsterDto) {
    return this.prisma.monster.create({ data: dto });
  }

  async updateMonster(id: string, dto: UpdateMonsterDto) {
    return this.prisma.monster.update({ where: { id }, data: dto });
  }

  async updateMonsterImage(id: string, imageUrl: string | null) {
    return this.prisma.monster.update({
      where: { id },
      data: { imageUrl },
    });
  }

  async deleteMonster(id: string) {
    return this.prisma.monster.delete({ where: { id } });
  }

  // ============ ITEMS ============

  async getItems() {
    return this.prisma.item.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  async getItemById(id: string) {
    return this.prisma.item.findUnique({ where: { id } });
  }

  async createItem(dto: CreateItemDto) {
    return this.prisma.item.create({ data: dto });
  }

  async updateItem(id: string, dto: UpdateItemDto) {
    return this.prisma.item.update({ where: { id }, data: dto });
  }

  async updateItemImage(id: string, imageUrl: string | null) {
    return this.prisma.item.update({
      where: { id },
      data: { imageUrl },
    });
  }

  async deleteItem(id: string) {
    return this.prisma.item.delete({ where: { id } });
  }

  // ============ SHOP ============

  async getShopItems() {
    return this.prisma.item.findMany({
      where: { buyPrice: { gt: 0 } },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  async updateShopItem(id: string, dto: UpdateShopDto) {
    return this.prisma.item.update({
      where: { id },
      data: { buyPrice: dto.buyPrice > 0 ? dto.buyPrice : null },
    });
  }

  // ============ DROP TABLES ============

  async getDropTables() {
    return this.prisma.dropTable.findMany({
      include: {
        monster: { select: { id: true, name: true } },
        item: { select: { id: true, name: true } },
      },
      orderBy: { monster: { name: 'asc' } },
    });
  }

  async createDropTable(dto: CreateDropTableDto) {
    return this.prisma.dropTable.create({ data: dto });
  }

  async updateDropTable(id: string, dto: UpdateDropTableDto) {
    return this.prisma.dropTable.update({
      where: { id },
      data: { dropRate: dto.dropRate },
    });
  }

  async deleteDropTable(id: string) {
    return this.prisma.dropTable.delete({ where: { id } });
  }
}
