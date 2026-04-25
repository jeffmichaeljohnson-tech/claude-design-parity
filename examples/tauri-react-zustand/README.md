# Tauri 2 plus React plus Zustand specialization

This example shows how to specialize the generic `/claude-design-parity` skill for a Tauri 2 plus React plus Zustand project. It encodes Tauri-specific defaults (dev port `1420`, `src-tauri/` backend layout, `cargo check` static gate) and a generic page layout with placeholder pane names.

## Why specialize

The generic `/claude-design-parity` skill discovers conventions from `CLAUDE.md` and the file tree at runtime. That works, but it costs tokens on every invocation and can miss invariants that aren't documented anywhere. A stack-specific specialization moves those invariants into the skill itself, so the skill starts every run already knowing them.

## How to adopt this template

1. Copy `SKILL.md` from this directory into your repo at:

   ```
   .claude/skills/claude-design-parity-<your-project-slug>/SKILL.md
   ```

2. Open it and replace these placeholders (each is flagged with `<!-- CHANGE THIS -->` in the source):
   - **Skill name in frontmatter.** Change `claude-design-parity-tauri` to `claude-design-parity-<your-project-slug>`. The slash command becomes `/claude-design-parity-<your-project-slug>`.
   - **Repo invariants list.** Add anything specific to your project (graphics budgets, custom hooks, file-format invariants).
   - **`Where things live` paths.** Replace placeholder pane names (`<HomePane>`, `<SettingsPane>`, `<WorkspacePane>`) with your real ones. Update layout shell path.
   - **Routes in Phase 4 step 5.** Replace `/,/settings,/workspace` with your real route list.
   - **Off-repo archive path.** If you mirror design exports off-repo, replace `~/Documents/<project>-design-archive/` with the real path.

3. Make sure the parity script is reachable. Either:
   - Clone `claude-design-parity` somewhere stable and reference its absolute path in the SKILL.md (Phase 4 step 5).
   - Vendor the script into your repo at `scripts/parity-screenshot-diff.mjs` plus a copy of the `package.json` deps (`playwright`, `pixelmatch`, `pngjs`).

4. Test it on a known design handoff. The first run with `--first-port` should produce a clean parity report and a baseline snapshot.

## What this template assumes about your project

- Tauri 2 plus React (any version) plus Zustand (v5 plus `useShallow`).
- Vite dev server on `http://localhost:1420` (Tauri default).
- TypeScript strict mode (used in static gate via `npm run typecheck` or `npx tsc --noEmit`).
- A `src/panes/` directory for Zustand-wired pages and a `src/components/` directory for shared bits.
- A typed Tauri bridge at `src/tauri/bridge.ts`.

If any of those are wrong, edit the template before using it.

## What this template intentionally leaves blank

- **Project-specific invariants.** Things like graphics-context budgets, scrollback replay, voice or geolocation hooks. The template has placeholder comments where they should go. Fill them in based on your project's `CLAUDE.md`.
- **Real route list.** Every Tauri app has a different route layout. The template ships with three placeholder routes; replace them.
- **Acceptance-checklist file name.** Some projects use `FRONTEND-PORT.md`, others `IMPLEMENTATION.md`, others nothing at all. The template references the common ones; adjust as needed.

## Future stacks

Stacks not yet covered as examples (PRs welcome):

- Next.js plus Zustand
- Expo plus Zustand
- SwiftUI plus Combine
- Remix plus Redux
- Vue plus Pinia
