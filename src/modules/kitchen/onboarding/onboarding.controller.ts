import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { KitchenAccount } from '@prisma/client';
import { OnboardingService } from './onboarding.service';
import {
  BankDetailsDto,
  KitchenDetailsDto,
  KitchenLocationDto,
  OwnerDetailsDto,
  UploadDocumentDto,
} from './dto/onboarding.dto';
import { OnboardingStatusDto } from './dto/onboarding.response.dto';
import { KitchenAuthGuard } from '../../identity/kitchen-auth/guards/kitchen-auth.guard';
import { CurrentKitchenAccount } from '../../identity/kitchen-auth/decorators/current-kitchen.decorator';
import { ApiEnvelope, ApiEnvelopeError } from '../../../common/decorators/api-envelope.decorator';
import { KitchenScope } from '../../../common/decorators/kitchen-scope.decorator';

/**
 * The kitchen partner sign-up funnel.
 *
 * Every step returns the same `OnboardingStatusDto`, so the partner app has one
 * shape to render and never has to guess what to show next — `currentStep` and
 * `pending` tell it exactly where the partner is and what is still missing.
 */
@ApiTags('Kitchen · Onboarding')
@ApiBearerAuth('JWT-auth')
@UseGuards(KitchenAuthGuard)
@KitchenScope()
@Controller('partner/onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Get('status')
  @ApiOperation({
    summary: 'Where the partner is in the funnel, and what is left',
    description: 'Poll this on app launch to resume onboarding at the right step.',
  })
  @ApiEnvelope(OnboardingStatusDto)
  async status(@CurrentKitchenAccount() account: KitchenAccount) {
    return {
      message: 'Onboarding status fetched',
      data: await this.onboardingService.getStatus(account.id),
    };
  }

  @Post('owner-details')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Step 1 — owner name and email' })
  @ApiEnvelope(OnboardingStatusDto)
  @ApiEnvelopeError(409, 'That email already belongs to another partner')
  async ownerDetails(
    @CurrentKitchenAccount() account: KitchenAccount,
    @Body() dto: OwnerDetailsDto,
  ) {
    return {
      message: 'Owner details saved',
      data: await this.onboardingService.saveOwnerDetails(account.id, dto),
    };
  }

  @Post('kitchen-details')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Step 2 — kitchen identity',
    description:
      'Creates the kitchen row on first save, with status PENDING and isVerified false. It stays invisible to customers until the team approves the application.',
  })
  @ApiEnvelope(OnboardingStatusDto)
  async kitchenDetails(
    @CurrentKitchenAccount() account: KitchenAccount,
    @Body() dto: KitchenDetailsDto,
  ) {
    return {
      message: 'Kitchen details saved',
      data: await this.onboardingService.saveKitchenDetails(account.id, dto),
    };
  }

  @Post('location')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Step 3 — where the kitchen cooks',
    description: 'The coordinates are what put this kitchen into "Trending Near You".',
  })
  @ApiEnvelope(OnboardingStatusDto)
  @ApiEnvelopeError(400, 'Save your kitchen details first')
  async location(
    @CurrentKitchenAccount() account: KitchenAccount,
    @Body() dto: KitchenLocationDto,
  ) {
    return {
      message: 'Location saved',
      data: await this.onboardingService.saveLocation(account.id, dto),
    };
  }

  @Post('documents')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Step 4 — upload a compliance document',
    description:
      'Upload the file via POST /upload first, then send its URL here. Re-uploading after a rejection resets that document to PENDING.',
  })
  @ApiEnvelope(OnboardingStatusDto)
  async documents(
    @CurrentKitchenAccount() account: KitchenAccount,
    @Body() dto: UploadDocumentDto,
  ) {
    return {
      message: 'Document uploaded',
      data: await this.onboardingService.uploadDocument(account.id, dto),
    };
  }

  @Post('bank-details')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Step 5 — payout account',
    description: 'Only the last 4 digits of the account number are persisted.',
  })
  @ApiEnvelope(OnboardingStatusDto)
  async bankDetails(
    @CurrentKitchenAccount() account: KitchenAccount,
    @Body() dto: BankDetailsDto,
  ) {
    return {
      message: 'Bank details saved',
      data: await this.onboardingService.saveBankDetails(account.id, dto),
    };
  }

  @Post('submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Submit the application for review',
    description: 'Rejected unless every required step is complete; the 400 lists what is missing.',
  })
  @ApiEnvelope(OnboardingStatusDto)
  @ApiEnvelopeError(400, 'The application is not complete yet')
  async submit(@CurrentKitchenAccount() account: KitchenAccount) {
    return {
      message: 'Application submitted — our team will review it shortly',
      data: await this.onboardingService.submit(account.id),
    };
  }

  // ────────────────────────────────────────────────────────────────────────
  // Development helper. An ops console will own approval in Phase 2; until
  // then this lets the flow be exercised end to end. Disabled in production.
  // ────────────────────────────────────────────────────────────────────────
  @Post('simulate/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[dev] Approve this application and go live' })
  @ApiEnvelope(OnboardingStatusDto)
  async simulateApprove(@CurrentKitchenAccount() account: KitchenAccount) {
    if (process.env.NODE_ENV === 'production') {
      return { message: 'Not available', data: null };
    }
    return {
      message: 'Application approved',
      data: await this.onboardingService.approve(account.id),
    };
  }
}
