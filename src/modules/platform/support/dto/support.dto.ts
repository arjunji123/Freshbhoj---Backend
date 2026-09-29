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

  @ApiPropertyOptional({ default: true, description: 'Get notified before your next subscription cycle begins' })
  @IsOptional()
  @IsBoolean()
  subscriptionReminders?: boolean;

  @ApiPropertyOptional({ default: true, description: 'Personalized meal suggestions based on your taste profile' })
  @IsOptional()
  @IsBoolean()
  dailyAiRecommendations?: boolean;
}

export class FaqQueryDto {
  @ApiPropertyOptional({ example: 'ORDERS' })
  @IsOptional()
  @IsString()
  category?: string;
}
