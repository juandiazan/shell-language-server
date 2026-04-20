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
  export const Error: 1 = 1;
  export const Warning: 2 = 2;
  export const Information: 3 = 3;
  export const Hint: 4 = 4;
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
