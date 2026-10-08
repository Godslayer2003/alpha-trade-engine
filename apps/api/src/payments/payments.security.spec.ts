import { ForbiddenException, ValidationPipe } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from './payments.service';
import { VerifySessionDto } from './dto/verify-session.dto';

const mockRetrieve = jest.fn();
const mockCreate = jest.fn();
jest.mock('stripe', () => jest.fn().mockImplementation(() => ({
  checkout: { sessions: { retrieve: mockRetrieve, create: mockCreate } },
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
  it('keeps existing production entitlements while preventing unconfigured purchases', async () => {
    const originalEnvironment = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      delete process.env.STRIPE_SECRET_KEY;
      const lookup = jest.fn().mockResolvedValue({ role: 'USER', chatAccessPaid: true });
      const production = new PaymentsService({ user: { findUniqueOrThrow: lookup } } as unknown as PrismaService);
      await expect(production.getStatus('owner')).resolves.toEqual({ paid: true, admin: false, checkoutAvailable: false });
      lookup.mockResolvedValue({ role: 'USER', chatAccessPaid: false });
      await expect(production.getStatus('owner')).resolves.toEqual({ paid: false, admin: false, checkoutAvailable: false });
      await expect(production.createCheckoutSession('owner','fixture@example.invalid')).rejects.toThrow('New purchases are unavailable');
      expect(mockCreate).not.toHaveBeenCalled();
    } finally { if(originalEnvironment===undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV=originalEnvironment; }
  });
  it('does not enable production checkout from a Stripe key alone', async () => {
    const originalEnvironment = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const production = new PaymentsService({ user: { findUniqueOrThrow: jest.fn().mockResolvedValue({ role: 'USER', chatAccessPaid: false }) } } as unknown as PrismaService);
      await expect(production.createCheckoutSession('owner','fixture@example.invalid')).rejects.toThrow('New purchases are unavailable');
      expect(mockCreate).not.toHaveBeenCalled();
    } finally { if(originalEnvironment===undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV=originalEnvironment; }
  });
  it('requires the commerce flag and both seller fields before creating a checkout', async () => {
    const fields = ['NODE_ENV', 'COMMERCE_ENABLED', 'PUBLIC_SELLER_NAME', 'PUBLIC_SELLER_ADDRESS', 'WEB_ORIGIN'] as const;
    const previous = fields.map(field => process.env[field]);
    process.env.NODE_ENV = 'production';
    process.env.WEB_ORIGIN = 'https://fixture.example.invalid';
    const production = new PaymentsService({ user: { findUniqueOrThrow: jest.fn().mockResolvedValue({ role: 'USER', chatAccessPaid: false }) } } as unknown as PrismaService);
    try {
      for (const [enabled, name, address] of [['false', 'Fixture seller', 'Fixture address'], ['true', '', 'Fixture address'], ['true', 'Fixture seller', '  ']]) {
        process.env.COMMERCE_ENABLED = enabled; process.env.PUBLIC_SELLER_NAME = name; process.env.PUBLIC_SELLER_ADDRESS = address;
        await expect(production.createCheckoutSession('owner', 'fixture@example.invalid')).rejects.toThrow('New purchases are unavailable');
      }
      expect(mockCreate).not.toHaveBeenCalled();
      process.env.COMMERCE_ENABLED = 'true'; process.env.PUBLIC_SELLER_NAME = 'Fixture seller'; process.env.PUBLIC_SELLER_ADDRESS = 'Fixture address';
      await expect(production.getStatus('owner')).resolves.toMatchObject({ checkoutAvailable: true, seller: { name: 'Fixture seller', address: 'Fixture address' } });
      mockCreate.mockResolvedValue({ url: 'https://checkout.example.invalid/fixture' });
      await expect(production.createCheckoutSession('owner', 'fixture@example.invalid')).resolves.toEqual({ url: 'https://checkout.example.invalid/fixture' });
      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ mode: 'payment', client_reference_id: 'owner' }));
    } finally {
      fields.forEach((field, index) => { if (previous[index] === undefined) delete process.env[field]; else process.env[field] = previous[index]; });
    }
  });
});
