# @mth/widget-react

React adapter/UI package for the reusable multi-tenant chatbot widget.

This package provides the React components and local widget state orchestration, while delegating runtime networking, retry/timeout policy, and normalized runtime errors to `@mth/widget-core`.

## Installation

```bash
npm install @mth/widget-react react react-dom
```

## Usage

```tsx
import { ChatbotWidget } from "@mth/widget-react";

export function App() {
  return (
    <ChatbotWidget
      domain="shop.example.com"
      apiBaseUrl="https://api.yourplatform.com"
      title="Ask us anything"
      theme="light"
      position="bottom-right"
    />
  );
}
```

## Props

### Required

- `domain: string`
- `apiBaseUrl: string`

### Optional

- `title?: string`
- `theme?: 'light' | 'dark'`
- `position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'`
- `welcomeMessage?: string`
- `primaryColor?: string`
- `zIndex?: number`
- `openByDefault?: boolean`
- `maxHistoryMessages?: number`
- `className?: string`
- `onOpen?: () => void`
- `onClose?: () => void`
- `onMessageSent?: (message: string) => void`
- `onError?: (error: unknown) => void`

## Notes

- This package is UI-focused and does not implement HTTP policy details.
- Runtime transport, timeout/retry behavior, domain normalization, and runtime error normalization are handled by `@mth/widget-core` through `sendMessage(...)`.
