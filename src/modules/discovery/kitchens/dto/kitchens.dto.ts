import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../../common/dto/pagination.dto';

export enum KitchenSortBy {
  RECOMMENDED = 'recommended',
  RATING = 'rating',
  NEWEST = 'newest',
  POPULAR = 'popular',
}

export class KitchenQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Search by kitchen name or tagline' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ example: 'Jaipur' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'Malviya Nagar' })
  @IsOptional()
  @IsString()
  locality?: string;

  @ApiPropertyOptional({ description: 'Only curated / verified kitchens' })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  verifiedOnly?: boolean;

  @ApiPropertyOptional({ description: 'Hide kitchens that are closed right now' })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  openOnly?: boolean;

  @ApiPropertyOptional({ enum: KitchenSortBy, default: KitchenSortBy.RECOMMENDED })
  @IsOptional()
  @IsEnum(KitchenSortBy)
  sortBy?: KitchenSortBy = KitchenSortBy.RECOMMENDED;
}
