import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { KitchenAccount } from '@prisma/client';
import { FssaiAssistanceService } from './fssai-assistance.service';
import { UploadFssaiAssistanceDocumentDto } from './dto/fssai-assistance.dto';
import { FssaiAssistanceStatusDto } from './dto/fssai-assistance.response.dto';
import { KitchenAuthGuard } from '../../../identity/kitchen-auth/guards/kitchen-auth.guard';
import { CurrentKitchenAccount } from '../../../identity/kitchen-auth/decorators/current-kitchen.decorator';
import { ApiEnvelope, ApiEnvelopeError } from '../../../../common/decorators/api-envelope.decorator';
import { KitchenScope } from '../../../../common/decorators/kitchen-scope.decorator';

/**
 * A partner without their own FSSAI licence can ask FreshBhoj's ops team to
 * file the government application on their behalf, for a fee. Independent of
 * the onboarding funnel — it can be started at any point, and it satisfies
 * onboarding's FSSAI requirement in place of an uploaded document while it's
 * active (see `OnboardingService.getStatus`).
 */
@ApiTags('Kitchen · FSSAI Assistance')
@ApiBearerAuth('JWT-auth')
@UseGuards(KitchenAuthGuard)
@KitchenScope()
@Controller('partner/fssai-assistance')
export class FssaiAssistanceController {
  constructor(private readonly fssaiAssistanceService: FssaiAssistanceService) {}

  @Get('status')
  @ApiOperation({ summary: 'The partner’s current (or most recent) assistance request, if any' })
  @ApiEnvelope(FssaiAssistanceStatusDto)
  async status(@CurrentKitchenAccount() account: KitchenAccount) {
    return { message: 'FSSAI assistance status fetched', data: await this.fssaiAssistanceService.getStatus(account.id) };
  }

  @Post('start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start a request — returns the existing one if already in progress' })
  @ApiEnvelope(FssaiAssistanceStatusDto)
  async start(@CurrentKitchenAccount() account: KitchenAccount) {
    return { message: 'Assistance request started', data: await this.fssaiAssistanceService.start(account.id) };
  }

  @Post('documents')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upload one KYC document for the current request' })
  @ApiEnvelope(FssaiAssistanceStatusDto)
  @ApiEnvelopeError(400, 'Start an FSSAI assistance request first')
  async documents(@CurrentKitchenAccount() account: KitchenAccount, @Body() dto: UploadFssaiAssistanceDocumentDto) {
    return { message: 'Document uploaded', data: await this.fssaiAssistanceService.uploadDocument(account.id, dto) };
  }

  @Post('confirm-payment')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Confirm the ₹1,500 fee (placeholder — no payment gateway is wired yet)',
    description: 'Requires every required document to already be uploaded.',
  })
  @ApiEnvelope(FssaiAssistanceStatusDto)
  @ApiEnvelopeError(400, 'Upload every required document first')
  async confirmPayment(@CurrentKitchenAccount() account: KitchenAccount) {
    return { message: 'Payment confirmed — your application will be filed shortly', data: await this.fssaiAssistanceService.confirmPayment(account.id) };
  }

  @Post('cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel the current request' })
  @ApiEnvelope(FssaiAssistanceStatusDto)
  async cancel(@CurrentKitchenAccount() account: KitchenAccount) {
    return { message: 'Assistance request cancelled', data: await this.fssaiAssistanceService.cancel(account.id) };
  }

  // ────────────────────────────────────────────────────────────────────────
  // Development helper — mirrors onboarding's simulate/approve. Lets the
  // 6-screen flow be exercised end to end without ops/admin-secret access.
  // Disabled in production.
  // ────────────────────────────────────────────────────────────────────────
  @Post('simulate/advance')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[dev] Advance the current request one stage' })
  @ApiEnvelope(FssaiAssistanceStatusDto)
  async simulateAdvance(@CurrentKitchenAccount() account: KitchenAccount) {
    if (process.env.NODE_ENV === 'production') {
      return { message: 'Not available', data: null };
    }
    return { message: 'Advanced', data: await this.fssaiAssistanceService.simulateAdvance(account.id) };
  }
}
