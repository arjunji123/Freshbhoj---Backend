import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { PublishStoryDto } from './dto/kitchen-stories.dto';

const STORY_LIFETIME_HOURS = 24;

/**
 * Story publishing for the partner app.
 *
 * `KitchenStory.city` is written from the kitchen's own city at publish time
 * so the customer-facing city feed (`Discovery · Stories`) stays a single
 * indexed read — see that module's note for why.
 */
@Injectable()
export class KitchenStoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(accountId: string) {
    const kitchen = await this.requireKitchen(accountId);
    const stories = await this.prisma.kitchenStory.findMany({
      where: { kitchenId: kitchen.id },
      orderBy: { createdAt: 'desc' },
    });
    return stories.map((story) => this.toDto(story));
  }

  async publish(accountId: string, dto: PublishStoryDto) {
    const kitchen = await this.requireKitchen(accountId);

    if (dto.mealId) {
      const meal = await this.prisma.meal.findUnique({
        where: { id: dto.mealId },
        select: { kitchenId: true },
      });
      if (!meal || meal.kitchenId !== kitchen.id) {
        throw new BadRequestException('That dish does not belong to your kitchen');
      }
    }

    const story = await this.prisma.kitchenStory.create({
      data: {
        kitchenId: kitchen.id,
        mediaType: dto.mediaType,
        mediaUrl: dto.mediaUrl,
        thumbnailUrl: dto.thumbnailUrl,
        caption: dto.caption,
        mealId: dto.mealId,
        durationSec: dto.durationSec ?? 15,
        city: kitchen.city,
        expiresAt: new Date(Date.now() + STORY_LIFETIME_HOURS * 60 * 60 * 1000),
      },
    });

    return this.toDto(story);
  }

  /** Pull a story down early — the dish sold out, or it was posted by mistake. */
  async deactivate(accountId: string, storyId: string) {
    const kitchen = await this.requireKitchen(accountId);
    const story = await this.prisma.kitchenStory.findUnique({
      where: { id: storyId },
      select: { kitchenId: true },
    });
    if (!story) throw new NotFoundException('Story not found');
    if (story.kitchenId !== kitchen.id) {
      throw new ForbiddenException('This story does not belong to your kitchen');
    }

    await this.prisma.kitchenStory.update({ where: { id: storyId }, data: { isActive: false } });
    return { id: storyId };
  }

  private async requireKitchen(accountId: string) {
    const kitchen = await this.prisma.kitchen.findUnique({
      where: { accountId },
      select: { id: true, city: true },
    });
    if (!kitchen) throw new BadRequestException('Complete onboarding to create your kitchen first');
    return kitchen;
  }

  private toDto(story: {
    id: string;
    mediaType: any;
    mediaUrl: string;
    thumbnailUrl: string | null;
    caption: string | null;
    durationSec: number;
    viewCount: number;
    isActive: boolean;
    createdAt: Date;
    expiresAt: Date;
  }) {
    return {
      id: story.id,
      mediaType: story.mediaType,
      mediaUrl: story.mediaUrl,
      thumbnailUrl: story.thumbnailUrl,
      caption: story.caption,
      durationSec: story.durationSec,
      viewCount: story.viewCount,
      isActive: story.isActive,
      createdAt: story.createdAt,
      expiresAt: story.expiresAt,
    };
  }
}
