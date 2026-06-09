# Installation and Neovim setup

The server is plain JSON-RPC over stdio with no external runtime dependencies, so it can be installed as a standalone command and used by any LSP client. The only requirement on the target machine is **Node.js + npm**.

## How it is packaged

The server has no runtime dependencies and is published to the npm registry as a prebuilt CLI — installing it downloads a tarball of already-compiled JavaScript, so there is no build, no `tsc`, and no dependency install on the target machine. A few pieces make this work:

- `server/bin/shell-language-server.js` — a launcher with a `#!/usr/bin/env node` shebang that `require`s `../out/server.js` *relative to itself*, so it works regardless of where the package is installed.
- The root `package.json` `"bin"` field exposes the `shell-language-server` command. On install, npm generates the PATH shim for the host OS (a shell script on macOS/Linux, `.cmd`/`.ps1` on Windows) — this is what makes it cross-platform.
- The root `package.json` `"files"` field ships only `server/bin` and `server/out` to consumers. The VS Code client and the TypeScript sources are deliberately left out.
- The `"prepublishOnly"` script compiles the server right before publishing, so the published tarball can never contain stale output. `server/out` itself stays git-ignored — it is a build artifact, not source.
- `"postinstall"` is guarded with a Node check so it only installs the VS Code client's dependencies in a full dev checkout (`client/` present) and quietly no-ops for CLI consumers.

Releases are automated: pushing a `v*` tag triggers the GitHub Actions workflow in `.github/workflows/release.yml`, which compiles and runs `npm publish`. Cut a release with `npm version <patch|minor|major>` followed by `git push --follow-tags`.

## Installing

On any machine with Node.js installed:

```bash
npm install -g bash_lsp
```

This downloads the prebuilt package and puts a `shell-language-server` command on your `PATH`.

> **Permission errors (`EACCES`) on Linux/macOS:** if the global install fails with `EACCES ... symlink ... /usr/lib/node_modules`, your npm global prefix is a root-owned system directory. Don't use `sudo` — point npm at a prefix you own instead (one-time setup):
>
> ```bash
> npm config set prefix ~/.npm-global
> # add its bin dir to PATH (zsh shown; use ~/.bashrc for bash)
> echo 'export PATH="$HOME/.npm-global/bin:$PATH"' >> ~/.zshrc
> source ~/.zshrc
> ```
>
> Then re-run the install. This affects Linux/macOS Node installed from a distro/system package; **Windows is unaffected** because its default prefix (`%AppData%\npm`) is already user-writable.
>
> Better yet, install Node via a version manager like [nvm](https://github.com/nvm-sh/nvm) (or fnm / Volta). These keep Node *and* the global prefix under your home directory on every OS, so `npm install -g` works without any prefix tweak or elevation.

Verify the launcher works:

```bash
shell-language-server   # hangs waiting for stdin (it is listening) — Ctrl-C to exit
```

> **Windows caveat:** `hover.ts` shells out to `man`, which does not exist on Windows. Hover will return nothing there; every other feature works.

## Configuring Neovim

Because the binary is on `PATH`, the config is path-free and identical on every machine.

**Neovim 0.11+** (built-in `vim.lsp` API):

```lua
vim.lsp.config["shell-ls"] = {
  cmd = { "shell-language-server" },
  filetypes = { "sh", "bash" },
  root_markers = { ".git", ".sh" },
}

vim.lsp.enable("shell-ls")
```

**Neovim < 0.11** (autocommand form — note that pull diagnostics require 0.11+):

```lua
vim.api.nvim_create_autocmd("FileType", {
  pattern = { "sh", "bash" },
  callback = function(args)
    vim.lsp.start({
      name = "shell-ls",
      cmd = { "shell-language-server" },
      root_dir = vim.fs.root(args.buf, { ".git" }) or vim.fn.getcwd(),
      bufnr = args.buf,
    })
  end,
})
```

Open a `.sh` file, then check `:checkhealth vim.lsp` / `:LspInfo`. Test with `K` (hover), `gd` (definition), `<C-x><C-o>` (completion), and `:lua vim.lsp.buf.rename()`.
