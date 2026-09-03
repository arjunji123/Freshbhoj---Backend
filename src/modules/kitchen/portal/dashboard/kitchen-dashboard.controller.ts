import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { KitchenAccount } from '@prisma/client';
import { KitchenDashboardService } from './kitchen-dashboard.service';
import { DashboardSummaryDto } from './dto/kitchen-dashboard.response.dto';
import { KitchenAuthGuard } from '../../../identity/kitchen-auth/guards/kitchen-auth.guard';
import { CurrentKitchenAccount } from '../../../identity/kitchen-auth/decorators/current-kitchen.decorator';
import { ApiEnvelope, ApiEnvelopeError } from '../../../../common/decorators/api-envelope.decorator';
import { KitchenScope } from '../../../../common/decorators/kitchen-scope.decorator';

@ApiTags('Kitchen · Dashboard')
@ApiBearerAuth('JWT-auth')
@UseGuards(KitchenAuthGuard)
@KitchenScope()
@Controller('partner/dashboard')
export class KitchenDashboardController {
  constructor(private readonly kitchenDashboardService: KitchenDashboardService) {}

  @Get('summary')
  @ApiOperation({ summary: 'The partner app home screen — today’s numbers plus all-time totals' })
  @ApiEnvelope(DashboardSummaryDto)
  @ApiEnvelopeError(400, 'Complete onboarding to create your kitchen first')
  async summary(@CurrentKitchenAccount() account: KitchenAccount) {
    return {
      message: 'Dashboard fetched',
      data: await this.kitchenDashboardService.getSummary(account.id),
    };
  }
}
