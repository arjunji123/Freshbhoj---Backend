import { Module } from '@nestjs/common';
import { KitchenReelsController } from './kitchen-reels.controller';
import { KitchenReelsService } from './kitchen-reels.service';

@Module({
  controllers: [KitchenReelsController],
  providers: [KitchenReelsService],
  exports: [KitchenReelsService],
})
export class KitchenReelsModule {}
