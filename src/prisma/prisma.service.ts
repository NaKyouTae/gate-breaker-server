import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
    await this.ensureSchemaCompatibility();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  // Guard against local schema drift when migrations are not fully applied.
  private async ensureSchemaCompatibility() {
    await this.$executeRawUnsafe(
      'ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "profile_image_url" TEXT;',
    );
    await this.$executeRawUnsafe(
      'ALTER TABLE "item" ADD COLUMN IF NOT EXISTS "category" VARCHAR(30) NOT NULL DEFAULT \'기타\';',
    );
    await this.$executeRawUnsafe(
      'ALTER TABLE "item" ADD COLUMN IF NOT EXISTS "image_url" TEXT;',
    );
    await this.$executeRawUnsafe(
      'ALTER TABLE "monster" ADD COLUMN IF NOT EXISTS "image_url" TEXT;',
    );
  }
}
