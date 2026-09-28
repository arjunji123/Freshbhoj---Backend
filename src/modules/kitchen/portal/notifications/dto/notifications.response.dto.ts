import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationCategory } from '@prisma/client';
import { PageMetaDto } from '../../../../../common/dto/api-response.dto';

export class NotificationDto {
  @ApiProperty({ example: 'c9d0e1f2-3a4b-4c5d-8e6f-7a8b9c0d1e2f' })
  id: string;

  @ApiProperty({ enum: NotificationCategory, example: NotificationCategory.ORDER })
  category: NotificationCategory;

  @ApiProperty({ example: 'New order received' })
  title: string;

  @ApiProperty({ example: 'Order #FB-92834 — ₹349. Tap to accept.' })
  body: string;

  @ApiPropertyOptional({
    nullable: true,
    example: { orderId: 'c9d0e1f2-3a4b-4c5d-8e6f-7a8b9c0d1e2f', action: 'ACCEPT_ORDER' },
    description: 'Drives inline quick-actions on the notification card',
  })
  data: Record<string, unknown> | null;

  @ApiProperty({ example: false })
  isRead: boolean;

  @ApiProperty()
  createdAt: Date;
}

export class NotificationListDto {
  @ApiProperty({ type: [NotificationDto] })
  items: NotificationDto[];

  @ApiProperty({ type: PageMetaDto })
  meta: PageMetaDto;

  @ApiProperty({ example: 4, description: 'Unread count across ALL categories, not just the filtered page' })
  unreadCount: number;
}

export class MarkNotificationReadDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ example: true })
  isRead: boolean;
}

export class MarkAllNotificationsReadDto {
  @ApiProperty({ example: 4, description: 'How many were flipped from unread to read' })
  updatedCount: number;
}
