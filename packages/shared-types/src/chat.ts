export type ChatMessageRole = "user" | "assistant";

export interface ChatMessage {
  role: ChatMessageRole;
  content: string;
}

export type SourceEntityType = "CONTACT" | "SCHEDULE" | "DYNAMIC";

export interface SourceItem {
  entity_id: number;
  entity_type: SourceEntityType;
  tags: string[];
}

export interface PublicChatRequest {
  chatbotId?: number;
  domain?: string;
  widgetKey?: string;
  message: string;
  history?: ChatMessage[];
}

export interface PublicChatResponse {
  answer: string;
  sourceItems: SourceItem[];
}

// Public runtime contract version targeted by widget/runtime SDK integrations.
// Breaking changes must be released under a new API path version (for example /api/v2/...).
export const PUBLIC_CHAT_RUNTIME_API_VERSION = "v1";

export type PublicRuntimeErrorCode =
  | "VALIDATION_ERROR"
  | "CHATBOT_NOT_FOUND"
  | "ORIGIN_NOT_ALLOWED"
  | "INVALID_WIDGET_KEY"
  | "NO_RELEVANT_TAG"
  | "LLM_UNAVAILABLE"
  | "RATE_LIMIT_EXCEEDED"
  | "INTERNAL_ERROR";

export interface PublicApiError<Code extends string = string> {
  code: Code;
  message: string;
  details?: unknown;
}

export interface PublicApiSuccessEnvelope<TData> {
  success: true;
  data: TData;
  error: null;
}

export interface PublicApiErrorEnvelope<Code extends string = string> {
  success: false;
  data: null;
  error: PublicApiError<Code>;
}

export type PublicApiEnvelope<TData, Code extends string = string> =
  | PublicApiSuccessEnvelope<TData>
  | PublicApiErrorEnvelope<Code>;

export type PublicChatSuccessEnvelope = PublicApiSuccessEnvelope<PublicChatResponse>;
export type PublicChatErrorEnvelope = PublicApiErrorEnvelope<PublicRuntimeErrorCode>;
export type PublicChatApiEnvelope = PublicApiEnvelope<PublicChatResponse, PublicRuntimeErrorCode>;
