# Operating principles

These six principles compress the design-to-code convergence loop. They came out of a real session retrospective: shipping a v3 UX restyle that needed five rounds of catch-up work because earlier rounds kept dropping surfaces. The patterns below are what stopped the bleeding.

The principles are baked into the skill. You don't need to read this document to use `/claude-design-parity`. Read it when you want to understand why the skill is structured the way it is, or when something in a parity run feels off and you want to know which principle was violated.

## 1. The mapping table is a hypothesis, not a spec

When you see `topbar.jsx` in a design export and `ProjectTabs.tsx` in your impl, the natural inference is "topbar maps to the tab strip." Both have "tab" in the user model. Both look horizontal in screenshots. The names rhyme.

The natural inference is wrong. In a real session, `topbar.jsx` turned out to be the app-level header (brand, search, avatar). The tab strip was somewhere else entirely. That single misread cost an entire round of work.

The fix is to treat the filename-based mapping as a starting hypothesis and confirm it by reading the file end-to-end before drafting any port plan.

A per-file inventory looks like this:

```
lib_v3/topbar.jsx
- Lines 1-12: imports
- Lines 14-23: TopBar component (default export). Renders brand, search, avatar.
- Impl target: src/layout/AppShell.tsx (NOT ProjectTabs.tsx)
- Demo scaffolding: useState searchQuery (line 18), localStorage["app.recent-searches"] (line 21)
```

That single block resolves four open questions:

- What's actually in the file (header, not tab strip).
- Where it should land in impl (`AppShell.tsx`, not `ProjectTabs.tsx`).
- What state will need re-wiring in Pass B.
- What hardcoded values will need replacing.

Without the inventory, you'd patch `ProjectTabs.tsx` with the wrong content and discover the mistake on the next launch.

## 2. The only acceptable spec for a surface is the source file, lines A to B

Compressed sources lie. Three common ones:

- **Acceptance checklists** like `FRONTEND-PORT.md` are roadmaps. Their bullets are selective summaries. Real example from a real session: a checklist read "Settings: API keys card." Nothing else. The actual JSX had three cards: API keys, Appearance, and Storage. The Appearance card was missing entirely from the impl after the port because nobody opened the JSX. The bullet didn't lie; it just wasn't trying to be exhaustive.
- **Screenshots** are lossy. Hover states, focus rings, error variants, and conditional UI all live in code branches the screenshot can't show.
- **Prose change descriptions** are paraphrased. "We restyled the right rail" can mean a color tweak or a complete rebuild.

When porting a surface, the only acceptable spec is the source file path plus a line range. Cite it in the commit body:

```
[parity] settings: port Appearance card

Source: lib_v3/settings_panel.jsx:142-218
Pass A: literal port of card markup plus accent swatches
Pass B: theme plus accent -> useSettingsStore (useShallow); reduced-motion gate
TODO(parity): transparency slider needs set_wallpaper_alpha command
```

The line range serves three purposes. It documents what the commit actually ported. It makes future-you's job easier when this code drifts. And it's a forcing function: if you can't cite a line range, you're not working from the source.

## 3. Visual fidelity and functional fidelity are two passes, not one

This is the principle that took the longest to learn. The temptation in any "port the new design" task is to open the impl file, look at the design, and edit the impl to look more like the design while preserving the existing wiring. That sounds like the conservative move. It isn't.

The problem is that the impl predates the design. The impl's layout was correct for an older design. The new design has moved on. If you preserve the impl's layout while updating styles, you produce a _restyle_: same skeleton, new paint. The user opens the app and the panes are in the wrong places.

The fix is to split the work into two passes per file:

- **Pass A: literal port.** Copy the JSX from the design source lines A to B into the impl file. Markup, structure, styles, copy, sub-components. The rendered tree should match the design when fed dummy state.
- **Pass B: re-wire.** Re-attach state selectors, native bridge calls, hooks, and motion gates. Replace demo scaffolding (`useState` for mock data, `setTimeout` for fake events) with real plumbing.

