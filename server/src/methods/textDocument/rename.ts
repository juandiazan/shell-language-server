import * as fs from "fs";
import { pathToFileURL } from "url";
import { RequestMessage } from "../../server";
import { documents, TextDocumentPositionParams, WorkspaceEdit } from "../../interfaces/documents";
import { workspaceRoot, collectShellFiles } from "../../interfaces/workspace";
import { isWordChar, wordAtPosition } from "../../utils/text";
import log from "../../log";

interface RenameParams extends TextDocumentPositionParams {
  newName: string;
}

const normalizeUri = (uri: string): string =>
  uri
    .replace(/%3[Aa]/g, ":")
    .replace(/^file:\/\/\/[A-Z]:/, (m) => m.toLowerCase());

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

  log.write(`[rename] incoming uri="${params.textDocument.uri}" position=${JSON.stringify(params.position)} newName="${params.newName}"`);
  log.write(`[rename] documents keys: ${JSON.stringify([...documents.keys()])}`);
  log.write(`[rename] workspaceRoot="${workspaceRoot}"`);

  const content = documents.get(params.textDocument.uri);

  if (!content) {
    log.write(`[rename] document not found in map for uri="${params.textDocument.uri}"`);
    return null;
  }

  const line = content.split("\n")[params.position.line];
  if (line === undefined) {
    log.write(`[rename] line ${params.position.line} out of range`);
    return null;
  }

  const symbol = wordAtPosition(line, params.position.character);
  if (!symbol) {
    log.write(`[rename] no symbol at position ${params.position.character} on line: "${line}"`);
    return null;
  }

  log.write(`[rename] symbol="${symbol}"`);

  const result: WorkspaceEdit = { changes: {} };

  // rename in open documents
  for (const [uri, documentContent] of documents.entries()) {
    const normalizedUri = normalizeUri(uri);
    editsForContent(normalizedUri, documentContent, symbol, params.newName, result);
    log.write(`[rename] open doc uri="${normalizedUri}" edits=${result.changes[normalizedUri]?.length ?? 0}`);
  }

  // rename in workspace
  if (workspaceRoot) {
    const shellFiles = collectShellFiles(workspaceRoot);
    log.write(`[rename] workspace files (${shellFiles.length}): ${JSON.stringify(shellFiles)}`);
    for (const filePath of shellFiles) {
      const rawHref = pathToFileURL(filePath).href;
      const fileUri = normalizeUri(rawHref);
      const inDocuments = [...documents.keys()].some((u) => normalizeUri(u) === fileUri);
      log.write(`[rename] workspace file="${filePath}" rawHref="${rawHref}" fileUri="${fileUri}" inDocuments=${inDocuments}`);
      if (inDocuments) continue;

      let fileContent: string;
      try {
        fileContent = fs.readFileSync(filePath, "utf-8");
      } catch (e) {
        log.write(`[rename] failed to read "${filePath}": ${e}`);
        continue;
      }

      editsForContent(fileUri, fileContent, symbol, params.newName, result);
      log.write(`[rename] workspace edits for "${fileUri}": ${result.changes[fileUri]?.length ?? 0}`);
    }
  }

  log.write(`[rename] result uris: ${JSON.stringify(Object.keys(result.changes))}`);
  return result;
};
