// Tag interface models dynamic semantic labels used by chat runtime and admin-managed data blocks.
// Feature 0 seeds only system tags to ensure every tenant starts with a coherent NLP baseline.
// synonyms_json is exposed as string[] to keep runtime logic strongly typed in services.
// Categories help future filtering in admin UI when users manage contact/schedule/dynamic data.
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
