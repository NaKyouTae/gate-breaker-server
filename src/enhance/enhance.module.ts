import { Module } from '@nestjs/common';
import { EnhanceController } from './enhance.controller';
import { EnhanceService } from './enhance.service';

@Module({
  controllers: [EnhanceController],
  providers: [EnhanceService],
  exports: [EnhanceService],
})
export class EnhanceModule {}
