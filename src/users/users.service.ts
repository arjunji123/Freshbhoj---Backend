import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CompleteProfileDto, UpdateLocationDto, UpdateFcmTokenDto } from './dto/user.dto';
import { User, UserStatus } from '@prisma/client';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // ──────────────────────────────────────────────────────────────────────────
  // GET PROFILE
  // ──────────────────────────────────────────────────────────────────────────

  async findById(id: string): Promise<User> {
    // Check cache
    const cached = await this.redis.getCachedUser<User>(id);
    if (cached) return cached;

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    // Refresh cache
    await this.redis.cacheUser(id, user);
    return user;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // COMPLETE PROFILE (name, email, profile photo - called after OTP login for new users)
  // ──────────────────────────────────────────────────────────────────────────

  async completeProfile(
    userId: string,
    dto: CompleteProfileDto,
    profileImageUrl?: string,
  ): Promise<User> {
    // Check email uniqueness if provided
    if (dto.email) {
      const existingEmail = await this.prisma.user.findFirst({
        where: { email: dto.email, id: { not: userId } },
      });
      if (existingEmail) {
        throw new ConflictException('This email is already registered with another account');
      }
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        fullName: dto.fullName,
        ...(dto.email && { email: dto.email }),
        ...(profileImageUrl && { profileImage: profileImageUrl }),
        status: UserStatus.ACTIVE, // Mark as fully onboarded
      },
    });

    // Invalidate cache so fresh data is returned
    await this.redis.invalidateUser(userId);
    await this.redis.cacheUser(userId, user);

    this.logger.log(`User ${userId} completed profile setup`);
    return user;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // UPDATE LOCATION
  // ──────────────────────────────────────────────────────────────────────────

  async updateLocation(userId: string, dto: UpdateLocationDto): Promise<User> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        latitude: dto.latitude,
        longitude: dto.longitude,
        ...(dto.address && { address: dto.address }),
        ...(dto.city && { city: dto.city }),
        ...(dto.state && { state: dto.state }),
        ...(dto.pincode && { pincode: dto.pincode }),
      },
    });

    await this.redis.invalidateUser(userId);
    await this.redis.cacheUser(userId, user);

    return user;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // UPDATE PROFILE IMAGE
  // ──────────────────────────────────────────────────────────────────────────

  async updateProfileImage(userId: string, imageUrl: string): Promise<User> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { profileImage: imageUrl },
    });

    await this.redis.invalidateUser(userId);
    await this.redis.cacheUser(userId, user);

    return user;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // UPDATE FCM TOKEN (Push Notifications)
  // ──────────────────────────────────────────────────────────────────────────

  async updateFcmToken(userId: string, dto: UpdateFcmTokenDto): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { fcmToken: dto.fcmToken },
    });
    await this.redis.invalidateUser(userId);
    this.logger.log(`FCM token updated for user ${userId}`);
  }
}
