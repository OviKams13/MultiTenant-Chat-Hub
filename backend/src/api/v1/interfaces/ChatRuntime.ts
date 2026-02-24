// Chat runtime interfaces define the visitor-facing contract shared across validation, controller, and service layers.
// The public endpoint supports both widget mode (domain) and dashboard mode (chatbotId) in the same payload.
// History messages are accepted only as user/assistant turns and are never treated as trusted system instructions.
// Result and source item types are stabilized early so upcoming runtime features can evolve without breaking controllers.

export type ChatHistoryRole = 'user' | 'assistant';

export interface ChatHistoryMessage {
  role: ChatHistoryRole;
  content: string;
}

export interface ChatRuntimeInput {
  chatbotId?: number;
  domain?: string;
  message: string;
  history?: ChatHistoryMessage[];
}

export interface ChatRuntimeSourceItem {
  entity_id: number;
  entity_type: 'CONTACT' | 'SCHEDULE' | 'DYNAMIC';
  tags: string[];
}

export interface ChatRuntimeResult {
  answer: string;
  sourceItems: ChatRuntimeSourceItem[];
}

// Backward-compatible aliases keep existing imports operational while feature 8 contracts converge.
export type ChatRuntimeRequestBody = ChatRuntimeInput;
export type ChatRuntimeRequestPayload = ChatRuntimeInput;
export type ChatRuntimeResponseDTO = ChatRuntimeResult;
