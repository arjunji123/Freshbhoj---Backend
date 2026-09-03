import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { KitchenAccount } from '@prisma/client';
import { KitchenOrdersService } from './kitchen-orders.service';
import { AdvanceOrderStatusDto, KitchenOrderQueryDto } from './dto/kitchen-orders.dto';
import { KitchenOrderCardDto } from './dto/kitchen-orders.response.dto';
import { OrderDetailDto } from '../../../customer/orders/dto/orders.response.dto';
import { KitchenAuthGuard } from '../../../identity/kitchen-auth/guards/kitchen-auth.guard';
import { CurrentKitchenAccount } from '../../../identity/kitchen-auth/decorators/current-kitchen.decorator';
import {
  ApiEnvelope,
  ApiEnvelopeArray,
  ApiEnvelopeError,
  ApiEnvelopePaginated,
} from '../../../../common/decorators/api-envelope.decorator';
import { KitchenScope } from '../../../../common/decorators/kitchen-scope.decorator';

@ApiTags('Kitchen · Orders')
@ApiBearerAuth('JWT-auth')
@UseGuards(KitchenAuthGuard)
@KitchenScope()
@Controller('partner/orders')
export class KitchenOrdersController {
  constructor(private readonly kitchenOrdersService: KitchenOrdersService) {}

  @Get()
  @ApiOperation({ summary: 'Your kitchen’s orders, newest first' })
  @ApiEnvelopePaginated(KitchenOrderCardDto)
  async findAll(
    @CurrentKitchenAccount() account: KitchenAccount,
    @Query() query: KitchenOrderQueryDto,
  ) {
    return {
      message: 'Orders fetched',
      data: await this.kitchenOrdersService.findAll(account.id, query),
    };
  }

  @Get('incoming')
  @ApiOperation({
    summary: 'Orders in flight — poll this for the live order queue',
    description: 'PLACED / ACCEPTED / PREPARING / OUT_FOR_DELIVERY, oldest first so nothing waits.',
  })
  @ApiEnvelopeArray(KitchenOrderCardDto)
  async findIncoming(@CurrentKitchenAccount() account: KitchenAccount) {
    return {
      message: 'Incoming orders fetched',
      data: await this.kitchenOrdersService.findIncoming(account.id),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'One order, kitchen view' })
  @ApiEnvelope(KitchenOrderCardDto)
  @ApiEnvelopeError(403, 'This order belongs to another kitchen')
  @ApiEnvelopeError(404, 'Order not found')
  async findOne(
    @CurrentKitchenAccount() account: KitchenAccount,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return { message: 'Order fetched', data: await this.kitchenOrdersService.findOne(account.id, id) };
  }

  @Post(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Accept, start preparing, dispatch, or cancel an order',
    description:
      'A kitchen may only set ACCEPTED, PREPARING, OUT_FOR_DELIVERY or CANCELLED — DELIVERED is the delivery partner’s call, and payment states are the gateway’s. Delegates to the same transition logic the customer tracking screen reads, so both sides agree.',
  })
  @ApiEnvelope(OrderDetailDto, { description: 'Full order detail after the transition' })
  @ApiEnvelopeError(400, 'Illegal transition, or not a status a kitchen may set')
  @ApiEnvelopeError(403, 'This order belongs to another kitchen')
  async advanceStatus(
    @CurrentKitchenAccount() account: KitchenAccount,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdvanceOrderStatusDto,
  ) {
    return {
      message: 'Order status updated',
      data: await this.kitchenOrdersService.advanceStatus(account.id, id, dto.status, dto.note),
    };
  }
}
