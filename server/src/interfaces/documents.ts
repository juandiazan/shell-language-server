import { Position, Range } from "./location";

export type DocumentUri = string;
type DocumentBody = string;

export interface TextDocumentIdentifier {
  uri: DocumentUri;
}

export interface VersionedTextDocumentIdentifier extends TextDocumentIdentifier {
  version: number;
}

export interface TextDocumentItem extends TextDocumentIdentifier {
  languageId: string;
  version: number;
  text: string;
}

export interface TextDocumentContentChangeEvent {
  text: string;
}
export interface TextDocumentPositionParams {
  textDocument: TextDocumentIdentifier;
  position: Position;
}

interface TextEdit {
  range: Range;
  newText: string;
}

export interface WorkspaceEdit {
  changes: { [uri: DocumentUri]: TextEdit[] };
}

export const documents = new Map<DocumentUri, DocumentBody>();
