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
  uri.replace(/%3[Aa]/g, ":").replace(/^file:\/\/\/[A-Z]:/, (m) => m.toLowerCase());

const editsForContent = (content: string, symbol: string, newName: string) => {
  const lines = content.split("\n");
  const edits = [];

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
        edits.push({
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

  return edits;
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
  const normalizedDocUris = new Set([...documents.keys()].map(normalizeUri));

  for (const [uri, documentContent] of documents.entries()) {
    const normalizedUri = normalizeUri(uri);
    const edits = editsForContent(documentContent, symbol, params.newName);
    if (edits.length) result.changes[normalizedUri] = edits;
  }

  if (workspaceRoot) {
    const shellFiles = collectShellFiles(workspaceRoot);
    for (const filePath of shellFiles) {
      const fileUri = normalizeUri(pathToFileURL(filePath).href);
      if (normalizedDocUris.has(fileUri)) continue;

      let fileContent: string;
      try {
        fileContent = fs.readFileSync(filePath, "utf-8");
      } catch {
        continue;
      }

      const edits = editsForContent(fileContent, symbol, params.newName);
      if (edits.length) result.changes[fileUri] = edits;
    }
  }

  return result;
};
