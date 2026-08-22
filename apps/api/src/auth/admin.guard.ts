import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

// Must come after JwtAuthGuard in @UseGuards() — it reads req.user, which
// only JwtAuthGuard populates. There's no admin/role column on User, so
// without this any self-registered visitor is indistinguishable from the
// site operator on "operator only" routes (assistant config, feedback log).
@Injectable()
export class AdminGuard implements CanActivate {
  private readonly adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();
    if (!user?.email || !this.adminEmails.includes(String(user.email).toLowerCase())) {
      throw new ForbiddenException('Admin access required.');
    }
    return true;
  }
}
