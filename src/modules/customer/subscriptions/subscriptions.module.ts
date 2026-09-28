import { Module } from '@nestjs/common';
import { SubscriptionsController } from './subscriptions.controller';
import { KitchenSubscriptionsModule } from '../../kitchen/portal/subscriptions/kitchen-subscriptions.module';

@Module({
  imports: [KitchenSubscriptionsModule],
  controllers: [SubscriptionsController],
})
export class SubscriptionsModule {}
