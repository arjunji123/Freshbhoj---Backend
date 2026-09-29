import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { KitchenAccount } from '@prisma/client';
import { SubscriptionPlansService } from './subscription-plans.service';
import { CreateSubscriptionPlanDto, UpdateSubscriptionPlanDto } from './dto/subscription-plans.dto';
import { SubscriptionPlanDto } from './dto/subscription-plans.response.dto';
import { KitchenAuthGuard } from '../../../identity/kitchen-auth/guards/kitchen-auth.guard';
import { CurrentKitchenAccount } from '../../../identity/kitchen-auth/decorators/current-kitchen.decorator';
import { ApiEnvelope, ApiEnvelopeArray, ApiEnvelopeError } from '../../../../common/decorators/api-envelope.decorator';
import { KitchenScope } from '../../../../common/decorators/kitchen-scope.decorator';

@ApiTags('Kitchen · Subscription Plans')
@ApiBearerAuth('JWT-auth')
@UseGuards(KitchenAuthGuard)
@KitchenScope()
@Controller('partner/subscription-plans')
export class SubscriptionPlansController {
  constructor(private readonly subscriptionPlansService: SubscriptionPlansService) {}

  @Get()
  @ApiOperation({ summary: 'Your subscription plans, including inactive ones (for management)' })
  @ApiEnvelopeArray(SubscriptionPlanDto)
  async list(@CurrentKitchenAccount() account: KitchenAccount) {
    return { message: 'Plans fetched', data: await this.subscriptionPlansService.list(account.id) };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new subscription plan customers can browse and subscribe to' })
  @ApiEnvelope(SubscriptionPlanDto, { status: 201, description: 'Plan created' })
  @ApiEnvelopeError(400, 'originalPriceRs must be greater than priceRs, or omitted entirely')
  async create(@CurrentKitchenAccount() account: KitchenAccount, @Body() dto: CreateSubscriptionPlanDto) {
    return { message: 'Plan created', data: await this.subscriptionPlansService.create(account.id, dto) };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit a plan, or toggle isActive to remove/restore it from the public browse list' })
  @ApiEnvelope(SubscriptionPlanDto)
  @ApiEnvelopeError(404, 'Subscription plan not found')
  async update(@CurrentKitchenAccount() account: KitchenAccount, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSubscriptionPlanDto) {
    return { message: 'Plan updated', data: await this.subscriptionPlansService.update(account.id, id, dto) };
  }
}
