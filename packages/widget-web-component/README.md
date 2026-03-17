# @mth/widget-web-component

Universal browser integration wrapper for the chatbot widget.

This package registers `<chatbot-widget>`, mounts the React widget internally inside a Shadow DOM boundary, injects widget styles into that shadow root, and exposes host integration events via explicit `CustomEvent` dispatch.

## What this package is

- DOM integration shell for websites (including non-React hosts)
- Shadow DOM wrapper around `@mth/widget-react`
- owner of Shadow DOM style delivery for self-contained widget rendering

## What this package is not

- not the runtime/network logic core
- not backend business logic

## Shadow DOM styling strategy

- The widget is self-styled inside its shadow root.
- Host global CSS is not required for core widget rendering.
- On element connection, this package injects the widget style layer automatically.
- Default compatibility path: `<style>` tag injection into the shadow root.
- Optional internal optimization: constructable stylesheet via `adoptedStyleSheets` when supported.
- Fallback remains deterministic and safe if constructable stylesheets are unavailable.

Version note: this package targets widget integrations aligned with backend runtime API `v1`.

## Usage

```html
<script src=".../chatbot-widget.umd.js" defer></script>

<chatbot-widget
  data-domain="shop.example.com"
  data-api-base-url="https://api.yourplatform.com"
  data-title="Ask us anything"
  data-theme="light"
  data-position="bottom-right"
></chatbot-widget>
```

## Input contract

Required attributes:

- `data-domain`
- `data-api-base-url`

Optional attributes:

- `data-title`
- `data-theme`
- `data-position`
- `data-welcome-message`
- `data-primary-color`
- `data-z-index`
- `data-open-by-default`
- `data-max-history-messages`

Also supported as element properties:

- `element.domain`
- `element.apiBaseUrl`

## Output contract

The element emits explicit DOM events:

- `chatbot-opened`
- `chatbot-closed`
- `chatbot-message-sent`
- `chatbot-error`

Each event is emitted with:

- `bubbles: true`
- `composed: true`

`composed: true` is required so events cross the Shadow DOM boundary and can be handled by host-page listeners.
