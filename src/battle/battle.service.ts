import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BattleEngine } from './battle.engine';
import { GameConfigService } from '../game-config/game-config.service';
import { battleStore, BattleSession, BattleLogEntry } from '../dungeon/dungeon.service';
import { ItemType } from '@prisma/client';

@Injectable()
export class BattleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly battleEngine: BattleEngine,
    private readonly gameConfigService: GameConfigService,
  ) {}

  private logEntry(message: string, type: BattleLogEntry['type'], damage?: number): BattleLogEntry {
    return { message, type, damage, timestamp: Date.now() };
  }

  private getSession(userId: string): BattleSession {
    const session = battleStore.get(`battle:${userId}`);
    if (!session) {
      throw new NotFoundException('진행 중인 전투가 없습니다.');
    }
    if (session.result) {
      throw new BadRequestException('이미 종료된 전투입니다.');
    }
    return session;
  }

  private getRequiredExp(level: number): number {
    const expTable = this.gameConfigService.getCachedValue<{
      base: number;
    }>('levelup', 'exp_table');
    const base = expTable?.base ?? 100;
    return Math.floor(base * Math.pow(level, 1.5));
  }

  private async processVictory(session: BattleSession) {
    const monster = session.monster;
    const user = await this.prisma.user.findUnique({
      where: { id: session.userId },
    });
    if (!user) return;

    const expGained = monster.expReward;
    const goldGained = monster.goldReward;

    // Process drops
    const drops: { itemId: string; itemName: string }[] = [];
    const dropTables = await this.prisma.dropTable.findMany({
      where: { monsterId: monster.id },
      include: { item: true },
    });

    for (const drop of dropTables) {
      if (Math.random() < drop.dropRate) {
        drops.push({ itemId: drop.itemId, itemName: drop.item.name });

        // Stackable items: MATERIAL, CONSUMABLE
        if (
          drop.item.type === ItemType.MATERIAL ||
          drop.item.type === ItemType.CONSUMABLE
        ) {
          const existing = await this.prisma.inventory.findFirst({
            where: {
              userId: session.userId,
              itemId: drop.itemId,
              isEquipped: false,
            },
          });
          if (existing) {
            await this.prisma.inventory.update({
              where: { id: existing.id },
              data: { quantity: { increment: 1 } },
            });
          } else {
            await this.prisma.inventory.create({
              data: {
                userId: session.userId,
                itemId: drop.itemId,
                quantity: 1,
              },
            });
          }
        } else {
          // Equipment: always create new entry
          await this.prisma.inventory.create({
            data: {
              userId: session.userId,
              itemId: drop.itemId,
              quantity: 1,
            },
          });
        }
      }
    }

    // Add exp and gold, check level up
    let newExp = user.exp + expGained;
    let newLevel = user.level;
    let newMaxHp = user.maxHp;
    let newMaxMp = user.maxMp;
    let newAttack = user.attack;
    let newDefense = user.defense;
    let leveledUp = false;

    const statGrowth = this.gameConfigService.getCachedValue<{
      hpPerLevel: number;
      mpPerLevel: number;
      attackPerLevel: number;
      defensePerLevel: number;
    }>('levelup', 'stat_growth');

    while (newExp >= this.getRequiredExp(newLevel)) {
      newExp -= this.getRequiredExp(newLevel);
      newLevel++;
      leveledUp = true;
      newMaxHp += statGrowth?.hpPerLevel ?? 10;
      newMaxMp += statGrowth?.mpPerLevel ?? 5;
      newAttack += statGrowth?.attackPerLevel ?? 2;
      newDefense += statGrowth?.defensePerLevel ?? 1;
    }

    await this.prisma.user.update({
      where: { id: session.userId },
      data: {
        exp: newExp,
        level: newLevel,
        gold: { increment: goldGained },
        maxHp: newMaxHp,
        hp: newMaxHp,
        maxMp: newMaxMp,
        mp: newMaxMp,
        attack: newAttack,
        defense: newDefense,
      },
    });

    // Create battle log
    await this.prisma.battleLog.create({
      data: {
        userId: session.userId,
        dungeonId: session.dungeonId,
        result: 'VICTORY',
        goldEarned: goldGained,
        expEarned: expGained,
      },
    });

    // Store result in session instead of deleting
    session.result = 'victory';
    session.rewards = {
      exp: expGained,
      gold: goldGained,
      items: drops.map((d) => d.itemName),
    };

    return { expGained, goldGained, drops, leveledUp, newLevel };
  }

  private async processDefeat(session: BattleSession) {
    const user = await this.prisma.user.findUnique({
      where: { id: session.userId },
    });
    if (!user) return;

    const defeatPenalty = this.gameConfigService.getCachedValue<{
      goldLossRate: number;
    }>('battle', 'defeat_penalty');
    const lossRate = defeatPenalty?.goldLossRate ?? 0.1;
    const goldLost = Math.floor(user.gold * lossRate);

    await this.prisma.user.update({
      where: { id: session.userId },
      data: { gold: { decrement: goldLost } },
    });

    await this.prisma.battleLog.create({
      data: {
        userId: session.userId,
        dungeonId: session.dungeonId,
        result: 'DEFEAT',
        goldEarned: -goldLost,
        expEarned: 0,
      },
    });

    // Store result in session instead of deleting
    session.result = 'defeat';
    session.rewards = null;

    return { goldLost };
  }

  async getStatus(userId: string) {
    const session = battleStore.get(`battle:${userId}`);
    if (!session) {
      return {
        isInBattle: false,
        dungeonId: null,
        currentMonster: null,
        playerHp: 0,
        playerMaxHp: 0,
        playerMp: 0,
        playerMaxMp: 0,
        enemyHp: 0,
        enemyMaxHp: 0,
        isPlayerTurn: false,
        battleLog: [],
        result: null,
        rewards: null,
      };
    }
    return {
      isInBattle: true,
      dungeonId: session.dungeonId,
      currentMonster: session.monster,
      playerHp: session.playerHp,
      playerMaxHp: session.playerMaxHp,
      playerMp: session.playerMp,
      playerMaxMp: session.playerMaxMp,
      enemyHp: session.enemyHp,
      enemyMaxHp: session.enemyMaxHp,
      isPlayerTurn: session.isPlayerTurn,
      battleLog: session.log,
      result: session.result,
      rewards: session.rewards,
    };
  }

  async confirmResult(userId: string) {
    const session = battleStore.get(`battle:${userId}`);
    if (!session || !session.result) {
      throw new BadRequestException('확인할 전투 결과가 없습니다.');
    }
    battleStore.delete(`battle:${userId}`);
    return { success: true };
  }

  async attack(userId: string) {
    const session = this.getSession(userId);

    // Player attacks monster
    const playerDamage = this.battleEngine.calculateDamage(
      {
        hp: session.playerHp,
        maxHp: session.playerMaxHp,
        attack: session.playerAttack,
        defense: session.playerDefense,
        criticalRate: session.playerCriticalRate,
      },
      {
        hp: session.enemyHp,
        maxHp: session.enemyMaxHp,
        attack: session.monster.attack,
        defense: session.monster.defense,
        criticalRate: 0.05,
      },
    );

    session.enemyHp -= playerDamage.damage;
    session.log.push(
      this.logEntry(
        `${session.monster.name}에게 ${playerDamage.damage}의 피해를 입혔다!${playerDamage.isCritical ? ' (크리티컬!)' : ''}`,
        playerDamage.isCritical ? 'critical' : 'player_attack',
        playerDamage.damage,
      ),
    );

    // Check victory
    const result = this.battleEngine.checkBattleEnd(
      session.playerHp,
      session.enemyHp,
    );
    if (result === 'victory') {
      session.log.push(this.logEntry(`${session.monster.name}을(를) 처치했다!`, 'system'));
      const victoryResult = await this.processVictory(session);
      return {
        status: 'VICTORY',
        ...victoryResult,
        log: session.log,
      };
    }

    // Monster attacks back
    const monsterDamage = this.battleEngine.calculateDamage(
      {
        hp: session.enemyHp,
        maxHp: session.enemyMaxHp,
        attack: session.monster.attack,
        defense: session.monster.defense,
        criticalRate: 0.05,
      },
      {
        hp: session.playerHp,
        maxHp: session.playerMaxHp,
        attack: session.playerAttack,
        defense: session.playerDefense,
        criticalRate: session.playerCriticalRate,
      },
    );

    session.playerHp -= monsterDamage.damage;
    session.log.push(
      this.logEntry(
        `${session.monster.name}이(가) ${monsterDamage.damage}의 피해를 입혔다!${monsterDamage.isCritical ? ' (크리티컬!)' : ''}`,
        monsterDamage.isCritical ? 'critical' : 'enemy_attack',
        monsterDamage.damage,
      ),
    );

    // Check defeat
    const result2 = this.battleEngine.checkBattleEnd(
      session.playerHp,
      session.enemyHp,
    );
    if (result2 === 'defeat') {
      session.log.push(this.logEntry('전투에서 패배했다...', 'system'));
      const defeatResult = await this.processDefeat(session);
      return {
        status: 'DEFEAT',
        ...defeatResult,
        log: session.log,
      };
    }

    return {
      status: 'CONTINUE',
      playerHp: session.playerHp,
      playerMaxHp: session.playerMaxHp,
      playerMp: session.playerMp,
      playerMaxMp: session.playerMaxMp,
      enemyHp: session.enemyHp,
      enemyMaxHp: session.enemyMaxHp,
      log: session.log,
    };
  }

  async skill(userId: string) {
    const session = this.getSession(userId);

    if (session.playerMp < 10) {
      throw new BadRequestException('MP가 부족합니다.');
    }

    session.playerMp -= 10;

    // Skill: 1.5x damage
    const playerDamage = this.battleEngine.calculateDamage(
      {
        hp: session.playerHp,
        maxHp: session.playerMaxHp,
        attack: Math.floor(session.playerAttack * 1.5),
        defense: session.playerDefense,
        criticalRate: session.playerCriticalRate,
      },
      {
        hp: session.enemyHp,
        maxHp: session.enemyMaxHp,
        attack: session.monster.attack,
        defense: session.monster.defense,
        criticalRate: 0.05,
      },
    );

    session.enemyHp -= playerDamage.damage;
    session.log.push(
      this.logEntry(
        `스킬 공격! ${session.monster.name}에게 ${playerDamage.damage}의 피해를 입혔다!${playerDamage.isCritical ? ' (크리티컬!)' : ''} (MP -10)`,
        playerDamage.isCritical ? 'critical' : 'player_attack',
        playerDamage.damage,
      ),
    );

    const result = this.battleEngine.checkBattleEnd(
      session.playerHp,
      session.enemyHp,
    );
    if (result === 'victory') {
      session.log.push(this.logEntry(`${session.monster.name}을(를) 처치했다!`, 'system'));
      const victoryResult = await this.processVictory(session);
      return { status: 'VICTORY', ...victoryResult, log: session.log };
    }

    // Monster counter-attack
    const monsterDamage = this.battleEngine.calculateDamage(
      {
        hp: session.enemyHp,
        maxHp: session.enemyMaxHp,
        attack: session.monster.attack,
        defense: session.monster.defense,
        criticalRate: 0.05,
      },
      {
        hp: session.playerHp,
        maxHp: session.playerMaxHp,
        attack: session.playerAttack,
        defense: session.playerDefense,
        criticalRate: session.playerCriticalRate,
      },
    );

    session.playerHp -= monsterDamage.damage;
    session.log.push(
      this.logEntry(
        `${session.monster.name}이(가) ${monsterDamage.damage}의 피해를 입혔다!`,
        'enemy_attack',
        monsterDamage.damage,
      ),
    );

    const result2 = this.battleEngine.checkBattleEnd(
      session.playerHp,
      session.enemyHp,
    );
    if (result2 === 'defeat') {
      session.log.push(this.logEntry('전투에서 패배했다...', 'system'));
      const defeatResult = await this.processDefeat(session);
      return { status: 'DEFEAT', ...defeatResult, log: session.log };
    }

    return {
      status: 'CONTINUE',
      playerHp: session.playerHp,
      playerMaxHp: session.playerMaxHp,
      playerMp: session.playerMp,
      playerMaxMp: session.playerMaxMp,
      enemyHp: session.enemyHp,
      enemyMaxHp: session.enemyMaxHp,
      log: session.log,
    };
  }

  async useItem(userId: string) {
    const session = this.getSession(userId);

    // Find a consumable HP potion in inventory
    const consumable = await this.prisma.inventory.findFirst({
      where: {
        userId,
        item: { type: ItemType.CONSUMABLE },
        quantity: { gt: 0 },
      },
      include: { item: true },
    });

    if (!consumable) {
      throw new BadRequestException('사용할 수 있는 소비 아이템이 없습니다.');
    }

    // Heal 30 HP
    const healAmount = 30;
    session.playerHp = Math.min(
      session.playerMaxHp,
      session.playerHp + healAmount,
    );
    session.log.push(
      this.logEntry(`${consumable.item.name}을(를) 사용하여 HP를 ${healAmount} 회복했다!`, 'info'),
    );

    // Decrease quantity or remove
    if (consumable.quantity <= 1) {
      await this.prisma.inventory.delete({ where: { id: consumable.id } });
    } else {
      await this.prisma.inventory.update({
        where: { id: consumable.id },
        data: { quantity: { decrement: 1 } },
      });
    }

    // Monster still attacks
    const monsterDamage = this.battleEngine.calculateDamage(
      {
        hp: session.enemyHp,
        maxHp: session.enemyMaxHp,
        attack: session.monster.attack,
        defense: session.monster.defense,
        criticalRate: 0.05,
      },
      {
        hp: session.playerHp,
        maxHp: session.playerMaxHp,
        attack: session.playerAttack,
        defense: session.playerDefense,
        criticalRate: session.playerCriticalRate,
      },
    );

    session.playerHp -= monsterDamage.damage;
    session.log.push(
      this.logEntry(
        `${session.monster.name}이(가) ${monsterDamage.damage}의 피해를 입혔다!`,
        'enemy_attack',
        monsterDamage.damage,
      ),
    );

    const result = this.battleEngine.checkBattleEnd(
      session.playerHp,
      session.enemyHp,
    );
    if (result === 'defeat') {
      session.log.push(this.logEntry('전투에서 패배했다...', 'system'));
      const defeatResult = await this.processDefeat(session);
      return { status: 'DEFEAT', ...defeatResult, log: session.log };
    }

    return {
      status: 'CONTINUE',
      playerHp: session.playerHp,
      playerMaxHp: session.playerMaxHp,
      playerMp: session.playerMp,
      playerMaxMp: session.playerMaxMp,
      enemyHp: session.enemyHp,
      enemyMaxHp: session.enemyMaxHp,
      log: session.log,
    };
  }

  async escape(userId: string) {
    const session = this.getSession(userId);

    const escapeChance = 0.5;
    const escaped = Math.random() < escapeChance;

    if (escaped) {
      session.log.push(this.logEntry('전투에서 도망쳤다!', 'system'));

      await this.prisma.battleLog.create({
        data: {
          userId: session.userId,
          dungeonId: session.dungeonId,
          result: 'ESCAPE',
          goldEarned: 0,
          expEarned: 0,
        },
      });

      // Store result in session instead of deleting
      session.result = 'escape';
      session.rewards = null;

      return {
        status: 'ESCAPE',
        log: session.log,
      };
    }

    // Failed to escape - monster gets a free attack
    session.log.push(this.logEntry('도망에 실패했다!', 'system'));

    const monsterDamage = this.battleEngine.calculateDamage(
      {
        hp: session.enemyHp,
        maxHp: session.enemyMaxHp,
        attack: session.monster.attack,
        defense: session.monster.defense,
        criticalRate: 0.05,
      },
      {
        hp: session.playerHp,
        maxHp: session.playerMaxHp,
        attack: session.playerAttack,
        defense: session.playerDefense,
        criticalRate: session.playerCriticalRate,
      },
    );

    session.playerHp -= monsterDamage.damage;
    session.log.push(
      this.logEntry(
        `${session.monster.name}이(가) ${monsterDamage.damage}의 피해를 입혔다!`,
        'enemy_attack',
        monsterDamage.damage,
      ),
    );

    const result = this.battleEngine.checkBattleEnd(
      session.playerHp,
      session.enemyHp,
    );
    if (result === 'defeat') {
      session.log.push(this.logEntry('전투에서 패배했다...', 'system'));
      const defeatResult = await this.processDefeat(session);
      return { status: 'DEFEAT', ...defeatResult, log: session.log };
    }

    return {
      status: 'ESCAPE_FAILED',
      playerHp: session.playerHp,
      playerMaxHp: session.playerMaxHp,
      enemyHp: session.enemyHp,
      enemyMaxHp: session.enemyMaxHp,
      log: session.log,
    };
  }
}
