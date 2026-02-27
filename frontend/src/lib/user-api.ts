import { apiClient } from "@/lib/api";

export interface UserChatbotCard {
  id: number;
  display_name: string;
  domain: string;
  created_at: string;
}

export interface OwnerChatbotsGroup {
  owner_id: number;
  owner_email: string;
  chatbots: UserChatbotCard[];
}

export interface UserChatbotDetail {
  id: number;
  display_name: string;
  domain: string;
  contact: {
    org_name: string;
    phone: string | null;
    email: string | null;
    address_text: string | null;
    city: string | null;
    country: string | null;
    hours_text: string | null;
  } | null;
  schedules: Array<{
    title: string;
    day_of_week: string;
    open_time: string;
    close_time: string;
    notes: string | null;
  }>;
  custom_blocks: Array<{
    type_id: number;
    type_name: string;
    description: string | null;
    instances: Array<Record<string, unknown>>;
  }>;
}

export interface PublicChatHistoryMessage {
  role: "user" | "assistant";
  content: string;
}

export interface PublicChatRequest {
  domain: string;
  message: string;
  history?: PublicChatHistoryMessage[];
}

export interface PublicChatSourceItem {
  entity_id: number;
  entity_type: "CONTACT" | "SCHEDULE" | "DYNAMIC";
  tags: string[];
}

export interface PublicChatResponseData {
  answer: string;
  sourceItems: PublicChatSourceItem[];
}

// userApi centralizes user-dashboard calls so the UI can consume one typed gateway instead of raw fetch calls.
// listOwnersWithChatbots drives the grouped admin/chatbot cards shown on the mall dashboard screen.
// getChatbotDetail hydrates the detail page tabs (contact, schedules, dynamic blocks) before opening the chat widget.
// chatByDomain powers the public runtime chat integration using URL domain context for tenant-safe responses.
export const userApi = {
  listOwnersWithChatbots: (token: string) => apiClient.get<OwnerChatbotsGroup[]>("/users/chatbots", token),
  getChatbotDetail: (chatbotId: number, token: string) => apiClient.get<UserChatbotDetail>(`/users/chatbots/${chatbotId}`, token),
  chatByDomain: (payload: PublicChatRequest) => apiClient.post<PublicChatResponseData>("/public/chat", payload)
};
