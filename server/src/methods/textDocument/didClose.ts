import { NotificationMessage } from "../../server";
import { documents, TextDocumentIdentifier } from "../../documents";

interface DidCloseTextDocumentParams {
  textDocument: TextDocumentIdentifier;
}

export const didClose = (message: NotificationMessage): void => {
  const params = message.params as DidCloseTextDocumentParams;
  documents.delete(params.textDocument.uri);
};
