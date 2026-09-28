import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { EscalationStatus } from '@prisma/client';

const STATUS_VALUES = Object.values(EscalationStatus);

export class ListBhojAiEscalationsQueryDto {
  @ApiPropertyOptional({ enum: STATUS_VALUES, description: 'Defaults to OPEN — the queue that needs action.' })
  @IsOptional()
  @IsIn(STATUS_VALUES)
  status?: EscalationStatus;
}
