import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DayOfWeek } from '@prisma/client';

export class OperatingHoursDayDto {
  @ApiProperty({ example: 'c9d0e1f2-3a4b-4c5d-8e6f-7a8b9c0d1e2f' })
  id: string;

  @ApiProperty({ enum: DayOfWeek, example: DayOfWeek.MONDAY })
  dayOfWeek: DayOfWeek;

  @ApiProperty({ example: false })
  isClosed: boolean;

  @ApiPropertyOptional({ nullable: true, example: '09:00' })
  session1Start: string | null;

  @ApiPropertyOptional({ nullable: true, example: '22:00' })
  session1End: string | null;

  @ApiPropertyOptional({ nullable: true })
  session2Start: string | null;

  @ApiPropertyOptional({ nullable: true })
  session2End: string | null;
}

export class HolidayOverrideDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ example: '2026-10-20', description: 'YYYY-MM-DD, IST calendar date' })
  date: string;

  @ApiProperty({ example: true })
  isClosed: boolean;

  @ApiPropertyOptional({ nullable: true })
  session1Start: string | null;

  @ApiPropertyOptional({ nullable: true })
  session1End: string | null;

  @ApiPropertyOptional({ nullable: true })
  session2Start: string | null;

  @ApiPropertyOptional({ nullable: true })
  session2End: string | null;

  @ApiPropertyOptional({ nullable: true })
  note: string | null;
}

export class WeeklyScheduleDto {
  @ApiProperty({ type: [OperatingHoursDayDto], description: 'Exactly 7 rows, MONDAY..SUNDAY, lazily backfilled from the kitchen’s legacy opensAt/closesAt on first read' })
  weekly: OperatingHoursDayDto[];

  @ApiProperty({ type: [HolidayOverrideDto], description: 'Upcoming overrides only, capped ~60 days out' })
  holidays: HolidayOverrideDto[];
}
