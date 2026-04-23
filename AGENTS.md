# AGENTS.md

Guidance for coding agents working in this repository.

## Project overview

This repo is a TypeScript VS Code extension with an embedded shell language server:

- **Client** (`client/src/extension.ts`) starts the server via stdio.
- **Server** (`server/src/server.ts`) parses JSON-RPC/LSP messages and dispatches handlers.
- Current request handlers:
  - `initialize`
  - `textDocument/completion`
  - `textDocument/definition`
  - `textDocument/diagnostic`
  - `textDocument/codeAction`
  - `textDocument/rename`
- Current notification handlers:
  - `textDocument/didOpen`
  - `textDocument/didChange`
  - `textDocument/didClose`

## Repository layout

- `client/`: VS Code extension host/client code
- `server/`: language server implementation
- `docs/`: project notes and reference material
- `lsp.log`: server log output

## Build and run

- Install dependencies from repo root: `npm install`
  - Root `postinstall` installs `client` and `server` dependencies.
- Build everything: `npm run compile`
- Watch mode: `npm run watch`
- Manual debug flow: open repo in VS Code and run **Launch Client** (`F5`).

There is currently no dedicated lint/test script in this repo.

## Implementation conventions

- Keep edits focused and small; avoid unrelated refactors.
- Follow existing TypeScript style (double quotes, semicolons, explicit interfaces/types).
- Preserve protocol compatibility between client and server.
- Update docs (`README.md` and/or this file) when behavior or workflow changes.

## Server-side guidance

- Add new LSP handlers under `server/src/methods/...`.
- Register every new handler in `methodLookup` in `server/src/server.ts`.
- If a new feature is client-visible, also advertise it in `initialize` capabilities (`server/src/methods/initialize.ts`).
- Request handlers should return a result object (or `null` when appropriate).
- Notification handlers should return `void`.
- Document state is held in-memory in `documents` (`server/src/interfaces/documents.ts`) and updated by open/change/close notifications.
- `textDocument/codeAction` currently consumes diagnostics with `DiagnosticType.MissingSemicolon`; keep diagnostic data and quick-fix logic aligned when changing either side.

## Client-side guidance

- Extension activation and `documentSelector` live in `client/src/extension.ts`.
- If you add/rename LSP methods or capabilities server-side, ensure the client still advertises/uses them correctly.

## Known caveats

- `server/src/log.ts` and `server/src/methods/textDocument/completion.ts` currently use absolute local file paths.
- Completion words are loaded from `server/src/exampleWords.txt` at server startup.
- `lsp.log` is append-only and can grow over time.

## Agent checklist

1. Read relevant files before editing (client + server when protocol changes).
2. Implement the smallest complete change.
3. Build with `npm run compile` after code changes.
4. Keep docs aligned with behavior.
