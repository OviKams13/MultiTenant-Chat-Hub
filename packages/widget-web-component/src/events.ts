const DEFAULT_EVENT_OPTIONS = {
  bubbles: true,
  composed: true,
} as const;

export const dispatchChatbotOpened = (
  element: HTMLElement,
  detail: { domain: string },
): void => {
  element.dispatchEvent(
    new CustomEvent("chatbot-opened", {
      ...DEFAULT_EVENT_OPTIONS,
      detail,
    }),
  );
};

export const dispatchChatbotClosed = (
  element: HTMLElement,
  detail: { domain: string },
): void => {
  element.dispatchEvent(
    new CustomEvent("chatbot-closed", {
      ...DEFAULT_EVENT_OPTIONS,
      detail,
    }),
  );
};

export const dispatchChatbotMessageSent = (
  element: HTMLElement,
  detail: { domain: string; message: string },
): void => {
  element.dispatchEvent(
    new CustomEvent("chatbot-message-sent", {
      ...DEFAULT_EVENT_OPTIONS,
      detail,
    }),
  );
};

export const dispatchChatbotError = (
  element: HTMLElement,
  detail: { domain: string; error: unknown },
): void => {
  element.dispatchEvent(
    new CustomEvent("chatbot-error", {
      ...DEFAULT_EVENT_OPTIONS,
      detail,
    }),
  );
};
