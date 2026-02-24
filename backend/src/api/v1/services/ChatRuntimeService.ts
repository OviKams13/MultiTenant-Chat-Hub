import { Op } from 'sequelize';
import { AppError } from '../errors/AppError';
import { ChatRuntimeInput, ChatRuntimeResult } from '../interfaces/ChatRuntime';
import { KnowledgeItem } from '../interfaces/KnowledgeItem';
import { BbContactModel } from '../models/BbContactModel';
import { BbEntityModel } from '../models/BbEntityModel';
import { BbScheduleModel } from '../models/BbScheduleModel';
import { BlockTypeModel } from '../models/BlockTypeModel';
import { ChatbotItemModel } from '../models/ChatbotItemModel';
import { ChatbotItemTagModel } from '../models/ChatbotItemTagModel';
import { ChatbotModel } from '../models/ChatbotModel';
import { TagModel } from '../models/TagModel';
import { TagService } from './TagService';

interface ResolvedChatbotContext {
  chatbotId: number;
  displayName: string;
}

interface RawItemRef {
  itemId: number;
  entityId: number;
}

// ChatRuntimeService owns public-chat orchestration and keeps HTTP/controller layers business-agnostic.
// Feature 8.5 adds tenant-scoped batch retrieval to build KnowledgeItem[] without N+1 queries.
// Ranking/limiting of this context is intentionally deferred to Feature 8.6 to keep responsibilities isolated.
// Final LLM response generation is deferred to Feature 8.7 while this service prepares the raw context set.
export class ChatRuntimeService {
  // chat resolves tenant scope, classifies user intent tags, then prepares raw context items for next pipeline phases.
  static async chat(input: ChatRuntimeInput): Promise<ChatRuntimeResult> {
    const { chatbotId, displayName } = await this.resolveChatbot(input);
    const queryTags = await TagService.classifyQuestion(input.message);

    if (queryTags.length === 0) {
      throw new AppError('No relevant tags for this question', 400, 'NO_RELEVANT_TAG');
    }

    const knowledgeItems = await this.fetchKnowledgeItems(chatbotId, queryTags);

    // Feature 8.6 will rank/slice knowledgeItems by kind priority and recency before context serialization.
    // Feature 8.7 will call LLMService with that selected context; for now we return source attribution only.
    return {
      answer: `Chat runtime pipeline not fully implemented yet for ${displayName} (chatbot ${chatbotId}).`,
      sourceItems: knowledgeItems.map((item) => ({
        entity_id: item.entityId,
        entity_type: item.kind,
        tags: queryTags
      }))
    };
  }

  // handleChat remains as compatibility alias while existing callers migrate to chat(...).
  static async handleChat(input: ChatRuntimeInput): Promise<ChatRuntimeResult> {
    return this.chat(input);
  }

