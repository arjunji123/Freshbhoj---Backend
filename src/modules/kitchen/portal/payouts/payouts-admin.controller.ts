import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PayoutsService } from './payouts.service';
import { CompletePayoutDto, FailPayoutDto, ListPayoutsAdminQueryDto } from './dto/payouts-admin.dto';
import { PayoutDto } from './dto/payouts.response.dto';
import { Public } from '../../../../common/decorators/public.decorator';
import { AdminSecretGuard } from '../../../../common/guards/admin-secret.guard';
import { ApiEnvelope } from '../../../../common/decorators/api-envelope.decorator';

/**
 * V0 ops tool — same shared-secret gate as `KitchenAdminController` and
 * `FssaiAssistanceAdminController`. FreshBhoj staff move a payout through its
 * REQUESTED → PROCESSING → PAID/FAILED states by hand here; no real
 * bank-transfer/payment-gateway API is wired.
 */
@ApiTags('Kitchen · Payouts Admin (V0 ops tool)')
@ApiHeader({ name: 'x-admin-secret', required: true })
@Public()
@UseGuards(AdminSecretGuard)
@Controller('admin/payouts')
export class PayoutsAdminController {
  constructor(private readonly payoutsService: PayoutsService) {}

  @Get()
  @ApiOperation({ summary: 'List payouts by status (defaults to the actionable queue)' })
  async list(@Query() query: ListPayoutsAdminQueryDto) {
    const payouts = await this.payoutsService.adminList(query.status);
    return { message: `${payouts.length} payout(s)`, data: payouts };
  }

  @Post(':id/process')
  @ApiOperation({ summary: 'REQUESTED → PROCESSING' })
  @ApiEnvelope(PayoutDto)
  async process(@Param('id') id: string) {
    return { message: 'Payout is now processing', data: await this.payoutsService.adminProcess(id) };
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'PROCESSING → PAID — records the (placeholder) transfer reference' })
  @ApiEnvelope(PayoutDto)
  async complete(@Param('id') id: string, @Body() dto: CompletePayoutDto) {
    return { message: 'Payout marked as paid', data: await this.payoutsService.adminComplete(id, dto.transferRef) };
  }

  @Post(':id/fail')
  @ApiOperation({ summary: 'Mark a payout as failed, with a reason' })
  @ApiEnvelope(PayoutDto)
  async fail(@Param('id') id: string, @Body() dto: FailPayoutDto) {
    return { message: 'Payout marked as failed', data: await this.payoutsService.adminFail(id, dto.reason) };
  }
}
