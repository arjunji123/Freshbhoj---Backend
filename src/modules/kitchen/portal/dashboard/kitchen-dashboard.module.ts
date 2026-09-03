import { Module } from '@nestjs/common';
import { KitchenDashboardController } from './kitchen-dashboard.controller';
import { KitchenDashboardService } from './kitchen-dashboard.service';

@Module({
  controllers: [KitchenDashboardController],
  providers: [KitchenDashboardService],
})
export class KitchenDashboardModule {}
