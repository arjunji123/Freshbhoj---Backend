import { Module } from '@nestjs/common';
import { KitchenMenuController } from './kitchen-menu.controller';
import { KitchenMenuService } from './kitchen-menu.service';
import { KitchenOnboardingModule } from '../../onboarding/onboarding.module';

@Module({
  imports: [KitchenOnboardingModule],
  controllers: [KitchenMenuController],
  providers: [KitchenMenuService],
  exports: [KitchenMenuService],
})
export class KitchenMenuModule {}
