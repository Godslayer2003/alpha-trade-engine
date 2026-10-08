// Uses only disposable local/CI PostgreSQL. Never point this test at production.
const assert = require('node:assert/strict');
const { createHash, randomBytes } = require('node:crypto');
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
const { StrategyService } = require('../apps/api/dist/strategy/strategy.service');
const { TelegramService } = require('../apps/api/dist/telegram/telegram.service');
const { AiEligibilityService } = require('../apps/api/dist/auth/ai-eligibility.service');

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
  const contactIds = [];
  try {
    const registered = await auth.register({ email, password, acceptedTerms: true });
    userId = registered.user.id;
    const payload = jwt.verify(registered.accessToken);
    assert.equal((await strategy.validate(payload)).userId, userId);
    await auth.revokeSession(payload.sid, userId);
    await assert.rejects(strategy.validate(payload));

    await mfa.begin(userId, password);
    await auth.changePassword(userId, password, password);
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).mfaSecret, null);
    await mfa.begin(userId, password);
    const enrollmentReset = randomBytes(32).toString('hex');
    await prisma.accountToken.create({ data: { id: createHash('sha256').update(enrollmentReset).digest('hex'),
      userId, purpose: 'reset', expiresAt: new Date(Date.now() + 60000) } });
    await new AccountTokenService(prisma, {}).consume(enrollmentReset, 'reset', password);
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).mfaSecret, null);
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
    const simultaneousRecovery = await Promise.allSettled(Array.from({ length: 5 }, () => auth.login({ email, password, otp: enrolled.recoveryCodes[5] })));
    assert.equal(simultaneousRecovery.filter(result => result.status === 'fulfilled').length, 1);
    const stored = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    assert.notEqual(stored.mfaSecret, setup.secret);
    assert(!stored.mfaRecoveryHashes.includes(enrolled.recoveryCodes[0]));

    const quota = new SecurityQuotaService(prisma);
    const scope = `integration-${userId}`;
    const secondQuotaInstance = new SecurityQuotaService(prisma);
    const attempts = await Promise.allSettled(Array.from({ length: 5 }, (_, index) => (index % 2 ? quota : secondQuotaInstance).consume(scope, userId, 2, 60000)));
    assert.equal(attempts.filter(result => result.status === 'fulfilled').length, 2);

    process.env.EMAIL_FROM = 'test@example.invalid';
    process.env.RESEND_API_KEY = 'disposable-test-value';
    process.env.WEB_ORIGIN = 'http://localhost:3010';
    let html = '';
    const tokens = new AccountTokenService(prisma, { sendAccountEmail: async (_to, _subject, content) => { html = content; } });
    await tokens.request(email, 'reset');
    const obsoleteReset = html.match(/#reset=([a-f0-9]{64})/)[1];
    await assert.rejects(auth.changePassword(userId, password, password));
    await assert.rejects(auth.changePassword(userId, password, password, 'invalid-code'));
    await auth.changePassword(userId, password, password, enrolled.recoveryCodes[4]);
    await assert.rejects(strategy.validate(securedPayload));
    await assert.rejects(tokens.consume(obsoleteReset, 'reset', password));
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
    const strategies = new StrategyService(prisma);
    // Real PostgreSQL races must consume a Telegram token only once.
    const telegram = new TelegramService(prisma, {}, {}, {}, {}, { consume: async () => {} }, {});
    const code = await telegram.createLinkCode(userId);
    const telegramSuccesses = [];
    await Promise.all([101, 102].map(id => telegram.handleLink({ chat: { id, type: 'private' },
      reply: async text => { if (text.startsWith('Linked!')) telegramSuccesses.push(id); } }, code)));
    assert.equal(telegramSuccesses.length, 1);
    const linked = await prisma.telegramLink.findUniqueOrThrow({ where: { userId } });
    assert.equal(linked.chatId, String(telegramSuccesses[0]));
    assert.equal(linked.linkCodeExpiresAt, null);
    const expiredCode = await telegram.createLinkCode(userId);
    await prisma.telegramLink.update({ where: { userId }, data: { linkCodeExpiresAt: new Date(Date.now() - 1) } });
    let rejected = false;
    await telegram.handleLink({ chat: { id: 103, type: 'private' }, reply: async text => { rejected = text.includes('invalid or expired'); } }, expiredCode);
    assert(rejected);
    assert.equal((await prisma.telegramLink.findUniqueOrThrow({ where: { userId } })).chatId, linked.chatId);
    await telegram.createLinkCode(unrelatedId);
    await telegram.disconnect(userId);
    assert.equal(await prisma.telegramLink.count({ where: { userId } }), 0);
    assert.equal(await prisma.telegramLink.count({ where: { userId: unrelatedId } }), 1);
    const ownedStrategy = await strategies.create(userId, { name: 'Isolation fixture', style: 'SWING_TRADING', preferredTickers: ['QQQ'] });
    await assert.rejects(strategies.update(unrelatedId, ownedStrategy.id, { name: 'Unwanted overwrite' }));
    await assert.rejects(strategies.remove(unrelatedId, ownedStrategy.id));
    assert.equal((await strategies.list(unrelatedId)).length, 0);
    assert.equal((await prisma.userStrategy.findUniqueOrThrow({ where: { id: ownedStrategy.id } })).name, 'Isolation fixture');
    await auth.revokeSession(jwt.verify(unrelated.accessToken).sid, userId);
    assert.equal((await strategy.validate(jwt.verify(unrelated.accessToken))).userId, unrelatedId);
    await assert.rejects(accounts.exportData(userId, { password: 'incorrect' }));
    await assert.rejects(accounts.deleteAccount(userId, { password: nextPassword }));
    await prisma.userProfile.upsert({ where: { userId }, create: { userId, profilePictureUrl: 'data:image/png;base64,fixture' }, update: { profilePictureUrl: 'data:image/png;base64,fixture' } });
    await accounts.removePicture(userId);
    assert.equal((await prisma.userProfile.findUniqueOrThrow({ where: { userId } })).profilePictureUrl, null);
    const eligibility = new AiEligibilityService(prisma);
    await assert.rejects(eligibility.require(userId));
    await eligibility.confirm(userId, { country: 'CA', adult: true });
    await eligibility.require(userId);
    await prisma.userProfile.update({ where: { userId }, data: { age: 17 } });
    await assert.rejects(eligibility.require(userId));
    await prisma.userProfile.update({ where: { userId }, data: { age: null } });
    for (const resolvedAt of [null, new Date(), new Date(Date.now() - 366 * 86400000)]) {
      const request = await prisma.contactRequest.create({ data: { email, category: 'privacy', message: 'Disposable retention request', resolvedAt } });
      contactIds.push(request.id);
    }
    const feedback = await prisma.assistantFeedback.create({ data: { userId, question: 'fixture', answer: 'fixture', rating: 'UP', model: 'fixture', responseTimeMs: 0, inputTokens: 0, outputTokens: 0 } });
    const exported = await accounts.exportData(userId, { password: nextPassword, otp: enrolled.recoveryCodes[2] });
    assert.equal(exported.email, email);
    assert.equal(exported.assistantFeedback.length, 1);
    assert.equal(exported.aiCountry, 'CA');
    assert(exported.aiAdultConfirmedAt);
    for (const secret of ['passwordHash', 'mfaSecret', 'mfaRecoveryHashes', 'authSessions', 'accountTokens']) assert(!Object.hasOwn(exported, secret));
    await prisma.assistantFeedback.update({ where: { id: feedback.id }, data: { createdAt: new Date(Date.now() - 31 * 86400000) } });
    await new RetentionService(prisma).purgeExpired();
    assert.equal(await prisma.assistantFeedback.findUnique({ where: { id: feedback.id } }), null);
    assert.equal(await prisma.contactRequest.count({ where: { id: { in: contactIds } } }), 2);
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
    await prisma.contactRequest.deleteMany({ where: { id: { in: contactIds } } });
    if (unrelatedId) await prisma.user.delete({ where: { id: unrelatedId } });
    if (userId) {
      await prisma.portfolio.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } });
    }
    await prisma.$disconnect();
  }
}
main().catch(() => { console.error('Database security integration checks failed.'); process.exitCode = 1; });
