import { Module } from '@nestjs/common';
import { KitchenAdminController } from './kitchen-admin.controller';
import { KitchenAdminService } from './kitchen-admin.service';
import { KitchenOnboardingModule } from '../onboarding/onboarding.module';

@Module({
  imports: [KitchenOnboardingModule],
  controllers: [KitchenAdminController],
  providers: [KitchenAdminService],
})
export class KitchenAdminModule {}
