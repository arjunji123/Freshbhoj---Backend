import { Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { CustomerNotificationsService } from './notifications.service';
import { NotificationsQueryDto } from './dto/notifications.dto';
import { MarkReadResultDto, NotificationInboxDto, UnreadCountDto } from './dto/notifications.response.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ApiEnvelope } from '../../../common/decorators/api-envelope.decorator';

@ApiTags('Customer · Notifications')
@ApiBearerAuth('JWT-auth')
@Controller('customer/notifications')
export class CustomerNotificationsController {
  constructor(private readonly notificationsService: CustomerNotificationsService) {}

  @Get()
  @ApiOperation({
    summary: 'Notification inbox — order updates, kitchen messages, wallet credits and subscription changes, newest first',
  })
  @ApiEnvelope(NotificationInboxDto)
  async list(@CurrentUser() user: User, @Query() query: NotificationsQueryDto) {
    return {
      message: 'Notifications fetched',
      data: await this.notificationsService.list(user.id, query.page, query.limit, query.category),
    };
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Unread badge count' })
  @ApiEnvelope(UnreadCountDto)
  async unreadCount(@CurrentUser() user: User) {
    return { message: 'Unread count fetched', data: await this.notificationsService.unreadCount(user.id) };
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark everything currently in the inbox as read' })
  @ApiEnvelope(MarkReadResultDto)
  async readAll(@CurrentUser() user: User) {
    return { message: 'Notifications marked read', data: await this.notificationsService.markAllRead(user.id) };
  }
}
