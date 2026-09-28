import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BhojAiMessageRole } from '@prisma/client';

export class BhojAiMessageResponseDto {
  @ApiProperty({ example: 'Your FSSAI application is in government review — about 75% done, ~2 days left.' })
  message: string;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Deterministic, backend-built UI payload (e.g. an FSSAI status timeline) — null if this reply has none.',
    example: { type: 'FSSAI_STATUS', status: 'GOVT_REVIEW_IN_PROGRESS', progressPercent: 75, estimatedDaysLeft: 2 },
  })
  card: Record<string, unknown> | null;
}

export class BhojAiHistoryItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: BhojAiMessageRole, enumName: 'BhojAiHistoryRole', description: 'USER or MODEL — internal tool-calling rows are never returned here.' })
  role: BhojAiMessageRole;

  @ApiPropertyOptional({ nullable: true })
  text: string | null;

  @ApiPropertyOptional({ nullable: true })
  card: Record<string, unknown> | null;

  @ApiProperty()
  createdAt: Date;
}

export class BhojAiHistoryResponseDto {
  @ApiProperty({ type: [BhojAiHistoryItemDto] })
  messages: BhojAiHistoryItemDto[];
}
