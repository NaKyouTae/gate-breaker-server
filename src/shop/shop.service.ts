import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BuyDto } from './dto/buy.dto';
import { ItemType } from '@prisma/client';

@Injectable()
export class ShopService {
  constructor(private readonly prisma: PrismaService) {}

  async getShopItems() {
    return this.prisma.item.findMany({
      where: {
        buyPrice: { not: null, gt: 0 },
      },
      orderBy: [{ type: 'asc' }, { buyPrice: 'asc' }],
    });
  }

  async buy(userId: string, buyDto: BuyDto) {
    const { itemId, quantity: rawQuantity } = buyDto;
    const quantity = rawQuantity ?? 1;

    const item = await this.prisma.item.findUnique({
      where: { id: itemId },
    });

    if (!item || !item.buyPrice || item.buyPrice <= 0) {
      throw new NotFoundException('구매할 수 없는 아이템입니다.');
    }

    const totalCost = item.buyPrice * quantity;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    if (user.gold < totalCost) {
      throw new BadRequestException(
        `골드가 부족합니다. 필요: ${totalCost}, 보유: ${user.gold}`,
      );
    }

    // Deduct gold
    await this.prisma.user.update({
      where: { id: userId },
      data: { gold: { decrement: totalCost } },
    });

    // Add to inventory (stackable for MATERIAL/CONSUMABLE)
    if (
      item.type === ItemType.MATERIAL ||
      item.type === ItemType.CONSUMABLE
    ) {
      const existing = await this.prisma.inventory.findFirst({
        where: { userId, itemId, isEquipped: false },
      });
      if (existing) {
        await this.prisma.inventory.update({
          where: { id: existing.id },
          data: { quantity: { increment: quantity } },
        });
      } else {
        await this.prisma.inventory.create({
          data: { userId, itemId, quantity },
        });
      }
    } else {
      // Equipment: create new entry for each
      for (let i = 0; i < quantity; i++) {
        await this.prisma.inventory.create({
          data: { userId, itemId, quantity: 1 },
        });
      }
    }

    return {
      message: `${item.name}을(를) ${quantity}개 구매했습니다.`,
      totalCost,
      remainingGold: user.gold - totalCost,
    };
  }
}
