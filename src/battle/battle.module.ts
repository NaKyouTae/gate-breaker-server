import { Module } from '@nestjs/common';
import { BattleController } from './battle.controller';
import { BattleService } from './battle.service';
import { BattleGateway } from './battle.gateway';
import { BattleEngine } from './battle.engine';

@Module({
  controllers: [BattleController],
  providers: [BattleService, BattleGateway, BattleEngine],
  exports: [BattleService],
})
export class BattleModule {}
