import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

// Roles are read from the database by JwtStrategy on every request.
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();
    if (user?.role !== 'ADMIN') {
      throw new ForbiddenException('Admin access required.');
    }
    if (!user.mfaVerified) throw new ForbiddenException('Enable MFA in Settings and sign in with an authenticator code for admin access.');
    return true;
  }
}
