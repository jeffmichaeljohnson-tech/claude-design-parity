# Contributing

Thanks for your interest. This project is small and opinionated; PRs are welcome but please match the existing standards described below.

## Getting set up

```sh
git clone https://github.com/jeffmichaeljohnson-tech/claude-design-parity.git
cd claude-design-parity
npm install
npm test
```

`npm install` runs `npx playwright install chromium` automatically as a postinstall step.

You need:

- Node.js 20 or later.
- A Unix-like shell (the smoke tests use `mkdir`, `touch`, etc.).
- Roughly 200 MB of disk for the Playwright Chromium download.

## Project layout

```
SKILL.md                          The generic /claude-design-parity skill (the headline).
examples/<stack>/                 Reference specializations for specific stacks.
docs/                             Long-form explainers (operating principles, two-pass port, visual verification).
scripts/                          The parity-screenshot-diff.mjs companion script.
tests/                            node:test smoke tests plus HTML fixtures.
.github/                          CI workflow and PR/issue templates.
```

## Running the tests

```sh
npm run lint           # eslint, must pass with zero errors and zero warnings
npm run format:check   # prettier, must pass
npm test               # node --test, six smoke tests
```

CI runs all of these on every push and PR. Local CI parity:

```sh
npm run lint && npm run format:check && npm test && node scripts/parity-screenshot-diff.mjs --help
```

## Adding a new stack example

The most useful contribution is a new specialization under `examples/<stack>/SKILL.md`. To add one:

1. Pick a stack that's distinct from the existing examples. Currently shipped: `tauri-react-zustand`. Planned but unbuilt: `nextjs-zustand`, `expo-zustand`, `swiftui-combine`, `remix-redux`, `vue-pinia`. Open an issue first if you want to add one of these (to claim it).
2. Create `examples/<stack>/SKILL.md`. Start by copying `examples/tauri-react-zustand/SKILL.md` and adapting:
   - Frontmatter `name` and `description`.
   - "Repo invariants" list (add or remove items based on what's specific to this stack).
   - "Where things live" paths.
   - Phase 4 step 5 dev-server URL and routes.
3. Create `examples/<stack>/README.md`. Follow the structure of `examples/tauri-react-zustand/README.md`: why specialize, how to adopt, what the template assumes, what it intentionally leaves blank.
4. Add the new stack to the "Future stacks" list in the existing examples' READMEs (so cross-references stay accurate).
5. Open a PR.

The bar: someone adopting your example by following its README should produce a working skill specialization for their project without having to read the headline `SKILL.md`.

## Coding standards

These are enforced in CI. Match them locally so your PR doesn't bounce.

- **No emdashes** (the `EM DASH` character, Unicode `U+2014`) anywhere in any file. Use periods, parentheses, colons, or restructure the sentence. The CI workflow grep-checks this. PRs that introduce emdashes will fail.
- **Conventional commits.** Subject under 72 characters. Format: `<type>(<scope>)?: <subject>`. Types: `feat`, `fix`, `docs`, `refactor`, `chore`, `test`, `perf`. Examples:
  - `feat: add nextjs-zustand example`
  - `fix(scripts): handle empty --routes correctly`
  - `docs(visual-verification): add CI integration section`
- **Prettier and ESLint must pass.** Run `npm run format` to auto-fix style and `npm run lint` to check for code errors before committing.
- **No comments narrating what the code does.** Comments only for non-obvious why (workarounds, invariants, references to external docs). The code is the documentation.
- **Reproducible output.** Anything written to disk should be deterministic across runs. No timestamps in file names; sorted JSON keys; predictable ordering.
- **Structured exit codes.** Scripts use `0` for success, `1` for soft failure (regression to investigate), `2` for usage error, `3` for runtime error. Don't add new exit codes without updating `scripts/README.md`.

## Submitting a PR

1. Fork the repo. Create a feature branch from `main`.
2. Make your changes. Run `npm run lint && npm run format:check && npm test` before pushing.
3. Push to your fork. Open a PR against `main`.
4. Fill out the PR template. Be specific about what you changed and how you tested it.
5. CI will run automatically. Fix any failures.
6. Address review comments. Squash if asked, but feel free to keep separate commits if they tell a story.

For larger contributions (new stack examples, script feature additions, doc rewrites), open an issue first to discuss the approach. This saves both of us time.

## What this project will not accept

- **Telemetry, analytics, or remote calls** outside the Playwright fetches the user explicitly invokes.
- **Auto-fixing of regressions.** The skill surfaces regressions via the visual diff and asks for human judgment. PRs that try to "smartly merge" design and impl are out of scope; that's exactly the failure mode the skill exists to prevent.
- **Configuration sprawl.** Don't add a config file or a flag unless there's a specific use case that genuinely needs it.
- **Dependencies beyond what the script needs.** Today: `playwright`, `pixelmatch`, `pngjs`. Adding anything else requires justification.
