local function script_dir()
  local source = debug.getinfo(1, "S").source
  if source:sub(1, 1) == "@" then
    return vim.fn.fnamemodify(source:sub(2), ":p:h")
  end
  return vim.loop.cwd()
end

local repo_root = vim.fn.fnamemodify(script_dir(), ":h")
local server_cmd = { "node", repo_root .. "/server/out/server.js" }

vim.api.nvim_create_autocmd("FileType", {
  pattern = { "sh", "bash", "zsh" },
  callback = function()
    vim.lsp.start({
      name = "shell-language-server",
      cmd = server_cmd,
      root_dir = vim.fs.root(0, { ".git", "package.json" }) or repo_root,
    })
  end,
})
