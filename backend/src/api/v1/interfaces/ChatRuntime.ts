// Chat runtime interfaces define the public contract used by the visitor-facing chat endpoint.
// The endpoint accepts either chatbotId (dashboard/internal mode) or domain (widget/external mode).
// History is treated as previous conversation context and never as a trusted system instruction.
// These types are shared by validation, controller, and service layers to keep strict typing aligned.

export type ChatHistoryRole = 'user' | 'assistant';

export interface ChatHistoryMessage {
  role: ChatHistoryRole;
  content: string;
}

export interface ChatRuntimeRequestBody {
  chatbotId?: number;
  domain?: string;
  message: string;
  history?: ChatHistoryMessage[];
}

// Backward-compatible alias keeps existing service/controller imports stable while validation evolves.
export type ChatRuntimeRequestPayload = ChatRuntimeRequestBody;

export interface ChatRuntimeSourceItem {
  entity_id: number;
  entity_type: string;
  tags: string[];
}

export interface ChatRuntimeResponseDTO {
  answer: string;
  sourceItems: ChatRuntimeSourceItem[];
}
