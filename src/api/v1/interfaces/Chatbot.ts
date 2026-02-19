// ChatbotDTO defines the sanitized chatbot shape returned to API clients.
// It intentionally excludes internal ownership fields to avoid leaking tenant implementation details.
// Frontend admin pages use this contract to render chatbot catalog and detail pages.
// Keeping a dedicated DTO lets us evolve DB columns later without breaking API consumers.
export interface ChatbotDTO {
  id: number;
  domain: string;
  display_name: string;
  created_at: Date;
}

// CreateChatbotPayload captures the required business fields for chatbot creation.
export interface CreateChatbotPayload {
  domain: string;
  display_name: string;
}

// UpdateChatbotPayload supports partial updates while keeping field names explicit.
export interface UpdateChatbotPayload {
  domain?: string;
  display_name?: string;
}
