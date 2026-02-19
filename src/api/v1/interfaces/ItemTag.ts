// ItemTagDTO is the API-facing tag shape used in item-tag management endpoints.
// It mirrors existing tag responses so admin UI can reuse one rendering contract everywhere.
// Keeping this DTO local to item tagging avoids accidental coupling with persistence internals.
// synonyms is always normalized to a string array for deterministic frontend behavior.
export interface ItemTagDTO {
  id: number;
  tag_code: string;
  description: string | null;
  category: string | null;
  is_system: boolean;
  synonyms: string[];
}

// UpdateItemTagsPayload models the PUT request body for replacing an item's full tag set.
// The API accepts either tagCodes or tagIds but never both in the same request.
// tagCodes are intended for admin builder UX while tagIds support direct internal tooling.
// Validation layer guarantees arrays are non-empty and pre-normalized before service logic runs.
export interface UpdateItemTagsPayload {
  tagCodes?: string[];
  tagIds?: number[];
}

// UpdateItemTagsResponseDTO wraps the final state returned after a successful replacement.
// Returning both item/chatbot IDs and resolved tags helps audit logs and frontend cache updates.
export interface UpdateItemTagsResponseDTO {
  item_id: number;
  chatbot_id: number;
  tags: ItemTagDTO[];
}
