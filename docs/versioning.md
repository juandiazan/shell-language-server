# Versioning and releases (npm CLI)

This covers how the `shell-language-server` npm package is versioned and released. For the VS Code Marketplace (`vsce`) flow, see the README.

## Single source of truth

The version lives in **one place: the root `package.json` `version` field.** Everything derives from it:

- `npm publish` publishes that version (the git tag only *triggers* the release — it does not set the version).
- `serverInfo.version` in `server/src/methods/initialize.ts` reads that field from `package.json` at runtime, so the version reported during the LSP handshake always matches the published package. No manual sync is needed.

The invariant to preserve: **the git tag name must equal `v<package.json version>`.** `npm version` (below) enforces this for you.

`server/package.json` intentionally has **no** `version` field — that subfolder is never published, so there is only ever one version to track.

## Prerequisite

The release workflow (`.github/workflows/release.yml`) publishes on every pushed `v*` tag, authenticating with the **`NPM_TOKEN`** repository secret (Settings → Secrets and variables → Actions). It must be a token that bypasses 2FA (an **Automation** or granular token). Without it, the publish step fails.

## Shipping an update

1. Commit your changes.
2. Bump the version — this also creates a commit and the matching tag:
   ```bash
   npm version patch   # 0.1.0 → 0.1.1 (+ commit + tag v0.1.1)
   npm version minor   # 0.1.0 → 0.2.0
   npm version major   # 0.1.0 → 1.0.0
   ```
3. Push the commit and the tag to trigger the release workflow:
   ```bash
   git push --follow-tags
   ```

Then verify and update locally:

```bash
npm view bash_lsp version    # confirm the registry has the new version
npm install -g bash_lsp      # pull it onto your machine
```

## The first release at the current version

For the very first publish, `package.json` is already at its starting version (e.g. `0.1.0`) and nothing is published yet, so you do **not** bump — `npm version` would error ("version not changed"). Tag the current version directly instead:

```bash
git tag v0.1.0
git push origin v0.1.0
```

## If a release fails partway

- **Auth / 2FA error during publish:** fix the `NPM_TOKEN` secret value, then re-run the failed job from the GitHub **Actions** tab (secrets are read at run time), or re-push the tag:
  ```bash
  git push origin :refs/tags/vX.Y.Z   # delete remote tag
  git push origin vX.Y.Z              # re-push → re-triggers
  ```
- **`EPUBLISHCONFLICT` / "cannot publish over previously published version":** that version already exists on npm and is immutable. Bump again (`npm version patch`) and push a new tag.
