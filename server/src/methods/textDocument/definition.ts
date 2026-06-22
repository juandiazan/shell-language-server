import * as fs from "fs";
import { pathToFileURL } from "url";
import { documents, TextDocumentPositionParams } from "../../interfaces/documents";
import { RequestMessage } from "../../server";
import { Location } from "../../interfaces/location";
import { workspaceRoot, collectShellFiles } from "../../interfaces/workspace";
import { wordAtPosition } from "../../utils/text";

type DefinitionParams = TextDocumentPositionParams;

const functionKeywordPattern =
  /^(\s*function\s+)([A-Za-z_][A-Za-z0-9_]*)\s*(?:\(\s*\))?\s*(?:\{|$)/;
const nameParenthesisPattern = /^(\s*)([A-Za-z_][A-Za-z0-9_]*)\s*\(\s*\)\s*(?:\{|$)/;

/**
 * Finds the first matching function-style definition for a symbol in a document.
 *
 * Supports both `function name()` and `name()` styles while ignoring commented
 * lines that start with `#`.
 *
 * @param uri Document URI.
 * @param content Full document content.
 * @param symbol Symbol to locate.
 * @returns Definition location or null if no match is found.
 */
const findDefinitionInContent = (uri: string, content: string, symbol: string): Location | null => {
  const lines = content.split("\n");

  for (let lineNumber = 0; lineNumber < lines.length; lineNumber += 1) {
    const line = lines[lineNumber];
    // if line is a comment, skip
    if (/^\s*#/.test(line)) {
      continue;
    }

    // checks for "function name (...)" pattern
    const functionKeywordMatch = line.match(functionKeywordPattern);
    if (functionKeywordMatch) {
      const functionName = functionKeywordMatch[2]; // at 0 returns full text, at 1 returns "function " part
      if (functionName === symbol) {
        const startCharacter = functionKeywordMatch[1].length;
        return {
          uri,
          range: {
            start: { line: lineNumber, character: startCharacter },
            end: {
              line: lineNumber,
              character: startCharacter + symbol.length,
            },
          },
        };
      }
    }

    // checks for "name (...)" pattern
    const nameParenthesisMatch = line.match(nameParenthesisPattern);
    if (nameParenthesisMatch) {
      const functionName = nameParenthesisMatch[2]; // at 0 returns full text, at 1 returns indentation
      if (functionName === symbol) {
        const startCharacter = nameParenthesisMatch[1].length;
        return {
          uri,
          range: {
            start: { line: lineNumber, character: startCharacter },
            end: {
              line: lineNumber,
              character: startCharacter + symbol.length,
            },
          },
        };
      }
    }
  }

  return null;
};

export const definition = (message: RequestMessage): Location | null => {
  const params = message.params as DefinitionParams;
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

  const currentDocumentDefinition = findDefinitionInContent(
    params.textDocument.uri,
    content,
    symbol
  );

  if (currentDocumentDefinition) {
    return currentDocumentDefinition;
  }

  // search other open documents
  for (const [uri, documentContent] of documents.entries()) {
    if (uri === params.textDocument.uri) continue;

    const definitionInOpenDocument = findDefinitionInContent(uri, documentContent, symbol);
    if (definitionInOpenDocument) return definitionInOpenDocument;
  }

  // search workspace .sh files not already open
  if (workspaceRoot) {
    for (const filePath of collectShellFiles(workspaceRoot)) {
      const fileUri = pathToFileURL(filePath).href;
      if (documents.has(fileUri)) continue;

      let fileContent: string;
      try {
        fileContent = fs.readFileSync(filePath, "utf-8");
      } catch {
        continue;
      }

      const definitionInWorkspace = findDefinitionInContent(fileUri, fileContent, symbol);
      if (definitionInWorkspace) return definitionInWorkspace;
    }
  }

  return null;
};
