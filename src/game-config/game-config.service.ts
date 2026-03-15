import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  enhanceDefaults,
  battleDefaults,
  dungeonDefaults,
  dropDefaults,
  levelupDefaults,
  shopDefaults,
} from './defaults';

interface ConfigCacheEntry {
  value: any;
  description: string | null;
}

@Injectable()
export class GameConfigService {
  private readonly logger = new Logger(GameConfigService.name);
  private cache = new Map<string, ConfigCacheEntry>();

  constructor(private readonly prisma: PrismaService) {}

  private cacheKey(category: string, key: string): string {
    return `${category}:${key}`;
  }

  async onModuleInit(): Promise<void> {
    await this.seedDefaults();
  }

  async loadCache(): Promise<void> {
    const configs = await this.prisma.gameConfig.findMany();
    this.cache.clear();
    for (const config of configs) {
      this.cache.set(this.cacheKey(config.category, config.key), {
        value: config.value,
        description: config.description,
      });
    }
    this.logger.log(`Loaded ${configs.length} game configs into cache`);
  }

  getCachedValue<T = any>(category: string, key: string): T | undefined {
    const entry = this.cache.get(this.cacheKey(category, key));
    return entry?.value as T | undefined;
  }

  async getAllConfigs(category?: string) {
    const where = category ? { category } : {};
    return this.prisma.gameConfig.findMany({
      where,
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });
  }

  async getConfigsByCategory(category: string) {
    return this.prisma.gameConfig.findMany({
      where: { category },
      orderBy: { key: 'asc' },
    });
  }

  async getConfig(category: string, key: string) {
    const config = await this.prisma.gameConfig.findUnique({
      where: { category_key: { category, key } },
    });
    if (!config) {
      throw new NotFoundException(`Config not found: ${category}/${key}`);
    }
    return config;
  }

  async updateConfig(category: string, key: string, value: any, description?: string) {
    const existing = await this.prisma.gameConfig.findUnique({
      where: { category_key: { category, key } },
    });
    if (!existing) {
      throw new NotFoundException(`Config not found: ${category}/${key}`);
    }

    const updated = await this.prisma.gameConfig.update({
      where: { category_key: { category, key } },
      data: {
        value,
        ...(description !== undefined && { description }),
      },
    });

    this.cache.set(this.cacheKey(category, key), {
      value: updated.value,
      description: updated.description,
    });

    return updated;
  }

  async seedDefaults(): Promise<{ created: number; skipped: number }> {
    const allDefaults: { category: string; items: { key: string; value: any; description: string }[] }[] = [
      { category: 'enhance', items: enhanceDefaults },
      { category: 'battle', items: battleDefaults },
      { category: 'dungeon', items: dungeonDefaults },
      { category: 'drop', items: dropDefaults },
      { category: 'levelup', items: levelupDefaults },
      { category: 'shop', items: shopDefaults },
    ];

    let created = 0;
    let skipped = 0;

    let updated = 0;

    for (const { category, items } of allDefaults) {
      for (const item of items) {
        const existing = await this.prisma.gameConfig.findUnique({
          where: { category_key: { category, key: item.key } },
        });
        if (existing) {
          const existingValue = JSON.stringify(existing.value);
          const newValue = JSON.stringify(item.value);
          if (existingValue !== newValue) {
            await this.prisma.gameConfig.update({
              where: { category_key: { category, key: item.key } },
              data: { value: item.value, description: item.description },
            });
            updated++;
          } else {
            skipped++;
          }
          continue;
        }
        await this.prisma.gameConfig.create({
          data: {
            category,
            key: item.key,
            value: item.value,
            description: item.description,
          },
        });
        created++;
      }
    }

    await this.loadCache();
    this.logger.log(`Seed complete: ${created} created, ${updated} updated, ${skipped} skipped`);
    return { created, skipped };
  }
}
