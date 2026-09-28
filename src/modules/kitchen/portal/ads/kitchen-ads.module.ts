import { Module } from '@nestjs/common';
import { KitchenAdsController } from './kitchen-ads.controller';
import { KitchenAdsService } from './kitchen-ads.service';

@Module({
  controllers: [KitchenAdsController],
  providers: [KitchenAdsService],
  exports: [KitchenAdsService],
})
export class KitchenAdsModule {}
