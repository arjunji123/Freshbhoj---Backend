import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * V0 ops-tool auth: a single shared secret, since there's no admin user
 * system yet (see the "ops console will own approval in Phase 2" note this
 * replaces). Deliberately fails closed — if ADMIN_SECRET isn't configured,
 * every request is rejected rather than silently left open.
 */
@Injectable()
export class AdminSecretGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const configured = this.configService.get<string>('app.adminSecret');
    if (!configured) {
      throw new UnauthorizedException('Admin access is not configured');
    }

    const request = context.switchToHttp().getRequest();
    const provided = request.headers['x-admin-secret'];
    if (provided !== configured) {
      throw new UnauthorizedException('Invalid admin secret');
    }

    return true;
  }
}
