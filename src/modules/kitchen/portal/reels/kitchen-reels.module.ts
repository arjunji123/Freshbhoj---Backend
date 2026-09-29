import { Module } from '@nestjs/common';
import { KitchenReelsController } from './kitchen-reels.controller';
import { KitchenReelsAdminController } from './kitchen-reels-admin.controller';
import { KitchenReelsService } from './kitchen-reels.service';
import { PremiumModule } from '../premium/premium.module';

@Module({
  imports: [PremiumModule],
  controllers: [KitchenReelsController, KitchenReelsAdminController],
  providers: [KitchenReelsService],
  exports: [KitchenReelsService],
})
export class KitchenReelsModule {}
