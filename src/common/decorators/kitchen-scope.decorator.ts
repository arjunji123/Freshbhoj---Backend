import { SetMetadata } from '@nestjs/common';

export const IS_KITCHEN_SCOPE_KEY = 'isKitchenScope';

/**
 * Marks a controller (or route) as belonging to the kitchen-partner realm.
 *
 * Customer and kitchen access tokens are both HS256-signed with
 * `jwt.accessSecret`, so without this the global customer `JwtAuthGuard`
 * would successfully verify a kitchen token's signature, look up
 * `payload.sub` in the `User` table, find nothing, and reject the request
 * with a misleading 401 — before `KitchenAuthGuard` (applied locally via
 * `@UseGuards`) ever gets a chance to authenticate it correctly.
 *
 * The global guard treats this the same as `@Public()` and steps aside;
 * `KitchenAuthGuard` does not look at this key, so it still enforces auth.
 */
export const KitchenScope = () => SetMetadata(IS_KITCHEN_SCOPE_KEY, true);
