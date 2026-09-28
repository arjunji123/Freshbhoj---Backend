import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

const HHMM_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const HHMM_MESSAGE = 'Use HH:mm, e.g. 09:00';

export class UpdateDayHoursDto {
  @ApiProperty({ example: false })
  @IsBoolean()
  isClosed: boolean;

  @ApiPropertyOptional({ example: '09:00', description: 'HH:mm, IST — session1Start/End must be set together, or not at all' })
  @IsOptional()
  @Matches(HHMM_REGEX, { message: HHMM_MESSAGE })
  session1Start?: string;

  @ApiPropertyOptional({ example: '15:00' })
  @IsOptional()
  @Matches(HHMM_REGEX, { message: HHMM_MESSAGE })
  session1End?: string;

  @ApiPropertyOptional({ example: '18:00', description: 'session2Start/End must be set together, or not at all' })
  @IsOptional()
  @Matches(HHMM_REGEX, { message: HHMM_MESSAGE })
  session2Start?: string;

  @ApiPropertyOptional({ example: '22:30' })
  @IsOptional()
  @Matches(HHMM_REGEX, { message: HHMM_MESSAGE })
  session2End?: string;
}

export class UpsertHolidayDto {
  @ApiProperty({ example: '2026-10-20', description: 'ISO date string (Diwali, a family event, etc.)' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  isClosed: boolean;

  @ApiPropertyOptional({ example: '10:00', description: 'Only meaningful when isClosed=false — must be set together with session1End' })
  @IsOptional()
  @Matches(HHMM_REGEX, { message: HHMM_MESSAGE })
  session1Start?: string;

  @ApiPropertyOptional({ example: '14:00' })
  @IsOptional()
  @Matches(HHMM_REGEX, { message: HHMM_MESSAGE })
  session1End?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(HHMM_REGEX, { message: HHMM_MESSAGE })
  session2Start?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(HHMM_REGEX, { message: HHMM_MESSAGE })
  session2End?: string;

  @ApiPropertyOptional({ example: 'Closed for Diwali' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}
