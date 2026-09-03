import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../../common/dto/pagination.dto';

export enum ReelFeedType {
  /** Ranked mix — the default "For You" feed. */
  FOR_YOU = 'for_you',
  /** Only kitchens the user follows. */
  FOLLOWING = 'following',
  /** Highest engagement in the last week. */
  TRENDING = 'trending',
}

export class ReelFeedQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ReelFeedType, default: ReelFeedType.FOR_YOU })
  @IsOptional()
  @IsEnum(ReelFeedType)
  feed?: ReelFeedType = ReelFeedType.FOR_YOU;

  @ApiPropertyOptional({ description: 'Restrict the feed to one kitchen' })
  @IsOptional()
  @IsUUID()
  kitchenId?: string;

  @ApiPropertyOptional({ example: 'tandoori', description: 'Search captions and hashtags' })
  @IsOptional()
  @IsString()
  q?: string;
}
