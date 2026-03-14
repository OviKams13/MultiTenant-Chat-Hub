# @mth/shared-types

`@mth/shared-types` is the source of truth for public runtime contracts shared between the backend public chat API and widget packages.

## Why this package exists

This package prevents contract drift between independently shipped backend and widget deliverables.

## Main exports

- `ChatMessage`
- `SourceItem`
- `PublicChatRequest`
- `PublicChatResponse` (runtime `data` payload for successful public chat responses)
- `WidgetConfig`
- `WidgetRuntimeErrorCode`
