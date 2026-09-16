import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MediaType } from '@prisma/client';

export class KitchenStoryDto {
  @ApiProperty({ example: '4e5f6a7b-8c9d-4e0f-8a1b-2c3d4e5f6a7b' })
  id: string;

  @ApiProperty({ enum: MediaType, example: MediaType.VIDEO })
  mediaType: MediaType;

  @ApiProperty({ example: 'https://cdn.freshbhoj.com/stories/annapurna-morning.mp4' })
  mediaUrl: string;

  @ApiPropertyOptional({ nullable: true })
  thumbnailUrl: string | null;

  @ApiPropertyOptional({ nullable: true })
  caption: string | null;

  @ApiProperty({ example: 15 })
  durationSec: number;

  @ApiProperty({ example: 312 })
  viewCount: number;

  @ApiProperty({ example: 24 })
  likeCount: number;

  @ApiProperty({ example: 6 })
  shareCount: number;

  @ApiProperty({ example: 3, description: 'Orders placed after tapping through this story\'s linked dish' })
  orderCount: number;

  @ApiPropertyOptional({ nullable: true, example: 'Special North Indian Thali' })
  mealName: string | null;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: '2026-09-03T04:30:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-09-04T04:30:00.000Z', description: 'Stories live 24 hours after publishing' })
  expiresAt: string;
}

export class DeletedStoryDto {
  @ApiProperty({ example: '4e5f6a7b-8c9d-4e0f-8a1b-2c3d4e5f6a7b' })
  id: string;
}
