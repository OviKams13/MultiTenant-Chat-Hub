# @mth/widget-core

UI-agnostic runtime package for the multi-tenant chat widget system.

`@mth/widget-core` is the reusable runtime heart shared by future widget adapters (React and Web Component). It owns runtime orchestration and network behavior so UI adapters do **not** reimplement backend communication policy.

## Responsibilities

- Public backend client for `POST /api/v1/public/chat`
- `sendMessage(...)` orchestration
- Domain normalization
- History serialization
- Response envelope parsing
- Standardized widget runtime error mapping
- Timeout, retry, and cancellation handling

## Public API

```ts
import {
  sendMessage,
  ChatApiClient,
  normalizeDomain,
  serializeHistory,
  parsePublicChatResponse,
  WidgetRuntimeError,
  type SendMessageOptions,
  type SendMessageResult,
  type WidgetRuntimeErrorCode,
} from "@mth/widget-core";
```

### `sendMessage(options: SendMessageOptions): Promise<SendMessageResult>`

- `SendMessageOptions`
  - `domain: string`
  - `apiBaseUrl: string`
  - `message: string`
  - `history?: ChatMessage[]`
  - `signal?: AbortSignal`
- `SendMessageResult`
  - `answer: string`
  - `sourceItems: SourceItem[]`

## Domain normalization behavior

`normalizeDomain(input)` applies conservative normalization:

1. trims whitespace,
2. if URL-like, extracts hostname,
3. strips path from scheme-less values,
4. removes trailing slash,
5. lowercases final output.

Examples:

- `https://shop.example.com/` -> `shop.example.com`
- `shop.example.com` -> `shop.example.com`
- `  https://www.example.com/path  ` -> `www.example.com`

## v1 network policy (explicit)

- Timeout: **10 seconds** per attempt
- Retry: **maximum 1 retry**
- Retry conditions only:
  - timeout
  - transient network failure (no HTTP response)
  - HTTP `502`, `503`, `504`
- Retry delay: **500ms**
- No retry on 4xx application errors
- `AbortController` support:
  - respects caller `signal`
  - abort stops retries immediately

For HTTP `503` + structured backend `LLM_UNAVAILABLE`, one retry is still allowed by the status-based v1 policy. If retry still fails, the surfaced widget runtime code is `LLM_UNAVAILABLE`.

## Runtime error mapping

`WidgetRuntimeError` normalizes backend/transport failures into stable UI-facing codes:

- network failure before response -> `NETWORK_ERROR`
- timeout -> `TIMEOUT`
- HTTP `429` or backend `RATE_LIMIT_EXCEEDED` -> `RATE_LIMITED`
- backend `CHATBOT_NOT_FOUND` -> `CHATBOT_NOT_FOUND`
- backend `LLM_UNAVAILABLE` -> `LLM_UNAVAILABLE`
- anything else malformed/unexpected -> `UNKNOWN_ERROR`
