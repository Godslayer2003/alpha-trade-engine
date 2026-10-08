import { createHash } from 'crypto';
import type { Context } from 'telegraf';
import { TelegramService } from './telegram.service';
import { PrismaService } from '../prisma/prisma.service';
import { PortfolioService } from '../portfolio/portfolio.service';
import { AnalysisService } from '../analysis/analysis.service';
import { AssistantService } from '../assistant/assistant.service';
import { PaymentsService } from '../payments/payments.service';
import { SecurityQuotaService } from '../auth/security-quota.service';
import { AiEligibilityService } from '../auth/ai-eligibility.service';

describe('Telegram account linking', () => {
  const upsert = jest.fn();
  const updateMany = jest.fn();
  const deleteMany = jest.fn();
  const consume = jest.fn();
  const reply = jest.fn();
  let service: TelegramService;
  const code = 'a'.repeat(32);
  const privateContext = () => ({ chat: { id: 123, type: 'private' }, reply }) as unknown as Context;
  beforeEach(() => {
    jest.resetAllMocks();
    consume.mockResolvedValue(undefined);
    upsert.mockResolvedValue({});
    updateMany.mockResolvedValue({ count: 1 });
    reply.mockResolvedValue(undefined);
    service = new TelegramService({ telegramLink: { upsert, updateMany, deleteMany } } as unknown as PrismaService,
      {} as PortfolioService, {} as AnalysisService, {} as AssistantService, {} as PaymentsService,
      { consume } as unknown as SecurityQuotaService, {} as AiEligibilityService);
  });
  it('stores only a hash and ten-minute expiry and limits code issuance', async () => {
    const issued = await service.createLinkCode('user');
    const stored = upsert.mock.calls[0][0];
    expect(issued).toMatch(/^[a-f0-9]{32}$/);
    expect(stored.create.linkCode).toBe(createHash('sha256').update(issued).digest('hex'));
    expect(stored.update).toEqual({ linkCode: stored.create.linkCode, linkCodeExpiresAt: stored.create.linkCodeExpiresAt });
    expect(stored.create.linkCodeExpiresAt.getTime() - Date.now()).toBeGreaterThan(599_000);
    expect(consume).toHaveBeenCalledWith('telegram-link-user', 'user', 10, 900_000);
  });
  it('rejects group linking before token or quota work', async () => {
    await service['handleLink']({ chat: { id: -123, type: 'group' }, reply } as unknown as Context, code);
    expect(updateMany).not.toHaveBeenCalled();
    expect(consume).not.toHaveBeenCalled();
  });
  it('rejects malformed codes before database work', async () => {
    await service['handleLink'](privateContext(), 'a'.repeat(33));
    expect(updateMany).not.toHaveBeenCalled();
  });
  it('consumes a hashed, unexpired code with one conditional update', async () => {
    await service['handleLink'](privateContext(), code);
    expect(updateMany).toHaveBeenCalledWith({
      where: { linkCode: createHash('sha256').update(code).digest('hex'), linkCodeExpiresAt: { gt: expect.any(Date) } },
      data: { chatId: '123', linkedAt: expect.any(Date), linkCode: expect.any(String), linkCodeExpiresAt: null },
    });
    expect(consume).toHaveBeenCalledWith('telegram-link-chat', '123', 5, 900_000);
    expect(reply).toHaveBeenCalledWith(expect.stringContaining('Linked!'));
  });
  it('rejects expired or already-consumed codes', async () => {
    updateMany.mockResolvedValue({ count: 0 });
    await service['handleLink'](privateContext(), code);
    expect(reply).toHaveBeenCalledWith(expect.stringContaining('invalid or expired'));
  });
  it('does not leak database errors or send group notifications', async () => {
    updateMany.mockRejectedValue(new Error('private database details'));
    await service['handleLink'](privateContext(), code);
    expect(reply).toHaveBeenCalledWith(expect.stringContaining('Could not link'));
    expect(reply).not.toHaveBeenCalledWith(expect.stringContaining('private database details'));
    await expect(service.sendMessage('-123', 'account data')).rejects.toThrow('private Telegram chat');
  });
  it('disconnects only the authenticated account link', async () => {
    await service.disconnect('current-user');
    expect(deleteMany).toHaveBeenCalledWith({ where: { userId: 'current-user' } });
  });
});
