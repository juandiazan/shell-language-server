# Neovim Shell LSP Guide

This guide shows how to wire the Shell Language Server into Neovim and gives a few keybind examples.

## Setup

1. Build the server (from the repo root):

```bash
npm install
npm run compile
```

2. Load the Neovim client script. The repo includes `nvim-client/nvim-shell-lsp.lua`, which starts the LSP on shell filetypes. You can load it from your `init.lua` like this:

```lua
vim.cmd("luafile /absolute/path/to/shell-language-server/nvim-client/nvim-shell-lsp.lua")
```

Tip: If you want a relative path, copy or symlink the file into your `~/.config/nvim` and adjust the `luafile` path.

3. Restart Neovim and open a shell file (e.g. `test.sh`, `test.zsh`).

4. Verify it attached:

```vim
:lua print(vim.inspect(vim.lsp.get_clients({ bufnr = 0 })))
```

You should see a client named `shell-language-server`.

## Plugin

This is the LazyVim plugin spec created at `~/.config/nvim/lua/plugins/shell-language-server.lua`:

```lua
return {
  {
    "neovim/nvim-lspconfig",
    opts = function(_, opts)
      local util = require("lspconfig.util")
      local server_path = vim.fn.expand("~/ort-proyectos/shell-language-server/server/out/server.js")

      opts.servers = opts.servers or {}
      opts.servers.shell_language_server = {
        cmd = { "node", server_path },
        filetypes = { "sh", "bash", "zsh", "ksh" },
        root_dir = function(fname)
          local path = fname
          if type(path) == "number" then
            path = vim.api.nvim_buf_get_name(path)
          end
          if path == "" then
            return vim.loop.cwd()
          end
          return util.root_pattern(".git")(path) or util.path.dirname(path)
        end,
        single_file_support = true,
        reuse_client = function(client, config)
          return client.name == "shell_language_server" and client.config.root_dir == config.root_dir
        end,
      }

      local group = vim.api.nvim_create_augroup("ShellLanguageServer", { clear = true })
      vim.api.nvim_create_autocmd("FileType", {
        group = group,
        pattern = { "sh", "bash", "zsh", "ksh" },
        callback = function(args)
          local config = vim.lsp.config["shell_language_server"]
          if not config then
            return
          end
          vim.lsp.start(config, { bufnr = args.buf })
        end,
      })
    end,
  },
}
```

## Keybind examples

These are common LSP actions. If your config doesn’t provide keymaps, you can run the commands directly.

By default, the leader key is \

| Action | Keybind (common in LazyVim) | Command |
| --- | --- | --- |
| Hover | `K` | `:lua vim.lsp.buf.hover()` |
| Go to definition | `gd` | `:lua vim.lsp.buf.definition()` |
| References | `gr` | `:lua vim.lsp.buf.references()` |
| Rename | `<leader>cr` | `:lua vim.lsp.buf.rename()` |
| Code action | `<leader>ca` | `:lua vim.lsp.buf.code_action()` |

## Troubleshooting

- Ensure `server/out/server.js` exists (re-run `npm run compile` if needed).
- Check `:set filetype?` is `sh`, `bash`, or `zsh`.
- See Neovim’s LSP log: `:lua print(vim.lsp.get_log_path())`
