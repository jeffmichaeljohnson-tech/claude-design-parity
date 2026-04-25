## Summary

Briefly: what does this change do? Why?

## Related issue

Closes #

## Type of change

- [ ] Bug fix (non-breaking)
- [ ] New feature (non-breaking)
- [ ] Breaking change (fixes a bug or adds a feature that would cause existing usage to fail)
- [ ] New stack example under `examples/`
- [ ] Documentation only

## Testing done

- [ ] `npm run lint` passes
- [ ] `npm run format:check` passes
- [ ] `npm test` passes
- [ ] If this changes the script: I ran the script against my own project and confirmed the new behavior
- [ ] If this adds a new stack example: I followed my own README to adopt it from scratch and confirmed it works

## Screenshots or output

If the change is visible (a new report format, a new CLI message, a new diff overlay), include a screenshot or a paste of the relevant output.

## Checklist

- [ ] No emdashes (`EM DASH`, Unicode `U+2014`) added anywhere. CI checks this.
- [ ] Conventional commit format on every commit. Subjects under 72 characters.
- [ ] No comments narrating what the code does. Comments only for non-obvious why.
- [ ] No new dependencies beyond `playwright`, `pixelmatch`, `pngjs` (or justified in the PR body if added).
- [ ] No telemetry or remote calls beyond the Playwright fetches the user explicitly invokes.
