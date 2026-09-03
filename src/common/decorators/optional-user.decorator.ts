import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Like `@CurrentUser()`, but for `@Public()` routes.
 *
 * Home, meal detail and the reels feed are browsable while logged out, yet they
 * still personalise (favourites, likes, follows) when a token happens to be
 * present. `OptionalAuthGuard` decodes any bearer token without rejecting the
 * request; this pulls out whatever it found — or `undefined`.
 */
export const OptionalUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    if (!user) return undefined;
    return data ? user?.[data] : user;
  },
);
