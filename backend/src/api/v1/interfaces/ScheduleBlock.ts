// Schedule block payloads/DTOs represent opening-hour slots attached to a chatbot.
// Unlike Contact, multiple Schedule blocks can coexist for the same chatbot.
// DTOs are designed for API consumers and hide storage-layer join complexity.
// Separate create/update payloads keep validation strict and intent-specific.
export interface ScheduleDTO {
  entity_id: number;
  chatbot_id: number;
  title: string;
  day_of_week: string;
  open_time: string;
  close_time: string;
  notes: string | null;
}

// ScheduleCreatePayload is the validated body for creating one schedule slot.
export interface ScheduleCreatePayload {
  title: string;
  day_of_week: string;
  open_time: string;
  close_time: string;
  notes?: string;
}

// ScheduleUpdatePayload allows partial updates while preserving field-level rules.
export interface ScheduleUpdatePayload {
  title?: string;
  day_of_week?: string;
  open_time?: string;
  close_time?: string;
  notes?: string;
}
