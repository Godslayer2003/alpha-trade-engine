import * as bcrypt from 'bcryptjs';
import { MfaService } from './mfa.service';
import { AccountTokenService } from './account-token.service';

describe('MFA enrollment across password recovery', () => {
  it('rejects enrollment started with a password changed during verification', async () => {
    const passwordHash = bcrypt.hashSync('fixture-password', 4);
    const updateMany = jest.fn().mockResolvedValue({ count: 0 });
    const service = new MfaService({ user: {
      findUniqueOrThrow: jest.fn().mockResolvedValue({ passwordHash, mfaEnabled: false }), updateMany,
    } } as never);
    jest.spyOn(service as any, 'otp').mockReturnValue({ generateSecret: () => 'fixture-secret' });
    jest.spyOn(service as any, 'encrypt').mockReturnValue('encrypted-fixture');
    await expect(service.begin('owner', 'fixture-password')).rejects.toThrow();
    expect(updateMany.mock.calls[0][0].where).toEqual({ id: 'owner', passwordHash, mfaEnabled: false });
  });
  it('rejects confirmation when password changes after the snapshot', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 0 });
    const revoke = jest.fn();
    const tx = { user: { updateMany }, authSession: { updateMany: revoke } };
    const service = new MfaService({ user: { findUniqueOrThrow: jest.fn().mockResolvedValue({
      passwordHash: 'old-hash', mfaEnabled: false, mfaSecret: 'pending-secret',
    }) }, $transaction: (run: (client: typeof tx) => unknown) => run(tx) } as never);
    jest.spyOn(service, 'verify').mockResolvedValue(undefined);
    await expect(service.confirm('owner', '123456')).rejects.toThrow('Enrollment changed');
    expect(updateMany.mock.calls[0][0].where.passwordHash).toBe('old-hash');
    expect(revoke).not.toHaveBeenCalled();
  });
  it('clears only unfinished enrollment during password recovery', async () => {
    const clearPending = jest.fn();
    const tx = { accountToken: {
      findUnique: jest.fn().mockResolvedValue({ id: 'fixture', userId: 'owner', purpose: 'reset', expiresAt: new Date(Date.now() + 60000) }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    }, user: { update: jest.fn(), updateMany: clearPending }, authSession: { updateMany: jest.fn() } };
    const service = new AccountTokenService({ $transaction: (run: (client: typeof tx) => unknown) => run(tx) } as never, {} as never);
    await service.consume('a'.repeat(64), 'reset', 'fixture-new-password');
    expect(clearPending).toHaveBeenCalledWith({ where: { id: 'owner', mfaEnabled: false }, data: { mfaSecret: null, mfaLastStep: -1 } });
  });
});
