import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { UploadModule } from './upload/upload.module';
import { WebWaitlistModule } from './web-waitlist/web-waitlist.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import appConfig from './config/app.config';
import jwtConfig from './config/jwt.config';
import redisConfig from './config/redis.config';
import awsConfig from './config/aws.config';
import twilioConfig from './config/twilio.config';

@Module({
  imports: [
    // ── Config ──────────────────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [appConfig, jwtConfig, redisConfig, awsConfig, twilioConfig],
    }),

    // ── Infrastructure ───────────────────────────────────────────────────────
    PrismaModule,
    RedisModule,

    // ── Feature Modules ───────────────────────────────────────────────────────
    AuthModule,
    UsersModule,
    UploadModule,
    WebWaitlistModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // ── Global JWT Guard: protects all routes by default ─────────────────────
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
