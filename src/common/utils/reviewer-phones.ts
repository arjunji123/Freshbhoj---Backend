import { normalizePhone } from './phone';

/**
 * App-store reviewers can't reliably receive real SMS, and OTP_DEV_MODE must
 * stay off in production for real security. This lets specific, explicitly
 * whitelisted numbers (a reviewer contact number, or a demo account used in
 * store-listing instructions) always resolve to one fixed OTP — every other
 * number still gets a real, randomly generated OTP sent over SMS.
 *
 * Configured via REVIEWER_TEST_PHONES="+91XXXXXXXXXX:111222,+919555512345:123456".
 * Unset (the default) disables this entirely — no behavior change.
 */
export function getReviewerOtp(rawPhone: string, configValue: string | undefined): string | null {
  if (!configValue) return null;
  const phone = normalizePhone(rawPhone);

  for (const entry of configValue.split(',')) {
    const [entryPhone, otp] = entry.split(':').map((part) => part?.trim());
    if (!entryPhone || !otp) continue;
    if (normalizePhone(entryPhone) === phone) return otp;
  }

  return null;
}
