import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        nickname: true,
        level: true,
        exp: true,
        gold: true,
        hp: true,
        maxHp: true,
        mp: true,
        maxMp: true,
        attack: true,
        defense: true,
        criticalRate: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    return user;
  }

  async update(userId: string, updateUserDto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(updateUserDto.nickname && { nickname: updateUserDto.nickname }),
      },
      select: {
        id: true,
        email: true,
        nickname: true,
        level: true,
        exp: true,
        gold: true,
        hp: true,
        maxHp: true,
        mp: true,
        maxMp: true,
        attack: true,
        defense: true,
        criticalRate: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updated;
  }

  async getStatsWithEquipment(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

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

    return {
      base: {
        hp: user.hp,
        mp: user.mp,
        attack: user.attack,
        defense: user.defense,
        criticalRate: user.criticalRate,
      },
      bonuses: {
        hp: bonusHp,
        mp: 0,
        attack: bonusAttack,
        defense: bonusDefense,
        criticalRate: 0,
      },
      total: {
        hp: user.hp + bonusHp,
        mp: user.mp,
        attack: user.attack + bonusAttack,
        defense: user.defense + bonusDefense,
        criticalRate: user.criticalRate,
      },
      equippedItems: equippedItems.map((inv) => ({
        inventoryId: inv.id,
        slot: inv.equippedSlot,
        item: inv.item,
        enhanceLevel: inv.enhanceLevel,
      })),
    };
  }
}
