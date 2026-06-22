import * as fs from "fs";
import { pathToFileURL } from "url";
import { RequestMessage } from "../../server";
import { documents, TextDocumentPositionParams, WorkspaceEdit } from "../../interfaces/documents";
import { workspaceRoot, collectShellFiles } from "../../interfaces/workspace";

interface RenameParams extends TextDocumentPositionParams {
  newName: string;
}

const normalizeUri = (uri: string): string =>
  uri.replace(/^file:\/\/\/[A-Z]:/, (m) => m.toLowerCase());

const isWordChar = (char: string): boolean => /[A-Za-z0-9_]/.test(char);

const wordAtPosition = (line: string, character: number): string | null => {
  if (!line.length) {
    return null;
  }

  let index = Math.min(character, line.length - 1);
  if (!isWordChar(line[index])) {
    if (character > 0 && isWordChar(line[character - 1])) {
      index = character - 1;
    } else {
      return null;
    }
  }

  let start = index;
  while (start > 0 && isWordChar(line[start - 1])) {
    start -= 1;
  }

  let end = index + 1;
  while (end < line.length && isWordChar(line[end])) {
    end += 1;
  }

  return line.slice(start, end);
};

const editsForContent = (
  uri: string,
  content: string,
  symbol: string,
  newName: string,
  result: WorkspaceEdit
): void => {
  const lines = content.split("\n");
  const documentEdits = [];

  for (let lineNumber = 0; lineNumber < lines.length; lineNumber += 1) {
    const line = lines[lineNumber];
    let searchStart = 0;

    while (searchStart <= line.length - symbol.length) {
      const matchIndex = line.indexOf(symbol, searchStart);
      if (matchIndex === -1) break;

      const before = matchIndex > 0 ? line[matchIndex - 1] : "";
      const afterIndex = matchIndex + symbol.length;
      const after = afterIndex < line.length ? line[afterIndex] : "";

      if (!isWordChar(before) && !isWordChar(after)) {
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
    result.changes[uri] = documentEdits;
  }
};

export const rename = (message: RequestMessage): WorkspaceEdit | null => {
  const params = message.params as RenameParams;
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

  const result: WorkspaceEdit = { changes: {} };

  // rename in open documents
  for (const [uri, documentContent] of documents.entries()) {
    editsForContent(uri, documentContent, symbol, params.newName, result);
  }

  // rename in workspace
  if (workspaceRoot) {
    for (const filePath of collectShellFiles(workspaceRoot)) {
      const fileUri = normalizeUri(pathToFileURL(filePath).href);
      if (documents.has(fileUri)) continue;

      let fileContent: string;
      try {
        fileContent = fs.readFileSync(filePath, "utf-8");
      } catch {
        continue;
      }

      editsForContent(fileUri, fileContent, symbol, params.newName, result);
    }
  }

  return result;
};
