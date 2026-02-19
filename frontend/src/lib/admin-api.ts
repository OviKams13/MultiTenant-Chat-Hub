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

export const adminApi = {
  listChatbots: (token: string) => apiClient.get<Chatbot[]>("/chatbots", token),
  getChatbot: (id: number, token: string) => apiClient.get<Chatbot>(`/chatbots/${id}`, token),
  createChatbot: (payload: { domain: string; display_name: string }, token: string) =>
    apiClient.post<Chatbot>("/chatbots", payload, token),
  updateChatbot: (id: number, payload: { domain?: string; display_name?: string }, token: string) =>
    apiClient.patch<Chatbot>(`/chatbots/${id}`, payload, token),

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

  listDynamicInstances: (chatbotId: number, typeId: number, token: string) =>
    apiClient.get<DynamicBlockInstance[]>(`/chatbots/${chatbotId}/blocks/dynamic/${typeId}`, token),
  createDynamicInstance: (chatbotId: number, typeId: number, payload: { data: Record<string, unknown> }, token: string) =>
    apiClient.post<DynamicBlockInstance>(`/chatbots/${chatbotId}/blocks/dynamic/${typeId}`, payload, token),
  updateDynamicInstance: (chatbotId: number, typeId: number, entityId: number, payload: { data: Record<string, unknown> }, token: string) =>
    apiClient.put<DynamicBlockInstance>(`/chatbots/${chatbotId}/blocks/dynamic/${typeId}/${entityId}`, payload, token),
  deleteDynamicInstance: (chatbotId: number, typeId: number, entityId: number, token: string) =>
    apiClient.delete(`/chatbots/${chatbotId}/blocks/dynamic/${typeId}/${entityId}`, token),
};
