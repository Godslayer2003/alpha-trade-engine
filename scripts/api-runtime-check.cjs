// Only a disposable local container/database is allowed; never use production accounts.
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');

async function main() {
  const origin = new URL(process.env.API_RUNTIME_TEST_URL || 'http://127.0.0.1:3007');
  assert(origin.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(origin.hostname));
  let ready = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    try { ready = (await fetch(new URL('/health', origin), { signal: AbortSignal.timeout(2000) })).ok; } catch {}
    if (ready) break;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  assert(ready, 'Container did not become healthy');
  const response = await fetch(new URL('/api/v1/auth/register', origin), {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:3010' },
    body: JSON.stringify({ email: `runtime-${randomBytes(8).toString('hex')}@example.invalid`, password: randomBytes(24).toString('hex'), acceptedTerms: true }),
  });
  assert.equal(response.status, 201, 'Disposable registration failed');
  const cookie = response.headers.get('set-cookie') || '';
  for (const attribute of ['HttpOnly', 'Secure', 'SameSite=Lax']) assert(cookie.includes(attribute), `Missing ${attribute}`);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert(!Object.hasOwn(await response.json(), 'accessToken'), 'Bearer token leaked into response body');
  assert.equal((await fetch(new URL('/api/v1/assistant/config', origin))).status, 401);
  const headers = { 'Content-Type': 'application/json', Origin: 'http://localhost:3010', Cookie: cookie.split(';')[0] };
  const chatBody = JSON.stringify({ messages: [{ role: 'user', content: 'Explain simulated trading.' }] });
  const undeclaredChat = await fetch(new URL('/api/v1/assistant/chat', origin), {
    method: 'POST', headers, body: chatBody,
  });
  assert.equal(undeclaredChat.status, 403, 'AI eligibility must fail closed before provider work');
  assert.match((await undeclaredChat.json()).message, /Confirm that you are 18 or older/);
  const declaration = await fetch(new URL('/api/v1/auth/ai-eligibility', origin), {
    method: 'POST', headers, body: JSON.stringify({ country: 'CA', adult: true }),
  });
  assert.equal(declaration.status, 201);
  assert.equal((await declaration.json()).eligible, true);
  const unpaidChat = await fetch(new URL('/api/v1/assistant/chat', origin), {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:3010', Cookie: cookie.split(';')[0] },
    body: chatBody,
  });
  assert.equal(unpaidChat.status, 403, 'Unpaid accounts must fail closed without Stripe configuration');
  assert.equal((await unpaidChat.json()).message, 'AI Guide chat access requires a one-time $5 payment.');
  const paymentStatus = await fetch(new URL('/api/v1/payments/status', origin), { headers });
  assert.equal(paymentStatus.status, 200);
  assert.deepEqual(await paymentStatus.json(), { paid: false, admin: false, checkoutAvailable: false });
  const checkout = await fetch(new URL('/api/v1/payments/checkout', origin), { method: 'POST', headers, body: '{}' });
  assert.equal(checkout.status, 400, 'New checkout must remain unavailable');
  console.log('Production container startup, secure cookie, eligibility and unpaid-access checks passed.');
}
main().catch(() => { console.error('Production container checks failed; credentials withheld.'); process.exitCode = 1; });
