import { Injectable } from '@nestjs/common';
import { GameConfigService } from '../game-config/game-config.service';

interface CombatStats {
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  criticalRate: number;
}

interface DamageFormulaConfig {
  baseVariance: number;
  critMultiplier: number;
  minDamage: number;
}

@Injectable()
export class BattleEngine {
  constructor(private readonly gameConfigService: GameConfigService) {}

  private getDamageFormula(): DamageFormulaConfig {
    return (
      this.gameConfigService.getCachedValue<DamageFormulaConfig>('battle', 'damage_formula') ?? {
        baseVariance: 3,
        critMultiplier: 1.5,
        minDamage: 1,
      }
    );
  }

  calculateDamage(
    attacker: CombatStats,
    defender: CombatStats,
  ): { damage: number; isCritical: boolean } {
    const formula = this.getDamageFormula();

    const isCritical = Math.random() < attacker.criticalRate;
    const variance = formula.baseVariance;
    const randomModifier = Math.floor(Math.random() * (variance * 2 + 1)) - variance;
    let damage = attacker.attack - defender.defense + randomModifier;

    if (isCritical) {
      damage = Math.floor(damage * formula.critMultiplier);
    }

    damage = Math.max(formula.minDamage, damage);

    return { damage, isCritical };
  }

  checkBattleEnd(playerHp: number, monsterHp: number): 'continue' | 'victory' | 'defeat' {
    if (monsterHp <= 0) return 'victory';
    if (playerHp <= 0) return 'defeat';
    return 'continue';
  }
}
