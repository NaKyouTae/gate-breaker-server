import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GameConfigService } from '../game-config/game-config.service';
import { EquipDto } from './dto/equip.dto';
import { SellDto } from './dto/sell.dto';
import { ItemType, EquipSlot } from '@prisma/client';

const ITEM_TYPE_TO_EQUIP_SLOT: Partial<Record<ItemType, EquipSlot>> = {
  [ItemType.WEAPON]: EquipSlot.WEAPON,
  [ItemType.ARMOR]: EquipSlot.ARMOR,
  [ItemType.GLOVE]: EquipSlot.GLOVE,
  [ItemType.SHOE]: EquipSlot.SHOE,
  [ItemType.RING]: EquipSlot.RING,
  [ItemType.NECKLACE]: EquipSlot.NECKLACE,
};

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gameConfigService: GameConfigService,
  ) {}

  /**
   * 강화 레벨에 따른 기대 비용 기반 판매가 계산
   * 판매가 = 기대 강화 비용의 20%
   */
  private calculateEnhanceSellPrice(enhanceLevel: number): number {
    if (enhanceLevel <= 0) return 0;

    const costConfig = this.gameConfigService.getCachedValue<{ baseGold: number; perLevel: number }>('enhance', 'cost_multiplier');
    const baseGold = costConfig?.baseGold ?? 100;
    const perLevel = costConfig?.perLevel ?? 1.5;

    // 각 레벨별 강화 시도 비용
    const attemptCost = (level: number) => Math.floor(baseGold * Math.pow(perLevel, level));

    // 각 레벨별 확률 조회
    const getRate = (level: number) => {
      const key = `rate_${level}_to_${level + 1}`;
      return this.gameConfigService.getCachedValue<Record<string, number>>('enhance', key);
    };

    // E[n] = 레벨 n에서 n+1로 가는 기대 비용
    const expectedStepCosts: number[] = [];
    // C[n] = 0에서 n까지의 누적 기대 비용
    const cumulativeCosts: number[] = [0];

    for (let n = 0; n < enhanceLevel; n++) {
      const cost = attemptCost(n);
      const rate = getRate(n);

      if (!rate) break;

      let stepCost: number;

      if ('successRate' in rate) {
        // 멀티 확률 (레벨 10+): E(n) = (cost + d*E(n-1) + k*C(n)) / s
        const s = rate.successRate;
        const d = rate.downgradeRate ?? 0;
        const k = rate.destroyRate ?? 0;
        const prevStep = n > 0 ? expectedStepCosts[n - 1] : 0;
        stepCost = (cost + d * prevStep + k * cumulativeCosts[n]) / s;
      } else {
        // 레거시 확률 (레벨 0-9): E(n) = cost / rate
        const r = rate.rate ?? 1;
        stepCost = cost / r;
      }

      expectedStepCosts.push(stepCost);
      cumulativeCosts.push(cumulativeCosts[n] + stepCost);
    }

    const totalExpectedCost = cumulativeCosts[Math.min(enhanceLevel, cumulativeCosts.length - 1)];
    return Math.floor(totalExpectedCost * 0.5);
  }

  async findAll(userId: string) {
    const inventories = await this.prisma.inventory.findMany({
      where: { userId },
      include: { item: true },
      orderBy: { createdAt: 'desc' },
    });

    return inventories;
  }

  async equip(userId: string, equipDto: EquipDto) {
    const inventory = await this.prisma.inventory.findUnique({
      where: { id: equipDto.inventoryId },
      include: { item: true },
    });

    if (!inventory) {
      throw new NotFoundException('인벤토리 아이템을 찾을 수 없습니다.');
    }

    if (inventory.userId !== userId) {
      throw new ForbiddenException('본인의 아이템만 장착할 수 있습니다.');
    }

    if (inventory.isDestroyed) {
      throw new BadRequestException('파괴된 아이템은 장착할 수 없습니다.');
    }

    const slot = ITEM_TYPE_TO_EQUIP_SLOT[inventory.item.type];
    if (!slot) {
      throw new BadRequestException('장착할 수 없는 아이템입니다.');
    }

    // Unequip any item currently in the same slot
    await this.prisma.inventory.updateMany({
      where: { userId, equippedSlot: slot, isEquipped: true },
      data: { isEquipped: false, equippedSlot: null },
    });

    // Equip the new item
    const updated = await this.prisma.inventory.update({
      where: { id: equipDto.inventoryId },
      data: { isEquipped: true, equippedSlot: slot },
      include: { item: true },
    });

    return updated;
  }

  async unequip(userId: string, equipDto: EquipDto) {
    const inventory = await this.prisma.inventory.findUnique({
      where: { id: equipDto.inventoryId },
    });

    if (!inventory) {
      throw new NotFoundException('인벤토리 아이템을 찾을 수 없습니다.');
    }

    if (inventory.userId !== userId) {
      throw new ForbiddenException('본인의 아이템만 해제할 수 있습니다.');
    }

    if (!inventory.isEquipped) {
      throw new BadRequestException('장착되지 않은 아이템입니다.');
    }

    const updated = await this.prisma.inventory.update({
      where: { id: equipDto.inventoryId },
      data: { isEquipped: false, equippedSlot: null },
      include: { item: true },
    });

    return updated;
  }

  async sell(userId: string, sellDto: SellDto) {
    const inventory = await this.prisma.inventory.findUnique({
      where: { id: sellDto.inventoryId },
      include: { item: true },
    });

    if (!inventory) {
      throw new NotFoundException('인벤토리 아이템을 찾을 수 없습니다.');
    }

    if (inventory.userId !== userId) {
      throw new ForbiddenException('본인의 아이템만 판매할 수 있습니다.');
    }

    if (inventory.isEquipped) {
      throw new BadRequestException('장착 중인 아이템은 판매할 수 없습니다.');
    }

    if (inventory.isDestroyed) {
      throw new BadRequestException('파괴된 아이템은 판매할 수 없습니다.');
    }

    const quantity = sellDto.quantity ?? inventory.quantity;

    if (quantity > inventory.quantity) {
      throw new BadRequestException('보유 수량이 부족합니다.');
    }

    const unitPrice = this.calculateEnhanceSellPrice(inventory.enhanceLevel);
    const totalGold = unitPrice * quantity;

    if (quantity >= inventory.quantity) {
      await this.prisma.inventory.delete({
        where: { id: sellDto.inventoryId },
      });
    } else {
      await this.prisma.inventory.update({
        where: { id: sellDto.inventoryId },
        data: { quantity: { decrement: quantity } },
      });
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { gold: { increment: totalGold } },
    });

    return { soldQuantity: quantity, goldEarned: totalGold };
  }

  async discard(userId: string, inventoryId: string) {
    const inventory = await this.prisma.inventory.findUnique({
      where: { id: inventoryId },
    });

    if (!inventory) {
      throw new NotFoundException('인벤토리 아이템을 찾을 수 없습니다.');
    }

    if (inventory.userId !== userId) {
      throw new ForbiddenException('본인의 아이템만 버릴 수 있습니다.');
    }

    if (inventory.isEquipped) {
      throw new BadRequestException('장착 중인 아이템은 버릴 수 없습니다.');
    }

    await this.prisma.inventory.delete({
      where: { id: inventoryId },
    });

    return { message: '아이템이 삭제되었습니다.' };
  }

  async restore(userId: string, inventoryId: string) {
    const inventory = await this.prisma.inventory.findUnique({
      where: { id: inventoryId },
      include: { item: true },
    });

    if (!inventory) {
      throw new NotFoundException('인벤토리 아이템을 찾을 수 없습니다.');
    }

    if (inventory.userId !== userId) {
      throw new ForbiddenException('본인의 아이템만 복원할 수 있습니다.');
    }

    if (!inventory.isDestroyed) {
      throw new BadRequestException('파괴된 아이템만 복원할 수 있습니다.');
    }

    // 복원 비용: 5000 골드
    const restoreCost = 5000;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    if (user.gold < restoreCost) {
      throw new BadRequestException(
        `골드가 부족합니다. 필요: ${restoreCost}, 보유: ${user.gold}`,
      );
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { gold: { decrement: restoreCost } },
    });

    const updated = await this.prisma.inventory.update({
      where: { id: inventoryId },
      data: {
        isDestroyed: false,
        enhanceLevel: 10,
      },
      include: { item: true },
    });

    return {
      message: `${updated.item.name}이(가) +10 상태로 복원되었습니다.`,
      inventory: updated,
      goldCost: restoreCost,
    };
  }
}
