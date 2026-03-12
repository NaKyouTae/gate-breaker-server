import { Global, Module } from '@nestjs/common';
import { GameConfigController } from './game-config.controller';
import { GameConfigService } from './game-config.service';

@Global()
@Module({
  controllers: [GameConfigController],
  providers: [GameConfigService],
  exports: [GameConfigService],
})
export class GameConfigModule {}
