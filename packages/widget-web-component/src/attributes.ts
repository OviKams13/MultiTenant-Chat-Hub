import type { ChatbotWidgetProps } from "@mth/widget-react";

export interface ChatbotWidgetElementLike extends HTMLElement {
  domain?: string;
  apiBaseUrl?: string;
}

const parseBooleanAttribute = (value: string | null): boolean | undefined => {
  if (value === null) {
    return undefined;
  }

  if (value === "" || value.toLowerCase() === "true") {
    return true;
  }

  if (value.toLowerCase() === "false") {
    return false;
  }

  return undefined;
};

const parseNumberAttribute = (value: string | null): number | undefined => {
  if (value === null) {
    return undefined;
  }

  const numeric = Number(value);

  return Number.isFinite(numeric) ? numeric : undefined;
};

const readStringAttribute = (value: string | null): string | undefined => {
  if (value === null) {
    return undefined;
  }

  const trimmed = value.trim();

  return trimmed ? trimmed : undefined;
};

export const readWidgetConfigFromElement = (
  element: ChatbotWidgetElementLike,
): ChatbotWidgetProps => {
  const domain =
    readStringAttribute(element.getAttribute("data-domain")) ?? element.domain;
  const apiBaseUrl =
    readStringAttribute(element.getAttribute("data-api-base-url")) ??
    element.apiBaseUrl;

  return {
    domain: domain ?? "",
    apiBaseUrl: apiBaseUrl ?? "",
    title: readStringAttribute(element.getAttribute("data-title")),
    theme:
      readStringAttribute(element.getAttribute("data-theme")) === "dark"
        ? "dark"
        : readStringAttribute(element.getAttribute("data-theme")) === "light"
          ? "light"
          : undefined,
    position: readStringAttribute(element.getAttribute("data-position")) as
      | ChatbotWidgetProps["position"]
      | undefined,
    welcomeMessage: readStringAttribute(
      element.getAttribute("data-welcome-message"),
    ),
    primaryColor: readStringAttribute(
      element.getAttribute("data-primary-color"),
    ),
    zIndex: parseNumberAttribute(element.getAttribute("data-z-index")),
    openByDefault: parseBooleanAttribute(
      element.getAttribute("data-open-by-default"),
    ),
    maxHistoryMessages: parseNumberAttribute(
      element.getAttribute("data-max-history-messages"),
    ),
  };
};

export const OBSERVED_ATTRIBUTES = [
  "data-domain",
  "data-api-base-url",
  "data-title",
  "data-theme",
  "data-position",
  "data-welcome-message",
  "data-primary-color",
  "data-z-index",
  "data-open-by-default",
  "data-max-history-messages",
];
