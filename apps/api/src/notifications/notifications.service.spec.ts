import { isWithinDueWindow, NotificationsService } from './notifications.service';

describe('isWithinDueWindow', () => {
  it('fires at the configured minute and during the following four minutes', () => {
    expect(isWithinDueWindow('07:00', 7 * 60)).toBe(true);
    expect(isWithinDueWindow('07:00', 7 * 60 + 4)).toBe(true);
  });

  it('does not fire before the configured time', () => {
    expect(isWithinDueWindow('07:00', 6 * 60 + 59)).toBe(false);
  });

  it('does not fire after the five-minute window', () => {
    expect(isWithinDueWindow('07:00', 7 * 60 + 5)).toBe(false);
  });

  it('handles a window crossing midnight', () => {
    expect(isWithinDueWindow('23:58', 1)).toBe(true);
    expect(isWithinDueWindow('23:58', 3)).toBe(false);
  });
});

describe('notification provider failure boundaries', () => {
  function fixture() {
    const sendMessage = jest.fn().mockRejectedValue(new Error('synthetic-private-telegram-diagnostic'));
    const sendDailyReport = jest.fn().mockRejectedValue(new Error('synthetic-private-email-diagnostic'));
    const service = new NotificationsService({
      telegramLink: { findUnique: jest.fn().mockResolvedValue({ chatId: '123' }) },
      userProfile: { findUnique: jest.fn().mockResolvedValue({ userId: 'owner',
        user: { email: 'fixture@example.invalid' }, notificationEmail: null,
        dailyReportChannels: ['TELEGRAM', 'EMAIL'] }) },
    } as never, {} as never, { sendMessage } as never, { sendDailyReport } as never);
    jest.spyOn(service, 'buildReportText').mockResolvedValue('Synthetic report');
    jest.spyOn(service, 'buildReportHtml').mockResolvedValue('<p>Synthetic report</p>');
    return { service, sendMessage, sendDailyReport };
  }

  it.each(['daily', 'workflow'])('sanitizes both channels in %s results without claiming delivery', async path => {
    const { service } = fixture();
    const result = path === 'daily'
      ? await service.dispatchToChannels('owner', 'fixture@example.invalid', null, ['TELEGRAM', 'EMAIL'])
      : await service.sendWorkflowMessage('owner', 'Fixture', 'Synthetic report');
    expect(result).toEqual({ sent: [], errors: [
      'Telegram delivery failed. Check your connection and try again.',
      'Email delivery failed. Check your address and try again.',
    ] });
    expect(JSON.stringify(result)).not.toContain('synthetic-private');
  });

  it('preserves successful delivery when the other channel fails', async () => {
    const { service, sendDailyReport } = fixture();
    sendDailyReport.mockResolvedValue(undefined);
    await expect(service.dispatchToChannels('owner', 'fixture@example.invalid', null, ['TELEGRAM', 'EMAIL']))
      .resolves.toEqual({ sent: ['EMAIL'], errors: ['Telegram delivery failed. Check your connection and try again.'] });
  });

  it('escapes workflow text in the email channel', async () => {
    const { service, sendDailyReport } = fixture();
    sendDailyReport.mockResolvedValue(undefined);
    await service.sendWorkflowMessage('owner', 'Fixture', '<img src=x> & text\nnext');
    expect(sendDailyReport).toHaveBeenCalledWith('fixture@example.invalid', 'Fixture', '&lt;img src=x&gt; &amp; text<br/>next');
  });
});
