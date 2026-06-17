# Installation and Neovim setup

The server is plain JSON-RPC over stdio with no external runtime dependencies, so it can be installed as a standalone command and used by any LSP client. The only requirement on the target machine is **Node.js + npm**.

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
shell-language-server   # hangs waiting for stdin, Ctrl-C to exit
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
