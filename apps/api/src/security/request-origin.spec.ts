import { isAllowedSessionWrite } from './request-origin';

const trustedOrigins = ['https://app.example.com'];
const cookie = 'alpha_trade_session=token';

describe('cookie request origin checks', () => {
  it('rejects writes with a foreign or missing origin', () => {
    expect(isAllowedSessionWrite({ method: 'POST', headers: { cookie, origin: 'https://evil.example' } }, trustedOrigins)).toBe(false);
    expect(isAllowedSessionWrite({ method: 'PATCH', headers: { cookie } }, trustedOrigins)).toBe(false);
  });

  it('accepts writes from the configured frontend and bearer-only clients', () => {
    expect(isAllowedSessionWrite({ method: 'POST', headers: { cookie, origin: trustedOrigins[0] } }, trustedOrigins)).toBe(true);
    expect(isAllowedSessionWrite({ method: 'POST', headers: {} }, trustedOrigins)).toBe(true);
  });
});
