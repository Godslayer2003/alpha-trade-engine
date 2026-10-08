// Keep credentials out of psql arguments and pass connection fields explicitly.
const { spawnSync } = require('node:child_process');

function connectionEnvironment(source) {
  const url = new URL(source.DATABASE_URL || '');
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname
      || !url.username || !url.password || url.pathname.length < 2) {
    throw new Error('Valid PostgreSQL owner connection required');
  }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  const sslmode = url.searchParams.get('sslmode') || (local ? 'disable' : 'require');
  if (!['disable', 'require', 'verify-ca', 'verify-full'].includes(sslmode)
      || (!local && sslmode === 'disable')) throw new Error('TLS required for remote migrations');
  const env = Object.fromEntries(Object.entries(source).filter(([key]) =>
    !key.startsWith('PG') && !['DATABASE_URL', 'MIGRATION_DATABASE_URL'].includes(key)));
  return { ...env, PGHOST: url.hostname.replace(/^\[|\]$/g, ''), PGPORT: url.port || '5432',
    PGUSER: decodeURIComponent(url.username), PGPASSWORD: decodeURIComponent(url.password),
    PGDATABASE: decodeURIComponent(url.pathname.slice(1)), PGSSLMODE: sslmode,
    PGCHANNELBINDING: url.searchParams.get('channel_binding') || 'prefer', PGCONNECT_TIMEOUT: '15' };
}

if (require.main === module) {
  try {
    const role = process.env.RUNTIME_DATABASE_ROLE || '';
    if (!/^[a-z_][a-z0-9_]{0,62}$/.test(role)) throw new Error('Runtime role required');
    const result = spawnSync('psql', ['--no-psqlrc', '--set=ON_ERROR_STOP=1',
      `--set=runtime_role=${role}`, '--file=packages/database/runtime-grants.sql'],
    { env: connectionEnvironment(process.env), stdio: 'inherit' });
    if (result.error || result.status !== 0) throw new Error('Grant command failed');
  } catch {
    console.error('Runtime grant job failed; credentials are not logged.');
    process.exitCode = 1;
  }
}
module.exports = { connectionEnvironment };
