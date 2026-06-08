---
name: add-lsp-feature
description: >
  Implement a new LSP language feature in the shell-language-server.
  Use when adding any new textDocument/* handler (e.g. references, signatureHelp,
  documentSymbol, formatting, inlayHints). Guides through all four touch points:
  capability advertisement, handler file, methodLookup registration, and return-type union.
---

# Add LSP Feature Skill

Implements a new Language Server Protocol feature end-to-end in this repo.

## The four mandatory touch points

Every new feature requires changes in exactly these four places:

### 1. Advertise the capability — `server/src/methods/initialize.ts`

Add a key to the `capabilities` object returned by `initialize`.
Look up the exact capability key in the LSP spec (e.g. `referencesProvider`, `documentSymbolProvider`).

```ts
capabilities: {
  // existing keys ...
  referencesProvider: true,   // ← add this
},
```

### 2. Create the handler — `server/src/methods/textDocument/<feature>.ts`

Export a single named function. Match this shape:

```ts
import { RequestMessage } from "../../server";
import { documents, TextDocumentPositionParams } from "../../interfaces/documents";

// Define params type (extend TextDocumentPositionParams when cursor position is needed)
type MyFeatureParams = TextDocumentPositionParams;

// Define return type (use LSP spec shape; null when nothing found)
interface MyFeatureResult { /* ... */ }

export const myFeature = (message: RequestMessage): MyFeatureResult | null => {
  const params = message.params as MyFeatureParams;
  const content = documents.get(params.textDocument.uri);
  if (!content) return null;

  // implement logic here

  return result;
};
```

**Patterns to follow** (read these as reference implementations):
- Cursor-position lookup → `server/src/methods/textDocument/hover.ts` (`wordAtPosition` helper)
- Cross-file workspace search → `server/src/methods/textDocument/definition.ts`
- Diagnostics-based response → `server/src/methods/textDocument/codeAction.ts`
- Multi-file rename → `server/src/methods/textDocument/rename.ts`

**Shared interfaces to reuse** (don't redefine):
- `documents` (Map<uri, text>) — `server/src/interfaces/documents.ts`
- `Location`, `Position`, `Range` — `server/src/interfaces/location.ts`
- `workspaceRoot`, `collectShellFiles` — `server/src/interfaces/workspace.ts`

### 3. Register in methodLookup — `server/src/server.ts`

Two edits in this file:

**a) Import the handler** at the top:
```ts
import { myFeature } from "./methods/textDocument/myFeature";
```

**b) Add it to `methodLookup`**:
```ts
const methodLookup: Record<string, RequestMethod | NotificationMethod> = {
  // existing entries ...
  "textDocument/myFeature": myFeature,
};
```

### 4. Extend the RequestMethod union — `server/src/server.ts`

Add the new handler's return type to the union so TypeScript stays happy:

```ts
type RequestMethod = (message: RequestMessage) =>
  | ReturnType<typeof initialize>
  // existing entries ...
  | ReturnType<typeof myFeature>;  // ← add this
```

## Request vs notification

| Type | Has `id`? | Returns | Use when |
|------|-----------|---------|----------|
| Request | yes | result object or `null` | client expects a response (go-to-def, hover, …) |
| Notification | no | `void` | fire-and-forget (didOpen, didChange, didClose) |

Notification handlers go in `methodLookup` but are **not** added to `RequestMethod`.

## Checklist

- [ ] Capability key added to `initialize.ts`
- [ ] Handler file created at `server/src/methods/textDocument/<feature>.ts`
- [ ] Handler imported and registered in `methodLookup` in `server.ts`
- [ ] Return type added to `RequestMethod` union in `server.ts`
- [ ] `npm run compile` passes with no errors
- [ ] Update `AGENTS.md` handler list if it's a new method name
