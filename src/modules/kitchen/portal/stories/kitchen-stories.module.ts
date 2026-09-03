import { Module } from '@nestjs/common';
import { KitchenStoriesController } from './kitchen-stories.controller';
import { KitchenStoriesService } from './kitchen-stories.service';

@Module({
  controllers: [KitchenStoriesController],
  providers: [KitchenStoriesService],
  exports: [KitchenStoriesService],
})
export class KitchenStoriesModule {}
