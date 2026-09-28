import { BadRequestException, Injectable } from '@nestjs/common';
import { DayOfWeek } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { getIstTodayDateOnly } from '../../../../common/utils/kitchen';
import { UpdateDayHoursDto, UpsertHolidayDto } from './dto/operating-hours.dto';

const ALL_DAYS: DayOfWeek[] = [
  DayOfWeek.MONDAY,
  DayOfWeek.TUESDAY,
  DayOfWeek.WEDNESDAY,
  DayOfWeek.THURSDAY,
  DayOfWeek.FRIDAY,
  DayOfWeek.SATURDAY,
  DayOfWeek.SUNDAY,
];

const HOLIDAY_WINDOW_DAYS = 60;
const IST_OFFSET_MIN = 330;
const DAY_MS = 24 * 60 * 60 * 1000;

type SessionPairs = { session1Start?: string; session1End?: string; session2Start?: string; session2End?: string };

/**
 * The rich replacement for `Kitchen.opensAt`/`closesAt` — per-day sessions plus
 * one-off holiday overrides. Purely CRUD over `KitchenOperatingHours` /
 * `KitchenHolidayOverride`; `isKitchenOpenNow()` (common/utils/kitchen.ts) is
 * the already-tested consumer of these rows and is not touched here.
 *
 * `Kitchen.opensAt`/`closesAt` stay untouched too — they remain the legacy
 * fallback for a kitchen that hasn't been backfilled yet.
 */
@Injectable()
export class OperatingHoursService {
  constructor(private readonly prisma: PrismaService) {}

  async getWeekly(accountId: string) {
    const kitchen = await this.requireKitchen(accountId);
    await this.backfillIfEmpty(kitchen.id, kitchen.opensAt, kitchen.closesAt);

    const today = getIstTodayDateOnly();
    const windowEnd = new Date(today.getTime() + HOLIDAY_WINDOW_DAYS * DAY_MS);

    const [weekly, holidays] = await Promise.all([
      this.prisma.kitchenOperatingHours.findMany({
        where: { kitchenId: kitchen.id },
        orderBy: { dayOfWeek: 'asc' }, // Postgres native enum order matches declaration order: MON..SUN
      }),
      this.prisma.kitchenHolidayOverride.findMany({
        where: { kitchenId: kitchen.id, date: { gte: today, lte: windowEnd } },
        orderBy: { date: 'asc' },
      }),
    ]);

    return { weekly, holidays: holidays.map((h) => this.serializeHoliday(h)) };
  }

  async updateDay(accountId: string, dayOfWeek: DayOfWeek, dto: UpdateDayHoursDto) {
    const kitchen = await this.requireKitchen(accountId);
    this.assertSessionPairs(dto);

    return this.prisma.kitchenOperatingHours.upsert({
      where: { kitchenId_dayOfWeek: { kitchenId: kitchen.id, dayOfWeek } },
      update: {
        isClosed: dto.isClosed,
        session1Start: dto.session1Start ?? null,
        session1End: dto.session1End ?? null,
        session2Start: dto.session2Start ?? null,
        session2End: dto.session2End ?? null,
      },
      create: {
        kitchenId: kitchen.id,
        dayOfWeek,
        isClosed: dto.isClosed,
        session1Start: dto.session1Start ?? null,
        session1End: dto.session1End ?? null,
        session2Start: dto.session2Start ?? null,
        session2End: dto.session2End ?? null,
      },
    });
  }

  async upsertHoliday(accountId: string, dto: UpsertHolidayDto) {
    const kitchen = await this.requireKitchen(accountId);
    this.assertSessionPairs(dto);
    const date = this.parseIstDateOnly(dto.date);

    const row = await this.prisma.kitchenHolidayOverride.upsert({
      where: { kitchenId_date: { kitchenId: kitchen.id, date } },
      update: {
        isClosed: dto.isClosed,
        session1Start: dto.session1Start ?? null,
        session1End: dto.session1End ?? null,
        session2Start: dto.session2Start ?? null,
        session2End: dto.session2End ?? null,
        note: dto.note ?? null,
      },
      create: {
        kitchenId: kitchen.id,
        date,
        isClosed: dto.isClosed,
        session1Start: dto.session1Start ?? null,
        session1End: dto.session1End ?? null,
        session2Start: dto.session2Start ?? null,
        session2End: dto.session2End ?? null,
        note: dto.note ?? null,
      },
    });
    return this.serializeHoliday(row);
  }

  /** A kitchen can always fall back to its regular weekly schedule for that day. */
  async removeHoliday(accountId: string, dateStr: string) {
    const kitchen = await this.requireKitchen(accountId);
    const date = this.parseIstDateOnly(dateStr);
    await this.prisma.kitchenHolidayOverride.deleteMany({ where: { kitchenId: kitchen.id, date } });
    return { date: dateStr };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // INTERNAL
  // ──────────────────────────────────────────────────────────────────────────

  private async backfillIfEmpty(kitchenId: string, opensAt: string, closesAt: string) {
    const existingCount = await this.prisma.kitchenOperatingHours.count({ where: { kitchenId } });
    if (existingCount > 0) return;

    await this.prisma.kitchenOperatingHours.createMany({
      data: ALL_DAYS.map((dayOfWeek) => ({
        kitchenId,
        dayOfWeek,
        isClosed: false,
        session1Start: opensAt,
        session1End: closesAt,
        session2Start: null,
        session2End: null,
      })),
      skipDuplicates: true,
    });
  }

  private assertSessionPairs(dto: SessionPairs) {
    const pairs: Array<[keyof SessionPairs, keyof SessionPairs]> = [
      ['session1Start', 'session1End'],
      ['session2Start', 'session2End'],
    ];
    for (const [startKey, endKey] of pairs) {
      if ((dto[startKey] !== undefined) !== (dto[endKey] !== undefined)) {
        throw new BadRequestException(`${startKey} and ${endKey} must be set together, or not at all`);
      }
    }
  }

  private async requireKitchen(accountId: string) {
    const kitchen = await this.prisma.kitchen.findUnique({
      where: { accountId },
      select: { id: true, opensAt: true, closesAt: true },
    });
    if (!kitchen) throw new BadRequestException('Complete onboarding to create your kitchen first');
    return kitchen;
  }

  /**
   * Converts a partner-supplied "YYYY-MM-DD" (an IST calendar date) into the
   * same UTC-instant convention `getIstTodayDateOnly()` uses, so equality and
   * range comparisons against it (and against rows written by it) stay
   * consistent regardless of the server's own timezone.
   */
  private parseIstDateOnly(dateStr: string): Date {
    const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number);
    return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0) - IST_OFFSET_MIN * 60_000);
  }

  /**
   * Inverse of `parseIstDateOnly`. `@db.Date` columns carry no timezone, so
   * once the IST-shifted instant above round-trips through Postgres it reads
   * back as UTC-midnight of the *previous* UTC calendar day (the 5.5h
   * subtraction always crosses midnight). Adding a day back recovers the
   * calendar date the partner actually typed, and this is the only place
   * that matters — every WHERE clause above compares instants directly
   * (verified self-consistent), this just fixes what the API returns.
   */
  private serializeHoliday<T extends { date: Date }>(row: T): Omit<T, 'date'> & { date: string } {
    const { date, ...rest } = row;
    return { ...rest, date: new Date(date.getTime() + DAY_MS).toISOString().slice(0, 10) };
  }
}
