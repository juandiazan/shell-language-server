# Versioning guide

## Preface

### Conventions

- The current version lives in the `version` field of the `package.json` located in the root of the repository.
- `serverInfo.version` in `server/src/methods/initialize.ts` reads that field from `package.json` at runtime, so the version reported during the LSP handshake always matches the published package.
- The `git tag` name must match the `version` field mentioned previously.

### Publishing

- The release workflow (`.github/workflows/release.yml`) publishes on every pushed `v*` tag. It needs an `NPM_TOKEN` on the repository secrets that bypasses 2FA.

## Shipping an update to the NPM package

### NPM Details

The server is published to the npm registry as a prebuilt CLI so installing it downloads a tarball of already-compiled JavaScript, there is no build and no need to install dependencies. A few pieces make this work:

- `server/bin/shell-language-server.js` — a launcher with a `#!/usr/bin/env node` shebang that `require`'s `../out/server.js` *relative to itself*, so it works regardless of where the package is installed.
- The root `package.json` `"bin"` field exposes the `shell-language-server` command. On install, npm generates the PATH shim for the host OS (a shell script on macOS/Linux, `.cmd`/`.ps1` on Windows).
- The root `package.json` `"files"` field ships only `server/bin` and `server/out` to consumers.
- The `"prepublishOnly"` script compiles the server right before publishing, so the published tarball can never contain stale output. `server/out` itself stays git-ignored.
- `"postinstall"` is guarded with a Node check so it only installs the VS Code client's dependencies in a full dev checkout (`client/` present) and quietly no-ops for CLI consumers.

Releases are automated: pushing a `v*` tag triggers the GitHub Actions workflow in `.github/workflows/release.yml`, which compiles and runs `npm publish`. Create a release with `npm version <patch|minor|major>` followed by `git push --follow-tags`.

### Step-by-step

1) Commit changes.
2) Move to the next version. This also creates a commit and the matching tag. Run one of the following commands depending on the next version:

```bash
    npm version patch   # 0.1.0 → 0.1.1
    npm version minor   # 0.1.0 → 0.2.0
    npm version major   # 0.1.0 → 1.0.0
```

3) Push the commit and the tag to trigger the release workflow:

```bash
   git push --follow-tags
```

4) Optionally, check version and install locally:

```bash
    npm view bash-lsp version    
    npm install -g bash-lsp      
```

## Shipping an update to the VS Code extension

Updates to the VS Code Marketplace are published with the `vsce` tool. This has to be done manually.

1) Move to the version and republish. `vsce` handles the version bump:

```bash
    vsce publish patch   # 0.1.0 → 0.1.1
    vsce publish minor   # 0.1.0 → 0.2.0
    vsce publish major   # 0.1.0 → 1.0.0
```

This updates `package.json` and publishes in one step.

2) Optionally, package and test locally before publishing by installing the resulting `.vsix`:

```bash
    vsce package
    code --install-extension bash-lsp-<version>.vsix
```

Or via the VS Code UI: Extensions sidebar --> `...` --> Install from VSIX.
