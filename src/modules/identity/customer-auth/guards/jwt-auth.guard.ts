import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../../../common/decorators/public.decorator';
import { IS_KITCHEN_SCOPE_KEY } from '../../../../common/decorators/kitchen-scope.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // `/partner/**` routes carry their own token audience (`aud: 'kitchen'`)
    // and their own guard (`KitchenAuthGuard`); this guard must not attempt to
    // decode that token as a customer's, so it steps aside entirely.
    if (this.isKitchenScope(context)) {
      return true;
    }

    if (!this.isPublic(context)) {
      return (await super.canActivate(context)) as boolean;
    }

    // Public route: still try to resolve the bearer token so browsable screens
    // (Home, meal detail, reels) can personalise for a signed-in user — but a
    // missing or expired token must never block the request.
    try {
      await super.canActivate(context);
    } catch {
      // Ignored by design — see handleRequest below.
    }
    return true;
  }

  /**
   * On public routes an auth failure yields `undefined` instead of a 401, which
   * leaves `request.user` unset for `@OptionalUser()` to read.
   */
  handleRequest<TUser = any>(
    err: any,
    user: any,
    info: any,
    context: ExecutionContext,
    status?: any,
  ): TUser {
    if (this.isPublic(context)) {
      return (user || undefined) as TUser;
    }
    return super.handleRequest(err, user, info, context, status);
  }

  private isPublic(context: ExecutionContext): boolean {
    return (
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? false
    );
  }

  private isKitchenScope(context: ExecutionContext): boolean {
    return (
      this.reflector.getAllAndOverride<boolean>(IS_KITCHEN_SCOPE_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? false
    );
  }
}
