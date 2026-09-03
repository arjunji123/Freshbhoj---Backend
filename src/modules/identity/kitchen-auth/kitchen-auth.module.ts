import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { KitchenAuthController } from './kitchen-auth.controller';
import { KitchenAuthService } from './kitchen-auth.service';
import { KitchenJwtStrategy } from './strategies/kitchen-jwt.strategy';
import { KitchenAuthGuard } from './guards/kitchen-auth.guard';
import { SmsService } from '../customer-auth/sms.service';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.accessSecret'),
        signOptions: { expiresIn: configService.get<string>('jwt.accessExpiry', '15m') },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [KitchenAuthController],
  providers: [KitchenAuthService, KitchenJwtStrategy, KitchenAuthGuard, SmsService],
  exports: [KitchenAuthService, KitchenAuthGuard],
})
export class KitchenAuthModule {}
