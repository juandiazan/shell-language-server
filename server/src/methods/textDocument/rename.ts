import * as fs from "fs";
import { pathToFileURL } from "url";
import { RequestMessage } from "../../server";
import { documents, TextDocumentPositionParams, WorkspaceEdit } from "../../interfaces/documents";
import { workspaceRoot, collectShellFiles } from "../../interfaces/workspace";
import { isWordChar, wordAtPosition } from "../../utils/text";

interface RenameParams extends TextDocumentPositionParams {
  newName: string;
}

const normalizeUri = (uri: string): string =>
  uri.replace(/^file:\/\/\/[A-Z]:/, (m) => m.toLowerCase());

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
