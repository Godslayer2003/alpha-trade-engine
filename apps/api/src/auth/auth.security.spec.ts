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
});
