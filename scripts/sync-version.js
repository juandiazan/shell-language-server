// Keeps server/package.json (the published `bash_lsp` npm package) in lockstep
// with the root manifest version. Run automatically by `npm version` via the
// root "version" script, so a single `npm version <bump>` updates both.
const fs = require("fs");
const path = require("path");

const rootVersion = require("../package.json").version;
const serverPath = path.join(__dirname, "..", "server", "package.json");
const server = JSON.parse(fs.readFileSync(serverPath, "utf8"));

server.version = rootVersion;
fs.writeFileSync(serverPath, JSON.stringify(server, null, 2) + "\n");
console.log(`synced server/package.json to ${rootVersion}`);
