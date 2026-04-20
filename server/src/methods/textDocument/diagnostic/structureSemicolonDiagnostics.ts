import { Range } from "../../../interfaces/location";
import {
  Diagnostic,
  DiagnosticSeverity,
  DiagnosticType,
} from "../../../interfaces/diagnostics";

interface PendingStructureSemicolonCheck {
  expectedKeyword: "then" | "do" | null;
  lastSignificantTokenSemicolon: boolean;
}

interface QuoteState {
  inSingleQuotes: boolean;
  inDoubleQuotes: boolean;
}

interface CurrentWordState {
  value: string;
  startCharacter: number;
}

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
  const quoteState: QuoteState = {
    inSingleQuotes: false,
    inDoubleQuotes: false,
  };

  const pendingCheck: PendingStructureSemicolonCheck = {
    expectedKeyword: null,
    lastSignificantTokenSemicolon: false,
  };

  for (let lineNumber = 0; lineNumber < lines.length; lineNumber += 1) {
    processLineForStructureSemicolonDiagnostics(
      lines[lineNumber],
      lineNumber,
      quoteState,
      pendingCheck,
      diagnostics,
    );
  }

  return diagnostics;
};

/**
 * Parses a line and updates pending structure semicolon checks.
 *
 * @param line Current line text.
 * @param lineNumber Zero-based line index.
 * @param quoteState Mutable quote parsing state shared across lines.
 * @param pendingCheck Mutable semicolon check state.
 * @param diagnostics Collected diagnostics.
 */
const processLineForStructureSemicolonDiagnostics = (
  line: string,
  lineNumber: number,
  quoteState: QuoteState,
  pendingCheck: PendingStructureSemicolonCheck,
  diagnostics: Diagnostic[],
): void => {
  const currentWord: CurrentWordState = {
    value: "",
    startCharacter: -1,
  };

  for (let character = 0; character < line.length; character += 1) {
    const currentChar = line[character];

    // check if current line is a comment
    if (isCommentStart(currentChar, quoteState)) {
      flushCurrentWord(currentWord, lineNumber, pendingCheck, diagnostics);
      break;
    }

    // check if current word starts with an escaped character, if it does, skip it
    if (isEscapedCharacter(currentChar, quoteState)) {
      flushCurrentWord(currentWord, lineNumber, pendingCheck, diagnostics);
      character += 1;
      continue;
    }

    // check if current word is starting or ending a single-quoted string
    if (isSingleQuoteToggle(currentChar, quoteState)) {
      flushCurrentWord(currentWord, lineNumber, pendingCheck, diagnostics);
      quoteState.inSingleQuotes = !quoteState.inSingleQuotes;
      continue;
    }

    // check if current word is starting or ending a double-quoted string
    if (isDoubleQuoteToggle(currentChar, quoteState)) {
      flushCurrentWord(currentWord, lineNumber, pendingCheck, diagnostics);
      quoteState.inDoubleQuotes = !quoteState.inDoubleQuotes;
      continue;
    }

    // if inside quoted string, skip character
    if (isInsideQuotedString(quoteState)) {
      continue;
    }

    if (isWordCharacter(currentChar)) {
      appendWordCharacter(currentWord, currentChar, character);
      continue;
    }

    flushCurrentWord(currentWord, lineNumber, pendingCheck, diagnostics);
    markSemicolonWhenPending(currentChar, pendingCheck);
  }

  flushCurrentWord(currentWord, lineNumber, pendingCheck, diagnostics);
};

/**
 * Returns whether a character starts a comment in the current quote state.
 *
 * @param char Character to inspect.
 * @param quoteState Current quote parsing state.
 */
const isCommentStart = (char: string, quoteState: QuoteState): boolean => {
  return !isInsideQuotedString(quoteState) && char === "#";
};

/**
 * Flushes the current word into structure semicolon checks and resets the word buffer.
 *
 * @param currentWord Mutable word buffer.
 * @param lineNumber Zero-based line index.
 * @param pendingCheck Mutable semicolon check state.
 * @param diagnostics Collected diagnostics.
 */
const flushCurrentWord = (
  currentWord: CurrentWordState,
  lineNumber: number,
  pendingCheck: PendingStructureSemicolonCheck,
  diagnostics: Diagnostic[],
): void => {
  processWordForStructureSemicolonDiagnostics(
    currentWord.value,
    lineNumber,
    currentWord.startCharacter,
    pendingCheck,
    diagnostics,
  );
  resetCurrentWord(currentWord);
};

/**
 * Processes one parsed word for structure semicolon validation.
 *
 * @param word Parsed shell word.
 * @param lineNumber Zero-based line index.
 * @param wordStartCharacter Zero-based word start character index.
 * @param pendingCheck Mutable semicolon check state.
 * @param diagnostics Collected diagnostics.
 */
