import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SuggestionStatus, SuggestionType } from '@prisma/client';
import { PageMetaDto } from '../../../../../common/dto/api-response.dto';

export class SuggestionImpactDto {
  @ApiPropertyOptional({ nullable: true, example: 15 })
  reachDeltaPct: number | null;

  @ApiPropertyOptional({ nullable: true, example: 12 })
  ordersDeltaPct: number | null;

  @ApiPropertyOptional({ nullable: true, example: 8 })
  roiDeltaPct: number | null;

  @ApiPropertyOptional({ nullable: true, example: 45 })
  expectedOrders: number | null;

  @ApiProperty({ example: 350 })
  costRs: number;

  @ApiProperty({ enum: ['LOW', 'MEDIUM', 'HIGH'], example: 'LOW' })
  effort: 'LOW' | 'MEDIUM' | 'HIGH';
}

export class SuggestionAppliedChangesDto {
  @ApiProperty({ example: 'dailyBudgetRs' })
  field: string;

  @ApiProperty({ example: 200 })
  before: number;

  @ApiProperty({ example: 250 })
  after: number;
}

export class CampaignSuggestionDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: SuggestionType })
  type: SuggestionType;

  @ApiProperty({ example: 'Increase weekend budget' })
  title: string;

  @ApiProperty()
  description: string;

  @ApiPropertyOptional({ nullable: true, description: 'Null for a kitchen-wide suggestion' })
  campaignId: string | null;

  @ApiProperty({ type: SuggestionImpactDto })
  impact: SuggestionImpactDto;

  @ApiProperty({ description: "The AI's own explanation, grounded in this kitchen's real campaign data" })
  reasoning: string;

  @ApiProperty({ enum: SuggestionStatus })
  status: SuggestionStatus;

  @ApiPropertyOptional({ type: SuggestionAppliedChangesDto, nullable: true })
  appliedChanges: SuggestionAppliedChangesDto | null;

  @ApiProperty()
  batchDate: Date;

  @ApiPropertyOptional({ nullable: true })
  appliedAt: Date | null;

  @ApiPropertyOptional({ nullable: true })
  dismissedAt: Date | null;

  @ApiProperty()
  createdAt: Date;
}

export class SuggestionListDto {
  @ApiProperty({ type: [CampaignSuggestionDto] })
  items: CampaignSuggestionDto[];

  @ApiProperty({ type: PageMetaDto })
  meta: PageMetaDto;
}
