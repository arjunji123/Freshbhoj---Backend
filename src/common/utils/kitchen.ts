/**
 * Opening hours are stored as "HH:mm" IST strings on the kitchen row.
 * The app shows an "Open Now" / "Closed" pill from this, so both the list and
 * the detail endpoint must agree — hence one helper.
 */
export function isKitchenOpenNow(
  opensAt: string,
  closesAt: string,
  now: Date = new Date(),
): boolean {
  const istNow = new Date(now.getTime() + (330 + now.getTimezoneOffset()) * 60_000);
  const minutesNow = istNow.getHours() * 60 + istNow.getMinutes();

  const toMinutes = (hhmm: string): number => {
    const [h, m] = hhmm.split(':').map((v) => parseInt(v, 10));
    return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
  };

  const open = toMinutes(opensAt);
  const close = toMinutes(closesAt);

  // Kitchens that close past midnight (e.g. 18:00 → 02:00) wrap around.
  return close > open
    ? minutesNow >= open && minutesNow < close
    : minutesNow >= open || minutesNow < close;
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
