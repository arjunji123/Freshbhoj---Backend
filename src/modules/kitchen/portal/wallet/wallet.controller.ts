import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { KitchenAccount } from '@prisma/client';
import { WalletService } from './wallet.service';
import { TopUpWalletDto } from './dto/wallet.dto';
import { TopUpResultDto, WalletSummaryDto, WalletTransactionListDto } from './dto/wallet.response.dto';
import { KitchenAuthGuard } from '../../../identity/kitchen-auth/guards/kitchen-auth.guard';
import { CurrentKitchenAccount } from '../../../identity/kitchen-auth/decorators/current-kitchen.decorator';
import { ApiEnvelope } from '../../../../common/decorators/api-envelope.decorator';
import { KitchenScope } from '../../../../common/decorators/kitchen-scope.decorator';
import { PaginationQueryDto } from '../../../../common/dto/pagination.dto';

@ApiTags('Kitchen · Wallet')
@ApiBearerAuth('JWT-auth')
@UseGuards(KitchenAuthGuard)
@KitchenScope()
@Controller('partner/wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  @ApiOperation({ summary: 'Balance, lifetime credits, this month’s spend, and the next premium-plan billing date' })
  @ApiEnvelope(WalletSummaryDto)
  async summary(@CurrentKitchenAccount() account: KitchenAccount) {
    return { message: 'Wallet summary fetched', data: await this.walletService.getSummary(account.id) };
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Recent Transactions — top-ups (credits) and ad-boost/premium-plan charges (debits)' })
  @ApiEnvelope(WalletTransactionListDto)
  async transactions(@CurrentKitchenAccount() account: KitchenAccount, @Query() query: PaginationQueryDto) {
    return {
      message: 'Transactions fetched',
      data: await this.walletService.listTransactions(account.id, query.page, query.limit),
    };
  }

  @Post('topup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add money to the wallet — completes immediately, no payment gateway is wired yet' })
  @ApiEnvelope(TopUpResultDto)
  async topUp(@CurrentKitchenAccount() account: KitchenAccount, @Body() dto: TopUpWalletDto) {
    return { message: 'Money added successfully', data: await this.walletService.topUp(account.id, dto.amountRs) };
  }
}
