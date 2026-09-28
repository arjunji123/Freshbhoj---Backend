import { Module } from '@nestjs/common';
import { BhojAiController } from './bhojai.controller';
import { BhojAiAdminController } from './bhojai-admin.controller';
import { BhojAiService } from './bhojai.service';
import { BhojAiGeminiClient } from './bhojai-gemini.client';
import { FssaiAssistanceModule } from '../fssai-assistance/fssai-assistance.module';
import { KitchenOnboardingModule } from '../../onboarding/onboarding.module';
import { KitchenProfileModule } from '../profile/kitchen-profile.module';
import { KitchenDashboardModule } from '../dashboard/kitchen-dashboard.module';
import { KitchenOrdersModule } from '../orders/kitchen-orders.module';

@Module({
  imports: [FssaiAssistanceModule, KitchenOnboardingModule, KitchenProfileModule, KitchenDashboardModule, KitchenOrdersModule],
  controllers: [BhojAiController, BhojAiAdminController],
  providers: [BhojAiService, BhojAiGeminiClient],
})
export class BhojAiModule {}
