# Visual verification

Every parity run ends with `scripts/parity-screenshot-diff.mjs` rendering both the design and the impl in headless Chromium, capturing screenshots at multiple viewports per route, and computing pixel deltas with pixelmatch. Routes with deltas above the configured threshold are flagged as regressions and block sign-off until investigated.

This document covers what the script captures, what the reports look like, and how to interpret the output.

## What the script captures

For each `(viewport, route)` pair, the script captures:

1. **Design screenshot.** Full-page PNG of the design source URL at that viewport. Saved as `design-<width>w-<route>.png`.
2. **Impl screenshot.** Full-page PNG of the impl URL at that viewport. Saved as `impl-<width>w-<route>.png`.
3. **Diff overlay.** Pixelmatch comparison with mismatched pixels rendered in red over a faded version of one source. Saved as `diff-<width>w-<route>.png`.
4. **Aria snapshot.** Playwright's accessibility tree for the impl page, captured as YAML. Saved as `<route>.aria.yaml`.

File names are deterministic (no timestamps). Re-running the script with the same `--out` directory cleans first, but only if it finds a `manifest.json` sentinel marking the directory as a previous run output. This prevents accidental wipes.

## CLI

```sh
node scripts/parity-screenshot-diff.mjs \
  --design <url-or-file> \
  --impl <url-or-file> \
  --out <output-dir> \
  [--viewports 375,768,1440] \
  [--routes /,/settings,/workspace] \
  [--threshold 0.005]
```

See `scripts/README.md` for the full CLI contract, exit codes, and templating rules.

## Threshold tuning

The default threshold is `0.005` (0.5%). A route is flagged as a regression when more than 0.5% of its pixels differ from the design (after Playwright's anti-aliasing is excluded).

When to tighten:

- Design is pixel-perfect and the impl uses the same fonts. Try `0.001` (0.1%).
- You're chasing down a specific drift and want to surface anything off.

When to loosen:

- Fonts render differently between the design and the impl (common when the design uses Inter and the impl falls back to system sans-serif).
- Animations are still settling at the `networkidle` capture point.
- Try `0.01` to `0.02`.

Don't loosen further than `0.05`. At that point you're not really verifying parity, you're just running the script for theater.

## Reading the report

The script writes two reports.

### `report.json`

Machine-readable, sorted keys, deterministic across runs. Schema:

```json
{
  "results": [
    {
      "mismatchRatio": 0.0023,
      "mismatchedPixels": 1542,
      "route": "/",
      "status": "ok",
      "totalPixels": 670400,
      "viewport": 375
    },
    {
      "mismatchRatio": 0.0184,
      "mismatchedPixels": 12361,
      "route": "/settings",
      "status": "regression",
      "totalPixels": 670400,
      "viewport": 375
    }
  ],
  "summary": {
    "design": "file:///path/to/design.html",
    "generatedAt": "2026-04-25T18:30:00.000Z",
    "impl": "http://localhost:1420",
    "regressions": 1,
    "routesCompared": 2,
    "threshold": 0.005
  }
}
```

CI pipelines should parse this file rather than the markdown one. The script's exit code reflects the `regressions` count: 0 if zero, 1 if one or more.

### `report.md`

Human-readable summary table:

```markdown
# Visual parity report

Generated: 2026-04-25T18:30:00.000Z
Threshold: 0.005
Routes compared: 2
Regressions: **1**

| Route       | Viewport | Mismatch ratio | Mismatched px | Status         |
| ----------- | -------- | -------------- | ------------- | -------------- |
| `/`         | 375w     | 0.230%         | 1,542         | ok             |
| `/settings` | 375w     | 1.840%         | 12,361        | **REGRESSION** |
```

## Investigating a regression

When a route is flagged, follow this sequence:

1. **Open the diff PNG.** `diff-<width>w-<route>.png` shows mismatched pixels in red. The shape of the red area tells you what changed.
   - Solid red blocks: a missing or extra component, a moved element, a color change across a large area.
   - Outlined red shapes: layout shift (border, padding, margin) without a content change.
   - Speckled red: anti-aliasing differences, font rendering, or shadow blur. Usually below threshold; if above, consider loosening the threshold or tightening the design and impl font stacks.
2. **Open both screenshots side by side.** `design-<width>w-<route>.png` and `impl-<width>w-<route>.png`. The difference is now visible without the red overlay.
3. **Decide: intentional or mistake?**
   - **Intentional.** The design has moved on in a way the impl can't follow this round (e.g. a new sub-component that needs backend work). Document in the human checklist as "expected delta, design ahead of impl on this surface" with a one-line rationale and a `TODO(parity)` reference.
   - **Mistake.** A wrong color, a missing prop, a forgotten sub-component, a CSS-vars vs Tailwind drift. Fix in the impl, re-run the script, confirm the regression clears.

## Aria snapshots

The `<route>.aria.yaml` files capture Playwright's accessibility tree. v0.1 doesn't auto-diff them, but they're useful in two scenarios:

- A visual regression has an obvious accessibility-tree explanation. Opening the aria snapshot tells you immediately whether a heading level shifted, an `aria-label` was lost, or a focus order changed.
- You want to verify that a port preserves accessibility even when no visible regression appears. Eyeball the aria YAML for the new and old impl revisions; structural differences (missing landmarks, extra interactive elements) often surface here before they surface visually.

Future versions of the script will auto-diff aria snapshots and flag accessibility regressions in the report.

## Limitations (v0.1)

- **Standalone HTML or running URL only.** Folder bundles like `lib_v3/` need a wrapper renderer. Planned for v0.2.
- **Full-page screenshots.** Long pages produce large diffs even when the visible viewport matches. Future versions may add an above-the-fold mode.
- **Single navigation per route.** The script doesn't scroll, hover, or click. Static state only. Animations and timing-sensitive content are captured at `networkidle`; components that animate forever will produce noisy diffs.
- **No retry on transient failures.** A network blip or a slow first paint can cause a one-off regression. Re-run before treating it as real.
- **No per-viewport thresholds.** The same threshold applies to mobile (375), tablet (768), and desktop (1440). Some projects need wider tolerance on mobile due to font rendering. Workaround: run the script three times, one per viewport, with different thresholds, and merge the reports manually.

## CI integration

A typical CI step looks like:

```yaml
- name: Visual parity check
  run: |
    npm run dev &
    DEV_PID=$!
    sleep 5
    node scripts/parity-screenshot-diff.mjs \
      --design 'https://design.example.com/{route}' \
      --impl 'http://localhost:5173{route}' \
      --routes '/,/settings,/workspace' \
      --viewports 375,1440 \
      --out parity-output \
      --threshold 0.005
    EXIT=$?
    kill $DEV_PID
    exit $EXIT
- name: Upload visual diff artifacts
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: parity-output
    path: parity-output/
```

Treat exit `1` as a soft failure (regression to investigate, not a script bug). Treat exit `2` or `3` as a hard failure (the script itself is broken).
