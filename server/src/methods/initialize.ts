import { fileURLToPath } from "url";
import { RequestMessage } from "../server";
import { setWorkspaceRoot } from "../interfaces/workspace";

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
      version: "0.0.1",
    },
  };
};
