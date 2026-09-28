import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { FssaiAssistanceStatus } from '@prisma/client';

const STATUS_VALUES = Object.values(FssaiAssistanceStatus);

export class ListFssaiAssistanceQueryDto {
  @ApiPropertyOptional({
    enum: STATUS_VALUES,
    description: 'Defaults to the in-progress queue (DOCUMENTS_SUBMITTED, APPLICATION_FILED, GOVT_REVIEW_IN_PROGRESS)',
  })
  @IsOptional()
  @IsIn(STATUS_VALUES)
  status?: FssaiAssistanceStatus;
}

export class ApproveFssaiAssistanceDto {
  @ApiProperty({ example: '12423099000456' })
  @IsString()
  @IsNotEmpty()
  licenseNumber: string;

  @ApiProperty({ example: '2026-10-01' })
  @IsDateString()
  validFrom: string;

  @ApiProperty({ example: '2027-10-01' })
  @IsDateString()
  validTill: string;

  @ApiPropertyOptional({ example: 'https://cdn.freshbhoj.com/certs/fssai-annapurna.pdf' })
  @IsOptional()
  @IsString()
  certificateUrl?: string;
}

export class RejectFssaiAssistanceDto {
  @ApiProperty({ example: 'Passport photo is blurred — please ask the partner to re-upload.' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
