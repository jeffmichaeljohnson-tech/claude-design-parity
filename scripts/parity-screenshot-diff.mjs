#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

const EXIT_OK = 0;
const EXIT_REGRESSION = 1;
const EXIT_USAGE = 2;
const EXIT_RUNTIME = 3;

const USAGE = `parity-screenshot-diff: Playwright-based visual diff for /claude-design-parity.

Usage:
  node scripts/parity-screenshot-diff.mjs --design <url> --impl <url> --out <dir> [options]

Required:
  --design <url>          Design source URL (file://, http://, or https://). Supports {route}.
  --impl <url>            Implementation URL (typically a dev server). Supports {route}.
  --out <dir>             Output directory for screenshots and reports.

Options:
  --viewports <list>      Comma-separated viewport widths in px. Default: 375,768,1440.
  --routes <list>         Comma-separated routes to compare. Default: /.
  --threshold <ratio>     Pixelmatch sensitivity, 0 to 1. Default: 0.005 (0.5%).
  --help                  Print this message and exit.

Routes are substituted into both URLs wherever {route} appears. URLs without {route} are used as-is.

Exit codes:
  0  All routes within threshold.
  1  Visual regression detected on at least one route.
  2  Usage error (missing or invalid args).
  3  Runtime error (browser launch failed, navigation timeout, etc.).
`;

function parseArgsOrExit() {
  let parsed;
  try {
    parsed = parseArgs({
      options: {
        design: { type: 'string' },
        impl: { type: 'string' },
        out: { type: 'string' },
        viewports: { type: 'string', default: '375,768,1440' },
        routes: { type: 'string', default: '/' },
        threshold: { type: 'string', default: '0.005' },
        help: { type: 'boolean', default: false },
      },
      strict: true,
    });
  } catch (err) {
    process.stderr.write(`Error: ${err.message}\n\n${USAGE}`);
    process.exit(EXIT_USAGE);
  }

  const { values } = parsed;

  if (values.help || (!values.design && !values.impl && !values.out)) {
    process.stdout.write(USAGE);
    process.exit(values.help ? EXIT_OK : EXIT_USAGE);
  }

  const missing = ['design', 'impl', 'out'].filter((k) => !values[k]);
  if (missing.length > 0) {
    process.stderr.write(
      `Error: missing required args: ${missing.map((k) => `--${k}`).join(', ')}\n\n${USAGE}`,
    );
    process.exit(EXIT_USAGE);
  }

  const threshold = Number(values.threshold);
  if (Number.isNaN(threshold) || threshold < 0 || threshold > 1) {
    process.stderr.write(
      `Error: --threshold must be a number between 0 and 1, got "${values.threshold}"\n`,
    );
    process.exit(EXIT_USAGE);
  }

  const viewports = values.viewports
    .split(',')
    .map((v) => Number(v.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);
  if (viewports.length === 0) {
    process.stderr.write(
      `Error: --viewports must be a comma-separated list of positive integers\n`,
    );
    process.exit(EXIT_USAGE);
  }

  const routes = values.routes
    .split(',')
    .map((r) => r.trim())
    .filter((r) => r.length > 0);
  if (routes.length === 0) {
    process.stderr.write(`Error: --routes must contain at least one route\n`);
    process.exit(EXIT_USAGE);
  }

  return {
    design: values.design,
    impl: values.impl,
    out: resolve(values.out),
    viewports,
    routes,
    threshold,
  };
}

async function prepareOutDir(out) {
  if (existsSync(out)) {
    const entries = await readdir(out);
    if (entries.length === 0) {
      return;
    }
    const sentinel = join(out, 'manifest.json');
    if (!existsSync(sentinel)) {
      throw new Error(
        `--out directory exists and is non-empty but has no manifest.json sentinel: ${out}\n` +
          `Refusing to clean. Pass an empty directory or a previous run's output dir.`,
      );
    }
    await rm(out, { recursive: true, force: true });
  }
  await mkdir(out, { recursive: true });
}

function slugify(route) {
  const trimmed = route.replace(/^\/+|\/+$/g, '');
  if (trimmed.length === 0) return 'root';
  return trimmed.replace(/[^a-zA-Z0-9._-]+/g, '-');
}

function applyRoute(template, route) {
  if (template.includes('{route}')) {
    return template.replace(/\{route\}/g, route);
  }
  return template;
}

async function captureRoute(page, url, viewport) {
  await page.setViewportSize({ width: viewport, height: Math.round(viewport * 0.625) });
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  const screenshot = await page.screenshot({ fullPage: true, type: 'png' });
  const ariaSnapshot = await page
    .locator('body')
    .ariaSnapshot()
    .catch(() => '');
  return { ariaSnapshot, screenshot };
}

function diffPNGs(designBuf, implBuf, threshold) {
  const designImg = PNG.sync.read(designBuf);
  const implImg = PNG.sync.read(implBuf);
  const width = Math.max(designImg.width, implImg.width);
  const height = Math.max(designImg.height, implImg.height);
  const designResized = resizePNG(designImg, width, height);
  const implResized = resizePNG(implImg, width, height);
  const diffImg = new PNG({ width, height });
  const mismatched = pixelmatch(designResized.data, implResized.data, diffImg.data, width, height, {
    threshold,
    includeAA: false,
    alpha: 0.4,
    diffColor: [255, 0, 0],
  });
  const total = width * height;
  return {
    diffPng: PNG.sync.write(diffImg),
    totalPixels: total,
    mismatchedPixels: mismatched,
    mismatchRatio: total === 0 ? 0 : mismatched / total,
  };
}

function resizePNG(src, width, height) {
  if (src.width === width && src.height === height) return src;
  const dst = new PNG({ width, height });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dstIdx = (y * width + x) * 4;
      if (x < src.width && y < src.height) {
        const srcIdx = (y * src.width + x) * 4;
        dst.data[dstIdx] = src.data[srcIdx];
        dst.data[dstIdx + 1] = src.data[srcIdx + 1];
        dst.data[dstIdx + 2] = src.data[srcIdx + 2];
        dst.data[dstIdx + 3] = src.data[srcIdx + 3];
      } else {
        dst.data[dstIdx] = 0;
        dst.data[dstIdx + 1] = 0;
        dst.data[dstIdx + 2] = 0;
        dst.data[dstIdx + 3] = 0;
      }
    }
  }
  return dst;
}

