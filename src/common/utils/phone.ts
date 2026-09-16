/**
 * `@IsMobilePhone('en-IN')` accepts several textual formats for the same real
 * number ("9876543210", "919876543210", "+919876543210" all validate as
 * distinct strings). Every place that uses a phone number as a lookup key —
 * Redis OTP keys, `OtpLog` rows, `User`/`KitchenAccount` find-or-create — must
 * normalize first, or the same person can end up with duplicate rows / missed
 * lookups depending on which format they typed.
 *
 * Defensive E.164-ish normalization — neither OTP flow guarantees a `+91`
 * prefix on input.
 */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return `+91${digits.slice(-10)}`;
}
