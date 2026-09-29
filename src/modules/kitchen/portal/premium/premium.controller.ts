import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { KitchenAccount } from '@prisma/client';
import { PremiumService } from './premium.service';
import { PurchasePremiumDto } from './dto/premium.dto';
import { PremiumSubscriptionDto, PremiumTierCatalogDto } from './dto/premium.response.dto';
import { KitchenAuthGuard } from '../../../identity/kitchen-auth/guards/kitchen-auth.guard';
import { CurrentKitchenAccount } from '../../../identity/kitchen-auth/decorators/current-kitchen.decorator';
import { ApiEnvelope, ApiEnvelopeArray, ApiEnvelopeError } from '../../../../common/decorators/api-envelope.decorator';
import { KitchenScope } from '../../../../common/decorators/kitchen-scope.decorator';

@ApiTags('Kitchen · Premium Plans')
@ApiBearerAuth('JWT-auth')
@UseGuards(KitchenAuthGuard)
@KitchenScope()
@Controller('partner/premium')
export class PremiumController {
  constructor(private readonly premiumService: PremiumService) {}

  @Get('tiers')
  @ApiOperation({ summary: 'The Basic/Pro/Elite pricing catalog' })
  @ApiEnvelopeArray(PremiumTierCatalogDto)
  async tiers() {
    return { message: 'Tiers fetched', data: this.premiumService.listTiers() };
  }

  @Get('subscription')
  @ApiOperation({ summary: 'Your current plan — lazily renews or expires on read' })
  @ApiEnvelope(PremiumSubscriptionDto)
  async mySubscription(@CurrentKitchenAccount() account: KitchenAccount) {
    return { message: 'Subscription fetched', data: await this.premiumService.getMyPlan(account.id) };
  }

  @Post('purchase')
  @ApiOperation({ summary: 'Purchase or upgrade to a tier — charges the wallet immediately' })
  @ApiEnvelope(PremiumSubscriptionDto, { status: 201, description: 'Plan purchased' })
  @ApiEnvelopeError(400, 'Insufficient wallet balance')
  async purchase(@CurrentKitchenAccount() account: KitchenAccount, @Body() dto: PurchasePremiumDto) {
    return { message: 'Plan purchased', data: await this.premiumService.purchase(account.id, dto) };
  }
}
