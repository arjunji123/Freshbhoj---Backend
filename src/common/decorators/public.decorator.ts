import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Mark a route as public (skip JWT auth guard).
 * Usage: @Public() on controller or route handler
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
