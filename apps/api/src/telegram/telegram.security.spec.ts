import { Telegraf } from 'telegraf';
import { TelegramService } from './telegram.service';
import { PrismaService } from '../prisma/prisma.service';
import { PortfolioService } from '../portfolio/portfolio.service';
import { AnalysisService } from '../analysis/analysis.service';
import { AssistantService } from '../assistant/assistant.service';
import { PaymentsService } from '../payments/payments.service';
import { SecurityQuotaService } from '../auth/security-quota.service';
import { AiEligibilityService } from '../auth/ai-eligibility.service';

describe('Telegram AI spending boundaries', () => {
  const findUnique = jest.fn();
  const getStatus = jest.fn();
  const chat = jest.fn();
  const consume = jest.fn();
  const requireEligibility = jest.fn();
  const reply = jest.fn();
  const ctx = { chat: { id: 123, type: 'private' }, message: { text: '/ask Explain risk' }, reply };
  let ask: (context: typeof ctx) => Promise<void>;
  beforeEach(() => {
    jest.clearAllMocks();
    findUnique.mockResolvedValue({ userId: 'linked-user' });
    getStatus.mockResolvedValue({ paid: true });
    chat.mockResolvedValue({ reply: 'Answer' });
    consume.mockReset().mockResolvedValue(undefined);
    requireEligibility.mockReset().mockResolvedValue(undefined);
    reply.mockResolvedValue(undefined);
    ctx.message.text = '/ask Explain risk';
    ctx.chat.type = 'private';
    const service = new TelegramService(
      { telegramLink: { findUnique } } as unknown as PrismaService,
      {} as PortfolioService, {} as AnalysisService,
      { chat } as unknown as AssistantService, { getStatus } as unknown as PaymentsService,
      { consume } as unknown as SecurityQuotaService,
      { require: requireEligibility } as unknown as AiEligibilityService,
    );
    service['registerHandlers']({ start: jest.fn(),
      command: (name: string, handler: typeof ask) => { if (name === 'ask') ask = handler; },
    } as unknown as Telegraf);
  });
  it('uses the linked account and shared web/global quota before calling AI', async () => {
    await ask(ctx);
    expect(consume.mock.calls).toEqual([
      ['chat-user', 'linked-user', 50, 86_400_000],
      ['ai-global', 'application', 500, 86_400_000],
    ]);
    expect(consume.mock.invocationCallOrder[1]).toBeLessThan(chat.mock.invocationCallOrder[0]);
    expect(chat).toHaveBeenCalledWith([{ role: 'user', content: 'Explain risk' }]);
  });
  it.each([1, 2])('does not call AI when quota check %i fails', async failure => {
    if (failure === 2) consume.mockResolvedValueOnce(undefined);
    consume.mockRejectedValueOnce(new Error('Request limit reached'));
    await ask(ctx);
    expect(chat).not.toHaveBeenCalled();
    expect(reply).toHaveBeenCalledWith('Could not reach the AI guide. Check eligibility and access in the app, or try again later.');
  });
  it('does not call AI for an unlinked chat', async () => {
    findUnique.mockResolvedValue(null);
    await ask(ctx);
    expect(getStatus).not.toHaveBeenCalled();
    expect(consume).not.toHaveBeenCalled();
    expect(chat).not.toHaveBeenCalled();
  });
  it('rejects group chats before linked-account or provider work', async () => {
    ctx.chat.type = 'group';
    await ask(ctx);
    expect(findUnique).not.toHaveBeenCalled();
    expect(chat).not.toHaveBeenCalled();
  });
  it('does not call AI for an unpaid account', async () => {
    getStatus.mockResolvedValue({ paid: false });
    await ask(ctx);
    expect(consume).not.toHaveBeenCalled();
    expect(chat).not.toHaveBeenCalled();
  });
  it('rejects missing age/country confirmation before payment, quotas or AI', async () => {
    requireEligibility.mockRejectedValue(new Error('Confirm AI eligibility'));
    await ask(ctx);
    expect(requireEligibility).toHaveBeenCalledWith('linked-user');
    expect(getStatus).not.toHaveBeenCalled();
    expect(consume).not.toHaveBeenCalled();
    expect(chat).not.toHaveBeenCalled();
  });
  it('rejects oversized questions before account/provider work', async () => {
    ctx.message.text = '/ask ' + 'a'.repeat(4_001);
    await ask(ctx);
    expect(findUnique).not.toHaveBeenCalled();
    expect(chat).not.toHaveBeenCalled();
    expect(reply).toHaveBeenCalledWith(expect.stringContaining('4,000'));
  });
  it('does not repeat private provider diagnostics in a command reply', async () => {
    chat.mockRejectedValueOnce(new Error('synthetic-private-provider-token'));
    await ask(ctx);
    expect(reply).toHaveBeenCalledWith('Could not reach the AI guide. Check eligibility and access in the app, or try again later.');
    expect(JSON.stringify(reply.mock.calls)).not.toContain('synthetic-private-provider-token');
  });
});
