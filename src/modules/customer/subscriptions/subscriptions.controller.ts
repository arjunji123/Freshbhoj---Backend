import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { KitchenSubscriptionsService } from '../../kitchen/portal/subscriptions/kitchen-subscriptions.service';
import {
  BulkPauseSubscriptionsDto,
  CreateSubscriptionDto,
  PauseSubscriptionDto,
  QuoteSubscriptionDto,
  SwapDeliveryMealDto,
} from './dto/customer-subscriptions.dto';
import { SubscriptionDetailDto, SubscriptionDto } from '../../kitchen/portal/subscriptions/dto/kitchen-subscriptions.response.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ApiEnvelope, ApiEnvelopeArray, ApiEnvelopeError } from '../../../common/decorators/api-envelope.decorator';

/**
 * Create/view/cancel a subscription, plus the customer-facing pause/resume/
 * vacation-mode and per-delivery dish-swap surface. Kitchen-side
 * approve/reject and the delivery/billing backfill idiom all still live in
 * `KitchenSubscriptionsService` — this controller is a thin wrapper over it.
 */
@ApiTags('Customer · Subscriptions')
@ApiBearerAuth('JWT-auth')
@Controller('customer/subscriptions')
export class SubscriptionsController {
  constructor(private readonly kitchenSubscriptionsService: KitchenSubscriptionsService) {}

  @Post()
  @ApiOperation({ summary: 'Request a subscription with a kitchen — starts PENDING until the kitchen approves' })
  @ApiEnvelope(SubscriptionDetailDto, { status: 201, description: 'Subscription requested' })
  @ApiEnvelopeError(400, 'This kitchen is not accepting subscriptions right now')
  async create(@CurrentUser() user: User, @Body() dto: CreateSubscriptionDto) {
    return { message: 'Subscription requested', data: await this.kitchenSubscriptionsService.createForCustomer(user.id, dto) };
  }

  @Post('quote')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Server-computed price preview for the setup wizard — never trust a client-computed total' })
  async quote(@CurrentUser() user: User, @Body() dto: QuoteSubscriptionDto) {
    return { message: 'Quote computed', data: await this.kitchenSubscriptionsService.quoteForCustomer(user.id, dto) };
  }

  @Post('pause-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '"Vacation mode" — pause every one of your active subscriptions at once, auto-resuming after N days' })
  async pauseAll(@CurrentUser() user: User, @Body() dto: BulkPauseSubscriptionsDto) {
    return { message: 'Subscriptions paused', data: await this.kitchenSubscriptionsService.bulkPauseForCustomer(user.id, dto.days) };
  }

  @Get()
  @ApiOperation({ summary: 'Your subscriptions' })
  @ApiEnvelopeArray(SubscriptionDto)
  async list(@CurrentUser() user: User) {
    return { message: 'Subscriptions fetched', data: await this.kitchenSubscriptionsService.listForCustomer(user.id) };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Subscription detail — plan, delivery schedule, billing history' })
  @ApiEnvelope(SubscriptionDetailDto)
  @ApiEnvelopeError(403, 'This subscription does not belong to you')
  @ApiEnvelopeError(404, 'Subscription not found')
  async findOne(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return { message: 'Subscription fetched', data: await this.kitchenSubscriptionsService.findOneForCustomer(user.id, id) };
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a subscription' })
  @ApiEnvelope(SubscriptionDetailDto)
  @ApiEnvelopeError(403, 'This subscription does not belong to you')
  async cancel(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return { message: 'Subscription cancelled', data: await this.kitchenSubscriptionsService.cancelForCustomer(user.id, id) };
  }

  @Post(':id/pause')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pause an active subscription — optionally auto-resuming after N days' })
  @ApiEnvelope(SubscriptionDetailDto)
  async pause(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string, @Body() dto: PauseSubscriptionDto) {
    return { message: 'Subscription paused', data: await this.kitchenSubscriptionsService.pauseForCustomer(user.id, id, dto.days) };
  }

  @Post(':id/resume')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resume a paused subscription' })
  @ApiEnvelope(SubscriptionDetailDto)
  async resume(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return { message: 'Subscription resumed', data: await this.kitchenSubscriptionsService.resumeForCustomer(user.id, id) };
  }

  @Post(':id/deliveries/:date/meal')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Swap the dish scheduled for a specific delivery — any SCHEDULED day in the rolling window, not just today' })
  @ApiEnvelopeError(400, 'That dish is not on this kitchen’s menu, or is not currently available')
  async swapMeal(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('date') date: string,
    @Body() dto: SwapDeliveryMealDto,
  ) {
    return { message: 'Dish swapped', data: await this.kitchenSubscriptionsService.swapDeliveryMeal(user.id, id, date, dto.mealId) };
  }
}
