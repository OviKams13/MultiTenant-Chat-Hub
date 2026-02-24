// Chat runtime interfaces define the public contract used by the visitor-facing chat endpoint.
// The endpoint accepts either chatbotId (dashboard/internal mode) or domain (widget/external mode).
// History stays optional and is treated as previous conversation context, not as system instructions.
// DTOs here keep controller, validation, and service layers aligned under strict TypeScript mode.

export type ChatHistoryRole = 'user' | 'assistant';

export interface ChatHistoryMessage {
  role: ChatHistoryRole;
  content: string;
}

export interface ChatRuntimeRequestPayload {
  chatbotId?: number;
  domain?: string;
  message: string;
  history?: ChatHistoryMessage[];
}

export interface ChatRuntimeSourceItem {
  entity_id: number;
  entity_type: string;
  tags: string[];
}

export interface ChatRuntimeResponseDTO {
  answer: string;
  sourceItems: ChatRuntimeSourceItem[];
}
