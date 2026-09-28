import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { KitchenAccount } from '@prisma/client';
import { BhojAiService } from './bhojai.service';
import { SendBhojAiMessageDto } from './dto/bhojai.dto';
import { BhojAiHistoryResponseDto, BhojAiMessageResponseDto } from './dto/bhojai.response.dto';
import { KitchenAuthGuard } from '../../../identity/kitchen-auth/guards/kitchen-auth.guard';
import { CurrentKitchenAccount } from '../../../identity/kitchen-auth/decorators/current-kitchen.decorator';
import { ApiEnvelope, ApiEnvelopeError } from '../../../../common/decorators/api-envelope.decorator';
import { KitchenScope } from '../../../../common/decorators/kitchen-scope.decorator';

/**
 * BhojAI — the kitchen partner's AI assistant. A single, persistent
 * conversation per account (find-or-create); every reply is grounded in real
 * tool calls against this partner's own data (see `bhojai-tools.ts`) — the
 * model never states a fact it didn't get from a tool.
 */
@ApiTags('Kitchen · BhojAI')
@ApiBearerAuth('JWT-auth')
@UseGuards(KitchenAuthGuard)
@KitchenScope()
@Controller('partner/bhojai')
export class BhojAiController {
  constructor(private readonly bhojAiService: BhojAiService) {}

  @Post('message')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a message and get BhojAI’s reply, with an optional structured card' })
  @ApiEnvelope(BhojAiMessageResponseDto)
  @ApiEnvelopeError(503, 'BhojAI is temporarily unavailable')
  async sendMessage(@CurrentKitchenAccount() account: KitchenAccount, @Body() dto: SendBhojAiMessageDto) {
    return { message: 'BhojAI replied', data: await this.bhojAiService.sendMessage(account.id, dto.message) };
  }

  @Get('history')
  @ApiOperation({ summary: 'The current conversation’s transcript, oldest first' })
  @ApiEnvelope(BhojAiHistoryResponseDto)
  async history(@CurrentKitchenAccount() account: KitchenAccount) {
    return { message: 'BhojAI history fetched', data: await this.bhojAiService.getHistory(account.id) };
  }

  @Post('reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive the current conversation — the next message starts fresh' })
  async reset(@CurrentKitchenAccount() account: KitchenAccount) {
    return { message: 'Conversation reset', data: await this.bhojAiService.reset(account.id) };
  }
}
