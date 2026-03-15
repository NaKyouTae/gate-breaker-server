import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Item } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GameConfigService } from '../game-config/game-config.service';
import { EnhanceDto } from './dto/enhance.dto';

interface LegacyRate {
  rate: number;
  failPenalty: string;
}

interface MultiRate {
  successRate: number;
  maintainRate: number;
  downgradeRate: number;
  destroyRate: number;
}

type EnhanceRate = LegacyRate | MultiRate;

function isMultiRate(r: EnhanceRate): r is MultiRate {
  return 'successRate' in r;
}

@Injectable()
export class EnhanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gameConfigService: GameConfigService,
  ) {}

  getEnhanceRate(currentLevel: number): EnhanceRate | undefined {
    const key = `rate_${currentLevel}_to_${currentLevel + 1}`;
    return this.gameConfigService.getCachedValue<EnhanceRate>('enhance', key);
  }

  getEnhanceCost():
    | { baseGold: number; perLevel: number }
    | undefined {
    return this.gameConfigService.getCachedValue('enhance', 'cost_multiplier');
  }

  private calculateGoldCost(enhanceLevel: number): number {
    const costConfig = this.getEnhanceCost();
    const baseGold = costConfig?.baseGold ?? 100;
    const perLevel = costConfig?.perLevel ?? 1.5;
    return Math.floor(baseGold * Math.pow(perLevel, enhanceLevel));
  }

  private getSuccessRate(rateInfo: EnhanceRate): number {
    return isMultiRate(rateInfo) ? rateInfo.successRate : rateInfo.rate;
  }

  private getFailurePenaltyLabel(rateInfo: EnhanceRate): string {
    if (isMultiRate(rateInfo)) {
      const parts: string[] = [];
      if (rateInfo.maintainRate > 0) parts.push('유지');
      if (rateInfo.downgradeRate > 0) parts.push('하락');
      if (rateInfo.destroyRate > 0) parts.push('파괴');
      return parts.join('/');
    }
    return rateInfo.failPenalty;
  }

  async getEnhanceInfo(inventoryId: string) {
    const inventory = await this.prisma.inventory.findUnique({
      where: { id: inventoryId },
      include: { item: true },
    });

    if (!inventory) {
      throw new NotFoundException('인벤토리 아이템을 찾을 수 없습니다.');
    }

    const currentLevel = inventory.enhanceLevel;
    const rateInfo = this.getEnhanceRate(currentLevel);

    if (!rateInfo) {
      return {
        item: inventory.item,
        currentLevel,
        maxLevel: true,
        message: '더 이상 강화할 수 없습니다.',
      };
    }

    const goldCost = this.calculateGoldCost(currentLevel);

    const response: Record<string, unknown> = {
      item: inventory.item,
      currentLevel,
      nextLevel: currentLevel + 1,
      successRate: Math.round(this.getSuccessRate(rateInfo) * 100),
      failurePenalty: this.getFailurePenaltyLabel(rateInfo),
      cost: goldCost,
    };

    if (isMultiRate(rateInfo)) {
      response.maintainRate = Math.round(rateInfo.maintainRate * 100);
      response.downgradeRate = Math.round(rateInfo.downgradeRate * 100);
      response.destroyRate = Math.round(rateInfo.destroyRate * 100);
    } else {
      const successRate = rateInfo.rate;
      const failRate = 1 - successRate;
      if (rateInfo.failPenalty === 'none') {
        response.maintainRate = Math.round(failRate * 100);
        response.downgradeRate = 0;
        response.destroyRate = 0;
      } else if (rateInfo.failPenalty === 'destroy') {
        response.maintainRate = 0;
        response.downgradeRate = 0;
        response.destroyRate = Math.round(failRate * 100);
      } else {
        response.maintainRate = 0;
        response.downgradeRate = Math.round(failRate * 100);
        response.destroyRate = 0;
      }
    }

    return response;
  }

  async enhance(userId: string, enhanceDto: EnhanceDto) {
    const inventory = await this.prisma.inventory.findUnique({
      where: { id: enhanceDto.inventoryId },
      include: { item: true },
    });

    if (!inventory) {
      throw new NotFoundException('인벤토리 아이템을 찾을 수 없습니다.');
    }

    if (inventory.userId !== userId) {
      throw new ForbiddenException('본인의 아이템만 강화할 수 있습니다.');
    }

    if (inventory.isDestroyed) {
      throw new BadRequestException('파괴된 아이템은 강화할 수 없습니다.');
    }

    const currentLevel = inventory.enhanceLevel;
    const rateInfo = this.getEnhanceRate(currentLevel);

    if (!rateInfo) {
      throw new BadRequestException('더 이상 강화할 수 없습니다.');
    }

    const goldCost = this.calculateGoldCost(currentLevel);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    if (user.gold < goldCost) {
      throw new BadRequestException(
        `골드가 부족합니다. 필요: ${goldCost}, 보유: ${user.gold}`,
      );
    }

    // Deduct gold
    await this.prisma.user.update({
      where: { id: userId },
      data: { gold: { decrement: goldCost } },
    });

    const roll = Math.random();

    if (isMultiRate(rateInfo)) {
      return this.resolveMultiRate(roll, rateInfo, enhanceDto.inventoryId, currentLevel, inventory.item, goldCost);
    }

    return this.resolveLegacyRate(roll, rateInfo, enhanceDto.inventoryId, currentLevel, inventory.item, goldCost);
  }

  private async resolveMultiRate(
    roll: number,
    rateInfo: MultiRate,
    inventoryId: string,
    currentLevel: number,
    item: Item,
    goldCost: number,
  ) {
    const { successRate, maintainRate, downgradeRate } = rateInfo;

    // success
    if (roll < successRate) {
      const updated = await this.prisma.inventory.update({
        where: { id: inventoryId },
        data: { enhanceLevel: { increment: 1 } },
        include: { item: true },
      });
      return {
        success: true,
        message: `강화 성공! +${currentLevel} → +${currentLevel + 1}`,
        enhanceLevel: updated.enhanceLevel,
        item: updated.item,
        goldCost,
      };
    }

    // maintain
    if (roll < successRate + maintainRate) {
      return {
        success: false,
        message: `강화 실패! 레벨 유지 (+${currentLevel})`,
        enhanceLevel: currentLevel,
        item,
        goldCost,
      };
    }

    // downgrade
    if (roll < successRate + maintainRate + downgradeRate) {
      const newLevel = Math.max(0, currentLevel - 1);
      const updated = await this.prisma.inventory.update({
        where: { id: inventoryId },
        data: { enhanceLevel: newLevel },
        include: { item: true },
      });
      return {
        success: false,
        message: `강화 실패! 레벨 하락 (+${currentLevel} → +${newLevel})`,
        enhanceLevel: updated.enhanceLevel,
        item: updated.item,
        goldCost,
      };
    }

    // destroy
    await this.prisma.inventory.update({
      where: { id: inventoryId },
      data: {
        isDestroyed: true,
        isEquipped: false,
        equippedSlot: null,
        enhanceLevel: 0,
      },
    });
    return {
      success: false,
      message: `강화 실패! 아이템이 파괴되었습니다.`,
      enhanceLevel: 0,
      item,
      destroyed: true,
      goldCost,
    };
  }

  private async resolveLegacyRate(
    roll: number,
    rateInfo: LegacyRate,
    inventoryId: string,
    currentLevel: number,
    item: Item,
    goldCost: number,
  ) {
    const success = roll < rateInfo.rate;

    if (success) {
      const updated = await this.prisma.inventory.update({
        where: { id: inventoryId },
        data: { enhanceLevel: { increment: 1 } },
        include: { item: true },
      });
      return {
        success: true,
        message: `강화 성공! +${currentLevel} → +${currentLevel + 1}`,
        enhanceLevel: updated.enhanceLevel,
        item: updated.item,
        goldCost,
      };
    }

    const penalty = rateInfo.failPenalty;

    if (penalty === 'none') {
      return {
        success: false,
        message: `강화 실패! 레벨 유지 (+${currentLevel})`,
        enhanceLevel: currentLevel,
        item,
        goldCost,
      };
    }

    const downgradeMatch = penalty.match(/^downgrade_(\d+)$/);
    if (downgradeMatch) {
      const downgradeAmount = parseInt(downgradeMatch[1], 10);
      const newLevel = Math.max(0, currentLevel - downgradeAmount);
      const updated = await this.prisma.inventory.update({
        where: { id: inventoryId },
        data: { enhanceLevel: newLevel },
        include: { item: true },
      });
      return {
        success: false,
        message: `강화 실패! 레벨 하락 (+${currentLevel} → +${newLevel})`,
        enhanceLevel: updated.enhanceLevel,
        item: updated.item,
        goldCost,
      };
    }

    if (penalty === 'destroy') {
      await this.prisma.inventory.update({
        where: { id: inventoryId },
        data: {
          isDestroyed: true,
          isEquipped: false,
          equippedSlot: null,
          enhanceLevel: 0,
        },
      });
      return {
        success: false,
        message: `강화 실패! 아이템이 파괴되었습니다.`,
        enhanceLevel: 0,
        item,
        destroyed: true,
        goldCost,
      };
    }

    return {
      success: false,
      message: `강화 실패!`,
      enhanceLevel: currentLevel,
      item,
      goldCost,
    };
  }
}
