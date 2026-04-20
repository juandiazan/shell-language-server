import { TextDocumentIdentifier } from "../../interfaces/documents";
import { Range } from "../../interfaces/location";
import { Diagnostic } from "../../interfaces/diagnostics";
import { DocumentUri } from "../../interfaces/documents";
import { RequestMessage } from "../../server";

interface TextEdit {
  range: Range;
  newText: string;
}

interface WorkspaceEdit {
  changes: { [uri: DocumentUri]: TextEdit[] };
}

type CodeActionKind = "quickfix";
namespace CodeActionKind {
  export const QuickFix: CodeActionKind = "quickfix";
}

interface CodeActionContext {
  diagnostics: Diagnostic[];
}

interface CodeActionParams {
  textDocument: TextDocumentIdentifier;
  range: Range;
  context: CodeActionContext;
}

interface CodeAction {
  title: string;
  kind?: CodeActionKind;
  edit?: WorkspaceEdit;
  data?: unknown;
}

export const codeAction = (message: RequestMessage): CodeAction[] | null => {
  const params = message.params as CodeActionParams;
  const documentUri = params.textDocument.uri;
};
