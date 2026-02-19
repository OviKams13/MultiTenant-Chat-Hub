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
  owner: {
    id: number;
    email: string;
  };
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
  custom_block_types_count: number;
  custom_block_instances_count: number;
}

export const userApi = {
  listOwnersWithChatbots: (token: string) => apiClient.get<OwnerChatbotsGroup[]>("/users/chatbots", token),
  getChatbotDetail: (chatbotId: number, token: string) => apiClient.get<UserChatbotDetail>(`/users/chatbots/${chatbotId}`, token)
};
