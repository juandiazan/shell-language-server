import { Range } from "./location";
import { TextDocumentIdentifier } from "./documents";

interface DiagnosticData {
  type: DiagnosticType;
}

type DiagnosticType = "missing-semicolon" | "missing-bracket";
export namespace DiagnosticType {
  export const MissingSemicolon: DiagnosticType = "missing-semicolon";
  export const MissingBracket: DiagnosticType = "missing-bracket";
}

type DiagnosticSeverity = 1 | 2 | 3 | 4;
export namespace DiagnosticSeverity {
  export const Error = 1 as const;
  export const Warning = 2 as const;
  export const Information = 3 as const;
  export const Hint = 4 as const;
}

export interface Diagnostic {
  range: Range;
  severity: DiagnosticSeverity;
  source: "shell-language-server";
  message: string;
  data: DiagnosticData;
}

export interface FullDocumentDiagnosticReport {
  kind: "full";
  items: Diagnostic[];
}

export interface DocumentDiagnosticParams {
  textDocument: TextDocumentIdentifier;
}
