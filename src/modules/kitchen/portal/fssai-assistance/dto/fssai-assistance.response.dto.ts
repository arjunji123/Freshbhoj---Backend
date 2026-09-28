import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentStatus, FssaiAssistanceDocumentType, FssaiAssistanceStatus, PaymentStatus } from '@prisma/client';

export class FssaiAssistanceDocumentDto {
  @ApiProperty({ example: 'c9d0e1f2-3a4b-4c5d-8e6f-7a8b9c0d1e2f' })
  id: string;

  @ApiProperty({ enum: FssaiAssistanceDocumentType, example: FssaiAssistanceDocumentType.IDENTITY_PROOF })
  type: FssaiAssistanceDocumentType;

  @ApiProperty({ example: 'https://cdn.freshbhoj.com/docs/identity.jpg' })
  fileUrl: string;

  @ApiProperty({ enum: DocumentStatus, example: DocumentStatus.PENDING })
  status: DocumentStatus;

  @ApiPropertyOptional({ nullable: true })
  remarks: string | null;
}

export class FssaiAssistanceRequestDto {
  @ApiProperty({ example: 'c9d0e1f2-3a4b-4c5d-8e6f-7a8b9c0d1e2f' })
  id: string;

  @ApiProperty({ enum: FssaiAssistanceStatus, example: FssaiAssistanceStatus.PENDING_PAYMENT })
  status: FssaiAssistanceStatus;

  @ApiProperty({ example: 1000 })
  govtFee: number;

  @ApiProperty({ example: 500 })
  serviceFee: number;

  @ApiProperty({ example: 1500 })
  totalFee: number;

  @ApiProperty({ enum: PaymentStatus, example: PaymentStatus.PENDING, description: 'Placeholder — no gateway wired yet' })
  paymentStatus: PaymentStatus;

  @ApiPropertyOptional({ nullable: true })
  licenseNumber: string | null;

  @ApiPropertyOptional({ nullable: true })
  validFrom: Date | null;

  @ApiPropertyOptional({ nullable: true })
  validTill: Date | null;

  @ApiPropertyOptional({ nullable: true })
  certificateUrl: string | null;

  @ApiPropertyOptional({ nullable: true })
  rejectionReason: string | null;

  @ApiPropertyOptional({ nullable: true })
  submittedAt: Date | null;

  @ApiPropertyOptional({ nullable: true })
  filedAt: Date | null;

  @ApiPropertyOptional({ nullable: true })
  approvedAt: Date | null;

  @ApiProperty()
  createdAt: Date;
}

export class FssaiAssistanceStatusDto {
  @ApiPropertyOptional({ type: FssaiAssistanceRequestDto, nullable: true, description: 'null if never started' })
  request: FssaiAssistanceRequestDto | null;

  @ApiProperty({ type: [FssaiAssistanceDocumentDto] })
  documents: FssaiAssistanceDocumentDto[];
}

export class FssaiAssistanceAdminListItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: FssaiAssistanceStatus })
  status: FssaiAssistanceStatus;

  @ApiPropertyOptional({ nullable: true })
  submittedAt: Date | null;

  @ApiProperty()
  account: { id: string; phone: string; ownerName: string | null };

  @ApiPropertyOptional({ nullable: true })
  kitchen: { id: string; name: string } | null;

  @ApiProperty({ type: [FssaiAssistanceDocumentDto] })
  documents: FssaiAssistanceDocumentDto[];
}
