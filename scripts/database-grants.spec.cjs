const { test } = require('node:test');
const assert = require('node:assert/strict');
const { connectionEnvironment } = require('./database-grants.cjs');

test('remote grants select the URL host and database with decoded credentials and TLS', () => {
  const env = connectionEnvironment({ DATABASE_URL:
    'postgresql://owner:p%40ss%3Aword@db.example:5433/neondb?sslmode=require&channel_binding=require',
  PGHOSTADDR: '127.0.0.1', PGSERVICE: 'wrong-database', PGPASSWORD: 'stale' });
  assert.equal(env.PGHOST, 'db.example');
  assert.equal(env.PGPORT, '5433');
  assert.equal(env.PGDATABASE, 'neondb');
  assert.equal(env.PGPASSWORD, 'p@ss:word');
  assert.equal(env.PGSSLMODE, 'require');
  assert.equal(env.PGCHANNELBINDING, 'require');
  assert.equal(env.PGHOSTADDR, undefined);
  assert.equal(env.PGSERVICE, undefined);
  assert.equal(env.DATABASE_URL, undefined);
});
test('remote grants reject plaintext transport and invalid connections', () => {
  for (const DATABASE_URL of ['https://owner:password@db.example/neondb',
    'postgresql://owner:password@db.example/neondb?sslmode=disable',
    'postgresql://owner@db.example/neondb']) {
    assert.throws(() => connectionEnvironment({ DATABASE_URL }));
  }
});
test('local disposable databases work without TLS while remote defaults require it', () => {
  assert.equal(connectionEnvironment({ DATABASE_URL:
    'postgresql://owner:password@localhost/test' }).PGSSLMODE, 'disable');
  assert.equal(connectionEnvironment({ DATABASE_URL:
    'postgresql://owner:password@db.example/test' }).PGSSLMODE, 'require');
});
