---
name: claude-design-parity-tauri
description: Reference specialization of /claude-design-parity for Tauri 2 plus React plus Zustand projects. Copy this into your repo as a starting point at .claude/skills/claude-design-parity-<project>/SKILL.md, then replace the example placeholders with your project's surfaces. Invoke with /claude-design-parity-<project>.
---

# /claude-design-parity-tauri (template)

This file is a **template**. To use it in your own repo, copy it to `.claude/skills/claude-design-parity-<project>/SKILL.md` (where `<project>` is your project's slug), rename the skill in the frontmatter, and replace the placeholders flagged with `# CHANGE THIS` below.

Run **only when explicitly invoked**. Bring this Tauri repo to parity with the latest Claude Design session output without nuking the real Zustand or Tauri wiring.

## Args

- `--first-port`. Treat the run as the first port: do the diff against any project acceptance checklist plus impl scan, port what's missing, then write the snapshot. Without this flag, **first run is snapshot-only** (no porting).
- `--dry-run`. Run Phases 0 through 2 only, write the parity report, then stop. No edits, no commits.

## Repo invariants (preserve, do not nuke)

These are the Tauri plus React plus Zustand defaults. Add or remove items based on your project.

- **Zustand v5 plus `useShallow`.** Any selector returning a fresh array or object MUST wrap with `useShallow` from `zustand/react/shallow`. Without it Zustand throws "Maximum update depth exceeded" and the UI freezes.
- **Tauri bridge.** All `invoke(...)` calls go through a single typed module (e.g. `src/tauri/bridge.ts`). Backend lives in `src-tauri/src/` (`lib.rs`, `commands.rs`, plus per-feature modules).
- **Reduced motion.** Every `motion.*` and CSS keyframe consumer gates on `useReducedMotion()` (or your project's helper, e.g. `src/ui/reduced-motion.ts`).
- **Styling idiom.** Match your existing convention. Two common Tauri patterns:
  - Inline `style={{ ... var(--*) }}` for theming. Do NOT convert to Tailwind utility classes mid-port.
  - Tailwind utilities throughout. Do NOT introduce inline CSS-vars mid-port.

  Whichever you use, the rule is: don't switch idioms during a parity run. If the design uses one and your impl uses the other, ask in Phase 3 before drifting.

- **No error boundaries.** If your project doesn't have any, don't add them mid-port. Add them in a separate task with explicit user approval.

\<!-- CHANGE THIS: list your project's other invariants here. Examples: --\>
\<!-- - WebGL or canvas budget for graphics-heavy panes. --\>
\<!-- - Scrollback or stream replay for long-running output. --\>
\<!-- - Specific hooks (voice, geolocation, push, etc). --\>
\<!-- - Config dirs or paths your code depends on. --\>
\<!-- - File-format invariants (sync locks, atomic writes, etc). --\>

## Where things live

These are typical Tauri plus React plus Zustand paths. Adjust for your project.

- Frontend components: `src/components/` (shared plus optional shadcn/ui under `src/components/ui/`)
- Page-level Zustand-wired surfaces: `src/panes/` (e.g. `<HomePane>`, `<SettingsPane>`, `<WorkspacePane>`)
- Layout shell: `src/layout/<your-shell>.tsx`
- State: `src/state/`
- Reduced motion helpers: `src/ui/reduced-motion.ts`
- Backend: `src-tauri/src/`
- Typed bridge: `src/tauri/bridge.ts`

\<!-- CHANGE THIS: replace placeholder pane names with your real ones. --\>

## Operating principles (from session retrospectives)

These compress the convergence loop. Read them every run. Skipping any of them is the dominant cause of "round 2, round 3, round 4" rework.

1. **The mapping table is a hypothesis, not a spec.** Filename inference (`topbar.jsx` becomes `ProjectTabs.tsx`) is wrong often enough to break runs. Before drafting a port plan, **read every changed `<canonical-design-source>/*.jsx` file end-to-end.** Build a per-file inventory of exports, top-level state, handlers, and rendered surfaces. Map each entry to an impl target or mark it "missing." Only then start porting.

2. **The only acceptable spec for a surface is `<file>.jsx` lines A to B.** Compressed sources lie:
   - Acceptance checklists (`FRONTEND-PORT.md`, `IMPLEMENTATION.md`) are _selective summaries_. Items that didn't make the bullet (think: an Appearance card that was in the JSX but not in the bullet list) get silently dropped.
   - Screenshots are lossy.
   - Prose change descriptions are paraphrased.

   When porting a surface, cite the design file path and line range in the commit body. If you find yourself working from a screenshot or a roadmap bullet, **stop and read the JSX**.

3. **Visual fidelity and functional fidelity are two passes, not one.**
   - "Preserve wiring" protects state and bridge calls. It does NOT mean "minimize visual change."
   - **Pass A, literal port:** copy the JSX from `<canonical-design-source>/X.jsx` lines A to B into the impl file. Markup, structure, styles, copy, sub-components.
   - **Pass B, re-wire:** re-attach Zustand selectors, Tauri bridge calls, motion gates, plus any project-specific hooks.
   - Merging them produces a _restyle_ of the existing impl rather than a _port_ of the new design.

4. **Prompt and commit structure mirror source structure.** One commit per `<canonical-design-source>/*.jsx` file (or per coherent block within a file, e.g. one of three sub-components). Don't invent thematic groupings ("tokens" / "shell" / "polish"). Surfaces fall between categories and get dropped. The taxonomy is `<canonical-design-source>/*.jsx`, not your mental model.

5. **First-pass perfection is not the target. Fast convergence with low rework is.** Design exports often contain demo scaffolding (`uuidish()`, mock state, hardcoded `localStorage[...]`) that can't port literally. Every surface needs judgment about what's real vs. demo. Expect 1 to 2 catch-up rounds; budget for them rather than over-promising round one.

6. **Visual verification is automated, every run.** Phase 5 runs `parity-screenshot-diff` against the impl dev server (`http://localhost:1420` for Tauri's default dev port) and the design source. Routes with pixel deltas above the threshold block sign-off.

## Phase 0: Ingest

Find the new design output without asking the user where it is.

1. Scan `~/Desktop` for files or folders modified in the last 7 days matching:
   - The canonical design source folder (e.g. `lib_v*/`, `library/`, `design-system/`)
   - `*.html` matching the project name or "design"
   - `FRONTEND-PORT.md`, `IMPLEMENTATION.md`, `STATUS.md`, `CHANGELOG-DESIGN.md`
   - Folders containing any of the above

   ```sh
   find ~/Desktop -maxdepth 3 -mtime -7 \( -name 'lib_v*' -o -name 'library' -o -iname '*design*.html' -o -name 'FRONTEND-PORT.md' -o -name 'IMPLEMENTATION.md' -o -name 'STATUS.md' -o -name 'CHANGELOG-DESIGN.md' \) 2>/dev/null
   ```

2. If more than one candidate: list with mtimes and ask multiple-choice.

3. If zero on Desktop: also check `~/Downloads` (same patterns, last 7 days). If your project has an off-repo archive (e.g. `~/Documents/<project>-design-archive/`), check the most recent subfolder there. If still empty, ask the user.

4. Move or copy the chosen bundle into `docs/design/handoffs/YYYY-MM-DD/`. If today's folder already exists, append `-2`, `-3`, etc.

5. Mirror the bundle to your project's off-repo archive if configured.

6. For standalone HTML exports (single `.html` file), prefer your project's intake script if you have one (e.g. `scripts/import-design.sh <path> --label "..." --summary "..."`). For folder bundles, do a manual move plus manual `CHANGELOG.md` row plus update `CURRENT.md`.

## Phase 1: Diff

Detect what changed since last sync. The order matters: snapshot diff narrows the file set, then **read those files end-to-end** (Operating Principle #1) before any other source. Acceptance checklists and changelogs are _cross-checks_, not specs.

1. **Snapshot diff.** Maintain `.design-snapshot/` at repo root (gitignored).
   - First run, no `--first-port`: copy incoming canonical source folder verbatim into `.design-snapshot/`, write a short `parity-report.md` saying "baseline established, no port performed," then go to Phase 4 step 1 and stop.
   - First run with `--first-port`: copy snapshot AND continue.
   - Subsequent runs: `diff -r .design-snapshot/<source>/ <handoff>/<source>/`. Every added, modified, or deleted file is a candidate.

2. **Read every changed source file end-to-end.** Non-negotiable. For each changed file, write into the parity report:
   - **Inventory:** every exported component, every `useState` or `useEffect` or store hook, every handler, every rendered surface (including conditionals and sub-trees).
   - **Line ranges** for each surface (so commits can cite `<source>:A-B`).
   - **Demo scaffolding flags:** mark every `uuidish()`, `setTimeout`, hardcoded `localStorage[...]`, mock array. These can't port literally and need judgment in Pass B.
   - **Impl target** per inventory entry. File path under `src/panes/` or `src/components/`, or `MISSING` if no current owner.

3. **Cross-checks (hypotheses to confirm, not specs):**
   - **`CHANGELOG-DESIGN.md`** in the new bundle. Entries since the last sync.
   - **Acceptance checklist** if present (`FRONTEND-PORT.md §11`, `IMPLEMENTATION.md`, `STATUS.md`).
   - These get cross-referenced against the inventory. If the bullet says less than the JSX shows, the JSX wins. If the JSX has a surface the bullet didn't mention, **port it anyway**.

4. **Cross-reference** the inventory against `src/panes/` and `src/components/`. The filename-based mapping is a starting hypothesis; the inventory either confirms or corrects it.

Write the **CHANGE REPORT** to `docs/design/handoffs/YYYY-MM-DD/parity-report.md`.

## Phase 2: Clarify

If the change report has ANY ambiguity (new functionality not explained, conflicting signals between design and impl, multiple plausible interpretations), ask multiple-choice questions BEFORE writing code.

**Conflict policy when design and impl disagree:** PAUSE AND ASK PER CONFLICT. Don't auto-resolve. List the conflict, give 2 to 4 options, wait.

If the change report is unambiguous and small, skip to Phase 3.

If `--dry-run`: stop here. The parity report is the deliverable.

## Phase 3: Port (two passes per file, never one)

For **each** changed source file (Operating Principle #3 plus #4):

### Pass A: Literal port (visual fidelity)

Copy the JSX from `<source>` lines A to B into the impl file. The goal is that the rendered tree matches the design when fed dummy state.

- **Markup, structure, styles, copy, sub-components.** Port them as written. Preserve your project's styling idiom. Don't switch idioms mid-port.
- **Don't preserve impl's prior layout** if the design has moved on. That's restyling, not porting. Layout is part of the spec.
- **Cite the source.** Capture `<source>:A-B` for the commit body.

### Pass B: Re-wire (functional fidelity)

Now re-attach the real wiring (the Repo invariants above):

- Zustand selectors plus `useShallow` wrappers
- Tauri bridge calls (`src/tauri/bridge.ts`)
- `useReducedMotion()` gates
- Project-specific hooks and invariants

**Demo scaffolding from the inventory gets replaced here, not in Pass A.**

- `useState` for mock data: real Zustand selector
- `setTimeout` or `setInterval` for fake events: real Tauri event subscription
- `uuidish()`: real ID from backend
- Hardcoded `localStorage[...]`: real settings store
- Mock arrays: real selector or empty-state

If the corresponding backend doesn't exist yet:

- Leave `// TODO(parity): wire to <command_name> when implemented`
- Add the gap to the human checklist in Phase 4

### New surfaces from design

If the source has surfaces with no current impl owner (`MISSING` in the inventory), scaffold into the right folder, then run **Pass A plus Pass B** on the new file:

- Page-level Zustand-wired: `src/panes/`
- Reusable bits: `src/components/`
- State: `src/state/` (new store) or extend existing
- Tauri commands: `src-tauri/src/commands.rs` plus register in `src/tauri/bridge.ts`

### Commit discipline

- **One commit per design source file**, or per coherent sub-component block within a single file. Don't invent thematic groupings.
- **Concise messages prefixed `[parity]`.**
- **Line citations in the commit body**, non-negotiable. Format:

  ```
  [parity] settings: port Appearance card

  Source: <canonical-design-source>/settings_panel.jsx:142-218
  Pass A: literal port of card markup plus accent swatches
  Pass B: theme plus accent -> useSettingsStore (useShallow); reduced-motion gate
  TODO(parity): transparency slider needs <command_name>
  ```

- One concept per commit. No multi-area mega-commits.

## Phase 4: Snapshot, verify, launch

1. **Update `.design-snapshot/`.** Copy the incoming source folder over the existing snapshot. This becomes the baseline for the next run.

   ```sh
   rm -rf .design-snapshot/<source-folder>
   cp -R "<handoff>/<source-folder>" .design-snapshot/
   ```

2. **Update `docs/design/CHANGELOG.md`** with one row summarizing what landed.

3. **Static gates.**
   - `npm run typecheck` (or `npx tsc --noEmit`) must pass.
   - `cargo check` (in `src-tauri/`) must pass.
   - `npm run lint` and `npm run format:check` if configured.
   - If any fail: fix before declaring done.

4. **Boot test.** Run `npm run tauri:dev` (per `package.json`). Confirm it boots without console errors. If it fails, fix and re-run.

5. **Visual verification (mandatory).** Run the parity script. The path depends on where you cloned `claude-design-parity`:

   ```sh
   node ~/path/to/claude-design-parity/scripts/parity-screenshot-diff.mjs \
     --design <path-or-url-to-design-source> \
     --impl http://localhost:1420 \
     --viewports 375,768,1440 \
     --routes /,/settings,/workspace \
     --out docs/design/handoffs/YYYY-MM-DD/visual-diff/ \
     --threshold 0.005
   ```

   \<!-- CHANGE THIS: replace the routes with your real route list. --\>
   - Read `report.md`. Any route with `status: regression` blocks sign-off.
   - For each regression: open the diff PNG, judge whether the delta is intentional or a port mistake. Fix mistakes; document intentional deltas in the human checklist.

6. **Print HUMAN VERIFICATION CHECKLIST.** Save to `docs/design/handoffs/YYYY-MM-DD/human-check.md` AND print to terminal. Derived from:
   - Acceptance-checklist items that touched changed surfaces.
   - New items from this round.
   - Routes flagged as regression in the visual diff.
   - Grouped by area (Shell, Left rail, Right rail, Pages, Components, etc.).
   - Checkbox format `[ ]`.
   - Trailing **TODO(parity)** section listing every `// TODO(parity)` comment left in this round.

7. **Stop.** Do not declare success. Wait for the user to run the checklist.

## Rules that apply throughout

- **The spec is the JSX, not the summary.** Cite `<source>:A-B` in commit bodies. Don't patch against acceptance-checklist bullets, screenshots, or prose change descriptions. Those are cross-checks.
- **Read each changed source file end-to-end** before drafting the port. Skipping this is the #1 cause of dropped surfaces.
- **Two passes per file: literal port, then re-wire.** Don't merge them. Don't restyle existing impl when the design has moved on.
- **One commit per design file.** No thematic groupings.
- **Filename inference is a hypothesis.** Confirm with the inventory before committing to a mapping.
- **First-pass perfection isn't the target.** Fast convergence with low rework is. Budget for 1 to 2 catch-up rounds.
- **Automated visual verification runs every parity run.** Any route with pixel delta above threshold blocks sign-off.
- **Ask multiple-choice questions** whenever confused, unless the user said "just go" when invoking.
- **Conflict policy is always pause-and-ask per conflict.** Never auto-resolve.
- **Don't switch styling idioms mid-port** (CSS-vars vs Tailwind, etc).
- **Every run leaves the repo in a state where `npm run tauri:dev` boots cleanly.**
- **No violent language** in commits, comments, or output. Use neutral alternatives (list, overview, guide, great, excellent).

## End-of-run summary

Print a one- or two-sentence summary: what landed, what's pending, where to read the full report. Then stop.
