import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseEnumPipe, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DayOfWeek, KitchenAccount } from '@prisma/client';
import { OperatingHoursService } from './operating-hours.service';
import { UpdateDayHoursDto, UpsertHolidayDto } from './dto/operating-hours.dto';
import { HolidayOverrideDto, OperatingHoursDayDto, WeeklyScheduleDto } from './dto/operating-hours.response.dto';
import { KitchenAuthGuard } from '../../../identity/kitchen-auth/guards/kitchen-auth.guard';
import { CurrentKitchenAccount } from '../../../identity/kitchen-auth/decorators/current-kitchen.decorator';
import { ApiEnvelope } from '../../../../common/decorators/api-envelope.decorator';
import { KitchenScope } from '../../../../common/decorators/kitchen-scope.decorator';

/**
 * Emergency Close needs no endpoint here — it's the pre-existing
 * `PATCH /partner/kitchen/accepting-orders` (`KitchenProfileController`), the
 * Timings screen just calls it too.
 */
@ApiTags('Kitchen · Operating Hours')
@ApiBearerAuth('JWT-auth')
@UseGuards(KitchenAuthGuard)
@KitchenScope()
@Controller('partner/operating-hours')
export class OperatingHoursController {
  constructor(private readonly operatingHoursService: OperatingHoursService) {}

  @Get()
  @ApiOperation({ summary: 'Weekly schedule (lazily backfilled from opensAt/closesAt on first read) plus upcoming holiday overrides' })
  @ApiEnvelope(WeeklyScheduleDto)
  async getWeekly(@CurrentKitchenAccount() account: KitchenAccount) {
    return { message: 'Operating hours fetched', data: await this.operatingHoursService.getWeekly(account.id) };
  }

  @Put(':dayOfWeek')
  @ApiOperation({ summary: "Replace one day's sessions" })
  @ApiEnvelope(OperatingHoursDayDto)
  async updateDay(
    @CurrentKitchenAccount() account: KitchenAccount,
    @Param('dayOfWeek', new ParseEnumPipe(DayOfWeek)) dayOfWeek: DayOfWeek,
    @Body() dto: UpdateDayHoursDto,
  ) {
    return {
      message: `${dayOfWeek} hours updated`,
      data: await this.operatingHoursService.updateDay(account.id, dayOfWeek, dto),
    };
  }

  @Post('holidays')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add or replace a one-off override for a specific date' })
  @ApiEnvelope(HolidayOverrideDto)
  async upsertHoliday(@CurrentKitchenAccount() account: KitchenAccount, @Body() dto: UpsertHolidayDto) {
    return { message: 'Holiday override saved', data: await this.operatingHoursService.upsertHoliday(account.id, dto) };
  }

  @Delete('holidays/:date')
  @ApiOperation({ summary: 'Remove an override — falls back to the regular weekly schedule for that day' })
  async removeHoliday(@CurrentKitchenAccount() account: KitchenAccount, @Param('date') date: string) {
    return { message: 'Holiday override removed', data: await this.operatingHoursService.removeHoliday(account.id, date) };
  }
}
