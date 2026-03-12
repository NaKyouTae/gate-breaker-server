import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ChannelController } from './channel.controller';
import { ChannelService } from './channel.service';
import { ChannelGateway } from './channel.gateway';
import { EnhanceModule } from '../enhance/enhance.module';
import { DungeonModule } from '../dungeon/dungeon.module';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'default-secret',
    }),
    EnhanceModule,
    DungeonModule,
  ],
  controllers: [ChannelController],
  providers: [ChannelService, ChannelGateway],
  exports: [ChannelService, ChannelGateway],
})
export class ChannelModule {}
