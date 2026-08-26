import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private redis: Redis;

  constructor() {
    const isTls = process.env.REDIS_TLS === 'true';

    this.redis = new Redis({
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: Number(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      tls: isTls ? {} : undefined,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      connectTimeout: 10000,
      keepAlive: 5000,
      autoResendUnfulfilledCommands: false,
      lazyConnect: false,
      retryStrategy(times) {
        return Math.min(times * 100, 2000);
      },
    });

    this.redis.on('connect', () => {
      console.log('✅ Custom Redis client connected successfully');
    });

    this.redis.on('error', (err: any) => {
      if (err?.code !== 'ECONNRESET' && err?.code !== 'ECONNABORTED') {
        console.error('Redis error:', err.message);
      }
    });
  }

  async onModuleInit() {
  
  }

  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit().catch(() => {});
    }
  }

  async get(key: string) {
    return this.redis.get(key);
  }

  async set(key: string, value: string, ttl?: number) {
    if (ttl) {
      return this.redis.set(key, value, 'EX', ttl);
    }
    return this.redis.set(key, value);
  }

  async del(key: string) {
    return this.redis.del(key);
  }

  async deleteByPattern(pattern: string) {
    let cursor = '0';
    const keys: string[] = [];

    do {
      const result = await this.redis.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100,
      );
      cursor = result[0];
      keys.push(...result[1]);
    } while (cursor !== '0');

    if (keys.length > 0) {
      await this.redis.del(...keys);
    }

    return keys.length;
  }
}
