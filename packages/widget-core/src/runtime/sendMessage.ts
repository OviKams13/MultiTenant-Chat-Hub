import type {
  ChatMessage,
  PublicChatRequest,
  SourceItem,
} from "@mth/shared-types";

import { ChatApiClient } from "../client/ChatApiClient";
import {
  WidgetRuntimeError,
  isRetriableRuntimeError,
  isWidgetRuntimeError,
} from "./errors";
import { normalizeDomain } from "./normalizeDomain";
import { parsePublicChatResponse } from "./parseResponse";
import { serializeHistory } from "./serializeHistory";

const REQUEST_TIMEOUT_MS = 10_000;
const RETRY_DELAY_MS = 500;
const MAX_RETRIES = 1;

export interface SendMessageOptions {
  domain: string;
  apiBaseUrl: string;
  message: string;
  history?: ChatMessage[];
  signal?: AbortSignal;
}

export interface SendMessageResult {
  answer: string;
  sourceItems: SourceItem[];
}

const delay = async (ms: number, signal?: AbortSignal): Promise<void> => {
  if (signal?.aborted) {
    throw (
      signal.reason ??
      new DOMException("The operation was aborted.", "AbortError")
    );
  }

  await new Promise<void>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);

    const onAbort = () => {
      cleanup();
      reject(
        signal?.reason ??
          new DOMException("The operation was aborted.", "AbortError"),
      );
    };

    const cleanup = () => {
      clearTimeout(timeoutId);
      signal?.removeEventListener("abort", onAbort);
    };

    signal?.addEventListener("abort", onAbort, { once: true });
  });
};

const executeWithTimeout = async <T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  callerSignal?: AbortSignal,
): Promise<T> => {
  const timeoutController = new AbortController();
  const attemptController = new AbortController();

  const onCallerAbort = () => {
    attemptController.abort(
      callerSignal?.reason ??
        new DOMException("The operation was aborted.", "AbortError"),
    );
  };

  const onTimeoutAbort = () => {
    attemptController.abort(
      new DOMException("Request timed out.", "TimeoutError"),
    );
  };

  callerSignal?.addEventListener("abort", onCallerAbort, { once: true });
  timeoutController.signal.addEventListener("abort", onTimeoutAbort, {
    once: true,
  });

  const timeoutId = setTimeout(() => {
    timeoutController.abort();
  }, timeoutMs);

  try {
    return await operation(attemptController.signal);
  } catch (error) {
    if (callerSignal?.aborted) {
      throw callerSignal.reason ?? error;
    }

    if (timeoutController.signal.aborted) {
      throw new WidgetRuntimeError(
        "TIMEOUT",
        "Public chat request timed out.",
        {
          cause: error,
        },
      );
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
    callerSignal?.removeEventListener("abort", onCallerAbort);
    timeoutController.signal.removeEventListener("abort", onTimeoutAbort);
  }
};

const toWidgetRuntimeError = (error: unknown): WidgetRuntimeError => {
  if (isWidgetRuntimeError(error)) {
    return error;
  }

  return new WidgetRuntimeError(
    "UNKNOWN_ERROR",
    "Unknown widget runtime failure.",
    {
      cause: error,
    },
  );
};

export const sendMessage = async (
  options: SendMessageOptions,
): Promise<SendMessageResult> => {
  if (options.signal?.aborted) {
    throw (
      options.signal.reason ??
      new DOMException("The operation was aborted.", "AbortError")
    );
  }

  const request: PublicChatRequest = {
    domain: normalizeDomain(options.domain),
    message: options.message,
    history: serializeHistory(options.history),
  };

  const client = new ChatApiClient(options.apiBaseUrl);

  let attempt = 0;

  while (attempt <= MAX_RETRIES) {
    try {
      const response = await executeWithTimeout(
        (signal) => client.sendPublicChatRaw(request, { signal }),
        REQUEST_TIMEOUT_MS,
        options.signal,
      );

      return parsePublicChatResponse(response.raw, { status: response.status });
    } catch (error) {
      if (
        options.signal?.aborted ||
        (error instanceof DOMException && error.name === "AbortError")
      ) {
        throw error;
      }

      const runtimeError = toWidgetRuntimeError(error);
      const shouldRetry =
        attempt < MAX_RETRIES && isRetriableRuntimeError(runtimeError);

      if (!shouldRetry) {
        throw runtimeError;
      }

      attempt += 1;
      await delay(RETRY_DELAY_MS, options.signal);
    }
  }

  throw new WidgetRuntimeError(
    "UNKNOWN_ERROR",
    "Unexpected retry flow termination.",
  );
};
