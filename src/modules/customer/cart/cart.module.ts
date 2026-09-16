import { Module } from '@nestjs/common';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { CouponsModule } from '../../platform/coupons/coupons.module';
import { ReferralModule } from '../../platform/referral/referral.module';

@Module({
  imports: [CouponsModule, ReferralModule],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
