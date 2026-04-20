import { RequestMessage } from "../../../server";
import { documents } from "../../../interfaces/documents";
import {
  DocumentDiagnosticParams,
  FullDocumentDiagnosticReport,
} from "../../../interfaces/diagnostics";
import { bracketDiagnostics } from "./bracketDiagnostics";
import { structureSemicolonDiagnostics } from "./structureSemicolonDiagnostics";

/**
 * Handles `textDocument/diagnostic` requests and returns full-document
 * diagnostics for bracket matching errors and control structure semicolon
 * checks.
 *
 * @param message JSON-RPC request containing document diagnostic params.
 * @returns Full diagnostic report for the requested document.
 */
export const diagnostic = (
  message: RequestMessage,
): FullDocumentDiagnosticReport | null => {
  const params = message.params as DocumentDiagnosticParams;
  const content = documents.get(params.textDocument.uri);

  if (!content) {
    return null;
  }

  return {
    kind: "full",
    items: [
      ...bracketDiagnostics(content),
      ...structureSemicolonDiagnostics(content),
    ],
  };
};
