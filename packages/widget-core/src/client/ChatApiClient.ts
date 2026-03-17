import type { PublicChatRequest, PublicChatResponse } from "@mth/shared-types";

import {
  WidgetRuntimeError,
  mapBackendErrorCodeToWidgetCode,
  mapHttpStatusToWidgetCode,
} from "../runtime/errors";

const normalizeApiBaseUrl = (apiBaseUrl: string): string =>
  apiBaseUrl.trim().replace(/\/+$/, "");

interface SendPublicChatOptions {
  signal?: AbortSignal;
}

interface ParsedClientResponse {
  raw: unknown;
  status: number;
}

export class ChatApiClient {
  private readonly apiBaseUrl: string;

  public constructor(apiBaseUrl: string) {
    this.apiBaseUrl = normalizeApiBaseUrl(apiBaseUrl);
  }

  public getPublicChatEndpoint(): string {
    return `${this.apiBaseUrl}/api/v1/public/chat`;
  }

  public async sendPublicChat(
    request: PublicChatRequest,
    options?: SendPublicChatOptions,
  ): Promise<PublicChatResponse> {
    const { raw, status } = await this.sendPublicChatRaw(request, options);

    if (
      typeof raw !== "object" ||
      raw === null ||
      !("success" in raw) ||
      typeof (raw as { success: unknown }).success !== "boolean"
    ) {
      throw new WidgetRuntimeError(
        "UNKNOWN_ERROR",
        "Malformed public chat response.",
        { status, details: raw },
      );
    }

    if ((raw as { success: boolean }).success === false) {
      const error = (
        raw as {
          error?: { code?: string; message?: string; details?: unknown };
        }
      ).error;
      const mappedCode =
        typeof error?.code === "string"
          ? mapBackendErrorCodeToWidgetCode(error.code)
          : mapHttpStatusToWidgetCode(status);

      throw new WidgetRuntimeError(
        mappedCode,
        error?.message ?? "Public chat request failed.",
        {
          status,
          details: error?.details,
        },
      );
    }

    const data = (raw as { data?: PublicChatResponse }).data;
    if (
      !data ||
      typeof data.answer !== "string" ||
      !Array.isArray(data.sourceItems)
    ) {
      throw new WidgetRuntimeError(
        "UNKNOWN_ERROR",
        "Malformed public chat data payload.",
        {
          status,
          details: raw,
        },
      );
    }

    return data;
  }

  public async sendPublicChatRaw(
    request: PublicChatRequest,
    options?: SendPublicChatOptions,
  ): Promise<ParsedClientResponse> {
    let response: Response;

    try {
      response = await fetch(this.getPublicChatEndpoint(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
        signal: options?.signal,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw error;
      }

      throw new WidgetRuntimeError("NETWORK_ERROR", "Network request failed.", {
        cause: error,
      });
    }

    let raw: unknown;
    try {
      raw = await response.json();
    } catch (error) {
      throw new WidgetRuntimeError(
        "UNKNOWN_ERROR",
        "Failed to parse JSON response.",
        {
          status: response.status,
          cause: error,
        },
      );
    }

    if (!response.ok) {
      const backendError =
        typeof raw === "object" && raw !== null
          ? (
              raw as {
                error?: { code?: string; message?: string; details?: unknown };
              }
            ).error
          : undefined;

      const code =
        typeof backendError?.code === "string"
          ? mapBackendErrorCodeToWidgetCode(backendError.code)
          : mapHttpStatusToWidgetCode(response.status);

      throw new WidgetRuntimeError(
        code,
        backendError?.message ??
          `Request failed with status ${response.status}.`,
        {
          status: response.status,
          details: backendError?.details,
        },
      );
    }

    return {
      raw,
      status: response.status,
    };
  }
}
