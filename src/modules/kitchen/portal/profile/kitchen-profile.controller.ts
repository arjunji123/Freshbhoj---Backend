import { Body, Controller, Get, HttpCode, HttpStatus, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { KitchenAccount } from '@prisma/client';
import { KitchenProfileService } from './kitchen-profile.service';
import { SetAcceptingOrdersDto, UpdateKitchenProfileDto } from './dto/kitchen-profile.dto';
import { KitchenProfileDto } from './dto/kitchen-profile.response.dto';
import { KitchenAuthGuard } from '../../../identity/kitchen-auth/guards/kitchen-auth.guard';
import { CurrentKitchenAccount } from '../../../identity/kitchen-auth/decorators/current-kitchen.decorator';
import { ApiEnvelope, ApiEnvelopeError } from '../../../../common/decorators/api-envelope.decorator';
import { KitchenScope } from '../../../../common/decorators/kitchen-scope.decorator';

@ApiTags('Kitchen · Profile')
@ApiBearerAuth('JWT-auth')
@UseGuards(KitchenAuthGuard)
@KitchenScope()
@Controller('partner/kitchen')
export class KitchenProfileController {
  constructor(private readonly kitchenProfileService: KitchenProfileService) {}

  @Get()
  @ApiOperation({ summary: 'Your kitchen profile' })
  @ApiEnvelope(KitchenProfileDto)
  @ApiEnvelopeError(400, 'Complete onboarding to create your kitchen first')
  async getOwn(@CurrentKitchenAccount() account: KitchenAccount) {
    return {
      message: 'Kitchen profile fetched',
      data: await this.kitchenProfileService.getOwn(account.id),
    };
  }

  @Patch()
  @ApiOperation({ summary: 'Update your kitchen profile' })
  @ApiEnvelope(KitchenProfileDto)
  async update(
    @CurrentKitchenAccount() account: KitchenAccount,
    @Body() dto: UpdateKitchenProfileDto,
  ) {
    return {
      message: 'Kitchen profile updated',
      data: await this.kitchenProfileService.update(account.id, dto),
    };
  }

  @Patch('accepting-orders')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Pause / resume accepting new orders',
    description: 'The one toggle for "we are swamped" without touching opening hours.',
  })
  @ApiEnvelope(KitchenProfileDto)
  async setAcceptingOrders(
    @CurrentKitchenAccount() account: KitchenAccount,
    @Body() dto: SetAcceptingOrdersDto,
  ) {
    return {
      message: 'Availability updated',
      data: await this.kitchenProfileService.setAcceptingOrders(account.id, dto),
    };
  }
}
