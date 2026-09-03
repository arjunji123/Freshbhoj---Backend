import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FoodType, MediaType } from '@prisma/client';

export class StoryKitchenDto {
  @ApiProperty({ example: 'd4c3b2a1-f6e5-4b7a-9c8d-1e0f3a2b5c4d' })
  id: string;

  @ApiProperty({ example: 'annapurna-kitchen' })
  slug: string;

  @ApiProperty({ example: 'Annapurna Kitchen' })
  name: string;

  @ApiPropertyOptional({ nullable: true })
  logoUrl: string | null;

  @ApiProperty({ example: true })
  isVerified: boolean;

  @ApiPropertyOptional({ nullable: true, example: 'Malviya Nagar' })
  locality: string | null;

  @ApiProperty({ example: true })
  isOpenNow: boolean;
}

export class StoryMealRefDto {
  @ApiProperty({ example: 'f1e2d3c4-b5a6-4978-8b6c-5d4e3f2a1b0c' })
  id: string;

  @ApiProperty({ example: 'Special North Indian Thali' })
  name: string;

  @ApiProperty({ example: 249 })
  price: number;

  @ApiPropertyOptional({ nullable: true })
  image: string | null;

  @ApiProperty({ enum: FoodType, example: FoodType.VEG })
  foodType: FoodType;
}

export class StoryItemDto {
  @ApiProperty({ example: '4e5f6a7b-8c9d-4e0f-8a1b-2c3d4e5f6a7b' })
  id: string;

  @ApiProperty({ enum: MediaType, example: MediaType.VIDEO })
  mediaType: MediaType;

  @ApiProperty({ example: 'https://cdn.freshbhoj.com/stories/annapurna-morning.mp4' })
  mediaUrl: string;

  @ApiPropertyOptional({ nullable: true })
  thumbnailUrl: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'Today’s dal, on the stove since 6am' })
  caption: string | null;

  @ApiProperty({ example: 15 })
  durationSec: number;

  @ApiProperty({ example: 312, description: 'Unique viewers, not replays' })
  viewCount: number;

  @ApiProperty({ example: '2026-09-03T04:30:00.000Z' })
  publishedAt: string;

  @ApiProperty({ example: '2026-09-04T04:30:00.000Z', description: 'Stories live 24 hours' })
  expiresAt: string;

  @ApiProperty({ example: false, description: 'Personalised; always false when signed out' })
  isSeen: boolean;

  @ApiPropertyOptional({ type: StoryMealRefDto, nullable: true, description: 'Shoppable link' })
  meal: StoryMealRefDto | null;
}

export class KitchenStoryGroupDto {
  @ApiProperty({ type: StoryKitchenDto })
  kitchen: StoryKitchenDto;

  @ApiProperty({ type: [StoryItemDto], description: 'In publish order' })
  items: StoryItemDto[];

  @ApiProperty({ example: 3 })
  storyCount: number;

  @ApiProperty({ example: true, description: 'Drives the filled ring on the avatar' })
  hasUnseen: boolean;

  @ApiPropertyOptional({ nullable: true, description: 'Thumbnail for the rail card' })
  coverImage: string | null;
}

export class StorySeenDto {
  @ApiProperty({ example: '4e5f6a7b-8c9d-4e0f-8a1b-2c3d4e5f6a7b' })
  storyId: string;

  @ApiProperty({ example: true })
  isSeen: boolean;

  @ApiProperty({ example: true, description: 'False when this viewer had already been counted' })
  recorded: boolean;
}
