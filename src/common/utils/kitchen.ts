import { DayOfWeek } from '@prisma/client';

const IST_OFFSET_MIN = 330;

/** IST wall-clock minutes-since-midnight for `now`. */
function istMinutesNow(now: Date): number {
  const istNow = new Date(now.getTime() + (IST_OFFSET_MIN + now.getTimezoneOffset()) * 60_000);
  return istNow.getHours() * 60 + istNow.getMinutes();
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map((v) => parseInt(v, 10));
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

/** Handles kitchens that close past midnight (e.g. 18:00 → 02:00). */
function isWithinSession(start: string, end: string, minutesNow: number): boolean {
  const open = toMinutes(start);
  const close = toMinutes(end);
  return close > open ? minutesNow >= open && minutesNow < close : minutesNow >= open || minutesNow < close;
}

/**
 * Midnight IST for `now`, as a UTC instant — the same shape Postgres's
 * `@db.Date` columns compare against. Matches the correction already used in
 * `KitchenDashboardService.getIstDayBounds`.
 */
export function getIstTodayDateOnly(now: Date = new Date()): Date {
  const istNow = new Date(now.getTime() + (IST_OFFSET_MIN + now.getTimezoneOffset()) * 60_000);
  const startOfDayIst = new Date(istNow);
  startOfDayIst.setHours(0, 0, 0, 0);
  return new Date(startOfDayIst.getTime() - (IST_OFFSET_MIN + now.getTimezoneOffset()) * 60_000);
}

/**
 * Today's IST calendar date, as literal UTC-midnight of that date (e.g.
 * "2026-09-29T00:00:00.000Z") — NOT the same value as `getIstTodayDateOnly()`,
 * which is genuine IST midnight (5.5h earlier in UTC terms). That distinction
 * matters once a value is going to be written to, or compared via day-count
 * *arithmetic* against, a `@db.Date` column: Postgres/Prisma store a
 * `@db.Date` by taking the UTC calendar day the given instant falls in and
 * dropping the time — genuine IST-midnight (18:30 UTC the *previous* day)
 * round-trips back one day early, silently corrupting day-diff math (a
 * `<`/`>` check tends to survive the ~18h skew; an exact
 * `Math.round(diff / DAY_MS)` does not). A value already at UTC midnight has
 * no such ambiguity — it's a fixed point, so it round-trips unchanged and
 * every later comparison/subtraction against a fresh call stays exact.
 * `getIstTodayDateOnly()` stays as-is for its existing callers (range/equality
 * comparisons against `KitchenHolidayOverride`, which don't do this arithmetic
 * and are already tested); use this one for any *new* `@db.Date` field.
 */
export function getIstCalendarDate(now: Date = new Date()): Date {
  const istNow = new Date(now.getTime() + (IST_OFFSET_MIN + now.getTimezoneOffset()) * 60_000);
  return new Date(Date.UTC(istNow.getFullYear(), istNow.getMonth(), istNow.getDate()));
}

const IST_DAY_NAMES: DayOfWeek[] = [
  DayOfWeek.SUNDAY,
  DayOfWeek.MONDAY,
  DayOfWeek.TUESDAY,
  DayOfWeek.WEDNESDAY,
  DayOfWeek.THURSDAY,
  DayOfWeek.FRIDAY,
  DayOfWeek.SATURDAY,
];

/** The IST day-of-week for `now`. */
export function getIstDayOfWeek(now: Date = new Date()): DayOfWeek {
  const istNow = new Date(now.getTime() + (IST_OFFSET_MIN + now.getTimezoneOffset()) * 60_000);
  return IST_DAY_NAMES[istNow.getDay()];
}

interface DaySessions {
  isClosed: boolean;
  session1Start: string | null;
  session1End: string | null;
  session2Start: string | null;
  session2End: string | null;
}

function isOpenInSessions(sessions: DaySessions, minutesNow: number): boolean {
  if (sessions.isClosed) return false;
  const inSession1 = sessions.session1Start && sessions.session1End && isWithinSession(sessions.session1Start, sessions.session1End, minutesNow);
  const inSession2 = sessions.session2Start && sessions.session2End && isWithinSession(sessions.session2Start, sessions.session2End, minutesNow);
  return Boolean(inSession1 || inSession2);
}

export interface KitchenScheduleInput {
  /** Legacy single-window hours — always present, used when there's no richer data. */
  opensAt: string;
  closesAt: string;
  /** This kitchen's weekly schedule, if it has been set up (0 or 7 rows). */
  operatingHours?: (DaySessions & { dayOfWeek: DayOfWeek })[];
  /** A `KitchenHolidayOverride` row for today, if one exists — takes precedence over the weekly schedule. */
  holidayOverride?: DaySessions | null;
}

/**
 * Whether a kitchen is open right now, in IST. Three layers, most specific
 * wins:
 *   1. A holiday override for today, if present.
 *   2. Today's row in the weekly `operatingHours`, if the kitchen has any.
 *   3. The legacy single opensAt/closesAt window — the fallback for every
 *      kitchen until it's been set up with the richer schedule. This branch
 *      is byte-identical to the pre-refactor behavior, so a kitchen with zero
 *      `operatingHours` rows sees no change at all.
 */
export function isKitchenOpenNow(kitchen: KitchenScheduleInput, now: Date = new Date()): boolean {
  const minutesNow = istMinutesNow(now);

  if (kitchen.holidayOverride) {
    return isOpenInSessions(kitchen.holidayOverride, minutesNow);
  }

  if (kitchen.operatingHours && kitchen.operatingHours.length > 0) {
    const today = getIstDayOfWeek(now);
    const todayRow = kitchen.operatingHours.find((r) => r.dayOfWeek === today);
    if (todayRow) return isOpenInSessions(todayRow, minutesNow);
    // A partial weekly schedule (shouldn't normally happen — the read path
    // backfills all 7) falls back to the legacy window rather than assuming closed.
  }

  return isWithinSession(kitchen.opensAt, kitchen.closesAt, minutesNow);
}

/** Great-circle distance in km, used to sort kitchens/meals by nearness. */
export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)) * 10) / 10;
}

/**
 * Latitude/longitude window that encloses a radius, for use as a SQL prefilter.
 *
 * Postgres cannot index a haversine expression without PostGIS, so the query
 * narrows with a cheap indexed BETWEEN on the box and the exact distance is
 * refined in JS. The box over-selects by at most ~27% (the corners), which is
 * a rounding error at this catalogue size and avoids a full table scan.
 */
export function boundingBox(latitude: number, longitude: number, radiusKm: number) {
  const latDelta = radiusKm / 111.045;
  // Degrees of longitude shrink as you move away from the equator.
  const cos = Math.cos((latitude * Math.PI) / 180);
  const lngDelta = radiusKm / (111.045 * Math.max(cos, 0.01));

  return {
    minLat: latitude - latDelta,
    maxLat: latitude + latDelta,
    minLng: longitude - lngDelta,
    maxLng: longitude + lngDelta,
  };
}

/** "1.2 km away" / "800 m away" */
export function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}
