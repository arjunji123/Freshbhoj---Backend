import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { SuggestionStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../../../../common/dto/pagination.dto';

const STATUS_VALUES = Object.values(SuggestionStatus);

export class ListSuggestionsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: STATUS_VALUES })
  @IsOptional()
  @IsIn(STATUS_VALUES)
  status?: SuggestionStatus;

  @ApiPropertyOptional({ example: 'budget' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;
}
