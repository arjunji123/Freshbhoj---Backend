import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateNotificationPreferencesDto {
  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  orderUpdates?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  promotions?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  newKitchens?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  reelActivity?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  whatsappUpdates?: boolean;
}

export class FaqQueryDto {
  @ApiPropertyOptional({ example: 'ORDERS' })
  @IsOptional()
  @IsString()
  category?: string;
}
