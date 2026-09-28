import { Module } from '@nestjs/common';
import { KitchenOrderChatController, OrderChatAdminController } from './order-chat.controller';
import { KitchenOrderChatService } from './order-chat.service';
import { KitchenOrdersModule } from '../orders/kitchen-orders.module';

@Module({
  imports: [KitchenOrdersModule],
  controllers: [KitchenOrderChatController, OrderChatAdminController],
  providers: [KitchenOrderChatService],
  exports: [KitchenOrderChatService],
})
export class OrderChatModule {}
