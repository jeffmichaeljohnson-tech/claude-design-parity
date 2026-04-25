---
name: Bug report
about: Something is broken or behaving unexpectedly
title: ''
labels: bug
assignees: ''
---

## What happened

A clear, concrete description of the bug. Please include exact CLI invocation, exact error message, and exit code.

## What you expected

What should have happened instead?

## Steps to reproduce

1.
2.
3.

## Environment

- **Skill version** (from `package.json`):
- **Node version** (`node --version`):
- **OS** (e.g. macOS 14.5, Ubuntu 22.04):
- **How you invoked**: Claude Code session / CI pipeline / manual CLI / other

## Logs and artifacts

If the issue is visual-diff related, please attach:

- The relevant `report.json` from your `--out` directory
- The `diff-*.png` for the affected route(s)
- The `manifest.json` from the same directory

If the issue is skill-related (the `/claude-design-parity` invocation itself), please paste the relevant Claude Code transcript section.
