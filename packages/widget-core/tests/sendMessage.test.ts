import { describe, expect, it, vi } from "vitest";

import { sendMessage } from "../src/runtime/sendMessage";
import { WidgetRuntimeError } from "../src/runtime/errors";

describe("sendMessage", () => {
  it("returns answer and sourceItems on happy path", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: {
            answer: "Hello",
            sourceItems: [
              { entity_id: 1, entity_type: "CONTACT", tags: ["a"] },
            ],
          },
          error: null,
        }),
      }),
    );

    const result = await sendMessage({
      domain: "https://shop.example.com/",
      apiBaseUrl: "http://localhost:3000/",
      message: "Hi",
    });

    expect(result.answer).toBe("Hello");
    expect(result.sourceItems).toHaveLength(1);
  });

  it("does not retry 4xx responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        success: false,
        data: null,
        error: { code: "VALIDATION_ERROR", message: "bad" },
      }),
    });

    vi.stubGlobal("fetch", fetchMock);

    await expect(
      sendMessage({
        domain: "example.com",
        apiBaseUrl: "http://localhost:3000",
        message: "Hi",
      }),
    ).rejects.toBeInstanceOf(WidgetRuntimeError);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries exactly once on 503", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({
          success: false,
          data: null,
          error: { code: "LLM_UNAVAILABLE", message: "down" },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: { answer: "Recovered", sourceItems: [] },
          error: null,
        }),
      });

    vi.stubGlobal("fetch", fetchMock);

    const result = await sendMessage({
      domain: "example.com",
      apiBaseUrl: "http://localhost:3000",
      message: "Hi",
    });

    expect(result.answer).toBe("Recovered");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("never retries more than once", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => ({
        success: false,
        data: null,
        error: { code: "INTERNAL_ERROR", message: "gateway" },
      }),
    });

    vi.stubGlobal("fetch", fetchMock);

    await expect(
      sendMessage({
        domain: "example.com",
        apiBaseUrl: "http://localhost:3000",
        message: "Hi",
      }),
    ).rejects.toBeInstanceOf(WidgetRuntimeError);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("supports cancellation via AbortSignal", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(
        () =>
          new Promise((_, reject) => {
            controller.signal.addEventListener("abort", () => {
              reject(new DOMException("Aborted", "AbortError"));
            });
          }),
      ),
    );

    const promise = sendMessage({
      domain: "example.com",
      apiBaseUrl: "http://localhost:3000",
      message: "Hi",
      signal: controller.signal,
    });

    controller.abort();
    await expect(promise).rejects.toBeInstanceOf(DOMException);
    vi.useRealTimers();
  });

  it("maps timeout to TIMEOUT", async () => {
    vi.useFakeTimers();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(
        (_, init?: RequestInit) =>
          new Promise((_, reject) => {
            init?.signal?.addEventListener("abort", () => {
              reject(new DOMException("Request timed out.", "AbortError"));
            });
          }),
      ),
    );

    const promise = sendMessage({
      domain: "example.com",
      apiBaseUrl: "http://localhost:3000",
      message: "Hi",
    });

    const rejection = expect(promise).rejects.toMatchObject({
      code: "TIMEOUT",
    });

    await vi.advanceTimersByTimeAsync(30_000);
    await rejection;

    vi.useRealTimers();
  }, 15_000);
});
