import { TextDocumentPositionParams, documents } from "../../interfaces/documents";
import { RequestMessage } from "../../server";
import { execSync } from "child_process";
import { Hover, MarkupKind } from "../../interfaces/hover";

type HoverParams = TextDocumentPositionParams;

/**
 * Returns whether a character can be part of a shell symbol token.
 */
const isWordChar = (char: string): boolean => /[A-Za-z0-9_]/.test(char);

/**
 * Gets the symbol under (or immediately before) the provided cursor position.
 *
 * @param line Current line content.
 * @param character Cursor character index.
 * @returns The detected symbol or null when no valid token exists at the position.
 */
const wordAtPosition = (line: string, character: number): string | null => {
  if (!line.length) {
    return null;
  }

  // checks if the current position is a valid symbol
  let index = Math.min(character, line.length - 1);
  if (!isWordChar(line[index])) {
    // if it is not a valid symbol, check one character to the left to take empty spaces into account
    if (character > 0 && isWordChar(line[character - 1])) {
      index = character - 1;
    } else {
      return null;
    }
  }

  // sets lower limit of symbol
  let start = index;
  while (start > 0 && isWordChar(line[start - 1])) {
    start -= 1;
  }

  // sets upper limit of symbol
  let end = index + 1;
  while (end < line.length && isWordChar(line[end])) {
    end += 1;
  }

  // returns the characters between start and end
  return line.slice(start, end);
};

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
