import { beforeEach, describe, expect, it, vi } from "vitest";

import type { WebComponentWidgetEventHandlers } from "../src/mountReactWidget";
import { CHATBOT_WIDGET_STYLE_MARKER } from "../src/widgetStyles";

const renderSpy = vi.fn();
const unmountSpy = vi.fn();

let latestHandlers: WebComponentWidgetEventHandlers | null = null;

vi.mock("../src/mountReactWidget", () => ({
  createReactWidgetMount: () => ({
    render: (_props: unknown, handlers: WebComponentWidgetEventHandlers) => {
      renderSpy(_props);
      latestHandlers = handlers;
    },
    unmount: () => {
      unmountSpy();
    },
  }),
}));

import {
  CHATBOT_WIDGET_TAG_NAME,
  registerChatbotWidgetElement,
} from "../src/index";

describe("ChatbotWidgetElement", () => {
  beforeEach(() => {
    renderSpy.mockClear();
    unmountSpy.mockClear();
    latestHandlers = null;
    registerChatbotWidgetElement();
  });

  it("registers custom element safely", () => {
    registerChatbotWidgetElement();
    expect(customElements.get(CHATBOT_WIDGET_TAG_NAME)).toBeDefined();
  });

  it("creates shadow root, style layer, and mount container on connect", () => {
    const element = document.createElement(CHATBOT_WIDGET_TAG_NAME);
    element.setAttribute("data-domain", "shop.example.com");
    element.setAttribute("data-api-base-url", "https://api.example.com");

    document.body.appendChild(element);

    expect(element.shadowRoot).toBeTruthy();
    expect(
      element.shadowRoot?.querySelector("[data-chatbot-widget-root]"),
    ).toBeTruthy();
    expect(
      element.shadowRoot?.querySelector(
        `style[${CHATBOT_WIDGET_STYLE_MARKER}="true"]`,
      ),
    ).toBeTruthy();
    expect(renderSpy).toHaveBeenCalledTimes(1);
  });

  it("injects styles only once across reconnects", () => {
    const element = document.createElement(CHATBOT_WIDGET_TAG_NAME);
    element.setAttribute("data-domain", "shop.example.com");
    element.setAttribute("data-api-base-url", "https://api.example.com");

    document.body.appendChild(element);
    element.remove();
    document.body.appendChild(element);

    const styleNodes = element.shadowRoot?.querySelectorAll(
      `style[${CHATBOT_WIDGET_STYLE_MARKER}="true"]`,
    );

    expect(styleNodes?.length).toBe(1);
  });

  it("rerenders when observed attribute changes without duplicating styles", () => {
    const element = document.createElement(CHATBOT_WIDGET_TAG_NAME);
    element.setAttribute("data-domain", "shop.example.com");
    element.setAttribute("data-api-base-url", "https://api.example.com");
    document.body.appendChild(element);

    element.setAttribute("data-title", "New title");

    expect(renderSpy).toHaveBeenCalledTimes(2);

    const styleNodes = element.shadowRoot?.querySelectorAll(
      `style[${CHATBOT_WIDGET_STYLE_MARKER}="true"]`,
    );

    expect(styleNodes?.length).toBe(1);
  });

  it("dispatches composed+bubbling custom events for open/close/message", () => {
    const element = document.createElement(CHATBOT_WIDGET_TAG_NAME);
    element.setAttribute("data-domain", "shop.example.com");
    element.setAttribute("data-api-base-url", "https://api.example.com");
    document.body.appendChild(element);

    const openedListener = vi.fn((event: Event) => {
      const customEvent = event as CustomEvent;
      expect(customEvent.bubbles).toBe(true);
      expect(customEvent.composed).toBe(true);
      expect(customEvent.detail).toEqual({ domain: "shop.example.com" });
    });

    const closedListener = vi.fn((event: Event) => {
      const customEvent = event as CustomEvent;
      expect(customEvent.bubbles).toBe(true);
      expect(customEvent.composed).toBe(true);
      expect(customEvent.detail).toEqual({ domain: "shop.example.com" });
    });

    const sentListener = vi.fn((event: Event) => {
      const customEvent = event as CustomEvent;
      expect(customEvent.bubbles).toBe(true);
      expect(customEvent.composed).toBe(true);
      expect(customEvent.detail).toEqual({
        domain: "shop.example.com",
        message: "hello",
      });
    });

    element.addEventListener("chatbot-opened", openedListener);
    element.addEventListener("chatbot-closed", closedListener);
    element.addEventListener("chatbot-message-sent", sentListener);

    latestHandlers?.onOpen();
    latestHandlers?.onClose();
    latestHandlers?.onMessageSent("hello");

    expect(openedListener).toHaveBeenCalledTimes(1);
    expect(closedListener).toHaveBeenCalledTimes(1);
    expect(sentListener).toHaveBeenCalledTimes(1);
  });

  it("unmounts react on disconnect", () => {
    const element = document.createElement(CHATBOT_WIDGET_TAG_NAME);
    element.setAttribute("data-domain", "shop.example.com");
    element.setAttribute("data-api-base-url", "https://api.example.com");

    document.body.appendChild(element);
    element.remove();

    expect(unmountSpy).toHaveBeenCalledTimes(1);
  });
});
