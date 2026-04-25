---
name: claude-design-parity
description: A Claude Code skill that ports Claude Design (claude.ai/design) prototypes into your real codebase. Surgical port that preserves state stores, native bridges, motion gates, and project conventions. Verifies visual fidelity with Playwright on every run. Project-agnostic, discovers conventions from CLAUDE.md and the repo. Invoke with /claude-design-parity (optional flags --first-port, --dry-run).
---

# /claude-design-parity

Run **only when explicitly invoked**. Bring the current project to parity with the latest Claude Design session output without nuking the real wiring (state stores, native or IPC bridges, hooks, motion gates).

If the current repo has a stack-specific specialization at `.claude/skills/claude-design-parity-<stack>/SKILL.md`, surface it in the first message and ask whether to defer to it. The specialization knows the repo's invariants directly. This generic skill infers them from `CLAUDE.md` and the file tree.

## Args

- `--first-port`. Treat the run as the first port: do the diff against any project acceptance checklist plus impl scan, port what's missing, then write the snapshot. Without this flag, **first run is snapshot-only** (no porting).
- `--dry-run`. Run Phases 0 through 2 only, write the parity report, then stop. No edits, no commits.

## Operating principles (from session retrospectives)

These compress the convergence loop. Read them every run. Skipping any of them is the dominant cause of "round 2, round 3, round 4" rework.

1. **The mapping table is a hypothesis, not a spec.** Filename inference (`topbar.jsx -> ProjectTabs.tsx`) is wrong often enough to break runs. Before drafting a port plan, **read every changed design source file end-to-end.** Build a per-file inventory of exports, top-level state, handlers, and rendered surfaces. Map each entry to an impl target or mark it "missing." Only then start porting.

2. **The only acceptable spec for a surface is `<file>.jsx` (or `.tsx` or `.html`) lines A to B.** Compressed sources lie:
   - Acceptance checklists and roadmaps (`FRONTEND-PORT.md`, `IMPLEMENTATION.md`) are _selective summaries_. Items that didn't make the bullet get silently dropped.
   - Screenshots are lossy.
   - Prose change descriptions are paraphrased.

   When porting a surface, cite the design file path and line range in the commit body. If you find yourself working from a screenshot or a roadmap bullet, **stop and read the source file**.

3. **Visual fidelity and functional fidelity are two passes, not one.**
   - "Preserve wiring" protects state and bridge calls. It does NOT mean "minimize visual change."
   - **Pass A, literal port:** copy the JSX or markup from `<source>` lines A to B into the impl file. Markup, structure, styles, copy, sub-components.
   - **Pass B, re-wire:** re-attach the project's real state selectors, native or IPC bridge calls, hooks, and motion gates (whatever Phase 0 discovered).
   - Merging them produces a _restyle_ of the existing impl rather than a _port_ of the new design.

4. **Prompt and commit structure mirror source structure.** One commit per design source file (or per coherent block within a file). Don't invent thematic groupings ("tokens" / "shell" / "polish"). Surfaces fall between categories and get dropped. The taxonomy is the design source layout, not your mental model.

5. **First-pass perfection is not the target. Fast convergence with low rework is.** Design exports often contain demo scaffolding (`uuidish()`, mock state, hardcoded `localStorage[...]`) that can't port literally. Every surface needs judgment about what's real vs. demo. Expect 1 to 2 catch-up rounds; budget for them rather than over-promising round one.

6. **Visual verification is automated, every run.** Phase 5 runs `scripts/parity-screenshot-diff.mjs` against the impl dev server and the design URL or HTML export. Routes with pixel deltas above the threshold block sign-off until investigated. There is no opt-out: this is what "parity" means in this skill.

## Phase 0: Project discovery

Before anything else, read the project to learn its conventions. Do NOT assume.

1. Read `CLAUDE.md` at repo root if present. Note:
   - State store of record (Zustand, Redux, Jotai, signals, etc.)
   - State idiom rules (e.g. Zustand `useShallow` for fresh-reference selectors)
   - Native or IPC bridge module (Tauri, Electron, Capacitor, Expo, web)
   - Motion gating helper (`useReducedMotion`, CSS `prefers-reduced-motion`, etc.)
   - Styling idiom (Tailwind utilities vs inline CSS-vars vs CSS modules)
   - Component layout (e.g. `src/panes/` vs `src/pages/` vs `src/routes/`)
   - Forbidden patterns (no `any`, no error boundaries, no specific lib, etc.)
   - Launch and check commands

