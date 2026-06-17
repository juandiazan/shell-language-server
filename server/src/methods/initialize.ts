import { fileURLToPath } from "url";
import { readFileSync } from "fs";
import { join } from "path";
import { RequestMessage } from "../server";
import { setWorkspaceRoot } from "../interfaces/workspace";

// Read from the package manifest so serverInfo.version tracks the published
// `bash_lsp` package. From server/out/methods/ the server manifest
// (server/package.json) is two levels up — and it ships at the npm tarball
// root and inside the .vsix, so this resolves in dev, npm, and the extension.
const serverVersion = ((): string | undefined => {
  try {
    const manifest = readFileSync(join(__dirname, "../../package.json"), "utf8");
    return (JSON.parse(manifest) as { version?: string }).version;
  } catch {
    return undefined;
  }
})();

type ServerCapabilities = Record<string, unknown>;

interface InitializeResult {
  capabilities: ServerCapabilities;
  serverInfo?: {
    name: string;
    version?: string;
  };
}

interface InitializeParams {
  rootUri?: string | null;
  rootPath?: string | null;
}

export const initialize = (message: RequestMessage): InitializeResult => {
  const params = message.params as InitializeParams;
  const root = params?.rootUri ?? params?.rootPath ?? null;
  if (root) {
    setWorkspaceRoot(root.startsWith("file://") ? fileURLToPath(root) : root);
  }
  return {
    capabilities: {
      completionProvider: { snippetSupport: true },
      definitionProvider: true,
      codeActionProvider: true,
      textDocumentSync: 1,
      diagnosticProvider: {
        interFileDependencies: false,
        workspaceDiagnostics: false,
      },
      renameProvider: true,
      hoverProvider: {},
    },
    serverInfo: {
      name: "shell-language-server",
      version: serverVersion,
    },
  };
};
