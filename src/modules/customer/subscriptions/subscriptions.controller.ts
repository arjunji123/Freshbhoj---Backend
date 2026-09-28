import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { KitchenSubscriptionsService } from '../../kitchen/portal/subscriptions/kitchen-subscriptions.service';
import { CreateSubscriptionDto } from './dto/customer-subscriptions.dto';
import { SubscriptionDetailDto, SubscriptionDto } from '../../kitchen/portal/subscriptions/dto/kitchen-subscriptions.response.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ApiEnvelope, ApiEnvelopeArray, ApiEnvelopeError } from '../../../common/decorators/api-envelope.decorator';

/**
 * Deliberately thin — enough to create/view/cancel a subscription end-to-end
 * for real, without a polished browsing UI (out of scope this round, see the
 * Round 4 plan). All the richer subscriber-management logic (approve/reject/
 * pause/resume, delivery/billing backfill) lives in `KitchenSubscriptionsService`.
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
}
