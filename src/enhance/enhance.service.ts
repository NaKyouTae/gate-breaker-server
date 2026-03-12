import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GameConfigService } from '../game-config/game-config.service';
import { EnhanceDto } from './dto/enhance.dto';

@Injectable()
export class EnhanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gameConfigService: GameConfigService,
  ) {}

  getEnhanceRate(
    currentLevel: number,
  ): { rate: number; failPenalty: string } | undefined {
    const key = `rate_${currentLevel}_to_${currentLevel + 1}`;
    return this.gameConfigService.getCachedValue<{
      rate: number;
      failPenalty: string;
    }>('enhance', key);
  }

  getEnhanceCost():
    | { baseGold: number; perLevel: number; stonePerLevel: number }
    | undefined {
    return this.gameConfigService.getCachedValue('enhance', 'cost_multiplier');
  }

  private calculateGoldCost(enhanceLevel: number): number {
    const costConfig = this.getEnhanceCost();
    const baseGold = costConfig?.baseGold ?? 100;
    const perLevel = costConfig?.perLevel ?? 1.5;
    return Math.floor(baseGold * Math.pow(perLevel, enhanceLevel));
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

    return {
      item: inventory.item,
      currentLevel,
      nextLevel: currentLevel + 1,
      successRate: Math.round(rateInfo.rate * 100),
      failurePenalty: rateInfo.failPenalty,
      cost: goldCost,
    };
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

    // Roll for success
    const roll = Math.random();
    const success = roll < rateInfo.rate;

    if (success) {
      const updated = await this.prisma.inventory.update({
        where: { id: enhanceDto.inventoryId },
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

    // Failure penalties
    const penalty = rateInfo.failPenalty;

    if (penalty === 'none') {
      return {
        success: false,
        message: `강화 실패! 레벨 유지 (+${currentLevel})`,
        enhanceLevel: currentLevel,
        item: inventory.item,
        goldCost,
      };
    }

    if (penalty === 'downgrade_1') {
      const newLevel = Math.max(0, currentLevel - 1);
      const updated = await this.prisma.inventory.update({
        where: { id: enhanceDto.inventoryId },
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

    // downgrade_N 패턴에서 N만큼 하락
    const downgradeMatch = penalty.match(/^downgrade_(\d+)$/);
    if (downgradeMatch) {
      const downgradeAmount = parseInt(downgradeMatch[1], 10);
      const newLevel = Math.max(0, currentLevel - downgradeAmount);
      const updated = await this.prisma.inventory.update({
        where: { id: enhanceDto.inventoryId },
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
      await this.prisma.inventory.delete({
        where: { id: enhanceDto.inventoryId },
      });
      return {
        success: false,
        message: `강화 실패! 아이템이 파괴되었습니다.`,
        enhanceLevel: 0,
        item: inventory.item,
        destroyed: true,
        goldCost,
      };
    }

    // Fallback: just fail with no penalty
    return {
      success: false,
      message: `강화 실패!`,
      enhanceLevel: currentLevel,
      item: inventory.item,
      goldCost,
    };
  }
}
