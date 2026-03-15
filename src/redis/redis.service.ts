import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.client = new Redis({
      host: this.configService.get<string>('redis.host', 'localhost'),
      port: this.configService.get<number>('redis.port', 6379),
      password: this.configService.get<string>('redis.password') || undefined,
      db: this.configService.get<number>('redis.db', 0),
      retryStrategy: (times) => Math.min(times * 50, 2000),
      enableOfflineQueue: false,
    });

    this.client.on('connect', () => this.logger.log('✅ Redis connected'));
    this.client.on('error', (err) => this.logger.error('Redis error:', err.message));
    this.client.on('close', () => this.logger.warn('Redis connection closed'));
  }

  async onModuleDestroy() {
    await this.client.quit();
    this.logger.log('🔌 Redis disconnected');
  }

  getClient(): Redis {
    return this.client;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Core helpers
  // ──────────────────────────────────────────────────────────────────────────

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.setex(key, ttlSeconds, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async setJSON<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttlSeconds);
  }

  async getJSON<T>(key: string): Promise<T | null> {
    const raw = await this.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const count = await this.client.exists(key);
    return count > 0;
  }

  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    await this.client.expire(key, ttlSeconds);
  }

  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  // ── OTP specific ──────────────────────────────────────────────────────────

  async setOtp(phone: string, hashedOtp: string, ttlSeconds: number): Promise<void> {
    await this.set(`otp:${phone}`, hashedOtp, ttlSeconds);
  }

  async getOtp(phone: string): Promise<string | null> {
    return this.get(`otp:${phone}`);
  }

  async deleteOtp(phone: string): Promise<void> {
    await this.del(`otp:${phone}`);
    await this.del(`otp:attempts:${phone}`);
  }

  async incrementOtpAttempts(phone: string, ttlSeconds: number): Promise<number> {
    const key = `otp:attempts:${phone}`;
    const count = await this.incr(key);
    if (count === 1) {
      await this.expire(key, ttlSeconds);
    }
    return count;
  }

  async getOtpAttempts(phone: string): Promise<number> {
    const val = await this.get(`otp:attempts:${phone}`);
    return val ? parseInt(val, 10) : 0;
  }

  // ── Session / User cache ──────────────────────────────────────────────────

  async cacheUser(userId: string, userData: object, ttlSeconds = 3600): Promise<void> {
    await this.setJSON(`user:${userId}`, userData, ttlSeconds);
  }

  async getCachedUser<T>(userId: string): Promise<T | null> {
    return this.getJSON<T>(`user:${userId}`);
  }

  async invalidateUser(userId: string): Promise<void> {
    await this.del(`user:${userId}`);
  }

  // ── Rate limiting ─────────────────────────────────────────────────────────

  async checkRateLimit(key: string, maxRequests: number, windowSeconds: number): Promise<boolean> {
    const fullKey = `ratelimit:${key}`;
    const count = await this.incr(fullKey);
    if (count === 1) {
      await this.expire(fullKey, windowSeconds);
    }
    return count <= maxRequests;
  }
}
