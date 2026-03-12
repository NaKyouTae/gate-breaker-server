import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;

  constructor() {
    this.client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  getClient(): Redis {
    return this.client;
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.client.set(key, value, 'EX', ttl);
    } else {
      await this.client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  /** 리스트 오른쪽에 추가하고, maxLen 초과 시 왼쪽(오래된 것)을 제거 */
  async pushWithLimit(
    key: string,
    value: string,
    maxLen: number,
  ): Promise<void> {
    const pipeline = this.client.pipeline();
    pipeline.rpush(key, value);
    pipeline.ltrim(key, -maxLen, -1);
    await pipeline.exec();
  }

  /** 리스트 전체 조회 */
  async getList(key: string): Promise<string[]> {
    return this.client.lrange(key, 0, -1);
  }

  async onModuleDestroy() {
    await this.client.quit();
  }
}
