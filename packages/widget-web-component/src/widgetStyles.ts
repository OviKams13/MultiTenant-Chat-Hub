/**
 * Widget web-component styling baseline targeting public runtime API v1 integrations.
 */
export const SUPPORTED_API_VERSION = "v1";

export const CHATBOT_WIDGET_STYLE_MARKER = "data-chatbot-widget-style";

export const CHATBOT_WIDGET_CSS = `
:host {
  all: initial;
  font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #111827;
}

:host *,
:host *::before,
:host *::after {
  box-sizing: border-box;
  font-family: inherit;
}

[data-chatbot-widget-root] {
  position: relative;
  line-height: 1.4;
}

button,
input {
  font: inherit;
}

button {
  border: 0;
  background: transparent;
}

button:disabled,
input:disabled {
  cursor: not-allowed;
}
`;
