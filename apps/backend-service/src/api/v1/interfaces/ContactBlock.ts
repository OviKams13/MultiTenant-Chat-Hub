// Contact block payloads/DTOs describe the static business profile attached to one chatbot.
// In Feature 4 the Contact block is unique per chatbot to keep admin UX simple and deterministic.
// DTO shape mirrors API responses, while payloads model validated request bodies only.
// Keeping these contracts explicit prevents leaking raw Sequelize models to controllers.
export interface ContactDTO {
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

// ContactCreatePayload models POST /blocks/contact body after validation and normalization.
export interface ContactCreatePayload {
  org_name: string;
  phone?: string;
  email?: string;
  address_text?: string;
  city?: string;
  country?: string;
  hours_text?: string;
}

// ContactUpdatePayload is partial but must contain at least one mutable field.
export interface ContactUpdatePayload {
  org_name?: string;
  phone?: string;
  email?: string;
  address_text?: string;
  city?: string;
  country?: string;
  hours_text?: string;
}
