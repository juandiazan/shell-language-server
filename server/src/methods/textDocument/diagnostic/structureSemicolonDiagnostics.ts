import { Range } from "../../../interfaces/location";
import {
  Diagnostic,
  DiagnosticSeverity,
} from "../../../interfaces/diagnostics";

interface PendingStructureSemicolonCheck {
  expectedKeyword: "then" | "do" | null;
  lastSignificantTokenSemicolon: boolean;
}

const isWordCharacter = (char: string): boolean => /[A-Za-z0-9_]/.test(char);

/**
 * Builds a word range at a specific line/column location.
 *
 * @param line Zero-based line index.
 * @param startCharacter Zero-based start character index.
 * @param length Word length.
 * @returns LSP range covering the full word.
 */
const wordRange = (
  line: number,
  startCharacter: number,
  length: number,
): Range => ({
  start: { line, character: startCharacter },
  end: { line, character: startCharacter + length },
});

/**
 * Produces diagnostics for missing semicolons before structure continuation
 * keywords (`then` and `do`) after `if`, `while`, and `for`.
 *
 * @param content Full document text.
 * @returns Diagnostic list for detected structure semicolon issues.
 */
export const structureSemicolonDiagnostics = (
  content: string,
): Diagnostic[] => {
  const diagnostics: Diagnostic[] = [];
  const lines = content.split("\n");

  let inSingleQuotes = false;
  let inDoubleQuotes = false;

  const pendingCheck: PendingStructureSemicolonCheck = {
    expectedKeyword: null,
    lastSignificantTokenSemicolon: false,
  };

  const processWord = (
    word: string,
    lineNumber: number,
    wordStartCharacter: number,
  ): void => {
    if (!word.length) {
      return;
    }

    if (!pendingCheck.expectedKeyword) {
      if (word === "if") {
        pendingCheck.expectedKeyword = "then";
        pendingCheck.lastSignificantTokenSemicolon = false;
      } else if (word === "while" || word === "for") {
        pendingCheck.expectedKeyword = "do";
        pendingCheck.lastSignificantTokenSemicolon = false;
      }

      return;
    }

    if (word === pendingCheck.expectedKeyword) {
      if (!pendingCheck.lastSignificantTokenSemicolon) {
        diagnostics.push({
          severity: DiagnosticSeverity.Warning,
          message: `Missing semicolon before "${word}" in structure condition.`,
          source: "shell-language-server",
          range: wordRange(lineNumber, wordStartCharacter, word.length),
        });
      }

      pendingCheck.expectedKeyword = null;
      pendingCheck.lastSignificantTokenSemicolon = false;
      return;
    }

    pendingCheck.lastSignificantTokenSemicolon = false;
  };

  for (let lineNumber = 0; lineNumber < lines.length; lineNumber += 1) {
    const line = lines[lineNumber];
    let currentWord = "";
    let currentWordStartCharacter = -1;

    for (let character = 0; character < line.length; character += 1) {
      const currentChar = line[character];

      if (!inSingleQuotes && !inDoubleQuotes && currentChar === "#") {
        processWord(currentWord, lineNumber, currentWordStartCharacter);
        currentWord = "";
        currentWordStartCharacter = -1;
        break;
      }

      if (currentChar === "\\" && !inSingleQuotes) {
        processWord(currentWord, lineNumber, currentWordStartCharacter);
        currentWord = "";
        currentWordStartCharacter = -1;
        character += 1;
        continue;
      }

      if (currentChar === "'" && !inDoubleQuotes) {
        processWord(currentWord, lineNumber, currentWordStartCharacter);
        currentWord = "";
        currentWordStartCharacter = -1;
        inSingleQuotes = !inSingleQuotes;
        continue;
      }

      if (currentChar === '"' && !inSingleQuotes) {
        processWord(currentWord, lineNumber, currentWordStartCharacter);
        currentWord = "";
        currentWordStartCharacter = -1;
        inDoubleQuotes = !inDoubleQuotes;
        continue;
      }

      if (inSingleQuotes || inDoubleQuotes) {
        continue;
      }

      if (isWordCharacter(currentChar)) {
        if (!currentWord.length) {
          currentWordStartCharacter = character;
        }
        currentWord += currentChar;
        continue;
      }

      processWord(currentWord, lineNumber, currentWordStartCharacter);
      currentWord = "";
      currentWordStartCharacter = -1;

      if (pendingCheck.expectedKeyword && currentChar === ";") {
        pendingCheck.lastSignificantTokenSemicolon = true;
      }
    }

    processWord(currentWord, lineNumber, currentWordStartCharacter);
  }

  return diagnostics;
};
