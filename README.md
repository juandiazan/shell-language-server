# VS Code Language Server extension implementation guide

[![Lint & Format](https://github.com/juandiazan/shell-language-server/actions/workflows/lint.yml/badge.svg)](https://github.com/juandiazan/shell-language-server/actions/workflows/lint.yml)
[![Build](https://github.com/juandiazan/shell-language-server/actions/workflows/build.yml/badge.svg)](https://github.com/juandiazan/shell-language-server/actions/workflows/build.yml)

This README aims to provide a step-by-step guide for developing a self-contained Language Server Extension for VS Code using TypeScript, and adding new features to an existing one.

"Self-contained" in this context means that this extension bundles its own language server code rather than wrapping an existing language server executable.

If starting from scratch, see [Getting started](#getting-started). If you want to add a feature to this language server instead go to [Implementing new features](#implementing-new-features).

## Getting Started

1. Clone the repo this project is based on: [minimum-viable-vscode-language-server-extension](https://github.com/semanticart/minimum-viable-vscode-language-server-extension)

2. Replace items in `package.json` marked `REPLACE_ME` with text related to the extension
    - Name
    - Description
    - Author
    - Publisher
3. Do the same for `client/package.json`
    - Name
    - Descripton
    - Author
    - Publisher
    - Github repo link

4. Do the same for `server/package.json`
    - Name
    - Descripton
    - Author
    - Github repo link

5. Do the same in `client/src/extension.ts`
    - language-server-id
    - language-server name

6. **OPTIONAL**: Remove dependencies in `server/package.json` and leave `server.ts` empty if you want to develop it from scratch, without VS Code types (recommended)

7. Run `npm install` from the repo root.

## Scripts

Run these from the repo root with `pnpm <script>`:

| Script | Description |
|---|---|
| `compile` | Compile TypeScript for client + server |
| `watch` | Rebuild on save |
| `lint` | Run ESLint on all TypeScript source files |
| `format` | Auto-format all TypeScript source files with Prettier |
| `format:check` | Check formatting without writing changes (used in CI) |

To make it easy to get started, the language server will run on *every* file type by default. To target specific languages, change

`package.json`'s `activationEvents` from

```json
"activationEvents": [
  "onLanguage"
],
```

to something like

```json
"activationEvents": [
  "onLanguage: <your-language>"
],
```

And change the `documentSelector` in `client/src/extension.ts` to replace the `*` (e.g.)

```typescript
documentSelector: [{ scheme: "file", language: "<your-language>" }],
```

To help verify everything is working properly, we've included the following code in `server.ts` after the `onInitialize` function:

```typescript
documents.onDidChangeContent((change) => {
  connection.window.showInformationMessage(
    "onDidChangeContent: " + change.document.uri
  );
});
```

From the root directory of this project, run `code .` Then in VS Code

1. Build the extension (both client and server) with `⌘+shift+B` (or `ctrl+shift+B` on windows)
2. Open the Run and Debug view and press "Launch Client" (or press `F5`). This will open a `[Extension Development Host]` VS Code window.
3. Opening or editing a file of the chosen language in that window should show an information message in VS Code like you see below.

   ![example information message](https://semanticart.com/misc-images/minimum-viable-vscode-language-server-extension-info-message.png)

4. Edits made to your `server.ts` will be rebuilt immediately but you'll need to "Launch Client" again (`⌘-shift-F5`) from the primary VS Code window to see the impact of your changes.

## Implementing new features to this project

1. Add the capability corresponding to the language feature to `server/src/methods/initialize.ts`. Both the name and value of the capability related to the implemented language feature can be found in the official LSP docs inside the *specification* section (see [information of interest below](#information-of-interest))
2. Add method name and implementation to the `methodLookup` record located in `server/src/server.ts`
3. Create a file inside `methods/` named after the implemented method
4. Add the newly created method to the `RequestMethod` return type
5. Create necessary interfaces inside the new file (or inside `interfaces/`) and implement the method used on step 2. The interfaces can be extracted from the official LSP docs.

## Anatomy

```json
.
├── .vscode
│   ├── launch.json         // Tells VS Code how to launch our extension
│   └── tasks.json          // Tells VS Code how to build our extension
├── LICENSE
├── README.md
├── client
│   ├── package-lock.json   // Client dependencies lock file
│   ├── package.json        // Client manifest
│   ├── src
│   │   └── extension.ts    // Code to tell VS Code how to run our language server
│   └── tsconfig.json       // TypeScript config for the client
├── package-lock.json       // Top-level Dependencies lock file
├── package.json            // Top-level manifest
├── server
│   ├── package-lock.json   // Server dependencies lock file
│   ├── package.json        // Server manifest
│   ├── src
│   │   └── server.ts       // Language server code
│   └── tsconfig.json       // TypeScript config for the client
└── tsconfig.json           // Top-level TypeScript config
```

## Installation and Neovim setup

The server can be installed as a standalone `shell-language-server` command and used by any LSP client (including Neovim). See [installation-and-nvim.md](installation-and-nvim.md) for packaging details, installing from GitHub, and Neovim configuration.

## Publishing to the VS Code Marketplace

### First-time setup

1. Install the `vsce` tool:
   ```bash
   npm install -g @vscode/vsce
   ```

2. Create a publisher at https://marketplace.visualstudio.com/manage (sign in with a Microsoft account).

3. Get a Personal Access Token: Azure DevOps → User Settings → Personal access tokens → create one with **Marketplace → Manage** scope.

4. Make sure `package.json` has:
   - `"publisher"` set to your publisher ID (slug, not display name)
   - `"repository"` with the GitHub URL
   - `"version"` following semver (start at `0.1.0`)

5. Add a `.vscodeignore` to exclude dev files from the bundle:
   ```
   .vscode/**
   node_modules/**
   nvim-client/**
   docs/**
   src/**
   tsconfig.json
   *.log
   ```

6. Log in:
   ```bash
   vsce login your-publisher-id
   ```

7. Publish:
   ```bash
   vsce publish
   ```

### Testing before publishing

Package locally first and install the resulting `.vsix`:

```bash
vsce package
code --install-extension bash_lsp-0.1.0.vsix
```

Or via the VS Code UI: Extensions sidebar → `...` → **Install from VSIX**.

### Shipping an update

Bump the version and republish. You can let `vsce` handle the version bump:

```bash
vsce publish patch   # 0.1.0 → 0.1.1
vsce publish minor   # 0.1.0 → 0.2.0
vsce publish major   # 0.1.0 → 1.0.0
```

This updates `package.json` and publishes in one step. Existing users receive the update automatically within a few hours.

> **Note:** keep `serverInfo.version` in `server/src/methods/initialize.ts` in sync with `package.json` when bumping versions manually.

## Information of interest

- [LSP Docs](https://microsoft.github.io/language-server-protocol/)

- [Debugging your extension](https://code.visualstudio.com/api/language-extensions/language-server-extension-guide#debugging-both-client-and-server)

- [LSP Sample](https://github.com/microsoft/vscode-extension-samples/tree/main/lsp-sample)

- [Publish your extension](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)

- [Package and distribute without publishing with a .vsix file](https://code.visualstudio.com/api/working-with-extensions/publishing-extension#packaging-extensions)
