import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** The `KitchenAccount` attached by `KitchenJwtStrategy`. */
export const CurrentKitchenAccount = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const account = ctx.switchToHttp().getRequest().user;
    return data ? account?.[data] : account;
  },
);
