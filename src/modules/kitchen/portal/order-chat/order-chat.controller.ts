import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { KitchenAccount } from '@prisma/client';
import { KitchenOrderChatService } from './order-chat.service';
import { SendKitchenOrderMessageDto } from './dto/order-chat.dto';
import { OrderMessageDto } from './dto/order-chat.response.dto';
import { KitchenAuthGuard } from '../../../identity/kitchen-auth/guards/kitchen-auth.guard';
import { CurrentKitchenAccount } from '../../../identity/kitchen-auth/decorators/current-kitchen.decorator';
import { Public } from '../../../../common/decorators/public.decorator';
import { AdminSecretGuard } from '../../../../common/guards/admin-secret.guard';
import { ApiEnvelope, ApiEnvelopeArray, ApiEnvelopeError } from '../../../../common/decorators/api-envelope.decorator';
import { KitchenScope } from '../../../../common/decorators/kitchen-scope.decorator';

@ApiTags('Kitchen · Order Chat')
@ApiBearerAuth('JWT-auth')
@UseGuards(KitchenAuthGuard)
@KitchenScope()
@Controller('partner/orders')
export class KitchenOrderChatController {
  constructor(private readonly kitchenOrderChatService: KitchenOrderChatService) {}

  @Get(':id/messages')
  @ApiOperation({ summary: 'Message thread for an order — opening it marks unread customer messages read' })
  @ApiEnvelopeArray(OrderMessageDto)
  @ApiEnvelopeError(403, 'This order does not belong to your kitchen')
  @ApiEnvelopeError(404, 'Order not found')
  async list(@CurrentKitchenAccount() account: KitchenAccount, @Param('id', ParseUUIDPipe) id: string) {
    return { message: 'Messages fetched', data: await this.kitchenOrderChatService.list(account.id, id) };
  }

  @Post(':id/messages')
  @ApiOperation({
    summary: 'Send a message, optionally alongside a status transition',
    description: 'advanceToStatus is validated the same way as POST /partner/orders/:id/status — an illegal transition rejects the whole message.',
  })
  @ApiEnvelope(OrderMessageDto, { status: 201, description: 'Message sent' })
  @ApiEnvelopeError(400, 'A kitchen cannot set that status, or the order is not awaiting payment')
  @ApiEnvelopeError(403, 'This order does not belong to your kitchen')
  async send(@CurrentKitchenAccount() account: KitchenAccount, @Param('id', ParseUUIDPipe) id: string, @Body() dto: SendKitchenOrderMessageDto) {
    return { message: 'Message sent', data: await this.kitchenOrderChatService.send(account.id, id, dto) };
  }
}

/** V0 ops tool — same shared-secret gate as the other admin controllers. Read-only, for dispute lookup. */
@ApiTags('Kitchen · Order Chat Admin (V0 ops tool)')
@ApiHeader({ name: 'x-admin-secret', required: true })
@Public()
@UseGuards(AdminSecretGuard)
@Controller('admin/orders')
export class OrderChatAdminController {
  constructor(private readonly kitchenOrderChatService: KitchenOrderChatService) {}

  @Get(':id/messages')
  @ApiOperation({ summary: 'Read a message thread — no mark-read side effect' })
  @ApiEnvelopeArray(OrderMessageDto)
  async list(@Param('id', ParseUUIDPipe) id: string) {
    return { message: 'Messages fetched', data: await this.kitchenOrderChatService.adminList(id) };
  }
}
