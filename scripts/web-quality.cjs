// Public HTML contract checks. No browser credentials or production writes.
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const { readFileSync } = require('node:fs');
const { setTimeout: delay } = require('node:timers/promises');

const port = 3456;
const origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'start', '--port', String(port), '--hostname', '127.0.0.1'], {
  cwd: path.join(__dirname, '../apps/web'), stdio: ['ignore', 'pipe', 'pipe'],
});
let log = '';
server.stdout.on('data', chunk => { log = (log + chunk).slice(-2000); });
server.stderr.on('data', chunk => { log = (log + chunk).slice(-2000); });
server.on('error', error => { log = error.message; });

async function main() {
  let ready = false;
  for (let attempt = 0; attempt < 40; attempt++) {
    try { ready = (await fetch(`${origin}/privacy`)).ok; } catch {}
    if (ready) break;
    if (server.exitCode !== null) throw new Error(`Web server exited: ${log}`);
    await delay(250);
  }
  assert(ready, 'Production web server did not start');
  const routes = ['/dashboard', '/components', '/workflows', '/onboarding', '/settings', '/privacy', '/disclaimer', '/account-recovery', '/contact', '/ai-access'];
  const titles = new Set();
  const links = new Set();
  for (const route of routes) {
    const response = await fetch(`${origin}${route}`);
    assert.equal(response.status, 200, `${route}: route failed`);
    const html = await response.text();
    const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
    assert(title && !titles.has(title), `${route}: missing or duplicated title`);
    titles.add(title);
    assert(/<meta name="description" content="[^"]{20,}"/.test(html), `${route}: missing description`);
    assert.equal((html.match(/<h1(?:\s|>)/g) || []).length, 1, `${route}: expected one content heading`);
    assert.equal((html.match(/<nav[^>]*aria-label="Main navigation"/g) || []).length, 1, `${route}: duplicated navigation`);
    assert.equal((html.match(/<footer(?:\s|>)/g) || []).length, 1, `${route}: duplicated footer`);
    assert(html.includes('href="#page-content"'), `${route}: missing skip link`);
    assert(html.includes('href="/privacy"'), `${route}: missing privacy link`);
    for (const match of html.matchAll(/<a[^>]+href="(\/[^"#?]*)"/g)) links.add(match[1]);
  }
  for (const link of links) assert.equal((await fetch(origin + link)).status, 200, `Broken internal link: ${link}`);
  assert.equal((await fetch(`${origin}/icon.svg`)).status, 200, 'Missing favicon');
  const missing = await fetch(`${origin}/quality-check-missing-page`);
  assert.equal(missing.status, 404, 'Unknown URLs must return 404');
  assert((await missing.text()).includes('Page not found'), 'Missing custom 404');
  const dashboard = readFileSync(path.join(__dirname, '../apps/web/src/app/dashboard/page.tsx'), 'utf8');
  assert(!/shadow-|bg-gradient-|backdrop-blur/.test(dashboard), 'Decorative effects returned to the market workspace');
  assert(!dashboard.includes('Alpha Trade Engine</h1>'), 'Repeated site branding returned');
  console.log(`Web quality checks passed: ${routes.length} pages, ${links.size} links, favicon and 404.`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => server.kill());
