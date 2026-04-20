import { documents, TextDocumentIdentifier } from "../../interfaces/documents";
import { RequestMessage } from "../../server";
import { Position, Location } from "../../interfaces/location";
interface TextDocumentPositionParams {
  textDocument: TextDocumentIdentifier;
  position: Position;
}

interface DefinitionParams extends TextDocumentPositionParams {}

const functionKeywordPattern =
  /^(\s*function\s+)([A-Za-z_][A-Za-z0-9_]*)\s*(?:\(\s*\))?\s*(?:\{|$)/;
const nameParenthesisPattern =
  /^(\s*)([A-Za-z_][A-Za-z0-9_]*)\s*\(\s*\)\s*(?:\{|$)/;

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
const findDefinitionInContent = (
  uri: string,
  content: string,
  symbol: string,
): Location | null => {
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

/**
 * Handles `textDocument/definition` requests by resolving the symbol under the
 * cursor to its definition location in the current document or other open
 * documents.
 *
 * @param message JSON-RPC request message with definition parameters.
 * @returns A single location result or null when no definition is found.
 */
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
    symbol,
  );

  if (currentDocumentDefinition) {
    return currentDocumentDefinition;
  }

  // if definition is not found, look for it on every open document
  for (const [uri, documentContent] of documents.entries()) {
    if (uri === params.textDocument.uri) {
      continue;
    }

    const definitionInOpenDocument = findDefinitionInContent(
      uri,
      documentContent,
      symbol,
    );

    if (definitionInOpenDocument) {
      return definitionInOpenDocument;
    }
  }

  return null;
};
