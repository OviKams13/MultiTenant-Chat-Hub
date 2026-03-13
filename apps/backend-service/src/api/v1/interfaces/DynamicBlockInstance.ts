// DynamicBlockInstanceDTO represents one persisted dynamic block instance for a chatbot.
// type_name is duplicated in the DTO to simplify front-end rendering and audit views.
// data stores validated business content according to block-type schema_definition.
// This contract keeps controllers/services decoupled from raw Sequelize model shapes.
export interface DynamicBlockInstanceDTO {
  entity_id: number;
  chatbot_id: number;
  type_id: number;
  type_name: string;
  data: Record<string, unknown>;
  created_at: Date;
}

// CreateDynamicBlockPayload models POST body after lightweight request validation.
export interface CreateDynamicBlockPayload {
  data: Record<string, unknown>;
}

// UpdateDynamicBlockPayload models PUT body for partial merge updates.
export interface UpdateDynamicBlockPayload {
  data: Record<string, unknown>;
}
