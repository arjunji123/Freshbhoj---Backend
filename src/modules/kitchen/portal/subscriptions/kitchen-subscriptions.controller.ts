import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { KitchenAccount } from '@prisma/client';
import { KitchenSubscriptionsService } from './kitchen-subscriptions.service';
import { ListSubscriptionsQueryDto, RejectSubscriptionDto, SkipDeliveryDto } from './dto/kitchen-subscriptions.dto';
import { SubscriptionDetailDto, SubscriptionListDto } from './dto/kitchen-subscriptions.response.dto';
import { KitchenAuthGuard } from '../../../identity/kitchen-auth/guards/kitchen-auth.guard';
import { CurrentKitchenAccount } from '../../../identity/kitchen-auth/decorators/current-kitchen.decorator';
import { ApiEnvelope, ApiEnvelopeError } from '../../../../common/decorators/api-envelope.decorator';
import { KitchenScope } from '../../../../common/decorators/kitchen-scope.decorator';

@ApiTags('Kitchen · Subscriptions')
@ApiBearerAuth('JWT-auth')
@UseGuards(KitchenAuthGuard)
@KitchenScope()
@Controller('partner/subscriptions')
export class KitchenSubscriptionsController {
  constructor(private readonly kitchenSubscriptionsService: KitchenSubscriptionsService) {}

  @Get()
  @ApiOperation({ summary: 'Your subscribers, with per-status counts' })
  @ApiEnvelope(SubscriptionListDto)
  async list(@CurrentKitchenAccount() account: KitchenAccount, @Query() query: ListSubscriptionsQueryDto) {
    return {
      message: 'Subscriptions fetched',
      data: await this.kitchenSubscriptionsService.list(account.id, query.status, query.q, query.page, query.limit),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Subscriber detail — plan, delivery schedule (rolling 7-day window), billing history' })
  @ApiEnvelope(SubscriptionDetailDto)
  @ApiEnvelopeError(403, 'This subscription belongs to another kitchen')
  @ApiEnvelopeError(404, 'Subscription not found')
  async findOne(@CurrentKitchenAccount() account: KitchenAccount, @Param('id', ParseUUIDPipe) id: string) {
    return { message: 'Subscription fetched', data: await this.kitchenSubscriptionsService.findOne(account.id, id) };
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a pending subscription request — PENDING → ACTIVE' })
  @ApiEnvelope(SubscriptionDetailDto)
  async approve(@CurrentKitchenAccount() account: KitchenAccount, @Param('id', ParseUUIDPipe) id: string) {
    return { message: 'Subscription approved', data: await this.kitchenSubscriptionsService.approve(account.id, id) };
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Decline a pending subscription request, with a reason' })
  @ApiEnvelope(SubscriptionDetailDto)
  async reject(@CurrentKitchenAccount() account: KitchenAccount, @Param('id', ParseUUIDPipe) id: string, @Body() dto: RejectSubscriptionDto) {
    return { message: 'Subscription declined', data: await this.kitchenSubscriptionsService.reject(account.id, id, dto.reason) };
  }

  @Post(':id/pause')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pause an active subscription — resumable' })
  @ApiEnvelope(SubscriptionDetailDto)
  async pause(@CurrentKitchenAccount() account: KitchenAccount, @Param('id', ParseUUIDPipe) id: string) {
    return { message: 'Subscription paused', data: await this.kitchenSubscriptionsService.pause(account.id, id) };
  }

  @Post(':id/resume')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resume a paused subscription' })
  @ApiEnvelope(SubscriptionDetailDto)
  async resume(@CurrentKitchenAccount() account: KitchenAccount, @Param('id', ParseUUIDPipe) id: string) {
    return { message: 'Subscription resumed', data: await this.kitchenSubscriptionsService.resume(account.id, id) };
  }

  @Post(':id/deliveries/:date/dispatch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Mark today's delivery dispatched",
    description: 'Only today — does not create an Order (a full subscription-to-order pipeline needs background-job infra this codebase does not have).',
  })
  @ApiParam({ name: 'date', example: '2026-09-29' })
  @ApiEnvelopeError(400, "Only today's delivery can be dispatched or skipped, or it isn't SCHEDULED any more")
  async dispatch(@CurrentKitchenAccount() account: KitchenAccount, @Param('id', ParseUUIDPipe) id: string, @Param('date') date: string) {
    return { message: 'Delivery dispatched', data: await this.kitchenSubscriptionsService.dispatchDelivery(account.id, id, date) };
  }

  @Post(':id/deliveries/:date/skip')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Skip today's delivery, with an optional reason" })
  @ApiParam({ name: 'date', example: '2026-09-29' })
  @ApiEnvelopeError(400, "Only today's delivery can be dispatched or skipped, or it isn't SCHEDULED any more")
  async skip(
    @CurrentKitchenAccount() account: KitchenAccount,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('date') date: string,
    @Body() dto: SkipDeliveryDto,
  ) {
    return { message: 'Delivery skipped', data: await this.kitchenSubscriptionsService.skipDelivery(account.id, id, date, dto.reason) };
  }
}
