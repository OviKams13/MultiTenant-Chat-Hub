import type { ChatbotWidgetProps } from "@mth/widget-react";

import { OBSERVED_ATTRIBUTES, readWidgetConfigFromElement } from "./attributes";
import {
  dispatchChatbotClosed,
  dispatchChatbotError,
  dispatchChatbotMessageSent,
  dispatchChatbotOpened,
} from "./events";
import {
  createReactWidgetMount,
  type MountedReactWidget,
} from "./mountReactWidget";
import { injectWidgetStyles } from "./injectStyles";

const MOUNT_CONTAINER_ATTRIBUTE = "data-chatbot-widget-root";

export class ChatbotWidgetElement extends HTMLElement {
  private mountContainer: HTMLElement | null = null;

  private mountedWidget: MountedReactWidget | null = null;

  public static get observedAttributes(): string[] {
    return OBSERVED_ATTRIBUTES;
  }

  public get domain(): string | undefined {
    return this.getAttribute("data-domain") ?? undefined;
  }

  public set domain(value: string | undefined) {
    if (typeof value === "string") {
      this.setAttribute("data-domain", value);
      return;
    }

    this.removeAttribute("data-domain");
  }

  public get apiBaseUrl(): string | undefined {
    return this.getAttribute("data-api-base-url") ?? undefined;
  }

  public set apiBaseUrl(value: string | undefined) {
    if (typeof value === "string") {
      this.setAttribute("data-api-base-url", value);
      return;
    }

    this.removeAttribute("data-api-base-url");
  }

  public connectedCallback(): void {
    const shadowRoot = this.shadowRoot ?? this.attachShadow({ mode: "open" });

    injectWidgetStyles(shadowRoot);

    if (!this.mountContainer) {
      this.mountContainer = document.createElement("div");
      this.mountContainer.setAttribute(MOUNT_CONTAINER_ATTRIBUTE, "true");
      shadowRoot.appendChild(this.mountContainer);
    }

    if (!this.mountedWidget) {
      this.mountedWidget = createReactWidgetMount(this.mountContainer);
    }

    this.renderReactWidget();
  }

  public disconnectedCallback(): void {
    this.mountedWidget?.unmount();
    this.mountedWidget = null;
  }

  public attributeChangedCallback(
    _name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (oldValue === newValue || !this.isConnected || !this.mountedWidget) {
      return;
    }

    this.renderReactWidget();
  }

  private renderReactWidget(): void {
    if (!this.mountedWidget) {
      return;
    }

    const config = readWidgetConfigFromElement(this);

    this.mountedWidget.render(config, {
      onOpen: () => {
        dispatchChatbotOpened(this, { domain: config.domain });
      },
      onClose: () => {
        dispatchChatbotClosed(this, { domain: config.domain });
      },
      onMessageSent: (message) => {
        dispatchChatbotMessageSent(this, {
          domain: config.domain,
          message,
        });
      },
      onError: (error) => {
        dispatchChatbotError(this, {
          domain: config.domain,
          error,
        });
      },
    });
  }
}

export type ChatbotWidgetElementProps = ChatbotWidgetProps;
