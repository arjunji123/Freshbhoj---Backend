import { Module } from '@nestjs/common';
import { HomeController } from './home.controller';
import { HomeService } from './home.service';
import { CatalogModule } from '../catalog/catalog.module';
import { OrdersModule } from '../../customer/orders/orders.module';
import { ReelsModule } from '../reels/reels.module';

@Module({
  imports: [CatalogModule, OrdersModule, ReelsModule],
  controllers: [HomeController],
  providers: [HomeService],
})
export class HomeModule {}
