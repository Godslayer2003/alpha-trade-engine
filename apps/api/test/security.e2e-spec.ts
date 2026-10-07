import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { TelegramService } from '../src/telegram/telegram.service';
import { AssistantService } from '../src/assistant/assistant.service';
import { AuthService } from '../src/auth/auth.service';
import { SecurityQuotaService } from '../src/auth/security-quota.service';
import { PaymentsService } from '../src/payments/payments.service';

describe('HTTP authorization boundaries', () => {
  let app: INestApplication;
  let jwt: JwtService;
  const update = jest.fn();
  const remove = jest.fn();
  const getConfig = jest.fn().mockResolvedValue({ systemPrompt: 'fixture' });
  const quota = { consume: jest.fn().mockResolvedValue(undefined) };
  const verifyPayment = jest.fn().mockResolvedValue({ paid: false });
  const sessions: Record<string, object> = {};
  const token = (sub = 'user-a', sid = 'session-a', claims = {}) => jwt.sign({ sub, sid, ...claims });

  beforeAll(async () => {
    for (const [id, role, mfaVerified] of [['a', 'USER', false], ['admin', 'ADMIN', false], ['verified', 'ADMIN', true]] as const) {
      sessions[`session-${id}`] = { id: `session-${id}`, userId: `user-${id}`, revokedAt: null,
        expiresAt: new Date(Date.now() + 60000), mfaVerified,
        user: { id: `user-${id}`, email: `${id}@example.invalid`, role } };
    }
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService).useValue({
        authSession: { findUnique: jest.fn(({ where }) => sessions[where.id] ?? null) },
        userStrategy: { findUnique: jest.fn().mockResolvedValue({ id: 'owned-by-b', userId: 'user-b' }), update, delete: remove },
      })
      .overrideProvider(TelegramService).useValue({})
      .overrideProvider(AssistantService).useValue({ getConfig })
      .overrideProvider(AuthService).useValue({ login: jest.fn().mockRejectedValue(new UnauthorizedException()) })
      .overrideProvider(SecurityQuotaService).useValue(quota)
      .compile();
    jwt = module.get(JwtService);
    jest.spyOn(module.get(PaymentsService), 'verifySession').mockImplementation(verifyPayment);
    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => { await app.close(); });

  it('bounds checkout identifiers before provider access and supplies the authenticated owner', async () => {
    verifyPayment.mockClear();
    for (const session_id of [undefined, 'malformed', 'cs_test_' + 'a'.repeat(201), ['cs_test_a', 'cs_test_b']]) {
      await request(app.getHttpServer()).get('/api/v1/payments/verify')
        .set('Authorization', `Bearer ${token()}`).query(session_id === undefined ? {} : { session_id }).expect(400);
    }
    expect(verifyPayment).not.toHaveBeenCalled();
    await request(app.getHttpServer()).get('/api/v1/payments/verify').query({ session_id: 'cs_test_fixture' })
      .set('Authorization', `Bearer ${token()}`).expect(200);
    expect(verifyPayment).toHaveBeenCalledWith('user-a', 'cs_test_fixture');
  });

  it('accepts an owned session cookie and rejects anonymous or forged tokens', async () => {
    await request(app.getHttpServer()).get('/api/v1/auth/session').expect(401);
    const forged = new JwtService({ secret: 'attacker-key' }).sign({ sub: 'user-a', sid: 'session-a' });
    await request(app.getHttpServer()).get('/api/v1/auth/session').set('Authorization', `Bearer ${forged}`).expect(401);
    await request(app.getHttpServer()).get('/api/v1/auth/session').set('Cookie', `alpha_trade_session=${token()}`).expect(200);
  });

  it('rejects a genuine signature paired with another user’s session', async () => {
    await request(app.getHttpServer()).get('/api/v1/auth/session').set('Authorization', `Bearer ${token('user-b')}`).expect(401);
  });

  it('rejects cross-account strategy writes before persistence', async () => {
    await request(app.getHttpServer()).patch('/api/v1/strategies/owned-by-b')
      .set('Authorization', `Bearer ${token()}`).send({ name: 'overwrite' }).expect(403);
    await request(app.getHttpServer()).delete('/api/v1/strategies/owned-by-b')
      .set('Authorization', `Bearer ${token()}`).expect(403);
    expect(update).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });

  it('ignores claimed administrator privileges and requires verified MFA', async () => {
    for (const accessToken of [token('user-a', 'session-a', { role: 'ADMIN', mfaVerified: true }), token('user-admin', 'session-admin')]) {
      await request(app.getHttpServer()).get('/api/v1/assistant/config').set('Authorization', `Bearer ${accessToken}`).expect(403);
    }
    expect(getConfig).not.toHaveBeenCalled();
    await request(app.getHttpServer()).get('/api/v1/assistant/config')
      .set('Authorization', `Bearer ${token('user-verified', 'session-verified')}`).expect(200);
    expect(getConfig).toHaveBeenCalledTimes(1);
  });

  it('normalizes login identities and throttles repeated failed HTTP attempts', async () => {
    for (let attempt = 0; attempt < 10; attempt++) {
      await request(app.getHttpServer()).post('/api/v1/auth/login')
        .send({ email: attempt % 2 ? 'PERSON@example.invalid' : ' person@example.invalid ', password: 'fixture-password' }).expect(401);
    }
    await request(app.getHttpServer()).post('/api/v1/auth/login')
      .send({ email: 'person@example.invalid', password: 'fixture-password' }).expect(429);
    const accountCalls = quota.consume.mock.calls.filter(call => call[0] === 'login-account');
    expect(accountCalls).toHaveLength(10);
    expect(accountCalls.every(call => call[1] === 'person@example.invalid')).toBe(true);
  });
});
