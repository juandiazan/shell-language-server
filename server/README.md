# bash_lsp

A standalone shell/bash **Language Server (LSP)**, speaking JSON-RPC over stdio
with no external runtime dependencies. Usable by any LSP client (Neovim, etc.).
The VS Code extension is published separately as **Shell Language Server**
(`juandiazan.bash-lsp`).

## Install

```bash
npm install -g bash_lsp
```

This puts a `shell-language-server` command on your `PATH`.

## Use

Point your LSP client at the `shell-language-server` command for `shellscript`
files. See the project repository for editor setup (including Neovim):

https://github.com/juandiazan/shell-language-server

## Features

Completion, hover (`man`), go-to-definition, rename, and diagnostics
(unmatched brackets, missing semicolons in `if`/`for`/`while`).
