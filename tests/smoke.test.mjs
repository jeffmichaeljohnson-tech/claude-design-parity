import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const SCRIPT = resolve('scripts/parity-screenshot-diff.mjs');
const FIXTURES = resolve('tests/fixtures');
const OUT = resolve('tests/.tmp');

const fileUrl = (name) => pathToFileURL(resolve(FIXTURES, name)).href;

function runScript(args) {
  rmSync(OUT, { recursive: true, force: true });
  return spawnSync('node', [SCRIPT, ...args], {
    encoding: 'utf-8',
    timeout: 90000,
  });
}

test('prints help and exits 0 with --help', () => {
  const result = spawnSync('node', [SCRIPT, '--help'], { encoding: 'utf-8' });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Usage:/);
});

test('exits 2 when called with no args', () => {
  const result = spawnSync('node', [SCRIPT], { encoding: 'utf-8' });
  assert.equal(result.status, 2);
});

test('exits 2 when --threshold is invalid', () => {
  const result = runScript([
    '--design',
    fileUrl('design-baseline.html'),
    '--impl',
    fileUrl('impl-baseline.html'),
    '--out',
    OUT,
    '--threshold',
    'not-a-number',
    '--routes',
    '/',
    '--viewports',
    '375',
  ]);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /threshold/);
});

test('identical pages report zero regressions and exit 0', () => {
  const result = runScript([
    '--design',
    fileUrl('design-baseline.html'),
    '--impl',
    fileUrl('impl-baseline.html'),
    '--out',
    OUT,
    '--routes',
    '/',
    '--viewports',
    '375',
  ]);
  assert.equal(result.status, 0, `stdout: ${result.stdout}\nstderr: ${result.stderr}`);
  assert.ok(existsSync(`${OUT}/report.json`));
  assert.ok(existsSync(`${OUT}/report.md`));
  assert.ok(existsSync(`${OUT}/manifest.json`));
  assert.ok(existsSync(`${OUT}/design-375w-root.png`));
  assert.ok(existsSync(`${OUT}/impl-375w-root.png`));
  assert.ok(existsSync(`${OUT}/diff-375w-root.png`));
  assert.ok(existsSync(`${OUT}/root.aria.yaml`));
  const report = JSON.parse(readFileSync(`${OUT}/report.json`, 'utf-8'));
  assert.equal(report.summary.regressions, 0);
  assert.equal(report.results.length, 1);
});

test('different pages report regression and exit 1', () => {
  const result = runScript([
    '--design',
    fileUrl('design-baseline.html'),
    '--impl',
    fileUrl('impl-regression.html'),
    '--out',
    OUT,
    '--routes',
    '/',
    '--viewports',
    '375',
    '--threshold',
    '0.001',
  ]);
  assert.equal(result.status, 1, `stdout: ${result.stdout}\nstderr: ${result.stderr}`);
  const report = JSON.parse(readFileSync(`${OUT}/report.json`, 'utf-8'));
  assert.ok(report.summary.regressions >= 1);
  assert.equal(report.results[0].status, 'regression');
});

test('refuses to clean a non-empty --out without manifest sentinel', () => {
  const sentinelDir = resolve('tests/.tmp-sentinel-test');
  rmSync(sentinelDir, { recursive: true, force: true });
  const fs = spawnSync('mkdir', ['-p', sentinelDir]);
  assert.equal(fs.status, 0);
  spawnSync('touch', [`${sentinelDir}/something-important.txt`]);

  const result = spawnSync(
    'node',
    [
      SCRIPT,
      '--design',
      fileUrl('design-baseline.html'),
      '--impl',
      fileUrl('impl-baseline.html'),
      '--out',
      sentinelDir,
      '--routes',
      '/',
      '--viewports',
      '375',
    ],
    { encoding: 'utf-8' },
  );
  assert.equal(result.status, 3);
  assert.match(result.stderr, /manifest\.json/);

  rmSync(sentinelDir, { recursive: true, force: true });
});
