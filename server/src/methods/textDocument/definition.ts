import { documents, TextDocumentIdentifier } from "../../documents";
import { RequestMessage } from "../../server";

interface Position {
  line: number;
  character: number;
}

interface Range {
  start: Position;
  end: Position;
}

interface Location {
  uri: string;
  range: Range;
}

interface TextDocumentPositionParams {
  textDocument: TextDocumentIdentifier;
  position: Position;
}

interface DefinitionParams extends TextDocumentPositionParams {}

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

const functionKeywordPattern =
  /^(\s*function\s+)([A-Za-z_][A-Za-z0-9_]*)\s*(?:\(\s*\))?\s*(?:\{|$)/;
const nameParenthesisPattern =
  /^(\s*)([A-Za-z_][A-Za-z0-9_]*)\s*\(\s*\)\s*(?:\{|$)/;

const findDefinitionInContent = (
  uri: string,
  content: string,
  symbol: string,
): Location | null => {
  const lines = content.split("\n");

  for (let lineNumber = 0; lineNumber < lines.length; lineNumber += 1) {
    const line = lines[lineNumber];
    if (/^\s*#/.test(line)) {
      continue;
    }

    const functionKeywordMatch = line.match(functionKeywordPattern);
    if (functionKeywordMatch && functionKeywordMatch[2] === symbol) {
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

    const nameParenMatch = line.match(nameParenthesisPattern);
    if (nameParenMatch && nameParenMatch[2] === symbol) {
      const startCharacter = nameParenMatch[1].length;
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

  return null;
};

export const definition = (message: RequestMessage): Location | null => {
  const params = message.params as DefinitionParams;
  const content = documents.get(params.textDocument.uri);

  // checks content from document obtained from documents map
  if (!content) {
    return null;
  }

  // checks current line
  const line = content.split("\n")[params.position.line];
  if (line === undefined) {
    return null;
  }

  // checks current word
  const symbol = wordAtPosition(line, params.position.character);
  if (!symbol) {
    return null;
  }

  // gets definition from document content
  const currentDocumentDefinition = findDefinitionInContent(
    params.textDocument.uri,
    content,
    symbol,
  );

  // if definition is found its location is returned
  if (currentDocumentDefinition) {
    return currentDocumentDefinition;
  }

  // if definition is not found, look for it on every open document
  for (const [uri, documentContent] of documents.entries()) {
    // if document is current, skip it
    if (uri === params.textDocument.uri) {
      continue;
    }

    // look for definition on document
    const definitionInOpenDocument = findDefinitionInContent(
      uri,
      documentContent,
      symbol,
    );

    // if definition is found its location is returned
    if (definitionInOpenDocument) {
      return definitionInOpenDocument;
    }
  }

  return null;
};
