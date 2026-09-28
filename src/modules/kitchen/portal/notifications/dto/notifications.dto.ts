import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationCategory } from '@prisma/client';
import { PaginationQueryDto } from '../../../../../common/dto/pagination.dto';

export class ListNotificationsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: NotificationCategory, description: 'Filter to one tab — omit for all categories' })
  @IsOptional()
  @IsEnum(NotificationCategory)
  category?: NotificationCategory;
}
