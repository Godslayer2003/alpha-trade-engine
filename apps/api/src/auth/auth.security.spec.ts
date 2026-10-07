import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { AdminGuard } from './admin.guard';
import * as bcrypt from 'bcryptjs';

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
    const service = new AuthService(prisma as never, {} as never, {} as never);

    await expect(service.register({
      email: 'operator@example.com', password: 'long-enough-password', acceptedTerms: true,
    })).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('rejects legacy tokens without a server session', async () => {
    const strategy = new JwtStrategy({} as never);
    await expect(strategy.validate({ sub: 'user-id', email: 'user@example.com' }))
      .rejects.toBeInstanceOf(UnauthorizedException);
  });

  it.each(['revoked', 'expired', 'wrong-owner', 'missing'])('rejects a %s session', async (state) => {
    const session = state === 'missing' ? null : {
      id: 'session-id', userId: state === 'wrong-owner' ? 'other-user' : 'user-id',
      revokedAt: state === 'revoked' ? new Date() : null,
      expiresAt: new Date(Date.now() + (state === 'expired' ? -1000 : 60000)),
      user: { id: 'user-id', email: 'new@example.com', role: 'USER' },
    };
    const strategy = new JwtStrategy({ authSession: { findUnique: jest.fn().mockResolvedValue(session) } } as never);
    await expect(strategy.validate({ sub: 'user-id', email: 'old@example.com', sid: 'session-id' }))
      .rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('uses current account data only for an active owned session', async () => {
    const session = { id: 'session-id', userId: 'user-id', revokedAt: null, mfaVerified: false,
      expiresAt: new Date(Date.now() + 60000), user: { id: 'user-id', email: 'new@example.com', role: 'USER' } };
    const strategy = new JwtStrategy({ authSession: { findUnique: jest.fn().mockResolvedValue(session) } } as never);
    await expect(strategy.validate({ sub: 'user-id', email: 'old@example.com', sid: 'session-id' }))
      .resolves.toEqual({ userId: 'user-id', email: 'new@example.com', role: 'USER', mfaVerified: false, sessionId: 'session-id' });
  });

  it.each([
    { role: 'USER', mfaVerified: true },
    { role: 'ADMIN', mfaVerified: false },
    undefined,
  ])('denies admin access without both the role and MFA', (user) => {
    const context = { switchToHttp: () => ({ getRequest: () => ({ user }) }) };
    expect(() => new AdminGuard().canActivate(context as never)).toThrow(ForbiddenException);
  });

  it('requires a fresh MFA code before a password change writes anything', async () => {
    const user = { passwordHash: bcrypt.hashSync('current-password', 4), mfaEnabled: true, mfaSecret: 'encrypted' };
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue(user) }, $transaction: jest.fn() };
    const mfa = { verify: jest.fn().mockRejectedValue(new UnauthorizedException()) };
    const service = new AuthService(prisma as never, {} as never, mfa as never);
    await expect(service.changePassword('user-id', 'current-password', 'new-password-long')).rejects.toThrow(UnauthorizedException);
    expect(mfa.verify).not.toHaveBeenCalled();
    await expect(service.changePassword('user-id', 'current-password', 'new-password-long', '123456')).rejects.toThrow(UnauthorizedException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects a password change if account security changed during reauthentication', async () => {
    const user = { passwordHash: bcrypt.hashSync('current-password', 4), mfaEnabled: true, mfaSecret: 'encrypted' };
    const tx = { user: { findUnique: jest.fn().mockResolvedValue({ ...user, passwordHash: 'concurrently-changed' }), update: jest.fn() } };
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue(user) }, $transaction: (run: (client: typeof tx) => unknown) => run(tx) };
    const service = new AuthService(prisma as never, {} as never, { verify: jest.fn().mockResolvedValue(undefined) } as never);
    await expect(service.changePassword('user-id', 'current-password', 'new-password-long', '123456')).rejects.toThrow(UnauthorizedException);
    expect(tx.user.update).not.toHaveBeenCalled();
  });
});
