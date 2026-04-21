import { RequestMessage } from "../../server";
import {
  documents,
  TextDocumentPositionParams,
  WorkspaceEdit,
} from "../../interfaces/documents";

interface RenameParams extends TextDocumentPositionParams {
  newName: string;
}

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
 * Creates rename edits for every full-symbol occurrence in the target document.
 */
const createEditsForSymbol = (
  uri: string,
  symbol: string,
  newName: string,
): WorkspaceEdit => {
  const edits: WorkspaceEdit = { changes: {} };
  const content = documents.get(uri);

  if (!content) {
    return edits;
  }

  const documentEdits = [];
  const lines = content.split("\n");

  // iterates through all lines to find full-symbol matches and create edits for them
  for (let lineNumber = 0; lineNumber < lines.length; lineNumber += 1) {
    const line = lines[lineNumber];
    let searchStart = 0;

    // searches for the symbol in the line and checks for word boundaries to avoid partial matches
    while (searchStart <= line.length - symbol.length) {
      const matchIndex = line.indexOf(symbol, searchStart);
      if (matchIndex === -1) {
        break;
      }

      // checks for word boundaries around the match to ensure it's a full symbol match
      const before = matchIndex > 0 ? line[matchIndex - 1] : "";
      const afterIndex = matchIndex + symbol.length;
      const after = afterIndex < line.length ? line[afterIndex] : "";
      const hasWordBoundary = !isWordChar(before) && !isWordChar(after);

      // if it's a full symbol match, creates an edit for it
      if (hasWordBoundary) {
        documentEdits.push({
          range: {
            start: { line: lineNumber, character: matchIndex },
            end: { line: lineNumber, character: afterIndex },
          },
          newText: newName,
        });
      }

      searchStart = matchIndex + symbol.length;
    }
  }

  if (documentEdits.length) {
    edits.changes[uri] = documentEdits;
  }

  return edits;
};

export const rename = (message: RequestMessage): WorkspaceEdit | null => {
  const params = message.params as RenameParams;
  const uri = params.textDocument.uri;
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

  return createEditsForSymbol(uri, symbol, params.newName);
};
