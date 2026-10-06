async (page) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const candles = Array.from({length: 60}, (_, i) => ({time: new Date(Date.UTC(2026, 0, i + 1)).toISOString(), open: 100 + i, high: 102 + i, low: 99 + i, close: 101 + i, volume: 1000}));
  await page.route('**/backend/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    const anonymous = path.endsWith('/auth/session');
    const value = anonymous ? {message: 'Unauthorized'} : path.endsWith('/market/candles') ? candles : [];
    return route.fulfill({status: anonymous ? 401 : 200, contentType: 'application/json', body: JSON.stringify(value)});
  });
  const check = (condition, message) => { if (!condition) throw new Error(message); };
  const results = [];
  for (const theme of ['dark', 'light']) for (const width of [320, 390, 1280]) {
    await page.evaluate(value => localStorage.setItem('alpha-trade-theme', value), theme);
    await page.setViewportSize({width, height: 900});
    await page.goto('http://127.0.0.1:3010/dashboard');
    await page.getByRole('button', {name: 'Sign in', exact: true}).waitFor();
    await page.locator('canvas').first().waitFor();
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Overflow at ${width}px`);
    for (const name of ['Practice', 'Performance', 'Research']) {
      const button = page.getByRole('button', {name, exact: true});
      await button.click();
      check(await button.getAttribute('aria-pressed') === 'true', `${name} selection failed`);
    }
    await page.getByRole('button', {name: 'Sign in', exact: true}).click();
    check(await page.getByRole('dialog').isVisible(), 'Sign-in dialog missing');
    await page.keyboard.press('Escape');
    if (width < 1024) {
      await page.getByText('Menu', {exact: true}).click();
      await page.getByRole('link', {name: 'Settings', exact: true}).click();
      check(await page.locator('details[open]').count() === 0, 'Mobile menu stayed open');
    } else await page.getByRole('link', {name: 'Settings', exact: true}).click();
    await page.getByRole('heading', {name: 'Settings', exact: true}).waitFor();
    check(await page.locator('nav[aria-label="Main navigation"] a[href="/settings"][aria-current="page"]').count() > 0, 'Active navigation missing');
    results.push({theme, width, overflow: false, navigation: true, workspace: true, signIn: true});
  }
  check(errors.length === 0, errors.join('\n'));
  await page.evaluate(() => localStorage.setItem('alpha-trade-theme', 'dark'));
  await page.goto('http://127.0.0.1:3010/dashboard');
  await page.locator('canvas').first().waitFor();
  await page.unroute('**/backend/api/**');
  return {results, pageErrors: errors, data: 'Synthetic local responses; no account or provider calls'};
}
