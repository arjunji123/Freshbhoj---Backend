import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { OrderMessagesService } from './order-messages.service';
import { SendOrderMessageDto } from './dto/order-messages.dto';
import { OrderMessageDto } from '../../kitchen/portal/order-chat/dto/order-chat.response.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ApiEnvelope, ApiEnvelopeArray, ApiEnvelopeError } from '../../../common/decorators/api-envelope.decorator';

@ApiTags('Customer · Order Messages')
@ApiBearerAuth('JWT-auth')
@Controller('customer/orders')
export class OrderMessagesController {
  constructor(private readonly orderMessagesService: OrderMessagesService) {}

  @Get(':id/messages')
  @ApiOperation({ summary: 'Message thread for an order — opening it marks unread kitchen messages read' })
  @ApiEnvelopeArray(OrderMessageDto)
  @ApiEnvelopeError(403, 'This order does not belong to you')
  @ApiEnvelopeError(404, 'Order not found')
  async list(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return { message: 'Messages fetched', data: await this.orderMessagesService.list(user.id, id) };
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Send a message to the kitchen preparing this order' })
  @ApiEnvelope(OrderMessageDto, { status: 201, description: 'Message sent' })
  @ApiEnvelopeError(403, 'This order does not belong to you')
  async send(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string, @Body() dto: SendOrderMessageDto) {
    return { message: 'Message sent', data: await this.orderMessagesService.send(user.id, id, dto) };
  }

  @Post(':id/messages/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark the kitchen side of this thread as read' })
  async markRead(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return { message: 'Messages marked read', data: await this.orderMessagesService.markRead(user.id, id) };
  }
}
