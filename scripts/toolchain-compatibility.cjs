const assert = require('node:assert/strict');
const { mkdtempSync, writeFileSync, unlinkSync, rmdirSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { createRequire } = require('node:module');
const { loadNycConfig } = require('@istanbuljs/load-nyc-config');

async function main() {
  const loaderRequire = createRequire(require.resolve('@istanbuljs/load-nyc-config'));
  assert(loaderRequire('js-yaml/package.json').version.startsWith('4.'), 'NYC must use the tested YAML 4 reader');
  const directory = mkdtempSync(join(tmpdir(), 'alpha-nyc-check-'));
  const filename = join(directory, '.nycrc.yaml');
  try {
    writeFileSync(filename, 'include:\n  - apps/api/src/**/*.ts\nexclude:\n  - "**/*.spec.ts"\nreporter:\n  - text-summary\nall: true\n');
    const config = await loadNycConfig({ cwd: directory });
    assert.equal(config.all, true);
    assert.deepEqual(config.include, ['apps/api/src/**/*.ts']);
    assert.deepEqual(config.exclude, ['**/*.spec.ts']);
    assert.deepEqual(config.reporter, ['text-summary']);
    console.log('NYC YAML 4 configuration compatibility passed.');
  } finally {
    unlinkSync(filename);
    rmdirSync(directory);
  }
}
main().catch(() => { console.error('NYC toolchain compatibility failed.'); process.exitCode = 1; });
