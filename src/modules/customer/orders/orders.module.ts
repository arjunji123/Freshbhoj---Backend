import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { CartModule } from '../cart/cart.module';
import { CouponsModule } from '../../platform/coupons/coupons.module';
import { ReferralModule } from '../../platform/referral/referral.module';
import { AddressesModule } from '../addresses/addresses.module';

@Module({
  imports: [CartModule, CouponsModule, ReferralModule, AddressesModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
