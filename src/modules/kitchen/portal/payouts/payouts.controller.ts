import { Controller, Get, HttpCode, HttpStatus, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { KitchenAccount } from '@prisma/client';
import { PayoutsService } from './payouts.service';
import { PayoutDto, PayoutSummaryDto, TransactionListDto } from './dto/payouts.response.dto';
import { KitchenAuthGuard } from '../../../identity/kitchen-auth/guards/kitchen-auth.guard';
import { CurrentKitchenAccount } from '../../../identity/kitchen-auth/decorators/current-kitchen.decorator';
import { ApiEnvelope, ApiEnvelopeError } from '../../../../common/decorators/api-envelope.decorator';
import { KitchenScope } from '../../../../common/decorators/kitchen-scope.decorator';
import { PaginationQueryDto } from '../../../../common/dto/pagination.dto';

@ApiTags('Kitchen · Payouts')
@ApiBearerAuth('JWT-auth')
@UseGuards(KitchenAuthGuard)
@KitchenScope()
@Controller('partner/payouts')
export class PayoutsController {
  constructor(private readonly payoutsService: PayoutsService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Earnings summary, available-for-payout, and masked bank details' })
  @ApiEnvelope(PayoutSummaryDto)
  async summary(@CurrentKitchenAccount() account: KitchenAccount) {
    return { message: 'Payout summary fetched', data: await this.payoutsService.getSummary(account.id) };
  }

  @Post('request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a payout of the full available balance' })
  @ApiEnvelope(PayoutDto)
  @ApiEnvelopeError(400, 'Nothing available to pay out right now, or no bank details on file')
  async request(@CurrentKitchenAccount() account: KitchenAccount) {
    return { message: 'Payout requested', data: await this.payoutsService.request(account.id) };
  }

  @Get()
  @ApiOperation({ summary: 'Recent Transactions — DELIVERED orders (credits) and payouts (debits), merged and sorted by date' })
  @ApiEnvelope(TransactionListDto)
  async transactions(@CurrentKitchenAccount() account: KitchenAccount, @Query() query: PaginationQueryDto) {
    return {
      message: 'Transactions fetched',
      data: await this.payoutsService.listTransactions(account.id, query.page, query.limit),
    };
  }
}
