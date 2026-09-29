import { Module } from '@nestjs/common';
import { KitchenSubscriptionsController } from './kitchen-subscriptions.controller';
import { KitchenSubscriptionsService } from './kitchen-subscriptions.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { CustomerWalletModule } from '../../../customer/wallet/wallet.module';
import { ReferralModule } from '../../../platform/referral/referral.module';
import { AddressesModule } from '../../../customer/addresses/addresses.module';

@Module({
  imports: [NotificationsModule, CustomerWalletModule, ReferralModule, AddressesModule],
  controllers: [KitchenSubscriptionsController],
  providers: [KitchenSubscriptionsService],
  exports: [KitchenSubscriptionsService],
})
export class KitchenSubscriptionsModule {}
