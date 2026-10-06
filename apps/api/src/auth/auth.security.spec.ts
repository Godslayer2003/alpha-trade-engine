import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';

describe('account privilege boundaries', () => {
  const originalAdminEmails = process.env.ADMIN_EMAILS;
  const originalJwtSecret = process.env.JWT_SECRET;

  beforeEach(() => { process.env.JWT_SECRET = 'test-only-secret-with-sufficient-length'; });

  afterEach(() => {
    if (originalAdminEmails === undefined) delete process.env.ADMIN_EMAILS;
    else process.env.ADMIN_EMAILS = originalAdminEmails;
    if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalJwtSecret;
  });

  it('refuses public registration for an unclaimed admin address', async () => {
    process.env.ADMIN_EMAILS = 'operator@example.com';
    const prisma = { user: { findUnique: jest.fn(), create: jest.fn() } };
    const service = new AuthService(prisma as never, {} as never);

    await expect(service.register({
      email: 'operator@example.com', password: 'long-enough-password', acceptedTerms: true,
    })).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('rejects a token for a deleted user', async () => {
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue(null) } };
    const strategy = new JwtStrategy(prisma as never);

    await expect(strategy.validate({ sub: 'deleted-id', email: 'operator@example.com' }))
      .rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('uses the current database email for authorization', async () => {
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue({ id: 'user-id', email: 'new@example.com' }) } };
    const strategy = new JwtStrategy(prisma as never);

    await expect(strategy.validate({ sub: 'user-id', email: 'operator@example.com' }))
      .resolves.toEqual({ userId: 'user-id', email: 'new@example.com' });
  });
});
