import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { KitchenAccountStatus } from '@prisma/client';
import { KitchenAuthService } from '../kitchen-auth.service';

export interface KitchenJwtPayload {
  sub: string;
  phone: string;
  aud: string;
}

/**
 * Registered under the name `kitchen-jwt`, separate from the customer `jwt`
 * strategy. The `aud` check is the load-bearing line: a customer access token
 * is signed with the same secret, so without it a customer could call partner
 * endpoints.
 */
@Injectable()
export class KitchenJwtStrategy extends PassportStrategy(Strategy, 'kitchen-jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly kitchenAuthService: KitchenAuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.accessSecret'),
      // Passport would otherwise reject our `aud` claim before we can read it.
      audience: 'kitchen',
    });
  }

  async validate(payload: KitchenJwtPayload) {
    if (payload.aud !== 'kitchen') {
      throw new UnauthorizedException('This token is not valid for the partner portal');
    }

    const account = await this.kitchenAuthService.validateAccount(payload.sub);
    if (!account) throw new UnauthorizedException('Partner account not found');

    if (account.status === KitchenAccountStatus.SUSPENDED) {
      throw new UnauthorizedException('This partner account has been suspended');
    }

    return account;
  }
}
