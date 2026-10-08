// Disposable PostgreSQL only; the owner URL must never point at production.
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { randomBytes } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { PrismaClient } = require('@prisma/client');

async function main() {
  const url = new URL(process.env.DATABASE_URL || '');
  assert(['localhost', '127.0.0.1'].includes(url.hostname), 'Disposable local database required');
  const owner = new PrismaClient();
  const role = `runtime_${randomBytes(8).toString('hex')}`;
  const password = randomBytes(24).toString('hex');
  let runtime;
  try {
    await owner.$executeRawUnsafe(`CREATE ROLE "${role}" LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`);
    // Pin one connection: the grant script reads a session setting.
    const sql = readFileSync('packages/database/runtime-grants.sql', 'utf8');
    await assert.rejects(owner.$transaction(async tx => {
      await tx.$queryRaw`SELECT set_config('alpha.runtime_role', ${decodeURIComponent(url.username)}, true)`;
      await tx.$executeRawUnsafe(sql.slice(sql.indexOf('DO $$')));
    }), error => error.meta?.code === 'P0001');
    await owner.$transaction(async tx => {
      await tx.$queryRaw`SELECT set_config('alpha.runtime_role', ${role}, true)`;
      await tx.$executeRawUnsafe(sql.slice(sql.indexOf('DO $$')));
    });
    if (process.env.TEST_PSQL_GRANTS === 'true') {
      const grants = spawnSync(process.execPath, ['scripts/database-grants.cjs'], {
        env: { ...process.env, RUNTIME_DATABASE_ROLE: role }, stdio: 'inherit',
      });
      assert.equal(grants.status, 0, 'Protected migration grant command must connect and apply grants');
    }
    url.username = role;
    url.password = password;
    runtime = new PrismaClient({ datasources: { db: { url: url.toString() } } });
    for (const statement of [
      'CREATE TABLE public.forbidden_fixture (id integer)',
      'CREATE TEMP TABLE forbidden_temp (id integer)',
      'CREATE SCHEMA forbidden_schema',
      'CREATE ROLE forbidden_role',
      `ALTER ROLE "${role}" CREATEDB`,
      'SELECT * FROM public._prisma_migrations',
      'DELETE FROM public._prisma_migrations',
      'TRUNCATE TABLE public."User"',
      `SET ROLE "${decodeURIComponent(new URL(process.env.DATABASE_URL).username).replaceAll('"', '""')}"`,
    ]) {
      await assert.rejects(runtime.$executeRawUnsafe(statement), error => error.meta?.code === '42501');
    }
    await owner.$executeRawUnsafe('CREATE TABLE public.privilege_future_fixture (id serial PRIMARY KEY)');
    await runtime.$executeRawUnsafe('INSERT INTO public.privilege_future_fixture DEFAULT VALUES');
    await runtime.$executeRawUnsafe('UPDATE public.privilege_future_fixture SET id = id');
    assert.equal((await runtime.$queryRawUnsafe('SELECT * FROM public.privilege_future_fixture')).length, 1);
    await runtime.$executeRawUnsafe('DELETE FROM public.privilege_future_fixture');
    const test = spawnSync(process.execPath, ['scripts/security-integration.cjs'], {
      env: { ...process.env, DATABASE_URL: url.toString() }, stdio: 'inherit',
    });
    assert.equal(test.status, 0, 'Account security flows must pass under the runtime role');
    console.log('Runtime database privileges and account security checks passed.');
  } finally {
    await runtime?.$disconnect();
    await owner.$executeRawUnsafe('DROP TABLE IF EXISTS public.privilege_future_fixture');
    await owner.$executeRawUnsafe(`DROP OWNED BY "${role}"`);
    await owner.$executeRawUnsafe(`DROP ROLE "${role}"`);
    await owner.$disconnect();
  }
}
main().catch(() => { console.error('Database privilege checks failed; no credentials logged.'); process.exitCode = 1; });
