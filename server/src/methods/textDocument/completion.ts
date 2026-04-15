import { RequestMessage } from "../../server";
import { documents, TextDocumentIdentifier } from "../../documents";
import * as fs from "fs";
import log from "../../log";

const MAX_LENGTH = 1000;

const words = fs
  .readFileSync(
    "/home/juan/ort-proyectos/shell-language-server/server/src/exampleWords.txt",
  )
  .toString()
  .split("\n");

type CompletionItem = {
  label: string;
};

interface CompletionList {
  isIncomplete: boolean;
  items: CompletionItem[];
}

interface Position {
  line: number;
  character: number;
}

interface TextDocumentPositionParams {
  textDocument: TextDocumentIdentifier;
  position: Position;
}

export interface CompletionParams extends TextDocumentPositionParams {}

export const completion = (message: RequestMessage): CompletionList | null => {
  const params = message.params as CompletionParams;
  const content = documents.get(params.textDocument.uri);

  if (!content) {
    return null;
  }

  const currentLine = content?.split("\n")[params.position.line];
  const lineUntilCursor = currentLine.slice(0, params.position.character);
  const currentPrefix = lineUntilCursor.replace(/.*\W(.*?)/, "$1");

  const items = words
    .filter((word: string) => {
      return word.startsWith(currentPrefix);
    })
    .slice(0, MAX_LENGTH)
    .map((word: string) => {
      return { label: word };
    });

  log.write({
    completion: {
      currentLine,
      lineUntilCursor,
      currentWord: currentPrefix,
    },
  });

  return {
    isIncomplete: items.length === MAX_LENGTH,
    items,
  };
};
