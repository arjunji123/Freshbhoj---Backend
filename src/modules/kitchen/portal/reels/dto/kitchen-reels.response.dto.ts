import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReelStatus } from '@prisma/client';

export class KitchenReelDto {
  @ApiProperty({ example: '4e5f6a7b-8c9d-4e0f-8a1b-2c3d4e5f6a7b' })
  id: string;

  @ApiProperty({ example: 'https://storage.googleapis.com/freshbhoj-media/kitchens/.../reel-video/abc.mp4' })
  videoUrl: string;

  @ApiPropertyOptional({ nullable: true })
  thumbnailUrl: string | null;

  @ApiPropertyOptional({ nullable: true })
  caption: string | null;

  @ApiProperty({ type: [String], example: ['butterchicken', 'streetfood'] })
  hashtags: string[];

  @ApiProperty({ example: 20 })
  durationSec: number;

  @ApiProperty({ enum: ReelStatus, example: ReelStatus.PUBLISHED })
  status: ReelStatus;

  @ApiProperty({ example: 1204 })
  viewCount: number;

  @ApiProperty({ example: 96 })
  likeCount: number;

  @ApiProperty({ example: 14 })
  shareCount: number;

  @ApiProperty({ example: 3 })
  commentCount: number;

  @ApiPropertyOptional({ nullable: true, example: 'Butter Chicken Bowl' })
  mealName: string | null;

  @ApiProperty({ example: '2026-09-03T04:30:00.000Z' })
  publishedAt: string;

  @ApiProperty({ example: '2026-09-03T04:30:00.000Z' })
  createdAt: string;
}

export class DeletedReelDto {
  @ApiProperty({ example: '4e5f6a7b-8c9d-4e0f-8a1b-2c3d4e5f6a7b' })
  id: string;
}
