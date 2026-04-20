import { NotificationMessage } from "../../server";
import { documents, TextDocumentItem } from "../../interfaces/documents";

interface DidOpenTextDocumentParams {
  textDocument: TextDocumentItem;
}

export const didOpen = (message: NotificationMessage): void => {
  const params = message.params as DidOpenTextDocumentParams;
  documents.set(params.textDocument.uri, params.textDocument.text);
};
