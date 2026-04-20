import { Range } from "../../../interfaces/location";
import {
  Diagnostic,
  DiagnosticSeverity,
  DiagnosticType,
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

interface ParserState {
  inSingleQuotes: boolean;
  inDoubleQuotes: boolean;
  inCaseBlock: boolean;
  inCaseClauseBody: boolean;
}

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
  const parserState: ParserState = {
    inSingleQuotes: false,
    inDoubleQuotes: false,
    inCaseBlock: false,
    inCaseClauseBody: false,
  };

  for (let lineNumber = 0; lineNumber < lines.length; lineNumber += 1) {
    processLineForBracketDiagnostics(
      lines[lineNumber],
      lineNumber,
      parserState,
      bracketStack,
      diagnostics,
    );
  }

  emitUnmatchedOpeningBracketDiagnostics(bracketStack, diagnostics);

  return diagnostics;
};

/**
 * Parses one line and updates bracket diagnostics and parser state.
 *
 * @param line Current line text.
 * @param lineNumber Zero-based line index.
 * @param parserState Mutable parser state shared across lines.
 * @param bracketStack Stack of unmatched opening brackets.
 * @param diagnostics Collected diagnostics.
 */
const processLineForBracketDiagnostics = (
  line: string,
  lineNumber: number,
  parserState: ParserState,
  bracketStack: BracketToken[],
  diagnostics: Diagnostic[],
): void => {
  let currentWord = "";

  for (let character = 0; character < line.length; character += 1) {
    const currentChar = line[character];

    // check if current line is a comment
    if (isCommentStart(currentChar, parserState)) {
      processWordForCaseState(currentWord, parserState);
      break;
    }

    // check if current word starts with an escaped character, if it does, skip it
    if (isEscapedCharacter(currentChar, parserState)) {
      processWordForCaseState(currentWord, parserState);
      currentWord = "";
      character += 1;
      continue;
    }

    // check if current word is starting or ending a single-quoted string
    if (isSingleQuoteToggle(currentChar, parserState)) {
      processWordForCaseState(currentWord, parserState);
      currentWord = "";
      parserState.inSingleQuotes = !parserState.inSingleQuotes;
      continue;
    }

    // check if current word is starting or ending a double-quoted string
    if (isDoubleQuoteToggle(currentChar, parserState)) {
      processWordForCaseState(currentWord, parserState);
      currentWord = "";
      parserState.inDoubleQuotes = !parserState.inDoubleQuotes;
      continue;
    }

    // if inside quoted string, skip character
    if (isInsideQuotedString(parserState)) {
      continue;
    }

    currentWord = updateCurrentWord(currentWord, currentChar, parserState);

    if (isEnteringCaseClause(currentChar, parserState)) {
      parserState.inCaseClauseBody = true;
      continue;
    }

    if (isLeavingCaseClause(line, character, parserState)) {
      parserState.inCaseClauseBody = false;
      character += 1;
      continue;
    }

    if (shouldIgnoreBracketInCaseHeader(currentChar, parserState)) {
      continue;
    }

    if (isOpeningBracket(currentChar)) {
      pushOpeningBracket(
        bracketStack,
        currentChar as OpeningBracket,
        lineNumber,
        character,
      );
      continue;
    }

    if (isClosingBracket(currentChar)) {
      processClosingBracket(
        bracketStack,
        currentChar as ClosingBracket,
        lineNumber,
        character,
        diagnostics,
      );
    }
  }

  processWordForCaseState(currentWord, parserState);
};

/**
 * Returns whether a character starts a comment in the current parser state.
 *
 * @param char Character to inspect.
 * @param parserState Current parser state.
 */
const isCommentStart = (char: string, parserState: ParserState): boolean => {
  return !isInsideQuotedString(parserState) && char === "#";
};

/**
 * Updates case-related parser state when a shell word boundary is reached.
 *
 * @param word Parsed shell word.
 * @param parserState Mutable parser state.
 */
const processWordForCaseState = (
  word: string,
  parserState: ParserState,
): void => {
  if (word === "case") {
    parserState.inCaseBlock = true;
    parserState.inCaseClauseBody = false;
    return;
  }

  if (word === "esac") {
    parserState.inCaseBlock = false;
    parserState.inCaseClauseBody = false;
  }
};

/**
 * Returns whether the character begins an escaped sequence that should be skipped.
 *
 * @param char Character to inspect.
 * @param parserState Current parser state.
 */
const isEscapedCharacter = (
  char: string,
  parserState: ParserState,
): boolean => {
  return char === "\\" && !parserState.inSingleQuotes;
};

/**
 * Returns whether the character toggles single-quote string mode.
 *
 * @param char Character to inspect.
 * @param parserState Current parser state.
 */
const isSingleQuoteToggle = (
  char: string,
  parserState: ParserState,
): boolean => {
  return char === "'" && !parserState.inDoubleQuotes;
};

/**
 * Returns whether the character toggles double-quote string mode.
 *
 * @param char Character to inspect.
 * @param parserState Current parser state.
 */
const isDoubleQuoteToggle = (
  char: string,
  parserState: ParserState,
): boolean => {
  return char === '"' && !parserState.inSingleQuotes;
};

/**
 * Returns whether parsing is currently inside a quoted string.
 *
 * @param parserState Current parser state.
 */
