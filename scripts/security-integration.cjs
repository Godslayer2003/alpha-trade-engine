// Uses only disposable local/CI PostgreSQL. Never point this test at production.
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const { JwtService } = require('@nestjs/jwt');
const { generate } = require('otplib');
const { AuthService } = require('../apps/api/dist/auth/auth.service');
const { JwtStrategy } = require('../apps/api/dist/auth/jwt.strategy');
const { MfaService } = require('../apps/api/dist/auth/mfa.service');
const { AccountTokenService } = require('../apps/api/dist/auth/account-token.service');
const { SecurityQuotaService } = require('../apps/api/dist/auth/security-quota.service');
const { AccountManagementService } = require('../apps/api/dist/auth/account-management.service');
const { RetentionService } = require('../apps/api/dist/auth/retention.service');

async function main() {
  const url = new URL(process.env.DATABASE_URL || '');
  assert(['localhost', '127.0.0.1'].includes(url.hostname), 'Only a disposable local database is allowed');
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = randomBytes(32).toString('hex');
  process.env.MFA_ENCRYPTION_KEY = randomBytes(32).toString('base64');
  const prisma = new PrismaClient();
  const jwt = new JwtService({ secret: process.env.JWT_SECRET, signOptions: { expiresIn: '1d' } });
  const mfa = new MfaService(prisma);
  const auth = new AuthService(prisma, jwt, mfa);
  const strategy = new JwtStrategy(prisma);
  const email = `security-${randomBytes(8).toString('hex')}@example.invalid`;
  const password = randomBytes(24).toString('hex');
  let userId;
  let unrelatedId;
  try {
    const registered = await auth.register({ email, password, acceptedTerms: true });
    userId = registered.user.id;
    const payload = jwt.verify(registered.accessToken);
    assert.equal((await strategy.validate(payload)).userId, userId);
    await auth.revokeSession(payload.sid, userId);
    await assert.rejects(strategy.validate(payload));

    const login = await auth.login({ email, password });
    const loginPayload = jwt.verify(login.accessToken);
    await assert.rejects(mfa.begin(userId, 'wrong-password'));
    const setup = await mfa.begin(userId, password);
    const enrolled = await mfa.confirm(userId, await generate({ secret: setup.secret }));
    assert.equal(enrolled.recoveryCodes.length, 10);
    await assert.rejects(strategy.validate(loginPayload));
    await assert.rejects(auth.login({ email, password }));
    const secured = await auth.login({ email, password, otp: enrolled.recoveryCodes[0] });
    const securedPayload = jwt.verify(secured.accessToken);
    assert.equal((await strategy.validate(securedPayload)).mfaVerified, true);
    await assert.rejects(auth.login({ email, password, otp: enrolled.recoveryCodes[0] }));
    const stored = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    assert.notEqual(stored.mfaSecret, setup.secret);
    assert(!stored.mfaRecoveryHashes.includes(enrolled.recoveryCodes[0]));

    const quota = new SecurityQuotaService(prisma);
    const scope = `integration-${userId}`;
    const attempts = await Promise.allSettled(Array.from({ length: 5 }, () => quota.consume(scope, userId, 2, 60000)));
    assert.equal(attempts.filter(result => result.status === 'fulfilled').length, 2);

    process.env.EMAIL_FROM = 'test@example.invalid';
    process.env.RESEND_API_KEY = 'disposable-test-value';
    process.env.WEB_ORIGIN = 'http://localhost:3010';
    let html = '';
    const tokens = new AccountTokenService(prisma, { sendAccountEmail: async (_to, _subject, content) => { html = content; } });
    await tokens.request(email, 'verify');
    const verification = html.match(/#verify=([a-f0-9]{64})/)[1];
    await tokens.consume(verification, 'verify');
    await assert.rejects(tokens.consume(verification, 'verify'));
    await tokens.request(email, 'reset');
    const reset = html.match(/#reset=([a-f0-9]{64})/)[1];
    const nextPassword = randomBytes(24).toString('hex');
    const resets = await Promise.allSettled([tokens.consume(reset, 'reset', nextPassword), tokens.consume(reset, 'reset', nextPassword)]);
    assert.equal(resets.filter(result => result.status === 'fulfilled').length, 1);
    await assert.rejects(strategy.validate(securedPayload));
    await assert.rejects(auth.login({ email, password, otp: enrolled.recoveryCodes[1] }));
    const recovered = await auth.login({ email, password: nextPassword, otp: enrolled.recoveryCodes[1] });
    assert.equal((await strategy.validate(jwt.verify(recovered.accessToken))).mfaVerified, true);
    await auth.revokeAllSessions(userId);
    await assert.rejects(strategy.validate(jwt.verify(recovered.accessToken)));
    const accounts = new AccountManagementService(prisma, mfa);
    const unrelated = await auth.register({ email: `other-${email}`, password, acceptedTerms: true });
    unrelatedId = unrelated.user.id;
    await assert.rejects(accounts.exportData(userId, { password: 'incorrect' }));
    await assert.rejects(accounts.deleteAccount(userId, { password: nextPassword }));
    await prisma.userProfile.upsert({ where: { userId }, create: { userId, profilePictureUrl: 'data:image/png;base64,fixture' }, update: { profilePictureUrl: 'data:image/png;base64,fixture' } });
    await accounts.removePicture(userId);
    assert.equal((await prisma.userProfile.findUniqueOrThrow({ where: { userId } })).profilePictureUrl, null);
    const feedback = await prisma.assistantFeedback.create({ data: { userId, question: 'fixture', answer: 'fixture', rating: 'UP', model: 'fixture', responseTimeMs: 0, inputTokens: 0, outputTokens: 0 } });
    const exported = await accounts.exportData(userId, { password: nextPassword, otp: enrolled.recoveryCodes[2] });
    assert.equal(exported.email, email);
    assert.equal(exported.assistantFeedback.length, 1);
    for (const secret of ['passwordHash', 'mfaSecret', 'mfaRecoveryHashes', 'authSessions', 'accountTokens']) assert(!Object.hasOwn(exported, secret));
    await prisma.assistantFeedback.update({ where: { id: feedback.id }, data: { createdAt: new Date(Date.now() - 31 * 86400000) } });
    await new RetentionService(prisma).purgeExpired();
    assert.equal(await prisma.assistantFeedback.findUnique({ where: { id: feedback.id } }), null);
    await prisma.assistantFeedback.create({ data: { userId, question: 'fresh', answer: 'fixture', rating: 'UP', model: 'fixture', responseTimeMs: 0, inputTokens: 0, outputTokens: 0 } });
    await accounts.deleteAccount(userId, { password: nextPassword, otp: enrolled.recoveryCodes[3] });
    assert.equal(await prisma.user.count({ where: { id: userId } }), 0);
    assert.equal(await prisma.userProfile.count({ where: { userId } }), 0);
    assert.equal(await prisma.assistantFeedback.count({ where: { userId } }), 0);
    assert.equal(await prisma.authSession.count({ where: { userId } }), 0);
    assert.equal(await prisma.user.count({ where: { id: unrelatedId } }), 1);
    userId = undefined;
    console.log('Database security integration checks passed.');
  } finally {
    if (unrelatedId) await prisma.user.delete({ where: { id: unrelatedId } });
    if (userId) {
      await prisma.portfolio.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } });
    }
    await prisma.$disconnect();
  }
}
main().catch(() => { console.error('Database security integration checks failed.'); process.exitCode = 1; });
