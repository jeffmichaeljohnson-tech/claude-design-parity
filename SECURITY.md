# Security policy

## Reporting a vulnerability

Report security issues privately to [jeff.michael.johnson@gmail.com](mailto:jeff.michael.johnson@gmail.com). Please do not open public issues for vulnerabilities.

Expected response within 7 days. If the issue is confirmed, expect a fix or mitigation within 30 days, depending on severity.

## Scope

This project is a Claude Code skill plus a small Node script. The most realistic security concerns are:

- **Path traversal in `--out`.** The script refuses to clean a directory that has no `manifest.json` sentinel, but report any case where it does delete or overwrite something outside the specified output directory.
- **Browser-driven SSRF.** The script launches headless Chromium and navigates to user-supplied `--design` and `--impl` URLs. The browser's network stack is sandboxed by Chromium, but report any case where the script can be coerced into making requests on behalf of the host.
- **Dependency vulnerabilities.** This project depends on `playwright`, `pixelmatch`, and `pngjs`. If you find a CVE in one of these that affects the script's runtime behavior, report it.

Out of scope:

- Bugs in Playwright itself. Report those upstream at [microsoft/playwright](https://github.com/microsoft/playwright).
- Attacks that require the user to run the script with hostile arguments. The CLI documents that `--out` is destructive and that `--design` and `--impl` URLs are loaded in a real browser; users are expected to point them at trusted sources.

## Disclosure

After a fix lands, the vulnerability will be disclosed in `CHANGELOG.md` under the version that contains the fix. Reporters who would like credit should say so when they file.
