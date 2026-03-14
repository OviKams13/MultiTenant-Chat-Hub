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
  message: string;
  history?: ChatMessage[];
}

export interface PublicChatResponse {
  answer: string;
  sourceItems: SourceItem[];
}
