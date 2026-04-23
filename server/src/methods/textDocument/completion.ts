import { RequestMessage } from "../../server";
import { documents, TextDocumentIdentifier } from "../../interfaces/documents";
import {
  CompletionItem,
  CompletionItemKind,
  CompletionList,
  InsertTextFormat,
  CompletionKeywords,
  CompletionDetail,
} from "../../interfaces/completion";
import { Position } from "../../interfaces/location";
import * as fs from "fs";

const MAX_LENGTH = 1000;

const words = fs
  .readFileSync(
    "/home/juan/ort-proyectos/shell-language-server/server/src/exampleWords.txt",
  )
  .toString()
  .split("\n");

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
  if (currentLine === undefined) {
    return null;
  }

  const lineUntilCursor = currentLine.slice(0, params.position.character);
  const currentPrefix = lineUntilCursor.replace(/.*\W(.*?)/, "$1");

  const items = words
    .filter((word: string) => {
      return word.startsWith(currentPrefix);
    })
    .slice(0, MAX_LENGTH)
    .map((word: string) => {
      return buildCompletion(word);
    });

  return {
    isIncomplete: items.length === MAX_LENGTH,
    items,
  };
};

const buildCompletion = (word: string): CompletionItem => {
  if (!CompletionKeywords[word]) {
    return { label: word };
  }

  return {
    label: word,
    kind: CompletionItemKind.Snippet,
    detail: CompletionDetail[word],
    insertTextFormat: InsertTextFormat.Snippet,
    insertText: CompletionKeywords[word],
  };
};
