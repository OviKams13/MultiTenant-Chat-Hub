import { describe, expect, it } from "vitest";

import { readWidgetConfigFromElement } from "../src/attributes";

describe("readWidgetConfigFromElement", () => {
  it("parses required and optional attributes", () => {
    const element = document.createElement("div");
    element.setAttribute("data-domain", "shop.example.com");
    element.setAttribute("data-api-base-url", "https://api.example.com");
    element.setAttribute("data-title", "Ask us anything");
    element.setAttribute("data-theme", "dark");
    element.setAttribute("data-position", "bottom-right");

    const config = readWidgetConfigFromElement(element);

    expect(config.domain).toBe("shop.example.com");
    expect(config.apiBaseUrl).toBe("https://api.example.com");
    expect(config.title).toBe("Ask us anything");
    expect(config.theme).toBe("dark");
    expect(config.position).toBe("bottom-right");
  });

  it("parses booleans and numbers safely", () => {
    const element = document.createElement("div");
    element.setAttribute("data-domain", "shop.example.com");
    element.setAttribute("data-api-base-url", "https://api.example.com");
    element.setAttribute("data-open-by-default", "true");
    element.setAttribute("data-z-index", "9999");
    element.setAttribute("data-max-history-messages", "20");

    const config = readWidgetConfigFromElement(element);

    expect(config.openByDefault).toBe(true);
    expect(config.zIndex).toBe(9999);
    expect(config.maxHistoryMessages).toBe(20);
  });

  it("falls back to property values when attributes are missing", () => {
    const element = document.createElement("div") as HTMLDivElement & {
      domain?: string;
      apiBaseUrl?: string;
    };

    element.domain = "property.example.com";
    element.apiBaseUrl = "https://property-api.example.com";

    const config = readWidgetConfigFromElement(element);

    expect(config.domain).toBe("property.example.com");
    expect(config.apiBaseUrl).toBe("https://property-api.example.com");
  });
});