  // fetchKnowledgeItems retrieves all tenant-scoped entities matching query tags using batched table reads.
  // The method intentionally returns unsorted/unlimited context because ordering policy belongs to Feature 8.6.
  private static async fetchKnowledgeItems(chatbotId: number, queryTags: string[]): Promise<KnowledgeItem[]> {
    const tagLinks = await ChatbotItemTagModel.findAll({
      attributes: ['item_id'],
      include: [
        {
          model: TagModel,
          as: 'tag',
          attributes: ['tag_id', 'tag_code'],
          where: {
            tag_code: {
              [Op.in]: queryTags
            }
          },
          required: true
        },
        {
          model: ChatbotItemModel,
          as: 'item',
          attributes: ['item_id', 'entity_id'],
          where: { chatbot_id: chatbotId },
          required: true
        }
      ]
    });

    const rawItemRefs: RawItemRef[] = [];
    for (const link of tagLinks as Array<ChatbotItemTagModel & { item?: { item_id: number; entity_id: number } }>) {
      if (link.item) {
        rawItemRefs.push({ itemId: Number(link.item.item_id), entityId: Number(link.item.entity_id) });
      }
    }

    const orderedEntityIds: number[] = [];
    const seenEntityIds = new Set<number>();
    for (const ref of rawItemRefs) {
      if (!seenEntityIds.has(ref.entityId)) {
        seenEntityIds.add(ref.entityId);
        orderedEntityIds.push(ref.entityId);
      }
    }

    // Empty retrieval is a valid state in 8.5; downstream phases decide whether to answer with empty context.
    if (orderedEntityIds.length === 0) {
      return [];
    }

    const entities = await BbEntityModel.findAll({
      where: {
        entity_id: {
          [Op.in]: orderedEntityIds
        }
      }
    });

    const entityById = new Map<number, BbEntityModel>();
    for (const entity of entities) {
      entityById.set(Number(entity.entity_id), entity);
    }

    const contactEntityIds: number[] = [];
    const scheduleEntityIds: number[] = [];
    const dynamicTypeIds = new Set<number>();

    for (const entityId of orderedEntityIds) {
      const entity = entityById.get(entityId);
      if (!entity) {
        continue;
      }

      if (entity.entity_type === 'CONTACT') {
        contactEntityIds.push(entityId);
      }

      if (entity.entity_type === 'SCHEDULE') {
        scheduleEntityIds.push(entityId);
      }

      if (typeof entity.type_id === 'number') {
        dynamicTypeIds.add(Number(entity.type_id));
      }
    }

    const contacts =
      contactEntityIds.length > 0
        ? await BbContactModel.findAll({
            where: {
              entity_id: {
                [Op.in]: contactEntityIds
              }
            }
          })
        : [];

    const schedules =
      scheduleEntityIds.length > 0
        ? await BbScheduleModel.findAll({
            where: {
              entity_id: {
                [Op.in]: scheduleEntityIds
              }
            }
          })
        : [];

    const blockTypes =
      dynamicTypeIds.size > 0
        ? await BlockTypeModel.findAll({
            where: {
              type_id: {
                [Op.in]: Array.from(dynamicTypeIds)
              }
            },
            attributes: ['type_id', 'type_name']
          })
        : [];

    const contactByEntityId = new Map<number, BbContactModel>();
    for (const contact of contacts) {
      contactByEntityId.set(Number(contact.entity_id), contact);
    }

    const schedulesByEntityId = new Map<number, BbScheduleModel[]>();
    for (const schedule of schedules) {
      const key = Number(schedule.entity_id);
      const rows = schedulesByEntityId.get(key) ?? [];
      rows.push(schedule);
      schedulesByEntityId.set(key, rows);
    }

    const blockTypeById = new Map<number, BlockTypeModel>();
    for (const blockType of blockTypes) {
      blockTypeById.set(Number(blockType.type_id), blockType);
    }

    const knowledgeItems: KnowledgeItem[] = [];

    // Feature 8.6 sorting policy (documented only): CONTACT first, then SCHEDULE, then DYNAMIC; newest first per kind.
    // If CONTACT/SCHEDULE already fill MAX_CONTEXT_ITEMS, dynamic items are naturally dropped after ranking in 8.6.
    for (const entityId of orderedEntityIds) {
      const entity = entityById.get(entityId);
      if (!entity) {
        continue;
      }

      if (entity.entity_type === 'CONTACT') {
        const contact = contactByEntityId.get(entityId);
        if (!contact) {
          continue;
        }

        knowledgeItems.push({
          kind: 'CONTACT',
          entityId,
          createdAt: entity.created_at,
          contact: this.toPlainRecord(contact)
        });
        continue;
      }

      if (entity.entity_type === 'SCHEDULE') {
        const groupedSchedules = schedulesByEntityId.get(entityId) ?? [];
        knowledgeItems.push({
          kind: 'SCHEDULE',
          entityId,
          createdAt: entity.created_at,
          schedules: groupedSchedules.map((schedule) => this.toPlainRecord(schedule))
        });
        continue;
      }

      if (typeof entity.type_id === 'number') {
        const blockType = blockTypeById.get(Number(entity.type_id));
        knowledgeItems.push({
          kind: 'DYNAMIC',
          entityId,
          createdAt: entity.created_at,
          typeId: Number(entity.type_id),
          typeName: blockType?.type_name ?? 'UNKNOWN_TYPE',
          data: this.normalizeDynamicData(entity.data)
        });
      }
    }

    return knowledgeItems;
  }

  // resolveChatbot enforces the multi-tenant boundary: all downstream queries must use this resolved chatbotId.
  private static async resolveChatbot(input: ChatRuntimeInput): Promise<ResolvedChatbotContext> {
    let chatbot: ChatbotModel | null = null;

    if (typeof input.chatbotId === 'number') {
      chatbot = await ChatbotModel.findByPk(input.chatbotId);
    } else if (input.domain) {
      chatbot = await ChatbotModel.findOne({ where: { domain: input.domain } });
    } else {
      throw new AppError('chatbotId or domain is required', 400, 'VALIDATION_ERROR');
    }

    if (!chatbot) {
      throw new AppError('Chatbot not found', 404, 'CHATBOT_NOT_FOUND');
    }

    return {
      chatbotId: Number(chatbot.chatbot_id),
      displayName: chatbot.display_name
    };
  }

  // toPlainRecord converts Sequelize instances into serializable plain objects for context payload safety.
  private static toPlainRecord<T extends { toJSON?: () => object }>(row: T): Record<string, unknown> {
    if (typeof row.toJSON === 'function') {
      return row.toJSON() as Record<string, unknown>;
    }

    return { ...(row as unknown as Record<string, unknown>) };
  }

  // normalizeDynamicData guarantees DYNAMIC context always exposes an object payload.
  private static normalizeDynamicData(data: unknown): Record<string, unknown> {
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      return data as Record<string, unknown>;
    }

    return {};
  }
}
