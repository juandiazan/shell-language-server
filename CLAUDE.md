# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

A TypeScript VS Code extension with an embedded shell language server. The server speaks the Language Server Protocol (LSP) over stdio using raw JSON-RPC — no `vscode-languageserver` library.

The server is also published to npm as the `bash_lsp` package (published from `server/` using `server/package.json`), which exposes a standalone `shell-language-server` CLI usable by any LSP client. A Neovim setup is documented under `nvim-client/` (see also `docs/installation-and-nvim.md`).

## Build commands

```bash
# Install all dependencies (also runs client and server installs via postinstall)
npm install

# Compile TypeScript for client + server
npm run compile

# Watch mode (rebuilds on save)
npm run watch
```

There is also `npm run lint` (ESLint) and `npm run format` (Prettier). After any code change, run `npm run compile` to verify it builds.

`server/out/` is a git-ignored build artifact — never commit it. It is produced by `tsc` locally for dev/debug, and rebuilt fresh by `prepublishOnly` when publishing to npm (shipped via the `files` field).

CI uses **pnpm** (`pnpm install` / `pnpm compile`) in `.github/workflows/`.

## Running the extension

**VS Code**: Open the repo in VS Code, then press `F5` (Launch Client). This opens an Extension Development Host window where the server runs against `.sh` files.

**Neovim**: Install the published CLI with `npm install -g bash_lsp`, then point the client at the `shell-language-server` command. See `nvim-client/README.md` and `nvim-client/init.lua`. For local development against uncommitted changes, run the build directly: `node server/out/server.js`.

## Architecture

```
client/src/extension.ts     — VS Code extension host; spawns server.js via stdio
server/bin/shell-language-server.js — CLI launcher (shebang) that requires ../out/server.js; the npm `bin` entry
server/src/server.ts        — JSON-RPC framing loop; dispatches to methodLookup
server/src/methods/
  initialize.ts             — advertises all server capabilities; reads serverInfo.version from server/package.json at runtime
  textDocument/
    completion.ts           — prefix-matched word list + snippet keywords
    definition.ts           — go-to-definition
    hover.ts                — runs `man <word>` and returns the output
    rename.ts               — workspace rename
    codeAction.ts           — quick-fix for MissingSemicolon diagnostics
    diagnostic/
      diagnostic.ts         — entry point; merges all diagnostic sources
      bracketDiagnostics.ts — unmatched bracket detection
      structureSemicolonDiagnostics.ts — missing semicolons in if/for/while
server/src/interfaces/
  documents.ts              — in-memory document store (Map<uri, text>)
  completion.ts             — CompletionItem types, snippet keywords, detail strings
  diagnostics.ts            — Diagnostic types and DiagnosticType enum
  location.ts               — Position, Range types
server/src/log.ts           — appends to lsp.log
server/src/wordList.ts      — word list for completion (compiled into out/ by tsc)
```

**Request vs notification flow**: `server.ts` reads from `process.stdin`, parses `Content-Length` framed messages, looks up the handler in `methodLookup`, and writes the response to `process.stdout` only for request messages (those with an `id`). Notification handlers return `void` and receive no response.

**Document state**: All open documents are kept in the `documents` Map exported from `interfaces/documents.ts`. `didOpen`/`didChange`/`didClose` handlers mutate it; all feature handlers read from it.

## Adding a new LSP feature

1. Advertise the capability in `server/src/methods/initialize.ts`.
2. Create `server/src/methods/textDocument/<feature>.ts`; export a function matching the signature expected by `RequestMethod` or `NotificationMethod`.
3. Register it in `methodLookup` in `server/src/server.ts`.
4. Add the return type to the `RequestMethod` union in `server.ts`.

## Distribution and releasing

- **Two separate distributions, two manifests:**
  - **npm** — the `bash_lsp` CLI package, defined by `server/package.json` and published from `server/` (`working-directory: server` in CI). Its own `files` field ships only `bin` and `out/**/*.js`.
  - **VS Code Marketplace** — the `bash-lsp` extension (`juandiazan.bash-lsp`), defined by the root `package.json` and packaged by `vsce`. The root manifest uses `.vscodeignore` (not a `files` field — `vsce` rejects having both) and bundles `client/out` + `server/out`.
  - npm refuses `bash-lsp` (too similar to `bash_lsp`) and `vsce` refuses `bash_lsp` (underscore invalid), so the two names cannot be unified — hence two manifests.
- **Versions are kept in lockstep** by `scripts/sync-version.js`, run via the root `version` npm script: `npm version <bump>` updates the root manifest and copies that version into `server/package.json` in the same commit. `serverInfo.version` reads `server/package.json` at runtime (it ships in both the npm tarball and the `.vsix`).
- Releases are automated: pushing a `v*` tag runs `.github/workflows/release.yml`, which has three parallel jobs — `publish` (`npm publish` from `server/`, needs `NPM_TOKEN`), `publish-vscode` (`vsce publish` to the MS Marketplace, needs `VSCE_PAT`), and `publish-openvsx` (`ovsx publish` to Open VSX for VSCodium, needs `OVSX_PAT`). Cut a release with `npm version <patch|minor|major>` then `git push --follow-tags`.
- Full versioning/release docs: `docs/versioning.md`. Install + Neovim docs: `docs/installation-and-nvim.md`.

## Known caveats

- `lsp.log` is append-only and grows unbounded; safe to delete between sessions.
- `hover.ts` calls `execSync('man <command>')` synchronously on the LSP request thread.
- `hover.ts` relies on `man`, which is absent on Windows; hover returns nothing there while other features work.
