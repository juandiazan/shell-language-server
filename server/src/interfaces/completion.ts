export type CompletionItem = {
  label: string;
  kind?: CompletionItemKind;
  detail?: string;
  insertTextFormat?: InsertTextFormat;
  insertText?: string;
};

export interface CompletionList {
  isIncomplete: boolean;
  items: CompletionItem[];
}

export type InsertTextFormat = 1 | 2;
export namespace InsertTextFormat {
  export const PlainText = 1;
  export const Snippet = 2;
}

export type CompletionItemKind =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15
  | 16
  | 17
  | 18
  | 19
  | 20
  | 21
  | 22
  | 23
  | 24
  | 25;
export namespace CompletionItemKind {
  export const Text = 1;
  export const Method = 2;
  export const Function = 3;
  export const Constructor = 4;
  export const Field = 5;
  export const Variable = 6;
  export const Class = 7;
  export const Interface = 8;
  export const Module = 9;
  export const Property = 10;
  export const Unit = 11;
  export const Value = 12;
  export const Enum = 13;
  export const Keyword = 14;
  export const Snippet = 15;
  export const Color = 16;
  export const File = 17;
  export const Reference = 18;
  export const Folder = 19;
  export const EnumMember = 20;
  export const Constant = 21;
  export const Struct = 22;
  export const Event = 23;
  export const Operator = 24;
  export const TypeParameter = 25;
}

type Word = string;
type Completion = string;
type CompletionDescription = string;

export const CompletionKeywords: Record<Word, Completion> = {
  if: "if [[ ${1:condition} ]]; then\n \t$0\nfi",
  ifelse: "if [[ ${1:condition} ]]; then\n \t$0\nelse\n \t\nfi",
  while: "while [ ${1:condition} ]; do\n \t$0\ndone",
  for: "for $${1:elem} in $${2:list}; do\n \t$0\ndone",
  case:
    "case $${1:var} in\n" +
    "\t${2:value})\n" +
    "\t\t$0\n" +
    "\t\t;;\n" +
    "\t*)\n" +
    "\t\t;;\n" +
    "esac",
  function: "function ${1:name}()\n{\n$0}",
  select: "select ${1:var} in ${2:list};\ndo\n\t\ndone",
};

export const CompletionDetail: Record<Word, CompletionDescription> = {
  if: "if statement snippet",
  ifelse: "if-then-else statement snippet",
  while: "while loop snippet",
  for: "for loop snippet",
  case: "case statement snippet",
  function: "empty function body",
  select: "select snippet for menu creation",
};
