import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../../../common/decorators/public.decorator';

/**
 * Protects `/partner/**`. Applied per-controller rather than globally, because
 * the global guard is the customer one — a request carrying a customer token
 * must fail here, not fall through.
 */
@Injectable()
export class KitchenAuthGuard extends AuthGuard('kitchen-jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }
}
