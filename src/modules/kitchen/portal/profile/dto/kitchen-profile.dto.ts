import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/** Partial update of the kitchen's own profile — every field optional. */
export class UpdateKitchenProfileDto {
  @ApiPropertyOptional({ example: 'Annapurna Kitchen' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(80)
  name?: string;

  @ApiPropertyOptional({ example: 'Authentic Homemade North Indian' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  tagline?: string;

  @ApiPropertyOptional({ example: 'A family-run kitchen serving slow-cooked thalis.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coverImage?: string;

  @ApiPropertyOptional({ example: '+919876500011' })
  @IsOptional()
  @Matches(/^\+91[6-9]\d{9}$/, { message: 'Enter a valid Indian number with +91' })
  contactPhone?: string;

  @ApiPropertyOptional({ example: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(180)
  prepTimeMins?: number;

  @ApiPropertyOptional({ example: '08:00', description: 'HH:mm, IST' })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'Use HH:mm, e.g. 08:00' })
  opensAt?: string;

  @ApiPropertyOptional({ example: '22:30' })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'Use HH:mm, e.g. 22:30' })
  closesAt?: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Cuisine slugs this kitchen cooks — drives which Home rails it appears in',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cuisineSlugs?: string[];
}

/**
 * The one toggle a partner needs several times a day: "we are swamped, pause
 * new orders" without touching opening hours or going through support.
 */
export class SetAcceptingOrdersDto {
  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  isAcceptingOrders: boolean;
}
