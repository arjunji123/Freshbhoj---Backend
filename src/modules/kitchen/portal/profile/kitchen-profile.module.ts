import { Module } from '@nestjs/common';
import { KitchenProfileController } from './kitchen-profile.controller';
import { KitchenProfileService } from './kitchen-profile.service';

@Module({
  controllers: [KitchenProfileController],
  providers: [KitchenProfileService],
  exports: [KitchenProfileService],
})
export class KitchenProfileModule {}
