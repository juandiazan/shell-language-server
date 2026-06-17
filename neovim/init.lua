-- Neovim configuration for the shell-language-server.
-- Requires the CLI on $PATH: `npm install -g bash-lsp`
--
-- Try it standalone:  nvim -u /path/to/nvim-client/init.lua test.sh
-- Or copy this block into your own init.lua.

vim.lsp.config["shell-ls"] = {
  cmd = { "shell-language-server" },
  filetypes = { "sh", "bash" },
  root_markers = { ".git", ".sh" },
}

vim.lsp.enable("shell-ls")