const isInsideQuotedString = (parserState: ParserState): boolean => {
  return parserState.inSingleQuotes || parserState.inDoubleQuotes;
};

/**
 * Returns whether a character is part of a shell word token.
 *
 * @param char Character to inspect.
 */
const isWordCharacter = (char: string): boolean => /[A-Za-z0-9_]/.test(char);

/**
 * Appends to the current shell word or flushes it into case-state processing.
 *
 * @param currentWord Current accumulated word.
 * @param currentChar Current character.
 * @param parserState Mutable parser state.
 * @returns Updated accumulated word.
 */
const updateCurrentWord = (
  currentWord: string,
  currentChar: string,
  parserState: ParserState,
): string => {
  if (isWordCharacter(currentChar)) {
    return currentWord + currentChar;
  }

  processWordForCaseState(currentWord, parserState);
  return "";
};

/**
 * Returns whether the current character enters the body of a case clause.
 *
 * @param currentChar Character to inspect.
 * @param parserState Current parser state.
 */
const isEnteringCaseClause = (
  currentChar: string,
  parserState: ParserState,
): boolean => {
  return (
    parserState.inCaseBlock &&
    !parserState.inCaseClauseBody &&
    currentChar === ")"
  );
};

/**
 * Returns whether parsing is currently leaving a case clause body.
 *
 * @param line Current line text.
 * @param character Zero-based character index.
 * @param parserState Current parser state.
 */
const isLeavingCaseClause = (
  line: string,
  character: number,
  parserState: ParserState,
): boolean => {
  return (
    parserState.inCaseBlock &&
    parserState.inCaseClauseBody &&
    line.startsWith(";;", character)
  );
};

/**
 * Returns whether bracket tokens should be ignored in a case pattern header.
 *
 * @param currentChar Character to inspect.
 * @param parserState Current parser state.
 */
const shouldIgnoreBracketInCaseHeader = (
  currentChar: string,
  parserState: ParserState,
): boolean => {
  return (
    parserState.inCaseBlock &&
    !parserState.inCaseClauseBody &&
    (isOpeningBracket(currentChar) || isClosingBracket(currentChar))
  );
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
 * Pushes an opening bracket position onto the stack.
 *
 * @param bracketStack Stack of unmatched opening brackets.
 * @param openingBracket Opening bracket token.
 * @param lineNumber Zero-based line index.
 * @param character Zero-based character index.
 */
const pushOpeningBracket = (
  bracketStack: BracketToken[],
  openingBracket: OpeningBracket,
  lineNumber: number,
  character: number,
): void => {
  bracketStack.push({
    char: openingBracket,
    line: lineNumber,
    character,
  });
};

/**
 * Returns whether a character is one of the supported closing brackets.
 *
 * @param char Character to inspect.
 */
const isClosingBracket = (char: string): boolean => {
  return char === ")" || char === "]" || char === "}";
};

/**
 * Processes a closing bracket and emits diagnostics for unmatched/mismatched pairs.
 *
 * @param bracketStack Stack of unmatched opening brackets.
 * @param closingBracket Closing bracket token.
 * @param lineNumber Zero-based line index.
 * @param character Zero-based character index.
 * @param diagnostics Collected diagnostics.
 */
const processClosingBracket = (
  bracketStack: BracketToken[],
  closingBracket: ClosingBracket,
  lineNumber: number,
  character: number,
  diagnostics: Diagnostic[],
): void => {
  const expectedMatchingOpeningBracket =
    closingToOpeningBracket[closingBracket];
  const openingBracket = bracketStack.at(-1);

  if (!openingBracket) {
    diagnostics.push(
      buildBracketDiagnostic(
        `Unmatched closing bracket "${closingBracket}".`,
        lineNumber,
        character,
      ),
    );
    return;
  }

  if (openingBracket.char !== expectedMatchingOpeningBracket) {
    const expectedMatchingClosingBracket =
      openingToClosingBracket[openingBracket.char as OpeningBracket];

    diagnostics.push(
      buildBracketDiagnostic(
        `Mismatched closing bracket "${closingBracket}". Expected "${expectedMatchingClosingBracket}" to match "${openingBracket.char}".`,
        lineNumber,
        character,
      ),
    );
    return;
  }

  bracketStack.pop();
};

/**
 * Emits diagnostics for any opening brackets left unmatched in the stack.
 *
 * @param bracketStack Stack of unmatched opening brackets.
 * @param diagnostics Collected diagnostics.
 */
const emitUnmatchedOpeningBracketDiagnostics = (
  bracketStack: BracketToken[],
  diagnostics: Diagnostic[],
): void => {
  while (bracketStack.length > 0) {
    const openingBracket = bracketStack.pop() as BracketToken;
    diagnostics.push(
      buildBracketDiagnostic(
        `Unmatched opening bracket "${openingBracket.char}".`,
        openingBracket.line,
        openingBracket.character,
      ),
    );
  }
};

/**
 * Builds a diagnostic for a bracket parsing error at one character position.
 *
 * @param message Diagnostic error message.
 * @param line Zero-based line index.
 * @param character Zero-based character index.
 */
const buildBracketDiagnostic = (
  message: string,
  line: number,
  character: number,
): Diagnostic => {
  return {
    severity: DiagnosticSeverity.Error,
    message,
    source: "shell-language-server",
    range: singleCharacterRange(line, character),
    data: { type: DiagnosticType.MissingBracket },
  };
};

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
