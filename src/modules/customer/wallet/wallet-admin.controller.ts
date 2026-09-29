import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CustomerWalletWithdrawalStatus } from '@prisma/client';
import { CustomerWalletService } from './wallet.service';
import { FailWithdrawalDto } from './dto/wallet.dto';
import { WithdrawalDto } from './dto/wallet.response.dto';
import { Public } from '../../../common/decorators/public.decorator';
import { AdminSecretGuard } from '../../../common/guards/admin-secret.guard';
import { ApiEnvelope } from '../../../common/decorators/api-envelope.decorator';

/**
 * V0 ops tool — same shared-secret gate as PayoutsAdminController. FreshBhoj
 * staff move a withdrawal through REQUESTED → PROCESSING → PAID/FAILED by
 * hand; no real bank-transfer/payment-gateway API is wired.
 */
@ApiTags('Customer · Wallet Admin (V0 ops tool)')
@ApiHeader({ name: 'x-admin-secret', required: true })
@Public()
@UseGuards(AdminSecretGuard)
@Controller('admin/customer-wallet-withdrawals')
export class CustomerWalletAdminController {
  constructor(private readonly walletService: CustomerWalletService) {}

  @Get()
  @ApiOperation({ summary: 'List withdrawal requests by status (defaults to the actionable queue)' })
  async list(@Query('status') status?: CustomerWalletWithdrawalStatus) {
    const withdrawals = await this.walletService.adminList(status);
    return { message: `${withdrawals.length} withdrawal(s)`, data: withdrawals };
  }

  @Post(':id/process')
  @ApiOperation({ summary: 'REQUESTED → PROCESSING' })
  @ApiEnvelope(WithdrawalDto)
  async process(@Param('id') id: string) {
    return { message: 'Withdrawal is now processing', data: await this.walletService.adminProcess(id) };
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'PROCESSING → PAID' })
  @ApiEnvelope(WithdrawalDto)
  async complete(@Param('id') id: string) {
    return { message: 'Withdrawal marked as paid', data: await this.walletService.adminComplete(id) };
  }

  @Post(':id/fail')
  @ApiOperation({ summary: 'Mark a withdrawal as failed, with a reason — refunds the reserved amount' })
  @ApiEnvelope(WithdrawalDto)
  async fail(@Param('id') id: string, @Body() dto: FailWithdrawalDto) {
    return { message: 'Withdrawal marked as failed and refunded', data: await this.walletService.adminFail(id, dto.reason) };
  }
}
