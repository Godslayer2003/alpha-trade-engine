// Playwright CLI check with synthetic sessions and intercepted writes; no real accounts.
async (page) => {
  const errors = [];
  const writes = [];
  let acceptChange = false;
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/backend/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    let status = 200;
    let body = path.endsWith('/auth/session') ? { user: { id: 'fixture', email: 'fixture@example.invalid' } }
      : path.endsWith('/profile') ? null : path.endsWith('/telegram/status') ? { linked: false } : [];
    if (path.endsWith('/auth/password')) {
      writes.push(route.request().postDataJSON());
      status = acceptChange ? 201 : 401;
      body = acceptChange ? { ok: true } : { message: 'Enter an authenticator or recovery code.' };
    }
    return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  });
  const check = (condition, message) => { if (!condition) throw new Error(message); };
  const results = [];
  for (const theme of ['dark', 'light']) for (const width of [320, 390, 1280]) {
    await page.evaluate(value => localStorage.setItem('alpha-trade-theme', value), theme);
    await page.setViewportSize({ width, height: 900 });
    await page.goto('http://127.0.0.1:3010/settings');
    const form = page.getByRole('button', { name: 'Change password', exact: true }).locator('..');
    await form.getByLabel('Current password', { exact: true }).fill('fixture-password');
    await form.getByLabel('New password', { exact: true }).fill('new-fixture-password');
    const code = form.getByLabel('Authenticator or recovery code (required if MFA is enabled)', { exact: true });
    await code.fill('000000');
    acceptChange = false;
    await page.getByRole('button', { name: 'Change password', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'Enter an authenticator or recovery code.' }).waitFor();
    check(writes.at(-1).otp === '000000', 'MFA code missing from request');
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Overflow at ${width}px`);
    await code.fill('123456');
    acceptChange = true;
    await page.getByRole('button', { name: 'Change password', exact: true }).click();
    await page.waitForURL('**/dashboard');
    check(writes.at(-1).otp === '123456', 'Corrected MFA code missing');
    results.push({ theme, width, errorFeedback: true, successRedirect: true, overflow: false });
  }
  check(errors.length === 0, errors.join('\n'));
  return { results, pageErrors: errors, data: 'Synthetic local responses; no real account or provider calls' };
}
