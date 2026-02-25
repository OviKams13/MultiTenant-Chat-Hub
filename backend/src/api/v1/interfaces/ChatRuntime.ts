import { KnowledgeItem } from './KnowledgeItem';

// Chat runtime interfaces define the visitor-facing contract shared across validation, controller, and service layers.
// The public endpoint supports both widget mode (domain) and dashboard mode (chatbotId) in the same payload.
// History messages are accepted only as user/assistant turns and are never treated as trusted system instructions.
// Result and source item types are stabilized early so upcoming runtime features can evolve without breaking controllers.
export type ChatHistoryRole = 'user' | 'assistant';

export interface ChatRuntimeHistoryMessage {
  role: ChatHistoryRole;
  content: string;
}

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

// ChatRuntimeLLMResult is optional today but keeps an explicit shape ready for future metadata fields.
export interface ChatRuntimeLLMResult {
  answer: string;
}

export interface ChatRuntimeInput {
  chatbotId?: number;
  domain?: string;
  message: string;
  history?: ChatRuntimeHistoryMessage[];
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

// Raw context is returned by service internals before ranking/limiting in the next runtime feature.
export type ChatRuntimeRawContext = KnowledgeItem[];

// Backward-compatible aliases keep existing imports operational while feature 8 contracts converge.
export type ChatRuntimeRequestBody = ChatRuntimeInput;
export type ChatRuntimeRequestPayload = ChatRuntimeInput;
export type ChatRuntimeResponseDTO = ChatRuntimeResult;
