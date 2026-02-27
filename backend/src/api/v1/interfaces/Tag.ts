// Tag DTO represents the API-facing shape consumed by admin builders and block configuration screens.
// It normalizes synonyms into a string array so frontend code does not parse raw JSON manually.
// This contract is shared by list/create endpoints and by service methods returning tag data.
// Keeping DTOs explicit allows DB schema evolution without breaking external API compatibility.
export interface TagDTO {
  id: number;
  tag_code: string;
  description: string | null;
  category: string | null;
  is_system: boolean;
  synonyms: string[];
}

// TagFilter captures optional query parameters used by GET /tags for admin-side filtering.
export interface TagFilter {
  category?: string;
  is_system?: boolean;
  search?: string;
}

// CreateTagPayload models validated input for creating non-system custom tags.
export interface CreateTagPayload {
  tag_code: string;
  description?: string;
  category?: string;
  synonyms?: string[];
}

// UpdateTagPayload models validated input for updating an existing tag definition.
// Updates are partial but every provided field must pass strict validation.
// tag_code remains globally unique and is normalized to uppercase when provided.
export interface UpdateTagPayload {
  tag_code?: string;
  description?: string;
  category?: string;
  synonyms?: string[];
}

// TagResolutionMap maps normalized tag codes to numeric tag identifiers in persistence layer.
export type TagResolutionMap = Map<string, number>;

// Legacy interfaces are preserved for seed compatibility while feature modules migrate gradually.
export interface Tag {
  tag_id: number;
  tag_code: string;
  description: string | null;
  category: string | null;
  is_system: boolean;
  synonyms_json: string[] | null;
}

// This type captures the logical payload needed to create a tag during bootstrap seed.
export type TagCreation = Omit<Tag, 'tag_id'>;
