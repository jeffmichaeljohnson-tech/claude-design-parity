# claude-design-parity

[![CI](https://github.com/jeffmichaeljohnson-tech/claude-design-parity/actions/workflows/ci.yml/badge.svg)](https://github.com/jeffmichaeljohnson-tech/claude-design-parity/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node 20+](https://img.shields.io/badge/Node-20%2B-brightgreen.svg)](.nvmrc)

A Claude Code skill that ports Claude Design (claude.ai/design) prototypes into your real codebase. Surgical port that preserves your state stores, native bridges, motion gates, and project conventions. Verifies visual fidelity with Playwright on every run.

## What it is

Claude Design produces clickable React prototypes. The output is a folder of `.jsx` files plus optional acceptance checklists (`FRONTEND-PORT.md`, `IMPLEMENTATION.md`). Getting that into a real product codebase is harder than it looks: the prototype contains demo state and mock data that can't port literally; layout often shifts between iterations; and "preserve the existing wiring" sounds conservative but quietly degrades to "restyle the existing impl, leaving the new design's intent on the floor."

This skill enforces a discipline that closes most of the gap on the first pass:

- Read every changed source file end-to-end before drafting any port plan.
- Cite source line ranges in every commit body.
- Two passes per file: literal port (visual fidelity), then re-wire (functional fidelity).
- One commit per design source file, never thematic groupings.
- Visual verification via Playwright on every parity run, with pixel-delta thresholds that block sign-off until investigated.

It's project-agnostic: discovers your conventions from `CLAUDE.md` and the file tree at runtime. A reference specialization for Tauri 2 plus React plus Zustand projects ships under `examples/`.

## Why

The skill came out of a real failure-mode retrospective. Before the discipline was in place, a single design-to-code round on a real project needed five rounds of catch-up work. The dominant failure modes:

1. **Filename inference is a hypothesis, not a spec.** `topbar.jsx -> ProjectTabs.tsx` looked obvious; it was wrong. `topbar.jsx` was the app-level header; the tab strip was elsewhere.
2. **Compressed sources lie.** A roadmap bullet said "Settings: API keys card." The actual JSX had three cards. The Appearance card was missing entirely from the impl after the port because nobody opened the JSX.
3. **Restyle vs port.** "Preserve wiring" was interpreted as "minimize visual change." That produced the impl's old skeleton with new paint. Layout drifted.
4. **Token-cost compression dropped surfaces.** Prompts grouped work by theme ("tokens" / "shell" / "polish"); surfaces that fell between themes silently disappeared.

The Operating Principles in [`docs/operating-principles.md`](docs/operating-principles.md) are the patterns that stopped the bleeding. They're baked into the skill.

## Install

You need a Claude Code session and Node.js 20 or later.

```sh
git clone https://github.com/jeffmichaeljohnson-tech/claude-design-parity.git ~/claude-design-parity
cd ~/claude-design-parity
npm install
```

`npm install` runs `npx playwright install chromium` automatically. First install takes about a minute and 200 MB of disk.

To use the skill in a project, copy `SKILL.md` into one of:

- `.claude/skills/claude-design-parity/SKILL.md` (project-scoped, lives with the repo)
- `~/.claude/skills/claude-design-parity/SKILL.md` (user-global, available from any project)

Then invoke `/claude-design-parity` from a Claude Code session in that project.

For a stack-specific specialization (recommended for Tauri projects), copy `examples/tauri-react-zustand/SKILL.md` into `.claude/skills/claude-design-parity-<your-project-slug>/SKILL.md` and follow [`examples/tauri-react-zustand/README.md`](examples/tauri-react-zustand/README.md).

## How it works

A parity run executes five phases:

1. **Project discovery.** Reads your `CLAUDE.md` and `package.json` to learn state idioms, native bridge module, motion gating helper, styling idiom, layout conventions, and launch commands. Restates them back to you for confirmation.
2. **Ingest.** Finds the latest design output (scans `~/Desktop`, falls back to `~/Downloads` and any project-specific archive), moves it into `docs/design/handoffs/YYYY-MM-DD/`, and updates `CHANGELOG.md` plus `CURRENT.md`.
3. **Diff.** Compares the new design source against `.design-snapshot/` (the previous run's baseline). For every changed file, reads it end-to-end and produces a per-file inventory with line ranges, demo-scaffolding flags, and impl targets. Cross-checks against acceptance checklists; the source always wins.
4. **Clarify.** If any ambiguity remains (new functionality, design vs impl conflicts, multiple plausible interpretations), pauses and asks multiple-choice questions before any code changes.
5. **Port (two passes per file, never one).** Pass A: literal port of JSX from `<source>:A-B` into the impl file. Pass B: re-wire to your project's real state selectors, bridge calls, and motion gates. One commit per design source file with a line-citation in the body.
6. **Snapshot, verify, launch.** Updates `.design-snapshot/`. Runs static gates (typecheck, native check, lint, format). Boots the dev server. **Runs `scripts/parity-screenshot-diff.mjs`** against the running impl and the design source; routes with pixel deltas above threshold block sign-off. Prints a human verification checklist that includes flagged regressions and pending `TODO(parity)` items.

See [`docs/two-pass-port.md`](docs/two-pass-port.md) for the rationale behind the two-pass split, and [`docs/visual-verification.md`](docs/visual-verification.md) for the Playwright integration details.

## Visual verification

The companion script `scripts/parity-screenshot-diff.mjs` captures full-page PNGs of the design and the impl at multiple viewports per route, computes pixel deltas with pixelmatch, and writes:

- `report.json` with sorted keys, machine-readable.
- `report.md` with a human-readable summary table.
- Per-route screenshots and diff PNGs (red overlay on mismatched pixels).
- Per-route Playwright aria snapshots (YAML).
- A `manifest.json` sentinel that controls re-run cleanup safety.

CLI:

```sh
node scripts/parity-screenshot-diff.mjs \
  --design 'https://design.example.com/{route}' \
  --impl 'http://localhost:5173{route}' \
  --routes '/,/settings,/workspace' \
  --viewports 375,768,1440 \
  --out parity-output \
  --threshold 0.005
```

Exit codes: `0` for parity verified, `1` for at least one route exceeded threshold (visual regression to investigate), `2` for usage error, `3` for runtime error. Treat `1` as a soft failure; treat `2` or `3` as a hard failure.

Full CLI contract in [`scripts/README.md`](scripts/README.md). Threshold tuning, CI integration, and limitations in [`docs/visual-verification.md`](docs/visual-verification.md).

## Specializing for your stack

The headline `SKILL.md` works on any project. A stack-specific specialization works better. The `examples/` directory ships one reference specialization:

- `examples/tauri-react-zustand/`. Tauri 2 plus React plus Zustand. Bakes in dev port `1420`, `src-tauri/` backend layout, `cargo check` static gate, and the `useShallow` invariant for Zustand v5. Adoption guide at `examples/tauri-react-zustand/README.md`.

Stacks not yet covered (PRs welcome, see [`CONTRIBUTING.md`](CONTRIBUTING.md)):

- Next.js plus Zustand
- Expo plus Zustand
- SwiftUI plus Combine
- Remix plus Redux
- Vue plus Pinia

## Limitations

- The visual-diff script v0.1 only handles standalone HTML exports of Claude Design output and running URLs. Folder bundles like `lib_v3/` need a wrapper renderer (planned for v0.2).
- Full-page screenshots only; no above-the-fold mode.
- Aria snapshots are captured per route but not yet diffed automatically.
- Single threshold across all viewports.
- Static state only; the script doesn't scroll, hover, or click. Animations and timing-sensitive content may produce noisy diffs.

See [`docs/visual-verification.md`](docs/visual-verification.md) for the full list and [`CHANGELOG.md`](CHANGELOG.md) for the v0.2 roadmap.

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md). The most valuable contributions are new stack examples under `examples/`. Coding standards: no emdashes anywhere, conventional commits, ESLint plus Prettier must pass, no comments narrating what the code does.

## Prior art

This project lives alongside the author's other Claude Code OSS work:

- [`claude-code-toolkit`](https://github.com/jeffmichaeljohnson-tech/claude-code-toolkit). Production-grade infrastructure toolkit for Claude Code.
- [`neurotoken`](https://github.com/jeffmichaeljohnson-tech/neurotoken). Adaptive thinking allocation for Claude Code.

## License

[MIT](LICENSE).
