import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from 'src/types';

export const GetCurrentUserId = createParamDecorator(
  (_: undefined, context: ExecutionContext): Buffer => {
    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayload;
    return Buffer.from(user.sub, 'base64url');
  }
);
