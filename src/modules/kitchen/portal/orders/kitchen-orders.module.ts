import { Module } from '@nestjs/common';
import { KitchenOrdersController } from './kitchen-orders.controller';
import { KitchenOrdersService } from './kitchen-orders.service';
import { OrdersModule } from '../../../customer/orders/orders.module';

@Module({
  imports: [OrdersModule],
  controllers: [KitchenOrdersController],
  providers: [KitchenOrdersService],
  exports: [KitchenOrdersService],
})
export class KitchenOrdersModule {}
