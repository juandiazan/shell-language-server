import { RequestMessage } from "../../server";
import { documents, TextDocumentIdentifier } from "../../interfaces/documents";
import {
  CompletionItem,
  CompletionItemKind,
  CompletionList,
  InsertTextFormat,
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

export interface CompletionParams extends TextDocumentPositionParams { }

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
  switch (word) {
    case "if":
      return {
        label: word,
        kind: CompletionItemKind.Snippet,
        detail: "if statement snippet",
        insertTextFormat: InsertTextFormat.Snippet,
        insertText:
          "if [[ ${1:condition} ]]; then\n"
          + "\t$0\n"
          + "fi",
      };
    case "while":
      return {
        label: word,
        kind: CompletionItemKind.Snippet,
        detail: "while loop snippet",
        insertTextFormat: InsertTextFormat.Snippet,
        insertText:
          "while [ ${1:condition} ]; do\n"
          + "\t$0\n"
          + "done",
      };
    case "for":
      return {
        label: word,
        kind: CompletionItemKind.Snippet,
        detail: "for loop snippet",
        insertTextFormat: InsertTextFormat.Snippet,
        insertText:
          "for $${1:elem} in $${2:list}; do\n"
          + "\t$0\n"
          + "done",
      };
    case "case":
      return {
        label: word,
        kind: CompletionItemKind.Snippet,
        detail: "case statement snippet",
        insertTextFormat: InsertTextFormat.Snippet,
        insertText:
          "case $${1:var} in\n"
          + "\t${2:value})\n"
          + "\t\t$0\n"
          + "\t\t;;\n"
          + "\t*)\n"
          + "\t\t;;\n"
          + "esac",
      };
    case "ifelse":
      return {
        label: word,
        kind: CompletionItemKind.Snippet,
        detail: "if-then-else statement snippet",
        insertTextFormat: InsertTextFormat.Snippet,
        insertText:
          "if [[ ${1:condition} ]]; then\n"
          + "\t$0\n"
          + "else\n"
          + "\t\n"
          + "fi",
      };
    default:
      return { label: word };
  }
}
