import { Range } from "../../../interfaces/location";
import {
  Diagnostic,
  DiagnosticSeverity,
} from "../../../interfaces/diagnostics";

type OpeningBracket = "(" | "[" | "{";
type ClosingBracket = ")" | "]" | "}";

interface BracketToken {
  char: OpeningBracket;
  line: number;
  character: number;
}

/**
 * Maps opening brackets to their expected closing counterparts.
 */
const openingToClosingBracket = {
  "(": ")",
  "[": "]",
  "{": "}",
} as const;

/**
 * Maps closing brackets to their expected opening counterparts.
 */
const closingToOpeningBracket = {
  ")": "(",
  "]": "[",
  "}": "{",
} as const;

/**
 * Produces diagnostics for unmatched or mismatched brackets in shell content.
 *
 * Brackets inside comments and quoted strings are ignored. Inside `case` blocks,
 * pattern headers are ignored until `)` is reached, then bracket checks run for
 * the clause body until `;;`.
 *
 * @param content Full document text.
 * @returns Diagnostic list for detected bracket issues.
 */
export const bracketDiagnostics = (content: string): Diagnostic[] => {
  const diagnostics: Diagnostic[] = [];
  const bracketStack: BracketToken[] = [];
  const lines = content.split("\n");

  let inSingleQuotes = false;
  let inDoubleQuotes = false;
  let inCaseBlock = false;
  let inCaseClauseBody = false;

  // checks if token is inside a case
  const processWord = (word: string): void => {
    if (!word.length) {
      return;
    }

    if (word === "case") {
      inCaseBlock = true;
      inCaseClauseBody = false;
      return;
    }

    if (word === "esac") {
      inCaseBlock = false;
      inCaseClauseBody = false;
    }
  };

  for (let lineNumber = 0; lineNumber < lines.length; lineNumber += 1) {
    const line = lines[lineNumber];
    let currentWord = "";

    for (let character = 0; character < line.length; character += 1) {
      const currentChar = line[character];

      // check for comment
      if (!inSingleQuotes && !inDoubleQuotes && currentChar === "#") {
        processWord(currentWord);
        break;
      }

      if (currentChar === "\\" && !inSingleQuotes) {
        processWord(currentWord);
        currentWord = "";
        character += 1;
        continue;
      }

      // enter or leave single quote string if not in double quote string
      if (currentChar === "'" && !inDoubleQuotes) {
        processWord(currentWord);
        currentWord = "";
        inSingleQuotes = !inSingleQuotes;
        continue;
      }

      // enter or leave double quote string if not in single quote string
      if (currentChar === '"' && !inSingleQuotes) {
        processWord(currentWord);
        currentWord = "";
        inDoubleQuotes = !inDoubleQuotes;
        continue;
      }

      // if inside a string, keep checking line
      if (inSingleQuotes || inDoubleQuotes) {
        continue;
      }

      if (isWordCharacter(currentChar)) {
        currentWord += currentChar;
      } else {
        processWord(currentWord);
        currentWord = "";
      }

      // entering a case clause
      if (inCaseBlock && !inCaseClauseBody && currentChar === ")") {
        inCaseClauseBody = true;
        continue;
      }

      // leaving a case clause
      if (inCaseBlock && inCaseClauseBody && line.startsWith(";;", character)) {
        inCaseClauseBody = false;
        character += 1;
        continue;
      }

      // if current token is in case body but not inside a case clause do nothing
      if (
        inCaseBlock &&
        !inCaseClauseBody &&
        (isOpeningBracket(currentChar) || isClosingBracket(currentChar))
      ) {
        continue;
      }

      if (isOpeningBracket(currentChar)) {
        bracketStack.push({
          char: currentChar as OpeningBracket,
          line: lineNumber,
          character,
        });
        continue;
      }

      if (!isClosingBracket(currentChar)) {
        continue;
      }

      // if current character is a closing bracket, get corresponding opening bracket
      const expectedOpeningBracket =
        closingToOpeningBracket[currentChar as ClosingBracket];
      const openingBracket = bracketStack.at(-1);

      // if no opening bracket is found, add an error
      if (!openingBracket) {
        diagnostics.push({
          severity: DiagnosticSeverity.Error,
          message: `Unmatched closing bracket "${currentChar}".`,
          source: "shell-language-server",
          range: singleCharacterRange(lineNumber, character),
        });
        continue;
      }

      // if opening bracket is found but is mismatched, add an error
      if (openingBracket.char !== expectedOpeningBracket) {
        const expectedClosingBracket =
          openingToClosingBracket[openingBracket.char as OpeningBracket];

        diagnostics.push({
          severity: DiagnosticSeverity.Error,
          message: `Mismatched closing bracket "${currentChar}". Expected "${expectedClosingBracket}" to match "${openingBracket.char}".`,
          source: "shell-language-server",
          range: singleCharacterRange(lineNumber, character),
        });
        continue;
      }

      bracketStack.pop();
    }

    processWord(currentWord);
  }

  // if there are opening brackets left in stack, add an error for each one
  while (bracketStack.length > 0) {
    const openingBracket = bracketStack.pop() as BracketToken;
    diagnostics.push({
      severity: DiagnosticSeverity.Error,
      message: `Unmatched opening bracket "${openingBracket.char}".`,
      source: "shell-language-server",
      range: singleCharacterRange(
        openingBracket.line,
        openingBracket.character,
      ),
    });
  }

  return diagnostics;
};

/**
 * Returns whether a character is one of the supported opening brackets.
 *
 * @param char Character to inspect.
 */
const isOpeningBracket = (char: string): boolean => {
  return char === "(" || char === "[" || char === "{";
};

/**
 * Returns whether a character is one of the supported closing brackets.
 *
 * @param char Character to inspect.
 */
const isClosingBracket = (char: string): boolean => {
  return char === ")" || char === "]" || char === "}";
};

const isWordCharacter = (char: string): boolean => /[A-Za-z0-9_]/.test(char);

/**
 * Builds a single-character range at a specific line/column location.
 *
 * @param line Zero-based line index.
 * @param character Zero-based character index.
 * @returns LSP range covering one character.
 */
const singleCharacterRange = (line: number, character: number): Range => ({
  start: { line, character },
  end: { line, character: character + 1 },
});