2. Read `package.json` `scripts` to find:
   - Dev launcher (e.g. `npm run dev`, `npm run tauri:dev`, `npm start`, `expo start`)
   - Typecheck (e.g. `npm run typecheck`, `tsc --noEmit`)
   - Native build check if applicable (e.g. `cargo check` for Tauri, `xcodebuild` for native)

3. List `docs/design/` and look for the project's intake convention:
   - `README.md`. Protocol doc.
   - `CHANGELOG.md`. Pipe-delimited import log.
   - `CURRENT.md`. Pointer to latest spec.
   - `specs/`. Standalone HTML exports.
   - `handoffs/YYYY-MM-DD/`. Multi-file handoff bundles.
   - `scripts/import-design.sh` or similar. Intake automation.

   If `docs/design/` is absent, fall back to creating it on first run, mirroring the structure above.

4. **Restate** the discovered conventions in one paragraph back to the user before proceeding to Phase 1, so they can correct anything wrong.

## Phase 1: Ingest

Find the new design output without asking the user where it is.

1. Scan `~/Desktop` (last 7 days) for:
   - A canonical design source folder (e.g. `lib_v*/`, `library/`, `design-system/`)
   - `*.html` matching the project name or "design"
   - `FRONTEND-PORT.md`, `IMPLEMENTATION.md`, `STATUS.md`, `CHANGELOG-DESIGN.md`
   - Folders containing any of the above

   ```sh
   find ~/Desktop -maxdepth 3 -mtime -7 \( -name 'lib_v*' -o -name 'library' -o -iname '*design*.html' -o -name 'FRONTEND-PORT.md' -o -name 'IMPLEMENTATION.md' -o -name 'STATUS.md' -o -name 'CHANGELOG-DESIGN.md' \) 2>/dev/null
   ```

2. If more than one candidate: list with mtimes and ask multiple-choice.

3. If zero on Desktop: also check `~/Downloads` (same patterns, last 7 days). If the project has an off-repo archive (per `docs/design/README.md`, e.g. `~/Documents/<project>-design-archive/`), check the most recent subfolder there. If still empty, ask the user.

4. Move or copy the chosen bundle into `docs/design/handoffs/YYYY-MM-DD/`. If today's folder already exists, append `-2`, `-3`, etc.

5. Mirror to the project's off-repo archive if one is configured (see `docs/design/README.md`).

6. For standalone HTML exports, prefer the project's intake script if present (e.g. `scripts/import-design.sh <path> --label "..." --summary "..."`). For folder bundles, do a manual move plus manual `CHANGELOG.md` row plus update `CURRENT.md`.

## Phase 2: Diff

