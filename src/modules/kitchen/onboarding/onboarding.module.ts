import { Module } from '@nestjs/common';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';
import { KitchenAuthModule } from '../../identity/kitchen-auth/kitchen-auth.module';

@Module({
  imports: [KitchenAuthModule],
  controllers: [OnboardingController],
  providers: [OnboardingService],
  exports: [OnboardingService],
})
export class KitchenOnboardingModule {}
