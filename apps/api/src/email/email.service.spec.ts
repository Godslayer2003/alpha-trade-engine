import { EmailService } from './email.service';
const send = jest.fn();
jest.mock('resend', () => ({ Resend: jest.fn().mockImplementation(() => ({ emails: { send } })) }));
describe('Email delivery acceptance', () => {
  const originalKey = process.env.RESEND_API_KEY;
  beforeEach(() => { jest.clearAllMocks(); send.mockReset(); process.env.RESEND_API_KEY='disposable-fixture'; });
  afterAll(() => { if(originalKey===undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY=originalKey; });
  it('rejects a provider error instead of counting a report as sent', async () => {
    send.mockResolvedValue({ error: { message:'private provider diagnostic' } });
    await expect(new EmailService().sendDailyReport('fixture@example.invalid','Fixture','Fixture')).rejects.toThrow('Email report could not be delivered.');
  });
  it('accepts a successful send without leaving its timeout active', async () => {
    jest.useFakeTimers();
    try { send.mockResolvedValue({ data: { id:'fixture' }, error:null }); await new EmailService().sendDailyReport('fixture@example.invalid','Fixture','Fixture'); expect(jest.getTimerCount()).toBe(0); } finally { jest.useRealTimers(); }
  });
});
