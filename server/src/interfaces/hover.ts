import { Range } from "./location";

type MarkupKind = "plaintext" | "markdown";
namespace MarkupKind {
  export const PlainText = "plaintext" as const;
  export const Markdown = "markdown" as const;
}

interface MarkupContent {
  kind?: MarkupKind;
  value: string;
}

export interface Hover {
  contents: MarkupContent;
  range?: Range;
}

export { MarkupKind, MarkupContent };
