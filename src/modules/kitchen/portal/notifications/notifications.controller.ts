import { Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { KitchenAccount } from '@prisma/client';
import { NotificationsService } from './notifications.service';
import { ListNotificationsQueryDto } from './dto/notifications.dto';
import { MarkAllNotificationsReadDto, MarkNotificationReadDto, NotificationListDto } from './dto/notifications.response.dto';
import { KitchenAuthGuard } from '../../../identity/kitchen-auth/guards/kitchen-auth.guard';
import { CurrentKitchenAccount } from '../../../identity/kitchen-auth/decorators/current-kitchen.decorator';
import { ApiEnvelope, ApiEnvelopeError } from '../../../../common/decorators/api-envelope.decorator';
import { KitchenScope } from '../../../../common/decorators/kitchen-scope.decorator';

/** The partner app's in-app notification feed — see `NotificationsService`'s doc comment for scope. */
@ApiTags('Kitchen · Notifications')
@ApiBearerAuth('JWT-auth')
@UseGuards(KitchenAuthGuard)
@KitchenScope()
@Controller('partner/notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Your notifications, newest first, plus the unread count' })
  @ApiEnvelope(NotificationListDto)
  async list(@CurrentKitchenAccount() account: KitchenAccount, @Query() query: ListNotificationsQueryDto) {
    return {
      message: 'Notifications fetched',
      data: await this.notificationsService.list(account.id, query.category, query.page, query.limit),
    };
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark one notification read' })
  @ApiEnvelope(MarkNotificationReadDto)
  @ApiEnvelopeError(404, 'Notification not found')
  async markRead(@CurrentKitchenAccount() account: KitchenAccount, @Param('id', ParseUUIDPipe) id: string) {
    return { message: 'Notification marked read', data: await this.notificationsService.markRead(account.id, id) };
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark every unread notification read' })
  @ApiEnvelope(MarkAllNotificationsReadDto)
  async markAllRead(@CurrentKitchenAccount() account: KitchenAccount) {
    return { message: 'All notifications marked read', data: await this.notificationsService.markAllRead(account.id) };
  }
}
