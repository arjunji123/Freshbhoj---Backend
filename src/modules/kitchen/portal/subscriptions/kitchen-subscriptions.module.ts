import { Module } from '@nestjs/common';
import { KitchenSubscriptionsController } from './kitchen-subscriptions.controller';
import { KitchenSubscriptionsService } from './kitchen-subscriptions.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [KitchenSubscriptionsController],
  providers: [KitchenSubscriptionsService],
  exports: [KitchenSubscriptionsService],
})
export class KitchenSubscriptionsModule {}
