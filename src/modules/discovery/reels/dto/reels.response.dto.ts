import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FoodType } from '@prisma/client';

export class ReelStatsDto {
  @ApiProperty({ example: 12400 })
  views: number;

  @ApiProperty({ example: 2180 })
  likes: number;

  @ApiProperty({ example: 310 })
  shares: number;

  @ApiProperty({ example: 0 })
  comments: number;

  @ApiProperty({ example: '12.4K', description: 'Pre-formatted for the overlay pill' })
  viewsLabel: string;

  @ApiProperty({ example: '2.2K' })
  likesLabel: string;
}

export class ReelKitchenDto {
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

  @ApiProperty({ example: 4.8 })
  rating: number;

  @ApiPropertyOptional({ nullable: true, example: 'Malviya Nagar' })
  locality: string | null;
}

export class ReelMealDto {
  @ApiProperty({ example: 'f1e2d3c4-b5a6-4978-8b6c-5d4e3f2a1b0c' })
  id: string;

  @ApiProperty({ example: 'Special North Indian Thali' })
  name: string;

  @ApiProperty({ example: 249 })
  price: number;

  @ApiPropertyOptional({ nullable: true, example: 299 })
  mrp: number | null;

  @ApiPropertyOptional({ nullable: true })
  image: string | null;

  @ApiProperty({ enum: FoodType, example: FoodType.VEG })
  foodType: FoodType;

  @ApiPropertyOptional({ nullable: true, example: 720 })
  calories: number | null;

  @ApiPropertyOptional({ nullable: true, example: 28 })
  proteinG: number | null;

  @ApiProperty({ example: true })
  isAvailable: boolean;
}

export class ReelDto {
  @ApiProperty({ example: '2c3d4e5f-6a7b-4c8d-8e9f-0a1b2c3d4e5f' })
  id: string;

  @ApiProperty({ example: 'https://cdn.freshbhoj.com/reels/annapurna-thali.mp4' })
  videoUrl: string;

  @ApiPropertyOptional({ nullable: true })
  thumbnailUrl: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'Watch how our Special Thali comes together 🔥' })
  caption: string | null;

  @ApiProperty({ type: [String], example: ['behindthescenes', 'thali', 'jaipur'] })
  hashtags: string[];

  @ApiProperty({ example: 28 })
  durationSec: number;

  @ApiProperty({ example: '2026-09-01T06:00:00.000Z' })
  publishedAt: string;

  @ApiProperty({ type: ReelStatsDto })
  stats: ReelStatsDto;

  @ApiProperty({ example: false, description: 'Personalised; always false when signed out' })
  isLiked: boolean;

  @ApiProperty({ example: false })
  isSaved: boolean;

  @ApiProperty({ type: ReelKitchenDto })
  kitchen: ReelKitchenDto;

  @ApiPropertyOptional({
    type: ReelMealDto,
    nullable: true,
    description: 'Present when the reel is shoppable — powers the in-feed Add to cart CTA',
  })
  meal: ReelMealDto | null;
}

export class ReelLikeDto {
  @ApiProperty({ example: '2c3d4e5f-6a7b-4c8d-8e9f-0a1b2c3d4e5f' })
  reelId: string;

  @ApiProperty({ example: true })
  isLiked: boolean;

  @ApiProperty({ example: 2181 })
  likeCount: number;
}

export class ReelSaveDto {
  @ApiProperty({ example: '2c3d4e5f-6a7b-4c8d-8e9f-0a1b2c3d4e5f' })
  reelId: string;

  @ApiProperty({ example: true })
  isSaved: boolean;
}

export class ReelEngagementAckDto {
  @ApiProperty({ example: '2c3d4e5f-6a7b-4c8d-8e9f-0a1b2c3d4e5f' })
  reelId: string;

  @ApiProperty({ example: true })
  recorded: boolean;
}
