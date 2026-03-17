export interface AllowedOriginDTO {
  id: number;
  chatbot_id: number;
  origin: string;
  created_at: Date;
}

export interface CreateAllowedOriginPayload {
  origin: string;
}
