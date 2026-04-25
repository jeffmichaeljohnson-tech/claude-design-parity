# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-04-25

### Added

- Initial public release.
- `SKILL.md` at repo root: the generic `/claude-design-parity` Claude Code skill.
- `examples/tauri-react-zustand/SKILL.md`: reference specialization for Tauri 2 plus React plus Zustand projects.
- `examples/tauri-react-zustand/README.md`: adoption guide for the Tauri specialization.
- `scripts/parity-screenshot-diff.mjs`: Playwright plus pixelmatch visual diff companion script. Captures screenshots and aria snapshots per route per viewport, computes pixel deltas, writes `report.json`, `report.md`, and `manifest.json` to the output directory.
- `scripts/README.md`: full CLI contract, exit codes, threshold tuning, and limitations.
- `docs/operating-principles.md`: long-form explainer of the six operating principles.
- `docs/two-pass-port.md`: long-form explainer of Pass A (literal port) and Pass B (re-wire).
- `docs/visual-verification.md`: long-form explainer of the Playwright integration, report formats, threshold tuning, and CI integration.
- `tests/smoke.test.mjs`: end-to-end test suite covering identical-pages baseline, regression detection, usage errors, threshold validation, and `--out` sentinel safety. Six tests; runs under `node --test` in approximately 3 seconds.
- CI workflow runs install, lint, format check, smoke tests, and script `--help` invocation on every push and PR.
- ESLint flat config and Prettier configuration.
- MIT license.

### Known limitations

- Visual diff script v0.1 only handles standalone HTML exports of Claude Design output and running URLs. Folder bundles like `lib_v3/` need a wrapper renderer (planned for v0.2).
- Full-page screenshots only; no above-the-fold mode.
- Aria snapshots are captured per route but not yet diffed automatically. Manual review only in v0.1.
- Single threshold across all viewports. Per-viewport thresholds planned for v0.2.
