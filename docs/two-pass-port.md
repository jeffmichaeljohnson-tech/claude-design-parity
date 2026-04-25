# Two-pass port: Pass A and Pass B

The skill ports each changed design source file in two distinct passes. This document explains what each pass does, why the order matters, and what the commit looks like at the end.

## The principle

When the design source contains a surface that needs to land in an impl file, there are two separable concerns:

1. **Visual fidelity.** The rendered DOM should match the design's rendered DOM. Markup, structure, styles, copy, sub-components.
2. **Functional fidelity.** The component should be wired to real state stores, native or IPC bridges, project-specific hooks, and motion gates. Demo scaffolding from the design (mock arrays, `setTimeout`, hardcoded `localStorage`) should be replaced with real plumbing.

These two concerns interact. Re-wiring first means the new-design markup overwrites your wiring. Literal-porting first means you have a known-good visual baseline before you attach state. The skill enforces the second order: Pass A first, then Pass B.

## Pass A: Literal port (visual fidelity)

```
+-----------------+
| Design source   |
| <file>.jsx      |
| lines A-B       |
+-------+---------+
        |
        | copy markup, structure, styles, copy, sub-components
        v
+-----------------+
| Impl file       |
| (visual only,   |
|  demo state     |
|  still hardcoded)|
+-----------------+
```

What goes in Pass A:

- Markup tree (every JSX element).
- Inline styles and CSS classes (preserve the project's styling idiom; don't switch from CSS-vars to Tailwind or vice versa).
- Copy and labels.
- Sub-components and conditional renders.
- Layout primitives (grid, flex, padding, gap).

What stays in Pass A (yes, intentionally):

- Demo data from the design source (`useState` with mock arrays, `uuidish()` calls, hardcoded `localStorage` keys).
- `setTimeout` simulating async events.
- Any other scaffolding that exists to make the design clickable.

This is counterintuitive. Why keep demo state? Because removing it now means doing two things at once. Pass A's job is to produce a rendered tree that matches the design. With demo state in place, you can verify visually (or with the parity script) that the markup is right before adding the complexity of real state.

After Pass A: the impl file renders the design's markup with the design's mock data. Visual diff should be near-zero against the design.

## Pass B: Re-wire (functional fidelity)

```
+-----------------+
| Impl file after |
| Pass A          |
| (markup ok,     |
|  demo state)    |
+-------+---------+
        |
        | replace demo state with real selectors,
        | re-attach hooks, gates, bridge calls
        v
+-----------------+
| Impl file final |
| (markup ok,     |
|  real wiring)   |
+-----------------+
```

What goes in Pass B:

- State store selectors (e.g. Zustand `useStore(useShallow(s => ...))`, Redux `useSelector`).
- Native or IPC bridge calls (e.g. Tauri `invoke('cmd_name', { args })`).
- Project-specific hooks (voice, geolocation, push, etc.).
- Motion gates (`useReducedMotion()`, `prefers-reduced-motion` checks).
- Replacement of demo scaffolding:

  | Demo (Pass A)                        | Real (Pass B)                           |
  | ------------------------------------ | --------------------------------------- |
  | `useState([{...}, {...}])`           | `useStore(useShallow(s => s.items))`    |
  | `setTimeout(() => setX(true), 1000)` | `useEffect(() => listen('event', ...))` |
  | `uuidish()`                          | real ID from backend or store           |
  | `localStorage["app.theme"]`          | `useSettingsStore(s => s.theme)`        |
  | hardcoded mock array                 | real selector or empty-state            |

If the corresponding backend doesn't exist yet, leave a `TODO(parity)` comment and add the gap to the human checklist:

```javascript
// TODO(parity): wire to set_wallpaper_alpha command when implemented
const wallpaperAlpha = 0.4;
```

After Pass B: the impl file is functionally complete. Visual diff might shift slightly because real data differs from mock data, but should still be within the configured threshold.

## Why merging passes produces a restyle

The most common mistake when porting a new design is to open the impl file, look at the design, and _edit the impl to look more like the design while preserving the existing wiring_. This sounds conservative. It isn't.

The impl predates the design. The impl's layout, padding, and component hierarchy are correct for an older design. The new design has different layout. If you preserve the impl's wiring (correct, by definition) and update styles to match the new design (correct, by definition), you get something correct in two ways that is wrong in a third: layout. The result is the impl's old skeleton with new paint. The user opens the app and panes are in the wrong places.

The two-pass split prevents this. Pass A makes layout part of the spec: copy the markup, full stop. The wiring is gone temporarily, which is fine; Pass B re-attaches it.

## A complete commit

Here's what a single Pass A plus Pass B port looks like as a commit:

```
[parity] settings: port Appearance card

Source: lib_v3/settings_panel.jsx:142-218
Pass A: literal port of card markup, accent swatches, and contrast slider
Pass B: theme plus accent -> useSettingsStore (useShallow); reduced-motion gate on accent flash
TODO(parity): wallpaper transparency slider needs set_wallpaper_alpha command
```

Notice three things:

1. The source citation has a line range, not just a file path. The reviewer can open both files at those exact lines.
2. Pass A and Pass B are listed separately. The reviewer can verify visual fidelity against the source and verify functional fidelity against the project's invariants (Zustand `useShallow`, reduced-motion gate, etc.).
3. The `TODO(parity)` line documents what was punted. It also feeds into the human checklist printed at the end of the parity run.

## When a single pass is correct

There's one case where you don't need two passes: a surface that already exists in impl with correct wiring, and the design only changes copy or color. In that case, Pass A is a one-line edit and Pass B is empty. The two-pass discipline still applies (the empty Pass B is documented in the commit), but the work collapses.

Don't use this as an excuse to merge passes when more than copy or color changed. If the design moved layout, sub-components, or interaction patterns, do both passes.
