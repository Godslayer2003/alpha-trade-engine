import { ForbiddenException, ValidationPipe } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiEligibilityDto, AiEligibilityService } from './ai-eligibility.service';
describe('AI eligibility', () => {
  const findUniqueOrThrow = jest.fn(), findUnique = jest.fn(), update = jest.fn();
  const service = new AiEligibilityService({ user: { findUniqueOrThrow, update }, userProfile: { findUnique } } as unknown as PrismaService);
  beforeEach(() => { jest.resetAllMocks(); findUnique.mockResolvedValue(null); update.mockResolvedValue({}); });
  it.each([
    [{ aiCountry: null, aiAdultConfirmedAt: null }, false],
    [{ aiCountry: 'GB', aiAdultConfirmedAt: new Date() }, false],
    [{ aiCountry: 'CA', aiAdultConfirmedAt: new Date(), profile: { age: 17 } }, false],
    [{ aiCountry: 'CA', aiAdultConfirmedAt: new Date(), profile: { age: 18 } }, true],
  ])('checks stored country, confirmation and known age: %j', async (user, eligible) => {
    findUniqueOrThrow.mockResolvedValue(user); expect(await service.get('owner')).toEqual({ eligible });
    if (!eligible) await expect(service.require('owner')).rejects.toThrow(ForbiddenException);
  });
  it('records only the authenticated account and rejects a known minor', async () => {
    await expect(service.confirm('owner', { adult: true, country: 'CA' })).resolves.toEqual({ eligible: true });
    expect(update).toHaveBeenCalledWith({ where: { id: 'owner' }, data: { aiCountry: 'CA', aiAdultConfirmedAt: expect.any(Date) } });
    update.mockClear(); findUnique.mockResolvedValue({ age: 17 });
    await expect(service.confirm('owner', { adult: true, country: 'CA' })).rejects.toThrow(ForbiddenException);
    expect(update).not.toHaveBeenCalled();
  });
  it('rejects absent or false confirmation, other countries and coerced values', async () => {
    const pipe = new ValidationPipe({ transform: true, whitelist: true });
    for (const body of [{}, { adult: false, country: 'CA' }, { adult: 'true', country: 'CA' }, { adult: true, country: 'GB' }]) {
      await expect(pipe.transform(body, { type: 'body', metatype: AiEligibilityDto })).rejects.toThrow();
    }
  });
  it('withdraws the owner declaration without modifying another account', async () => {
    await expect(service.withdraw('owner')).resolves.toEqual({ eligible: false });
    expect(update).toHaveBeenCalledWith({ where: { id: 'owner' }, data: { aiCountry: null, aiAdultConfirmedAt: null } });
  });
});