const processWordForStructureSemicolonDiagnostics = (
  word: string,
  lineNumber: number,
  wordStartCharacter: number,
  pendingCheck: PendingStructureSemicolonCheck,
  diagnostics: Diagnostic[],
): void => {
  if (!word.length) {
    return;
  }

  if (!pendingCheck.expectedKeyword) {
    updatePendingCheckForStarterKeyword(word, pendingCheck);
    return;
  }

  if (word === pendingCheck.expectedKeyword) {
    if (!pendingCheck.lastSignificantTokenSemicolon) {
      diagnostics.push(
        buildMissingSemicolonDiagnostic(word, lineNumber, wordStartCharacter),
      );
    }

    pendingCheck.expectedKeyword = null;
    pendingCheck.lastSignificantTokenSemicolon = false;
    return;
  }

  pendingCheck.lastSignificantTokenSemicolon = false;
};

/**
 * Updates the expected continuation keyword when a structure opener is found.
 *
 * @param word Parsed shell word.
 * @param pendingCheck Mutable semicolon check state.
 */
const updatePendingCheckForStarterKeyword = (
  word: string,
  pendingCheck: PendingStructureSemicolonCheck,
): void => {
  if (word === "if") {
    pendingCheck.expectedKeyword = "then";
    pendingCheck.lastSignificantTokenSemicolon = false;
    return;
  }

  if (word === "while" || word === "for") {
    pendingCheck.expectedKeyword = "do";
    pendingCheck.lastSignificantTokenSemicolon = false;
  }
};

/**
 * Builds a missing semicolon diagnostic for structure continuation keywords.
 *
 * @param word Continuation keyword (`then` or `do`).
 * @param lineNumber Zero-based line index.
 * @param wordStartCharacter Zero-based word start character index.
 */
const buildMissingSemicolonDiagnostic = (
  word: string,
  lineNumber: number,
  wordStartCharacter: number,
): Diagnostic => {
  return {
    severity: DiagnosticSeverity.Error,
    message: `Missing semicolon before "${word}" in structure condition.`,
    source: "shell-language-server",
    range: wordRange(lineNumber, wordStartCharacter, word.length),
    data: DiagnosticType.MissingSemicolon,
  };
};

/**
 * Resets the current word buffer.
 *
 * @param currentWord Mutable word buffer.
 */
const resetCurrentWord = (currentWord: CurrentWordState): void => {
  currentWord.value = "";
  currentWord.startCharacter = -1;
};

/**
 * Returns whether the character begins an escaped sequence.
 *
 * @param char Character to inspect.
 * @param quoteState Current quote parsing state.
 */
const isEscapedCharacter = (char: string, quoteState: QuoteState): boolean => {
  return char === "\\" && !quoteState.inSingleQuotes;
};

/**
 * Returns whether the character toggles single-quote string mode.
 *
 * @param char Character to inspect.
 * @param quoteState Current quote parsing state.
 */
const isSingleQuoteToggle = (char: string, quoteState: QuoteState): boolean => {
  return char === "'" && !quoteState.inDoubleQuotes;
};

/**
 * Returns whether the character toggles double-quote string mode.
 *
 * @param char Character to inspect.
 * @param quoteState Current quote parsing state.
 */
const isDoubleQuoteToggle = (char: string, quoteState: QuoteState): boolean => {
  return char === '"' && !quoteState.inSingleQuotes;
};

/**
 * Returns whether parsing is currently inside a quoted string.
 *
 * @param quoteState Current quote parsing state.
 */
const isInsideQuotedString = (quoteState: QuoteState): boolean => {
  return quoteState.inSingleQuotes || quoteState.inDoubleQuotes;
};

/**
 * Returns whether a character is part of a shell word token.
 *
 * @param char Character to inspect.
 */
const isWordCharacter = (char: string): boolean => /[A-Za-z0-9_]/.test(char);

/**
 * Appends a word character to the current word buffer.
 *
 * @param currentWord Mutable word buffer.
 * @param char Current character.
 * @param characterIndex Zero-based character index.
 */
const appendWordCharacter = (
  currentWord: CurrentWordState,
  char: string,
  characterIndex: number,
): void => {
  if (!currentWord.value.length) {
    currentWord.startCharacter = characterIndex;
  }

  currentWord.value += char;
};

/**
 * Marks the pending check as semicolon-terminated when applicable.
 *
 * @param char Current non-word character.
 * @param pendingCheck Mutable semicolon check state.
 */
const markSemicolonWhenPending = (
  char: string,
  pendingCheck: PendingStructureSemicolonCheck,
): void => {
  if (pendingCheck.expectedKeyword && char === ";") {
    pendingCheck.lastSignificantTokenSemicolon = true;
  }
};
