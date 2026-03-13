// BlockTypeDTO represents one dynamic block definition visible to admin form-builder clients.
// scope helps frontend distinguish global read-only templates from chatbot-owned editable templates.
// schema_definition stays as JSON because form structures are dynamic and evolve over time.
// Keeping these contracts explicit prevents leaking raw ORM internals across layers.
export interface BlockTypeDTO {
  type_id: number;
  chatbot_id: number | null;
  type_name: string;
  description: string | null;
  schema_definition: Record<string, unknown>;
  is_system: boolean;
  scope: 'GLOBAL' | 'CHATBOT';
  created_at: Date;
}

// CreateBlockTypePayload is the validated input for POST block type creation.
export interface CreateBlockTypePayload {
  type_name: string;
  description?: string;
  schema_definition: Record<string, unknown>;
}

// UpdateBlockTypePayload supports partial updates for chatbot-owned block types only.
export interface UpdateBlockTypePayload {
  type_name?: string;
  description?: string;
  schema_definition?: Record<string, unknown>;
}
