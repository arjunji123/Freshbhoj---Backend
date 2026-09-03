import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
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

export class AddCartItemDto {
  @ApiProperty({ example: 'e0b1…', description: 'Meal to add' })
  @IsUUID()
  mealId: string;

  @ApiPropertyOptional({ example: 1, minimum: 1, maximum: 20, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20, { message: 'You can add at most 20 of the same item' })
  quantity?: number = 1;

  @ApiPropertyOptional({ type: [String], description: 'Chosen customisation option ids' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsUUID('4', { each: true })
  customizationIds?: string[];

  @ApiPropertyOptional({ example: 'Make it less spicy, no onions' })
  @IsOptional()
  @IsString()
  @MaxLength(250)
  specialInstructions?: string;

  @ApiPropertyOptional({
    description:
      'A cart holds meals from one kitchen only. Set true to discard the existing cart and start fresh with this meal.',
  })
  @IsOptional()
  @IsBoolean()
  replaceCart?: boolean;
}

export class UpdateCartItemDto {
  @ApiProperty({ example: 2, minimum: 0, description: 'Quantity; 0 removes the line' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(20)
  quantity: number;

  @ApiPropertyOptional({ example: 'Extra spicy please' })
  @IsOptional()
  @IsString()
  @MaxLength(250)
  specialInstructions?: string;
}

export class ApplyCouponDto {
  @ApiProperty({ example: 'FRESH150' })
  @IsString()
  @MaxLength(30)
  code: string;
}
