import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  DocumentStatus,
  KitchenAccountStatus,
  KitchenDocumentType,
  KitchenOnboardingStep,
} from '@prisma/client';

export class OnboardingStepStateDto {
  @ApiProperty({ enum: KitchenOnboardingStep, example: KitchenOnboardingStep.KITCHEN_DETAILS })
  step: KitchenOnboardingStep;

  @ApiProperty({ example: 'Kitchen details' })
  label: string;

  @ApiProperty({ example: 'Name, photos, timings and what you cook' })
  description: string;

  @ApiProperty({ example: true })
  isComplete: boolean;

  @ApiProperty({ example: false, description: 'The step the partner app should open' })
  isCurrent: boolean;
}

export class KitchenDocumentDto {
  @ApiProperty({ example: 'c9d0e1f2-3a4b-4c5d-8e6f-7a8b9c0d1e2f' })
  id: string;

  @ApiProperty({ enum: KitchenDocumentType, example: KitchenDocumentType.FSSAI })
  type: KitchenDocumentType;

  @ApiPropertyOptional({ nullable: true, example: '22823004000123' })
  number: string | null;

  @ApiProperty({ example: 'https://cdn.freshbhoj.com/docs/fssai.pdf' })
  fileUrl: string;

  @ApiProperty({ enum: DocumentStatus, example: DocumentStatus.PENDING })
  status: DocumentStatus;

  @ApiPropertyOptional({ nullable: true, description: 'Reviewer feedback if rejected' })
  remarks: string | null;
}

export class KitchenBankAccountDto {
  @ApiProperty({ example: 'Meena Sharma' })
  accountHolderName: string;

  @ApiProperty({ example: '••••••5566', description: 'Only the last 4 digits are stored' })
  accountNumberMasked: string;

  @ApiProperty({ example: 'HDFC0001234' })
  ifsc: string;

  @ApiPropertyOptional({ nullable: true, example: 'HDFC Bank' })
  bankName: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'annapurna@okhdfcbank' })
  upiId: string | null;

  @ApiProperty({ example: false })
  isVerified: boolean;
}

export class OnboardingStatusDto {
  @ApiProperty({ enum: KitchenAccountStatus, example: KitchenAccountStatus.ONBOARDING })
  status: KitchenAccountStatus;

  @ApiProperty({ enum: KitchenOnboardingStep, example: KitchenOnboardingStep.LOCATION })
  currentStep: KitchenOnboardingStep;

  @ApiProperty({ example: 43, description: 'Percent of the funnel completed' })
  progressPercent: number;

  @ApiProperty({ type: [OnboardingStepStateDto] })
  steps: OnboardingStepStateDto[];

  @ApiProperty({ example: true, description: 'Whether every required step is done' })
  canSubmit: boolean;

  @ApiProperty({
    type: [String],
    example: ['Upload your FSSAI licence', 'Add at least one dish'],
    description: 'What is still missing before the application can be submitted',
  })
  pending: string[];

  @ApiPropertyOptional({ nullable: true })
  rejectionReason: string | null;

  @ApiProperty({ type: [KitchenDocumentDto] })
  documents: KitchenDocumentDto[];

  @ApiPropertyOptional({ type: KitchenBankAccountDto, nullable: true })
  bankAccount: KitchenBankAccountDto | null;

  @ApiPropertyOptional({ nullable: true, description: 'Created once kitchen details are saved' })
  kitchenId: string | null;
}
