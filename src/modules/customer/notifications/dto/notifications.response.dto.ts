import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PageMetaDto } from '../../../../common/dto/api-response.dto';
import { NOTIFICATION_CATEGORIES } from './notifications.dto';

export class CustomerNotificationDto {
  @ApiProperty({ description: 'Stable id, prefixed with its source (e.g. `order-event:<uuid>`)' }) id: string;
  @ApiProperty({ enum: NOTIFICATION_CATEGORIES }) category: string;
  @ApiProperty() title: string;
  @ApiProperty() body: string;
  @ApiPropertyOptional({
    description: 'Deep-link hints: `{ orderId }`, `{ subscriptionId }` or `{ walletTransactionId }`',
    type: 'object',
    additionalProperties: true,
    nullable: true,
  })
  data: Record<string, string> | null;
  @ApiProperty() isRead: boolean;
  @ApiProperty() createdAt: Date;
}

export class NotificationInboxDto {
  @ApiProperty({ type: [CustomerNotificationDto] }) items: CustomerNotificationDto[];
  @ApiProperty({ type: PageMetaDto }) meta: PageMetaDto;
  @ApiProperty({ description: 'Unread across every category, regardless of the filter' }) unreadCount: number;
}

export class UnreadCountDto {
  @ApiProperty() unreadCount: number;
}

export class MarkReadResultDto {
  @ApiProperty() readAt: Date;
}
