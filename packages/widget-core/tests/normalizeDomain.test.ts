import { describe, expect, it } from "vitest";

import { normalizeDomain } from "../src/runtime/normalizeDomain";

describe("normalizeDomain", () => {
  it("keeps a raw domain stable", () => {
    expect(normalizeDomain("shop.example.com")).toBe("shop.example.com");
  });

  it("removes protocol and trailing slash", () => {
    expect(normalizeDomain("https://shop.example.com/")).toBe(
      "shop.example.com",
    );
  });

  it("trims whitespace and extracts hostname from full URL", () => {
    expect(normalizeDomain("  https://www.example.com/path?q=1  ")).toBe(
      "www.example.com",
    );
  });

  it("removes path from scheme-less value", () => {
    expect(normalizeDomain("example.com/some/path")).toBe("example.com");
  });
});
