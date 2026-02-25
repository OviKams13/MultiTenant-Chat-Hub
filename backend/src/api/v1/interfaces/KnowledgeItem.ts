// KnowledgeItem interfaces define the normalized runtime context passed to later pipeline phases.
// Feature 8.5 builds this structure from tenant-scoped DB rows, while Feature 8.6 ranks and slices it.
// createdAt is mandatory because context selection sorts by recency inside each business-priority bucket.
// The union is intentionally serializable so Feature 8.7 can transform it into a deterministic prompt string.

export type KnowledgeItemKind = 'CONTACT' | 'SCHEDULE' | 'DYNAMIC';

export interface KnowledgeItemBase {
  kind: KnowledgeItemKind;
  entityId: number;
  createdAt: Date;
}

// CONTACT items represent one contact entity (address, phone, email, etc.)
export interface ContactKnowledgeItem extends KnowledgeItemBase {
  kind: 'CONTACT';
  contact: Record<string, unknown>;
}

// SCHEDULE items group all schedule rows for a given entity_id
export interface ScheduleKnowledgeItem extends KnowledgeItemBase {
  kind: 'SCHEDULE';
  schedules: Array<Record<string, unknown>>;
}

// DYNAMIC items wrap bb_entities.data JSON along with the block type name
export interface DynamicKnowledgeItem extends KnowledgeItemBase {
  kind: 'DYNAMIC';
  typeId: number;
  typeName: string;
  data: Record<string, unknown>;
}

export type KnowledgeItem = ContactKnowledgeItem | ScheduleKnowledgeItem | DynamicKnowledgeItem;
