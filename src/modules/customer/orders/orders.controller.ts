import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { OrderStatus, User } from '@prisma/client';
import { OrdersService } from './orders.service';
import {
  CancelOrderDto,
  ConfirmPaymentDto,
  OrderHistoryQueryDto,
  PlaceOrderDto,
} from './dto/orders.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import {
  OrderCardDto,
  OrderDetailDto,
  OrderTrackingDto,
  ReorderResultDto,
} from './dto/orders.response.dto';
import {
  ApiEnvelope,
  ApiEnvelopeArray,
  ApiEnvelopeError,
  ApiEnvelopePaginated,
} from '../../../common/decorators/api-envelope.decorator';

@ApiTags('Customer · Orders')
@ApiBearerAuth('JWT-auth')
@Controller('customer/orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({
    summary: 'Place an order from the current cart',
    description:
      'Totals are recomputed server-side — the device is never trusted. COD orders come back as PLACED; UPI/Card/Wallet come back as PENDING_PAYMENT and must be finalised with /confirm-payment. The cart is only emptied once payment lands, so a failure leaves it intact for a retry.',
  })
  @ApiEnvelope(OrderDetailDto, { status: 201, description: 'Order created' })
  @ApiEnvelopeError(400, 'Empty cart, unavailable item, closed kitchen, or below minimum order value')
  @ApiEnvelopeError(403, 'The delivery address belongs to another user')
  async place(@CurrentUser() user: User, @Body() dto: PlaceOrderDto) {
    return { message: 'Order placed', data: await this.ordersService.placeOrder(user.id, dto) };
  }

  @Get()
  @ApiOperation({ summary: 'Order history, most recent first' })
  @ApiEnvelopePaginated(OrderCardDto)
  async history(@CurrentUser() user: User, @Query() query: OrderHistoryQueryDto) {
    return {
      message: 'Orders fetched',
      data: await this.ordersService.findAll(user.id, query.page, query.limit, query.status),
    };
  }

  @Get('active')
  @ApiOperation({ summary: 'Orders currently in flight (Home strip + tracking)' })
  @ApiEnvelopeArray(OrderDetailDto)
  async active(@CurrentUser() user: User) {
    return { message: 'Active orders fetched', data: await this.ordersService.findActive(user.id) };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Full order detail' })
  @ApiEnvelope(OrderDetailDto)
  @ApiEnvelopeError(403, 'This order belongs to another user')
  @ApiEnvelopeError(404, 'Order not found')
  async detail(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return { message: 'Order fetched', data: await this.ordersService.findOne(user.id, id) };
  }

  @Get(':id/tracking')
  @ApiOperation({
    summary: 'Live tracking stepper + ETA',
    description:
      'Slim payload meant for polling every ~15s. Stop polling once `status` is DELIVERED or CANCELLED. Items and the bill come from GET /orders/{id}, which the client already holds.',
  })
  @ApiEnvelope(OrderTrackingDto)
  @ApiEnvelopeError(404, 'Order not found')
  async tracking(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return { message: 'Tracking fetched', data: await this.ordersService.getTracking(user.id, id) };
  }

  @Post(':id/confirm-payment')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mark payment successful and release the order to the kitchen',
    description: 'Also empties the cart, redeems the coupon and bumps each meal’s order count.',
  })
  @ApiEnvelope(OrderDetailDto)
  @ApiEnvelopeError(400, 'This order is not awaiting payment')
  async confirmPayment(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConfirmPaymentDto,
  ) {
    return {
      message: 'Payment confirmed',
      data: await this.ordersService.confirmPayment(user.id, id, dto),
    };
  }

  @Post(':id/fail-payment')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Record a failed payment so the app can offer a retry',
    description: 'The cart is deliberately left untouched so the customer can try again.',
  })
  @ApiEnvelope(OrderDetailDto)
  @ApiEnvelopeError(400, 'This order is not awaiting payment')
  async failPayment(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return { message: 'Payment marked failed', data: await this.ordersService.failPayment(user.id, id) };
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel an order (only before the kitchen starts preparing)' })
  @ApiEnvelope(OrderDetailDto)
  @ApiEnvelopeError(400, 'Too late to cancel — the kitchen has started preparing')
  async cancel(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelOrderDto,
  ) {
    return { message: 'Order cancelled', data: await this.ordersService.cancel(user.id, id, dto) };
  }

  @Post(':id/reorder')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'One-tap reorder — rebuilds the cart from a past order',
    description:
      'Clears the cart first (one kitchen per cart), skips items and add-ons the kitchen has since retired, and reports exactly what was dropped in `skippedItems`.',
  })
  @ApiEnvelope(ReorderResultDto)
  @ApiEnvelopeError(400, 'None of the items from this order are available any more')
  async reorder(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return { message: 'Items added to cart', data: await this.ordersService.reorder(user.id, id) };
  }

  // ────────────────────────────────────────────────────────────────────────
  // Dev-only simulator. Lets the app exercise the full tracking stepper before
  // the vendor dashboard exists. Disabled outside development.
  // ────────────────────────────────────────────────────────────────────────
  @Post(':id/simulate/:status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[dev] Advance an order to the next status',
    description:
      'Development helper that walks an order through the tracking stepper before the vendor dashboard exists. Returns a null payload in production. Illegal transitions are rejected.',
  })
  @ApiParam({
    name: 'status',
    enum: OrderStatus,
    example: OrderStatus.PREPARING,
    description: 'The next status; must be a legal transition from the current one',
  })
  @ApiEnvelope(OrderDetailDto)
  @ApiEnvelopeError(400, 'Illegal status transition')
  async simulate(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('status') status: OrderStatus,
  ) {
    if (process.env.NODE_ENV === 'production') {
      return { message: 'Not available', data: null };
    }
    await this.ordersService.findOne(user.id, id); // ownership check
    return {
      message: 'Order status advanced',
      data: await this.ordersService.advanceStatus(id, status, 'Simulated in development'),
    };
  }
}
