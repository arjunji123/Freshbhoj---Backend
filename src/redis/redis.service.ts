import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);

  // ──────────────────────────────────────────────────────────────────────────
  // MOCKED REDIS (DISABLED FOR NOW)
  // ──────────────────────────────────────────────────────────────────────────

  async get(key: string): Promise<string | null> { return null; }
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {}
  async setJSON<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {}
  async getJSON<T>(key: string): Promise<T | null> { return null; }
  async del(key: string): Promise<void> {}
  async exists(key: string): Promise<boolean> { return false; }
  async incr(key: string): Promise<number> { return 1; }
  async expire(key: string, ttlSeconds: number): Promise<void> {}
  async ttl(key: string): Promise<number> { return 0; }

  async setOtp(phone: string, hashedOtp: string, ttlSeconds: number): Promise<void> {}
  async getOtp(phone: string): Promise<string | null> { return null; }
  async deleteOtp(phone: string): Promise<void> {}
  async incrementOtpAttempts(phone: string, ttlSeconds: number): Promise<number> { return 1; }
  async getOtpAttempts(phone: string): Promise<number> { return 0; }

  async cacheUser(userId: string, userData: object, ttlSeconds = 3600): Promise<void> {}
  async getCachedUser<T>(userId: string): Promise<T | null> { return null; }
  async invalidateUser(userId: string): Promise<void> {}

  async checkRateLimit(key: string, maxRequests: number, windowSeconds: number): Promise<boolean> { return true; }
}
