import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../../common/dto/pagination.dto';

export const NOTIFICATION_CATEGORIES = ['ORDER', 'SUBSCRIPTION', 'WALLET'] as const;
export type CustomerNotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export class NotificationsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: NOTIFICATION_CATEGORIES, description: 'Only this kind of notification' })
  @IsOptional()
  @IsIn(NOTIFICATION_CATEGORIES)
  category?: CustomerNotificationCategory;
}
