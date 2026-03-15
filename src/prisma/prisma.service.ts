import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import {
  purgeNonWeaponEquipment,
  migrateOldWeapons,
  seedWeaponCatalog,
} from '../bootstrap/weapon-catalog.seed';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
    await this.ensureSchemaCompatibility();
    await this.seedBaselineWeapons();
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

  private async seedBaselineWeapons() {
    const cleaned = await purgeNonWeaponEquipment(this);
    console.log(
      `[bootstrap] Non-weapon equipment purged (items: ${cleaned.itemsRemoved}, inventory: ${cleaned.inventoryRemoved}, drops: ${cleaned.dropTablesRemoved})`,
    );

    const migration = await migrateOldWeapons(this);
    if (migration.migrated > 0) {
      console.log(`[bootstrap] Old weapons migrated: ${migration.migrated}`);
    }

    const { created, updated } = await seedWeaponCatalog(this);
    console.log(
      `[bootstrap] Weapon catalog seeded (created: ${created}, updated: ${updated})`,
    );
  }
}
