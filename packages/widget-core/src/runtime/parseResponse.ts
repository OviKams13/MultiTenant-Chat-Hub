import type {
  PublicChatApiEnvelope,
  PublicChatErrorEnvelope,
  PublicChatSuccessEnvelope,
  SourceItem,
} from "@mth/shared-types";

import {
  WidgetRuntimeError,
  mapBackendErrorCodeToWidgetCode,
  mapHttpStatusToWidgetCode,
} from "./errors";

export interface SendMessageResult {
  answer: string;
  sourceItems: SourceItem[];
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isSourceItemArray = (value: unknown): value is SourceItem[] =>
  Array.isArray(value) && value.every((item) => isObject(item));

export const parsePublicChatResponse = (
  raw: unknown,
  context?: { status?: number },
): SendMessageResult => {
  if (!isObject(raw) || typeof raw.success !== "boolean") {
    throw new WidgetRuntimeError(
      "UNKNOWN_ERROR",
      "Malformed public chat response envelope.",
      { status: context?.status, details: raw },
    );
  }

  const envelope = raw as unknown as PublicChatApiEnvelope;

  if (envelope.success) {
    const successEnvelope = envelope as PublicChatSuccessEnvelope;
    if (
      !successEnvelope.data ||
      typeof successEnvelope.data.answer !== "string" ||
      !isSourceItemArray(successEnvelope.data.sourceItems)
    ) {
      throw new WidgetRuntimeError(
        "UNKNOWN_ERROR",
        "Malformed success payload in public chat response.",
        { status: context?.status, details: raw },
      );
    }

    return {
      answer: successEnvelope.data.answer,
      sourceItems: successEnvelope.data.sourceItems,
    };
  }

  const errorEnvelope = envelope as PublicChatErrorEnvelope;
  const backendCode = errorEnvelope.error?.code;
  const message = errorEnvelope.error?.message;

  const mappedCode =
    typeof backendCode === "string"
      ? mapBackendErrorCodeToWidgetCode(backendCode)
      : mapHttpStatusToWidgetCode(context?.status ?? 0);

  throw new WidgetRuntimeError(
    mappedCode,
    typeof message === "string" ? message : "Public chat request failed.",
    {
      status: context?.status,
      details: errorEnvelope.error?.details,
    },
  );
};
