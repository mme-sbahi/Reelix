import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// Usage: profile(@CurrentUser() user: { userId: string; email: string })
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);
