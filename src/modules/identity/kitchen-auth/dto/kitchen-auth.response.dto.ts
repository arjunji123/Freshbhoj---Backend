import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { KitchenAccountStatus, KitchenOnboardingStep } from '@prisma/client';

export class KitchenAccountDto {
  @ApiProperty({ example: 'a7b8c9d0-1e2f-4a3b-8c4d-5e6f7a8b9c0d' })
  id: string;

  @ApiProperty({ example: '+919876500011' })
  phone: string;

  @ApiPropertyOptional({ nullable: true, example: 'partner@annapurna.in' })
  email: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'Meena Sharma' })
  ownerName: string | null;

  @ApiProperty({ enum: KitchenAccountStatus, example: KitchenAccountStatus.ONBOARDING })
  status: KitchenAccountStatus;

  @ApiProperty({
    enum: KitchenOnboardingStep,
    example: KitchenOnboardingStep.KITCHEN_DETAILS,
    description: 'Furthest step completed — the partner app resumes from here',
  })
  onboardingStep: KitchenOnboardingStep;

  @ApiPropertyOptional({ nullable: true, description: 'Shown verbatim if the application is rejected' })
  rejectionReason: string | null;

  @ApiPropertyOptional({ nullable: true })
  submittedAt: string | null;

  @ApiPropertyOptional({ nullable: true })
  approvedAt: string | null;
}

export class KitchenTokenPairDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken: string;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  refreshToken: string;

  @ApiProperty({ example: 900 })
  expiresIn: number;
}

export class KitchenVerifyOtpResultDto {
  @ApiProperty({ example: true, description: 'True on first sign-up — start the onboarding funnel' })
  isNewAccount: boolean;

  @ApiProperty({ type: KitchenAccountDto })
  account: KitchenAccountDto;

  @ApiProperty({ type: KitchenTokenPairDto })
  tokens: KitchenTokenPairDto;
}

export class KitchenSendOtpResultDto {
  @ApiProperty({ example: 10 })
  expiresInMinutes: number;

  @ApiPropertyOptional({ example: '123456', description: 'Only while OTP_DEV_MODE=true' })
  devOtp?: string;
}
