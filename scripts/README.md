# scripts/

## `parity-screenshot-diff.mjs`

Playwright-based visual diff. Captures screenshots from a design URL and an impl URL, compares them with pixelmatch, and writes a JSON report plus a Markdown report plus per-route accessibility trees.

### CLI

```sh
node scripts/parity-screenshot-diff.mjs \
  --design <url-or-file> \
  --impl <url-or-file> \
  --out <dir> \
  [--viewports 375,768,1440] \
  [--routes /,/settings,/workspace] \
  [--threshold 0.005]
```

### Routes and templating

Both `--design` and `--impl` accept the literal token `{route}`. For each route in `--routes`, the token is substituted in both URLs. URLs without `{route}` are used verbatim for every route.

This handles three common cases:

1. Single design canvas vs multi-route impl. Pass `--design http://design.local/canvas` (no template) and `--impl http://localhost:1420{route}`. The design page is loaded once per route; the impl rotates through routes.
2. Per-route design exports vs multi-route impl. Pass `--design 'http://design.local/{route}'` and `--impl 'http://localhost:1420{route}'`.
3. Static HTML fixtures. Pass two `file://` URLs and `--routes /`.

### Output

The script writes these files to `--out`:

- `design-<width>w-<route>.png`. Design screenshot.
- `impl-<width>w-<route>.png`. Impl screenshot.
- `diff-<width>w-<route>.png`. Pixelmatch diff with red overlay on mismatched pixels.
- `<route>.aria.yaml`. Playwright aria snapshot from the impl page (YAML, accessibility tree).
- `report.json`. Machine-readable summary with sorted keys.
- `report.md`. Human-readable summary table.
- `manifest.json`. Sentinel file marking this directory as a previous run output (controls re-run cleanup).

File names are deterministic and contain no timestamps. Re-running with the same `--out` cleans the directory first, but only if a `manifest.json` sentinel is present. This prevents accidental wipes of unrelated directories.

### Exit codes

| Code | Meaning                                                          |
| ---- | ---------------------------------------------------------------- |
| 0    | All routes within threshold.                                     |
| 1    | At least one route exceeded threshold (visual regression).       |
| 2    | Usage error (missing or invalid args).                           |
| 3    | Runtime error (browser launch failed, navigation timeout, etc.). |

CI pipelines should treat exit 1 as a soft failure (visual regression to investigate) and exit 2 or 3 as hard failures (script broken).

### Threshold

`--threshold` is the pixelmatch sensitivity, between 0 and 1. The default `0.005` means a route is flagged as a regression when more than 0.5% of pixels differ (after Playwright anti-aliasing is excluded). Tighten to `0.001` for pixel-perfect comparisons; loosen to `0.02` if your dev server has fonts that render slightly differently from the design.

### Limitations (v0.1)

- Standalone HTML or running URL only. Folder bundles like `lib_v3/` need a wrapper renderer (planned for v0.2).
- Screenshots are full-page, not above-the-fold only. Long pages produce large diffs even when the visible viewport matches.
- Animations and timing-sensitive content are captured at a fixed `networkidle` wait. Components that animate forever will produce noisy diffs; use the threshold to absorb.
- The aria snapshot is captured per route but not yet diffed automatically. Manual review only in v0.1.
