import { TextDocumentPositionParams, documents } from "../../interfaces/documents";
import { RequestMessage } from "../../server";
import { execSync } from "child_process";
import { Hover, MarkupKind } from "../../interfaces/hover";
import { wordAtPosition } from "../../utils/text";

type HoverParams = TextDocumentPositionParams;

/**
 * Retrieves the man page content for a given command.
 *
 * @param command The command name to get the man page for.
 * @returns The man page content, or a message if the man page is not found.
 */
const getManPage = (command: string): string => {
  const candidates =
    process.platform === "win32"
      ? [`wsl man ${command}`, `bash -c "man ${command}"`, `man ${command}`]
      : [`man ${command}`];

  for (const cmd of candidates) {
    try {
      return execSync(cmd, {
        encoding: "utf-8",
        timeout: 5000,
        stdio: ["pipe", "pipe", "pipe"],
      });
    } catch {
      continue;
    }
  }

  return `Man page for '${command}' not found.`;
};

export const hover = (message: RequestMessage): Hover | null => {
  const params = message.params as HoverParams;
  const content = documents.get(params.textDocument.uri);

  if (!content) {
    return null;
  }

  const line = content.split("\n")[params.position.line];
  if (line === undefined) {
    return null;
  }
  const symbol = wordAtPosition(line, params.position.character);

  if (!symbol) {
    return null;
  }

  const manPage = getManPage(symbol);

  return {
    contents: {
      kind: MarkupKind.PlainText,
      value: manPage,
    },
    range: {
      start: {
        line: params.position.line,
        character: params.position.character,
      },
      end: {
        line: params.position.line,
        character: params.position.character,
      },
    },
  };
};
