import { ForbiddenException, ValidationPipe } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from './payments.service';
import { VerifySessionDto } from './dto/verify-session.dto';

const mockRetrieve = jest.fn();
jest.mock('stripe', () => jest.fn().mockImplementation(() => ({
  checkout: { sessions: { retrieve: mockRetrieve } },
})));

describe('Checkout entitlement verification', () => {
  const update = jest.fn().mockResolvedValue({});
  const paid = { client_reference_id: 'user-a', payment_status: 'paid', payment_intent: 'pi_fixture',
    mode: 'payment', currency: 'usd', amount_total: 500 };
  let service: PaymentsService;
  const originalKey = process.env.STRIPE_SECRET_KEY;
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = 'disposable-test-key';
    service = new PaymentsService({ user: { update } } as unknown as PrismaService);
  });
  afterAll(() => {
    if (originalKey === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = originalKey;
  });
  it('accepts the caller’s paid one-time USD checkout', async () => {
    mockRetrieve.mockResolvedValue(paid);
    await expect(service.verifySession('user-a', 'cs_test_fixture')).resolves.toEqual({ paid: true });
    expect(update).toHaveBeenCalledWith({ where: { id: 'user-a' },
      data: { chatAccessPaid: true, stripePaymentIntentId: 'pi_fixture' } });
  });
  it('rejects another account’s paid checkout before persistence', async () => {
    mockRetrieve.mockResolvedValue(paid);
    await expect(service.verifySession('user-b', 'cs_test_fixture')).rejects.toThrow(ForbiddenException);
    expect(update).not.toHaveBeenCalled();
  });
  it.each([{ amount_total: 1 }, { currency: 'eur' }, { mode: 'subscription' }])('rejects a different purchase: %j', async change => {
    mockRetrieve.mockResolvedValue({ ...paid, ...change });
    await expect(service.verifySession('user-a', 'cs_test_fixture')).rejects.toThrow(ForbiddenException);
    expect(update).not.toHaveBeenCalled();
  });
  it('does not grant access before payment completes', async () => {
    mockRetrieve.mockResolvedValue({ ...paid, payment_status: 'unpaid' });
    await expect(service.verifySession('user-a', 'cs_test_fixture')).resolves.toEqual({ paid: false });
    expect(update).not.toHaveBeenCalled();
  });
  it('rejects missing, malformed and oversized session identifiers', async () => {
    const pipe = new ValidationPipe({ transform: true, whitelist: true });
    for (const session_id of [undefined, 'not-a-checkout', ['cs_test_fixture'], 'cs_test_' + 'a'.repeat(201)]) {
      await expect(pipe.transform({ session_id }, { type: 'query', metatype: VerifySessionDto })).rejects.toThrow();
    }
    await expect(pipe.transform({ session_id: 'cs_live_fixture' }, { type: 'query', metatype: VerifySessionDto })).resolves.toEqual({ session_id: 'cs_live_fixture' });
  });
});