Detect what changed since last sync. The order matters: snapshot diff narrows the file set, then **read those files end-to-end** (Operating Principle #1) before any other source. Acceptance checklists and changelogs are _cross-checks_, not specs.

1. **Snapshot diff.** Maintain `.design-snapshot/` at repo root (gitignored).
   - First run, no `--first-port`: copy the incoming canonical source folder verbatim into `.design-snapshot/`, write a short `parity-report.md` saying "baseline established, no port performed," then go to Phase 5 step 1 and stop.
   - First run with `--first-port`: copy snapshot AND continue.
   - Subsequent runs: `diff -r .design-snapshot/<source>/ <handoff>/<source>/`. Every added, modified, or deleted file is a candidate.

2. **Read every changed design source file end-to-end.** Non-negotiable. For each changed file, write into the parity report:
   - **Inventory:** every exported component, every state hook, every handler, every rendered surface (including conditionals and sub-trees).
   - **Line ranges** for each surface (so commits can cite `<source>:A-B`).
   - **Demo scaffolding flags:** mark every `uuidish()`, `setTimeout`, hardcoded `localStorage[...]`, mock array. These can't port literally and need judgment in Pass B.
   - **Impl target** per inventory entry. File path under the project's component layout, or `MISSING` if no current owner.

   Skipping this step is the #1 cause of dropped surfaces. Do not skip even if the changed file looks small.

3. **Cross-checks (hypotheses to confirm, not specs):**
   - **`CHANGELOG-DESIGN.md`** in the new bundle. Entries since the last sync.
   - **Acceptance checklist** if present (`FRONTEND-PORT.md §11`, `IMPLEMENTATION.md`, `STATUS.md`).
   - These get cross-referenced against the inventory from step 2. If the bullet says less than the source shows, the source wins. If the source has a surface the bullet didn't mention, **port it anyway**.

4. **Cross-reference** the inventory against the project's component layout. The filename-based mapping you did in step 2 is a starting hypothesis; the inventory either confirms or corrects it.

Write **CHANGE REPORT** to `docs/design/handoffs/YYYY-MM-DD/parity-report.md`:

```markdown
# Parity Report, YYYY-MM-DD

## Per-file inventory (Operating Principle #1)

### <source path>

- Lines 1-40: exports (list each)
- Lines A-B: <Surface name>. Impl target: <path> (or MISSING)
- Lines C-D: <Surface name>. Impl target: ...
- Demo scaffolding to replace in Pass B: ...

(repeat per changed source file)

## Files added in design (need new impl)

## Files modified in design (need impl patches, include line ranges)

## Files deleted in design (impl may need cleanup)

## Surfaces in source that did NOT appear in checklist bullets

## Unchecked items from acceptance checklist mapping to impl gaps

## Open questions / ambiguities
```

## Phase 3: Clarify

If ANY ambiguity in the report (new functionality, conflicting signals between design and impl, multiple plausible interpretations), ask multiple-choice questions BEFORE writing code.

**Conflict policy when design and impl disagree:** PAUSE AND ASK PER CONFLICT. Don't auto-resolve. Don't assume design wins. Don't assume impl wins. List the conflict, give 2 to 4 options, wait.

If the report is unambiguous and small (copy tweak, color update, one new button), skip to Phase 4.

If `--dry-run`: stop here. The parity report is the deliverable.

## Phase 4: Port (two passes per file, never one)

For **each** changed design source file (Operating Principle #3 plus #4):

### Pass A: Literal port (visual fidelity)

Copy the JSX or markup from `<source>` lines A to B into the impl file. The goal is that the rendered tree matches the design when fed dummy state.

- **Markup, structure, styles, copy, sub-components.** Port them as written. Preserve the project's styling idiom discovered in Phase 0 (don't switch from CSS-vars to Tailwind, or vice versa, unless that's the explicit ask).
- **Don't preserve impl's prior layout** if the design has moved on. That's restyling, not porting. Layout is part of the spec.
- **Cite the source.** Capture `<source>:A-B` for the commit body.

### Pass B: Re-wire (functional fidelity)

Now re-attach the real wiring noted in Phase 0:

- State store calls plus idiom rules (e.g. Zustand `useShallow`)
- Native or IPC bridge calls
- Project-specific hooks (voice, geolocation, push, etc.)
- Motion gates (`useReducedMotion()`, `prefers-reduced-motion`)
- Any other invariants from `CLAUDE.md`

**Demo scaffolding from the inventory gets replaced here, not in Pass A.** The inventory in Phase 2 step 2 already flagged it:

- `useState` for mock data: real state selector
- `setTimeout` or `setInterval` for fake events: real event subscription
- `uuidish()`: real ID from backend
- Hardcoded `localStorage[...]`: real settings store
- Mock arrays: real selector or empty-state

If the corresponding backend doesn't exist yet:

- Leave `// TODO(parity): wire to <name> when implemented`
- Add the gap to the human checklist in Phase 5

### New surfaces from design

If the design source has surfaces with no current impl owner (`MISSING` in the inventory), scaffold into the right folder per the project's layout, then run **Pass A plus Pass B** on the new file.

### Commit discipline

- **One commit per design source file**, or per coherent sub-component block within a single file. Don't invent thematic groupings.
- **Concise messages prefixed `[parity]`.**
- **Line citations in the commit body**, non-negotiable. Format:

  ```
  [parity] settings: port Appearance card

  Source: <design-source-path>:142-218
  Pass A: literal port of card markup plus accent swatches
  Pass B: theme plus accent -> useSettingsStore (useShallow); reduced-motion gate
  TODO(parity): transparency slider needs <command_name>
  ```

- One concept per commit. No multi-area mega-commits.

## Phase 5: Snapshot, verify, launch

1. **Update `.design-snapshot/`.** Copy incoming canonical source folder over the existing snapshot.

2. **Update `docs/design/CHANGELOG.md`** with one row summarizing what landed.

3. **Static gates** per Phase 0 discovery:
   - Typecheck (e.g. `npm run typecheck`, `tsc --noEmit`).
   - Native check if applicable (e.g. `cargo check`).
   - Lint and format if the project has them configured.
   - If any fail: fix before proceeding.

4. **Boot test.** Run the dev launcher discovered in Phase 0 (e.g. `npm run dev`, `npm run tauri:dev`, `expo start`). Confirm it boots without console errors.

5. **Visual verification (mandatory).** Run `scripts/parity-screenshot-diff.mjs`:

   ```sh
   node <path-to>/scripts/parity-screenshot-diff.mjs \
     --design <path-or-url-to-design-source> \
     --impl http://localhost:<dev-port> \
     --viewports 375,768,1440 \
     --routes <comma-separated-list-of-routes> \
     --out docs/design/handoffs/YYYY-MM-DD/visual-diff/ \
     --threshold 0.005
   ```

   - The script writes `report.md`, `report.json`, per-route diff PNGs, and per-route aria snapshots.
   - Read `report.md`. Any route with `status: regression` (mismatch ratio above threshold) blocks sign-off.
   - For each regression: open the diff PNG, judge whether the delta is intentional (design moved on, impl needs catch-up) or unintentional (port mistake). If unintentional, fix and re-run. If intentional, document it in the human checklist as "expected delta, design ahead of impl on this surface" with a rationale.
   - The script's exit code feeds CI: 0 means parity verified, 1 means regression to investigate, 2 or 3 means script-level failure.

6. **Print HUMAN VERIFICATION CHECKLIST.** Save to `docs/design/handoffs/YYYY-MM-DD/human-check.md` AND print to terminal. Derived from:
   - Acceptance-checklist items that touched changed surfaces.
   - New items from this round.
   - Routes flagged as regression in the visual diff (with diff-PNG path).
   - Aria snapshot deltas worth eyes (manual review in v0.1).
   - Grouped by area (Shell, Navigation, Pages, Components, etc.).
   - Checkbox format `[ ]`.
   - Trailing **TODO(parity)** section listing every `// TODO(parity)` comment left in this round.

7. **Stop.** Do not declare success. Wait for the user to run the checklist.

## Rules that apply throughout

- **The spec is the source file, not the summary.** Cite `<source>:A-B` in commit bodies. Don't patch against acceptance-checklist bullets, screenshots, or prose change descriptions. Those are cross-checks.
- **Read each changed design source file end-to-end** before drafting the port. Skipping this is the #1 cause of dropped surfaces.
- **Two passes per file: literal port, then re-wire.** Don't merge them. Don't restyle existing impl when the design has moved on.
- **One commit per design source file.** No thematic groupings.
- **Filename inference is a hypothesis.** Confirm with the inventory before committing to a mapping.
- **First-pass perfection isn't the target.** Fast convergence with low rework is. Budget for 1 to 2 catch-up rounds.
- **Automated visual verification runs on every parity run** via `scripts/parity-screenshot-diff.mjs`. Any route with pixel delta above threshold blocks the human checklist sign-off until investigated and either fixed or documented.
- **Ask multiple-choice questions** whenever confused, unless the user said "just go" when invoking.
- **Conflict policy is always pause-and-ask per conflict.** Never auto-resolve.
- **Preserve project conventions** discovered in Phase 0. Don't drift styling idioms, don't add error boundaries the project doesn't use, don't introduce libraries the project hasn't already adopted.
- **Every run leaves the repo in a state where the dev launcher boots cleanly and `parity-screenshot-diff` exits 0 or 1** (not 2 or 3).
- **No violent language** in commits, comments, or output.

## End-of-run summary

Print a one- or two-sentence summary: what landed, what's pending, where to read the full report. Then stop.

## When to defer to a stack-specific specialization

If the current repo has `.claude/skills/claude-design-parity-<stack>/SKILL.md`, the specialization encodes invariants this generic skill infers. Surface that in the first response:

> A stack-specific specialization exists: `/claude-design-parity-<stack>`. It knows this repo's invariants directly. Run that instead, or proceed with the generic flow?

Wait for the user's choice before continuing.
