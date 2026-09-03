import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReviewAuthorDto {
  @ApiProperty({ example: '0b1c2d3e-4f5a-4b6c-8d7e-9f0a1b2c3d4e' })
  id: string;

  @ApiProperty({ example: 'Arjun Mehta' })
  name: string;

  @ApiPropertyOptional({ nullable: true })
  avatar: string | null;

  @ApiProperty({ example: 'AM', description: 'Monogram fallback when there is no photo' })
  initials: string;
}

export class ReviewMealRefDto {
  @ApiProperty({ example: 'f1e2d3c4-b5a6-4978-8b6c-5d4e3f2a1b0c' })
  id: string;

  @ApiProperty({ example: 'Paneer Butter Masala' })
  name: string;
}

export class ReviewDto {
  @ApiProperty({ example: '9e0f1a2b-3c4d-4e5f-8a6b-7c8d9e0f1a2b' })
  id: string;

  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  rating: number;

  @ApiPropertyOptional({ nullable: true, example: 'The Paneer Butter Masala was incredibly fresh.' })
  comment: string | null;

  @ApiProperty({ type: [String] })
  photos: string[];

  @ApiProperty({ type: [String], example: ['Clean', 'Well-packed'] })
  tags: string[];

  @ApiProperty({ example: true, description: 'Set when the review is tied to a delivered order' })
  isVerified: boolean;

  @ApiProperty({ example: 24 })
  likeCount: number;

  @ApiProperty({ example: '2026-09-01T10:14:00.000Z' })
  createdAt: string;

  @ApiPropertyOptional({ type: ReviewMealRefDto, nullable: true })
  meal: ReviewMealRefDto | null;

  @ApiProperty({ type: ReviewAuthorDto })
  author: ReviewAuthorDto;
}

export class RatingBucketDto {
  @ApiProperty({ example: 5 })
  star: number;

  @ApiProperty({ example: 1019 })
  count: number;

  @ApiProperty({ example: 82 })
  percent: number;
}

export class ReviewSummaryDto {
  @ApiProperty({ example: 4.8 })
  average: number;

  @ApiProperty({ example: 1243 })
  total: number;

  @ApiProperty({ type: [RatingBucketDto], description: '5 → 1, for the histogram bars' })
  distribution: RatingBucketDto[];
}

export class PendingReviewKitchenDto {
  @ApiProperty({ example: 'd4c3b2a1-f6e5-4b7a-9c8d-1e0f3a2b5c4d' })
  id: string;

  @ApiProperty({ example: 'Annapurna Kitchen' })
  name: string;

  @ApiPropertyOptional({ nullable: true })
  logoUrl: string | null;
}

export class PendingReviewItemDto {
  @ApiProperty({ example: 'Special North Indian Thali' })
  name: string;

  @ApiPropertyOptional({ nullable: true })
  imageUrl: string | null;

  @ApiPropertyOptional({ nullable: true })
  mealId: string | null;
}

export class PendingReviewDto {
  @ApiProperty({ example: '6f7a8b9c-0d1e-4f2a-8b3c-4d5e6f7a8b9c' })
  orderId: string;

  @ApiProperty({ example: 'FB-40213' })
  orderNumber: string;

  @ApiPropertyOptional({ nullable: true, example: '2026-09-02T13:15:00.000Z' })
  deliveredAt: string | null;

  @ApiProperty({ type: PendingReviewKitchenDto })
  kitchen: PendingReviewKitchenDto;

  @ApiPropertyOptional({ type: PendingReviewItemDto, nullable: true })
  highlightItem: PendingReviewItemDto | null;
}

export class ReviewHelpfulDto {
  @ApiProperty({ example: '9e0f1a2b-3c4d-4e5f-8a6b-7c8d9e0f1a2b' })
  id: string;

  @ApiProperty({ example: 25 })
  likeCount: number;
}