Pass A produces something visually correct but non-functional (it has the design's mock data hardcoded). Pass B makes it functional. The order matters: if you re-wire first, Pass A will overwrite your wiring. If you literal-port first, Pass B has a known-good visual baseline to attach state to.

This sequence is also testable. After Pass A, the visual diff against the design should be near-zero (the rendered tree matches because both run the same JSX). After Pass B, the visual diff might shift slightly (real data is different from demo data) but should still be within the threshold.

## 4. Prompt and commit structure mirror source structure

When breaking a large port into smaller chunks, the temptation is to invent thematic groupings: "tokens," "shell," "polish," "dashboards." This feels organized. It also drops surfaces.

The problem: any surface that doesn't fit neatly into a category falls between categories. In a real session, a "right rail panels" pass and a "settings" pass both completed cleanly, but the wallpaper transparency slider (which lived in the right rail's settings sub-panel) got dropped because neither prompt covered it. The category list was somebody's mental model. The actual taxonomy was the source-file layout.

The fix is to mirror source structure in commits. One commit per design source file, or per coherent block within a single file. If a JSX file has three sub-components, that's potentially three commits, not one "files-9-through-12" commit.

This rule has a side benefit: it makes review easier. A commit titled `[parity] settings: port Appearance card` with a `Source: lib_v3/settings_panel.jsx:142-218` line in the body is something a reviewer can verify by opening the source file and the impl file side by side. A commit titled `[parity] polish round 3` is not.

## 5. First-pass perfection is not the target. Fast convergence is.

Design exports are not pure specifications. They contain demo scaffolding that exists to make the design clickable in the browser:

- `uuidish()` returning random IDs to populate lists.
- `useState` initialized with mock arrays.
- `setTimeout` simulating async events.
- Hardcoded `localStorage` keys for fake persistence.

None of that ports literally. Every surface needs judgment about what's real vs. what's demo. Judgment calls are where fidelity leaks.

Trying to make the first parity pass perfect is the wrong target. It encourages over-thinking each judgment call, which slows the round, which means fewer surfaces get touched per round, which means more rounds total.

The right target is fast convergence with low rework. Do the obvious port, leave a `TODO(parity)` comment where you punted, ship round one, run the visual diff, fix the regressions surfaced by the diff, and call that round two. Two short rounds beats one perfect round.

This isn't a license to skip Operating Principles 1 through 4. Those still apply. But once you've read the source, mapped it correctly, done both passes, and committed in the right shape, accept that some judgment calls were imperfect and iterate.

## 6. Visual verification is automated, every run

Every parity run ends with `parity-screenshot-diff` rendering both the design and the impl in headless Chromium and computing pixel deltas per route per viewport. Routes with deltas above the configured threshold (default 0.5%) block sign-off until investigated.

There is no opt-out. Visual verification is what "parity" means. A parity run that doesn't produce a visual diff report didn't verify parity; it just produced code.

The diff report is a forcing function for honesty. Reading the diff, you'll see exactly which surfaces drifted, by how much, and at which viewports. Some drifts are intentional (the design moved on in a way the impl can't follow yet). Some are mistakes (a wrong color, a missing border, a forgotten sub-component). The report distinguishes them; you document the intentional ones in the human checklist and fix the mistakes.

The aria snapshots captured alongside the screenshots serve the same purpose for accessibility. v0.1 doesn't auto-diff them, but they're there for manual review when a screenshot regression has an obvious accessibility-tree explanation (a missing `aria-label`, a focus order change, a heading-level shift).

## What the principles add up to

Read every changed source file end-to-end. Cite line ranges in commits. Two passes per file. One commit per file. Expect catch-up rounds. Always run the visual diff.

Each principle on its own is small. Together they replace a five-round parity convergence with a two-round one. The principles aren't a process for its own sake; they exist because their absence cost real time on real projects.
