import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrderMessagesController } from './order-messages.controller';
import { OrderMessagesService } from './order-messages.service';
import { CartModule } from '../cart/cart.module';
import { CouponsModule } from '../../platform/coupons/coupons.module';
import { ReferralModule } from '../../platform/referral/referral.module';
import { AddressesModule } from '../addresses/addresses.module';
import { NotificationsModule } from '../../kitchen/portal/notifications/notifications.module';

@Module({
  imports: [CartModule, CouponsModule, ReferralModule, AddressesModule, NotificationsModule],
  controllers: [OrdersController, OrderMessagesController],
  providers: [OrdersService, OrderMessagesService],
  exports: [OrdersService],
})
export class OrdersModule {}
