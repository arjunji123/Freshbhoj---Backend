import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { CustomerWalletService } from './wallet.service';
import { RequestWithdrawalDto, TopUpWalletDto } from './dto/wallet.dto';
import { TopUpResultDto, WalletSummaryDto, WalletTransactionDto, WithdrawalDto } from './dto/wallet.response.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ApiEnvelope, ApiEnvelopeArray } from '../../../common/decorators/api-envelope.decorator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

@ApiTags('Customer · Wallet')
@ApiBearerAuth('JWT-auth')
@Controller('customer/wallet')
export class CustomerWalletController {
  constructor(private readonly walletService: CustomerWalletService) {}

  @Get()
  @ApiOperation({ summary: 'Balance, lifetime top-ups, and this month’s spend' })
  @ApiEnvelope(WalletSummaryDto)
  async summary(@CurrentUser() user: User) {
    return { message: 'Wallet summary fetched', data: await this.walletService.getSummary(user.id) };
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Recent transactions — top-ups (credits) and order/subscription payments (debits)' })
  @ApiEnvelopeArray(WalletTransactionDto)
  async transactions(@CurrentUser() user: User, @Query() query: PaginationQueryDto) {
    return { message: 'Transactions fetched', data: await this.walletService.listTransactions(user.id, query.page, query.limit) };
  }

  @Post('topup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add money to the wallet — completes immediately, no payment gateway is wired yet' })
  @ApiEnvelope(TopUpResultDto)
  async topUp(@CurrentUser() user: User, @Body() dto: TopUpWalletDto) {
    return { message: 'Money added successfully', data: await this.walletService.topUp(user.id, dto.amountRs) };
  }

  @Get('withdrawals')
  @ApiOperation({ summary: 'Your withdrawal requests' })
  @ApiEnvelopeArray(WithdrawalDto)
  async withdrawals(@CurrentUser() user: User, @Query() query: PaginationQueryDto) {
    return { message: 'Withdrawals fetched', data: await this.walletService.listWithdrawals(user.id, query.page, query.limit) };
  }

  @Post('withdraw')
  @ApiOperation({ summary: 'Request a withdrawal — reserves the amount immediately, pending ops confirmation' })
  @ApiEnvelope(WithdrawalDto, { status: 201, description: 'Withdrawal requested' })
  async withdraw(@CurrentUser() user: User, @Body() dto: RequestWithdrawalDto) {
    return { message: 'Withdrawal requested', data: await this.walletService.requestWithdrawal(user.id, dto.amountRs, dto.destination) };
  }
}