function sortKeys(obj) {
  if (Array.isArray(obj)) return obj.map(sortKeys);
  if (obj && typeof obj === 'object') {
    return Object.keys(obj)
      .sort()
      .reduce((acc, k) => {
        acc[k] = sortKeys(obj[k]);
        return acc;
      }, {});
  }
  return obj;
}

function renderReportMd(report) {
  const lines = [];
  lines.push('# Visual parity report\n');
  lines.push(`Generated: ${report.summary.generatedAt}`);
  lines.push(`Threshold: ${report.summary.threshold}`);
  lines.push(`Routes compared: ${report.summary.routesCompared}`);
  lines.push(`Regressions: **${report.summary.regressions}**\n`);
  lines.push('| Route | Viewport | Mismatch ratio | Mismatched px | Status |');
  lines.push('| --- | --- | --- | --- | --- |');
  for (const r of report.results) {
    const status = r.status === 'regression' ? '**REGRESSION**' : 'ok';
    const ratio = (r.mismatchRatio * 100).toFixed(3) + '%';
    lines.push(
      `| \`${r.route}\` | ${r.viewport}w | ${ratio} | ${r.mismatchedPixels.toLocaleString()} | ${status} |`,
    );
  }
  lines.push('\n## Files\n');
  lines.push('Each `(route, viewport)` pair produced these files in this directory:');
  lines.push('- `design-<width>w-<route>.png`');
  lines.push('- `impl-<width>w-<route>.png`');
  lines.push('- `diff-<width>w-<route>.png` (red overlay on mismatched pixels)');
  lines.push('- `<route>.aria.yaml` (Playwright aria snapshot from impl)');
  return lines.join('\n') + '\n';
}

async function run() {
  const args = parseArgsOrExit();

  try {
    await prepareOutDir(args.out);
  } catch (err) {
    process.stderr.write(`Error preparing --out: ${err.message}\n`);
    process.exit(EXIT_RUNTIME);
  }

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (err) {
    process.stderr.write(`Error launching Chromium: ${err.message}\n`);
    process.exit(EXIT_RUNTIME);
  }

  const results = [];
  let regressions = 0;

  try {
    const context = await browser.newContext({ deviceScaleFactor: 1 });
    const page = await context.newPage();

    for (const route of args.routes) {
      const slug = slugify(route);
      for (const viewport of args.viewports) {
        const designUrl = applyRoute(args.design, route);
        const implUrl = applyRoute(args.impl, route);
        process.stdout.write(`[parity] ${viewport}w ${route}\n`);

        const designCapture = await captureRoute(page, designUrl, viewport);
        const implCapture = await captureRoute(page, implUrl, viewport);

        const diff = diffPNGs(designCapture.screenshot, implCapture.screenshot, args.threshold);
        const status = diff.mismatchRatio > args.threshold ? 'regression' : 'ok';
        if (status === 'regression') regressions += 1;

        const designPath = join(args.out, `design-${viewport}w-${slug}.png`);
        const implPath = join(args.out, `impl-${viewport}w-${slug}.png`);
        const diffPath = join(args.out, `diff-${viewport}w-${slug}.png`);
        const ariaPath = join(args.out, `${slug}.aria.yaml`);

        await writeFile(designPath, designCapture.screenshot);
        await writeFile(implPath, implCapture.screenshot);
        await writeFile(diffPath, diff.diffPng);
        await writeFile(ariaPath, implCapture.ariaSnapshot + '\n');

        results.push({
          mismatchRatio: diff.mismatchRatio,
          mismatchedPixels: diff.mismatchedPixels,
          route,
          status,
          totalPixels: diff.totalPixels,
          viewport,
        });
      }
    }

    await context.close();
  } catch (err) {
    process.stderr.write(`Error during capture: ${err.message}\n`);
    process.exit(EXIT_RUNTIME);
  } finally {
    await browser.close().catch(() => {});
  }

  results.sort((a, b) => {
    if (a.route !== b.route) return a.route.localeCompare(b.route);
    return a.viewport - b.viewport;
  });

  const report = {
    results,
    summary: {
      design: args.design,
      generatedAt: new Date().toISOString(),
      impl: args.impl,
      regressions,
      routesCompared: results.length,
      threshold: args.threshold,
    },
  };

  await writeFile(join(args.out, 'report.json'), JSON.stringify(sortKeys(report), null, 2) + '\n');
  await writeFile(join(args.out, 'report.md'), renderReportMd(report));
  await writeFile(
    join(args.out, 'manifest.json'),
    JSON.stringify(
      { tool: 'claude-design-parity/parity-screenshot-diff', version: '0.1.0' },
      null,
      2,
    ) + '\n',
  );

  process.stdout.write(
    `\n[parity] ${regressions} regression(s) across ${results.length} comparison(s).\n`,
  );
  process.stdout.write(`[parity] Report: ${join(args.out, 'report.md')}\n`);
  process.exit(regressions > 0 ? EXIT_REGRESSION : EXIT_OK);
}

run().catch((err) => {
  process.stderr.write(`Unexpected error: ${err.stack || err.message}\n`);
  process.exit(EXIT_RUNTIME);
});
