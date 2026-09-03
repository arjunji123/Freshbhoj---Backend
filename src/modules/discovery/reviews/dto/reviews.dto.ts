import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../../common/dto/pagination.dto';

export class CreateReviewDto {
  @ApiProperty({ example: 4, minimum: 1, maximum: 5 })
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'Rating must be between 1 and 5' })
  @Max(5, { message: 'Rating must be between 1 and 5' })
  rating: number;

  @ApiPropertyOptional({ description: 'Order being reviewed — makes the review "Verified"' })
  @IsOptional()
  @IsUUID()
  orderId?: string;

  @ApiPropertyOptional({ description: 'Review a specific dish rather than the kitchen overall' })
  @IsOptional()
  @IsUUID()
  mealId?: string;

  @ApiPropertyOptional({ example: 'The Paneer Butter Masala was incredibly fresh.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;

  @ApiPropertyOptional({ type: [String], description: 'Uploaded photo URLs (see /upload)' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  photos?: string[];

  @ApiPropertyOptional({ type: [String], example: ['Clean', 'Well-packed'], description: 'Quick chips' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @IsString({ each: true })
  tags?: string[];
}

export enum ReviewSortBy {
  RECENT = 'recent',
  HIGHEST = 'highest',
  LOWEST = 'lowest',
  HELPFUL = 'helpful',
}

export class ReviewQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ReviewSortBy, default: ReviewSortBy.RECENT })
  @IsOptional()
  @IsString()
  sortBy?: ReviewSortBy = ReviewSortBy.RECENT;

  @ApiPropertyOptional({ example: 5, description: 'Only reviews with this star rating' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({ description: 'Restrict to reviews of one dish' })
  @IsOptional()
  @IsUUID()
  mealId?: string;
}
