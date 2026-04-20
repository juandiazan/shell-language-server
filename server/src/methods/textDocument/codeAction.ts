import { TextDocumentIdentifier } from "../../interfaces/documents";
import { Range } from "../../interfaces/location";
import { Diagnostic, DiagnosticType } from "../../interfaces/diagnostics";
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
  const diagnostics = params.context.diagnostics;

  const missingSemicolonDiagnostics = diagnostics.filter(
    (diagnostic) => diagnostic.data === DiagnosticType.MissingSemicolon,
  );
  const missingSemicolonActions = missingSemicolonDiagnostics.map(
    (diagnostic) => {
      return buildInsertSemicolonCodeAction(diagnostic, documentUri);
    },
  );

  // in the future more code actions could be added here
  const actions = [...missingSemicolonActions];

  if (!actions.length) {
    return null;
  }

  return actions;
};

const buildInsertSemicolonCodeAction = (
  missingSemicolonDiagnostic: Diagnostic,
  documentUri: DocumentUri,
): CodeAction => {
  const insertRange: Range = {
    start: missingSemicolonDiagnostic.range.start,
    end: missingSemicolonDiagnostic.range.start,
  };

  const keyword = missingSemicolonDiagnostic.message.includes("then")
    ? '"then"'
    : missingSemicolonDiagnostic.message.includes("do")
      ? '"do"'
      : "keyword";

  return {
    title: `Quick fix: insert semicolon before ${keyword}.`,
    kind: CodeActionKind.QuickFix,
    edit: {
      changes: {
        [documentUri]: [{ range: insertRange, newText: "; " }],
      },
    },
  };
};
