import { apiClient } from "@/lib/api";

export interface Chatbot {
  id: number;
  domain: string;
  display_name: string;
  created_at: string;
}

export interface ContactBlock {
  entity_id: number;
  chatbot_id: number;
  org_name: string;
  phone: string | null;
  email: string | null;
  address_text: string | null;
  city: string | null;
  country: string | null;
  hours_text: string | null;
}

export interface ScheduleBlock {
  entity_id: number;
  chatbot_id: number;
  title: string;
  day_of_week: string;
  open_time: string;
  close_time: string;
  notes: string | null;
}

export interface BlockType {
  type_id: number;
  chatbot_id: number | null;
  type_name: string;
  description: string | null;
  schema_definition: Record<string, unknown>;
  is_system: boolean;
  scope: "GLOBAL" | "CHATBOT";
  created_at: string;
}

export interface DynamicBlockInstance {
  entity_id: number;
  chatbot_id: number;
  type_id: number;
  type_name: string;
  data: Record<string, unknown>;
  created_at: string;
}

export interface Tag {
  id: number;
  tag_code: string;
  description: string | null;
  category: string | null;
  is_system: boolean;
  synonyms: string[];
}

export interface ItemTagUpdateResult {
  item_id: number;
  chatbot_id: number;
  tags: Tag[];
}

export interface ChatbotItemSummary {
  item_id: number;
  entity_id: number;
  entity_type: "CONTACT" | "SCHEDULE" | "DYNAMIC";
  type_id: number | null;
  type_name: string | null;
}

export const adminApi = {
  listChatbots: (token: string) => apiClient.get<Chatbot[]>("/chatbots", token),
  getChatbot: (id: number, token: string) => apiClient.get<Chatbot>(`/chatbots/${id}`, token),
  createChatbot: (payload: { domain: string; display_name: string }, token: string) =>
    apiClient.post<Chatbot>("/chatbots", payload, token),
  updateChatbot: (id: number, payload: { domain?: string; display_name?: string }, token: string) =>
    apiClient.patch<Chatbot>(`/chatbots/${id}`, payload, token),
  deleteChatbot: (id: number, token: string) => apiClient.delete(`/chatbots/${id}`, token),

  getContact: (chatbotId: number, token: string) =>
    apiClient.get<ContactBlock>(`/chatbots/${chatbotId}/blocks/contact`, token),
  createContact: (chatbotId: number, payload: Omit<ContactBlock, "entity_id" | "chatbot_id">, token: string) =>
    apiClient.post<ContactBlock>(`/chatbots/${chatbotId}/blocks/contact`, payload, token),
  updateContact: (chatbotId: number, payload: Partial<Omit<ContactBlock, "entity_id" | "chatbot_id">>, token: string) =>
    apiClient.put<ContactBlock>(`/chatbots/${chatbotId}/blocks/contact`, payload, token),

  listSchedules: (chatbotId: number, token: string) =>
    apiClient.get<ScheduleBlock[]>(`/chatbots/${chatbotId}/blocks/schedules`, token),
  createSchedule: (chatbotId: number, payload: Omit<ScheduleBlock, "entity_id" | "chatbot_id">, token: string) =>
    apiClient.post<ScheduleBlock>(`/chatbots/${chatbotId}/blocks/schedules`, payload, token),
  updateSchedule: (chatbotId: number, entityId: number, payload: Partial<Omit<ScheduleBlock, "entity_id" | "chatbot_id">>, token: string) =>
    apiClient.put<ScheduleBlock>(`/chatbots/${chatbotId}/blocks/schedules/${entityId}`, payload, token),
  deleteSchedule: (chatbotId: number, entityId: number, token: string) =>
    apiClient.delete(`/chatbots/${chatbotId}/blocks/schedules/${entityId}`, token),

  listBlockTypes: (chatbotId: number, token: string) =>
    apiClient.get<BlockType[]>(`/chatbots/${chatbotId}/block-types`, token),
  createBlockType: (chatbotId: number, payload: { type_name: string; description?: string; schema_definition: Record<string, unknown> }, token: string) =>
    apiClient.post<BlockType>(`/chatbots/${chatbotId}/block-types`, payload, token),
  getBlockType: (chatbotId: number, typeId: number, token: string) =>
    apiClient.get<BlockType>(`/chatbots/${chatbotId}/block-types/${typeId}`, token),
  updateBlockType: (
    chatbotId: number,
    typeId: number,
    payload: { type_name?: string; description?: string; schema_definition?: Record<string, unknown> },
    token: string
  ) => apiClient.put<BlockType>(`/chatbots/${chatbotId}/block-types/${typeId}`, payload, token),
  deleteBlockType: (chatbotId: number, typeId: number, token: string) =>
    apiClient.delete(`/chatbots/${chatbotId}/block-types/${typeId}`, token),

  listDynamicInstances: (chatbotId: number, typeId: number, token: string) =>
    apiClient.get<DynamicBlockInstance[]>(`/chatbots/${chatbotId}/blocks/dynamic/${typeId}`, token),
  createDynamicInstance: (chatbotId: number, typeId: number, payload: { data: Record<string, unknown> }, token: string) =>
    apiClient.post<DynamicBlockInstance>(`/chatbots/${chatbotId}/blocks/dynamic/${typeId}`, payload, token),
  getDynamicInstance: (chatbotId: number, typeId: number, entityId: number, token: string) =>
    apiClient.get<DynamicBlockInstance>(`/chatbots/${chatbotId}/blocks/dynamic/${typeId}/${entityId}`, token),
  updateDynamicInstance: (chatbotId: number, typeId: number, entityId: number, payload: { data: Record<string, unknown> }, token: string) =>
    apiClient.put<DynamicBlockInstance>(`/chatbots/${chatbotId}/blocks/dynamic/${typeId}/${entityId}`, payload, token),
  deleteDynamicInstance: (chatbotId: number, typeId: number, entityId: number, token: string) =>
    apiClient.delete(`/chatbots/${chatbotId}/blocks/dynamic/${typeId}/${entityId}`, token),

  listTags: (token: string, query?: { category?: string; is_system?: boolean; search?: string }) => {
    const params = new URLSearchParams();
    if (query?.category) params.set("category", query.category);
    if (typeof query?.is_system === "boolean") params.set("is_system", String(query.is_system));
    if (query?.search) params.set("search", query.search);
    const suffix = params.toString() ? `?${params.toString()}` : "";
    return apiClient.get<Tag[]>(`/tags${suffix}`, token);
  },
  createTag: (
    payload: { tag_code: string; description?: string; category?: string; synonyms?: string[] },
    token: string
  ) => apiClient.post<Tag>("/tags", payload, token),
  updateTag: (
    tagId: number,
    payload: { tag_code?: string; description?: string; category?: string; synonyms?: string[] },
    token: string
  ) => apiClient.put<Tag>(`/tags/${tagId}`, payload, token),

  listChatbotItems: (chatbotId: number, token: string) =>
    apiClient.get<ChatbotItemSummary[]>(`/chatbots/${chatbotId}/items`, token),
  getItemTags: (chatbotId: number, itemId: number, token: string) =>
    apiClient.get<Tag[]>(`/chatbots/${chatbotId}/items/${itemId}/tags`, token),
  updateItemTags: (
    chatbotId: number,
    itemId: number,
    payload: { tagCodes?: string[]; tagIds?: number[] },
    token: string
  ) => apiClient.put<ItemTagUpdateResult>(`/chatbots/${chatbotId}/items/${itemId}/tags`, payload, token),
};
