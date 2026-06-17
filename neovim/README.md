# Neovim setup

How to wire the Shell Language Server into Neovim. Requires **Neovim 0.11+** (for the built-in `vim.lsp.config` API and pull diagnostics).

For packaging details and other LSP clients, see [../docs/installation-and-nvim.md](../docs/installation-and-nvim.md).

## 1. Install the server

```bash
npm install -g bash-lsp
```

This puts a `shell-language-server` command on your `PATH`. Confirm it:

```bash
which shell-language-server
```

> If the global install fails with `EACCES` on Linux/macOS, your npm prefix is root-owned — see the troubleshooting in [../docs/installation-and-nvim.md](../docs/installation-and-nvim.md).

## 2. Configure Neovim

The config is path-free because the binary is on `PATH`. The repo ships a ready-to-use [`init.lua`](init.lua):

```lua
vim.lsp.config["shell-ls"] = {
  cmd = { "shell-language-server" },
  filetypes = { "sh", "bash" },
  root_markers = { ".git", ".sh" },
}

vim.lsp.enable("shell-ls")
```

Copy that block into your own `init.lua`, or try it standalone without touching your config:

```bash
nvim -u /path/to/shell-language-server/nvim-client/init.lua test.sh
```

## 3. Verify it attached

Open a shell file (`test.sh`), then:

```vim
:checkhealth vim.lsp
```

or:

```vim
:lua print(vim.inspect(vim.lsp.get_clients({ bufnr = 0 })))
```

You should see a client named `shell-ls`.

## Keybind examples

These LSP actions work once the server is attached. If your config has no LSP keymaps, run the commands directly.

| Action | Common keybind | Command |
| --- | --- | --- |
| Hover (runs `man`) | `K` | `:lua vim.lsp.buf.hover()` |
| Go to definition | `gd` | `:lua vim.lsp.buf.definition()` |
| Rename | `grn` | `:lua vim.lsp.buf.rename()` |
| Code action | `gra` | `:lua vim.lsp.buf.code_action()` |
| Completion | `<C-x><C-o>` | (omnifunc) |

## Troubleshooting

- **Not attaching?** Confirm Neovim can see the command:
  ```vim
  :lua print(vim.fn.exepath("shell-language-server"))
  ```
  If it prints empty, the command isn't on the `PATH` your Neovim inherited (common with `nvm` when launching a GUI build). Launch Neovim from a terminal where `which shell-language-server` works, or set `cmd` to the absolute path.
- **Wrong filetype?** Check with `:set filetype?` — it must be `sh` or `bash`.
- **Hover empty on Windows?** `man` doesn't exist there; every other feature still works.
- **LSP log:** `:lua print(vim.lsp.get_log_path())`
