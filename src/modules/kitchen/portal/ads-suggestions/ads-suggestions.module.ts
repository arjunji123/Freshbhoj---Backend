import { Module } from '@nestjs/common';
import { AdsSuggestionsController } from './ads-suggestions.controller';
import { AdsSuggestionsService } from './ads-suggestions.service';
import { AdsSuggestionAiClient } from './ads-suggestion-ai.client';
import { KitchenAdsModule } from '../ads/kitchen-ads.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [KitchenAdsModule, NotificationsModule],
  controllers: [AdsSuggestionsController],
  providers: [AdsSuggestionsService, AdsSuggestionAiClient],
})
export class AdsSuggestionsModule {}
