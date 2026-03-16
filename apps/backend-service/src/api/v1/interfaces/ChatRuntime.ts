import type {
  ChatMessage,
  PublicApiError,
  PublicChatApiEnvelope,
  PublicChatRequest,
  PublicChatResponse,
  PublicChatSuccessEnvelope,
  PublicRuntimeErrorCode,
  SourceItem
} from '@mth/shared-types';
import { KnowledgeItem } from './KnowledgeItem';

// ChatRuntime interfaces define the visitor-facing contract shared across validation, controller, and service layers.
// Public request/response and reusable runtime message/source contracts are centralized in @mth/shared-types.
// Backend-specific envelopes and internal orchestration types remain local only when they are not public API contracts.

export type ChatRuntimeHistoryMessage = ChatMessage;

// Backward-compatible alias keeps pre-8.7 imports stable while introducing explicit runtime naming.
export type ChatHistoryMessage = ChatRuntimeHistoryMessage;

// ChatRuntimeLLMParams is the normalized prompt input passed from runtime orchestration to LLMService.
// It carries resolved tenant identity, validated user question, context text, and optional bounded history.
// maxHistoryMessages allows per-call overrides while still honoring global defaults from constants.
export interface ChatRuntimeLLMParams {
  chatbotDisplayName: string;
  message: string;
  history?: ChatRuntimeHistoryMessage[];
  contextText: string;
  maxHistoryMessages?: number;
  locale?: string;
}

// ChatRuntimeLLMResult keeps an explicit answer shape ready for future metadata fields (tokens, latency, etc.).
export interface ChatRuntimeLLMResult {
  answer: string;
}

export type ChatRuntimeInput = PublicChatRequest;

export type ChatRuntimeSourceItem = SourceItem;

export type ChatRuntimeSuccessData = PublicChatResponse;

export type ChatRuntimeErrorCode = PublicRuntimeErrorCode;

export type ChatRuntimeErrorPayload = PublicApiError<ChatRuntimeErrorCode>;

export type ChatRuntimeResponseSuccess = PublicChatSuccessEnvelope;

export interface ChatRuntimeResponseError {
  success: false;
  data: null;
  error: ChatRuntimeErrorPayload;
}

export type ChatRuntimeResponse = PublicChatApiEnvelope;

export type ChatRuntimeResult = PublicChatResponse;

// Raw context is returned by service internals before ranking/limiting in the next runtime feature.
export type ChatRuntimeRawContext = KnowledgeItem[];

// Backward-compatible aliases keep existing imports operational while feature 8 contracts converge.
export type ChatRuntimeRequestBody = ChatRuntimeInput;
export type ChatRuntimeRequestPayload = ChatRuntimeInput;
export type ChatRuntimeResponseDTO = ChatRuntimeResult;
