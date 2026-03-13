import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { InventoryModule } from './inventory/inventory.module';
import { DungeonModule } from './dungeon/dungeon.module';
import { BattleModule } from './battle/battle.module';
import { EnhanceModule } from './enhance/enhance.module';
import { ShopModule } from './shop/shop.module';
import { GameConfigModule } from './game-config/game-config.module';
import { AdminModule } from './admin/admin.module';
import { RedisModule } from './redis/redis.module';
import { ChannelModule } from './channel/channel.module';
import { CodexModule } from './codex/codex.module';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    GameConfigModule,
    AuthModule,
    UserModule,
    InventoryModule,
    DungeonModule,
    BattleModule,
    EnhanceModule,
    ShopModule,
    AdminModule,
    ChannelModule,
    CodexModule,
  ],
})
export class AppModule {}
