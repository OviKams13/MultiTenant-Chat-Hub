import type {
  PublicRuntimeErrorCode,
  WidgetRuntimeErrorCode,
} from "@mth/shared-types";

export class WidgetRuntimeError extends Error {
  public readonly code: WidgetRuntimeErrorCode;

  public readonly status?: number;

  public readonly details?: unknown;

  public readonly cause?: unknown;

  public constructor(
    code: WidgetRuntimeErrorCode,
    message: string,
    options?: {
      status?: number;
      details?: unknown;
      cause?: unknown;
    },
  ) {
    super(message);
    this.name = "WidgetRuntimeError";
    this.code = code;
    this.status = options?.status;
    this.details = options?.details;
    this.cause = options?.cause;
  }
}

export const isWidgetRuntimeError = (
  error: unknown,
): error is WidgetRuntimeError => error instanceof WidgetRuntimeError;

const BACKEND_ERROR_CODE_MAP: Partial<
  Record<PublicRuntimeErrorCode, WidgetRuntimeErrorCode>
> = {
  CHATBOT_NOT_FOUND: "CHATBOT_NOT_FOUND",
  LLM_UNAVAILABLE: "LLM_UNAVAILABLE",
  RATE_LIMIT_EXCEEDED: "RATE_LIMITED",
  ORIGIN_NOT_ALLOWED: "ORIGIN_NOT_ALLOWED",
  INVALID_WIDGET_KEY: "INVALID_WIDGET_KEY",
};

export const mapBackendErrorCodeToWidgetCode = (
  backendCode: string,
): WidgetRuntimeErrorCode => {
  if (backendCode in BACKEND_ERROR_CODE_MAP) {
    return (
      BACKEND_ERROR_CODE_MAP[backendCode as PublicRuntimeErrorCode] ??
      "UNKNOWN_ERROR"
    );
  }

  return "UNKNOWN_ERROR";
};

export const mapHttpStatusToWidgetCode = (
  status: number,
): WidgetRuntimeErrorCode => {
  if (status === 429) {
    return "RATE_LIMITED";
  }

  if (status === 403) {
    return "ORIGIN_NOT_ALLOWED";
  }

  return "UNKNOWN_ERROR";
};

export const isRetriableStatus = (status: number): boolean =>
  status === 502 || status === 503 || status === 504;

export const isRetriableRuntimeError = (error: WidgetRuntimeError): boolean =>
  error.code === "TIMEOUT" ||
  error.code === "NETWORK_ERROR" ||
  (typeof error.status === "number" && isRetriableStatus(error.status));
