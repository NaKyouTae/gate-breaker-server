import { Module } from '@nestjs/common';
import { DungeonController } from './dungeon.controller';
import { DungeonService } from './dungeon.service';

@Module({
  controllers: [DungeonController],
  providers: [DungeonService],
  exports: [DungeonService],
})
export class DungeonModule {}
