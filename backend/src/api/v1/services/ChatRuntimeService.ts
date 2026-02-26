import { Op } from 'sequelize';
import { MAX_CHAT_HISTORY_MESSAGES, MAX_CONTEXT_ITEMS } from '../../../config/constants';
import { AppError } from '../errors/AppError';
import { ChatRuntimeInput, ChatRuntimeResult } from '../interfaces/ChatRuntime';
import { KnowledgeItem, KnowledgeItemKind } from '../interfaces/KnowledgeItem';
import { BbContactModel } from '../models/BbContactModel';
import { BbEntityModel } from '../models/BbEntityModel';
import { BbScheduleModel } from '../models/BbScheduleModel';
import { BlockTypeModel } from '../models/BlockTypeModel';
import { ChatbotItemModel } from '../models/ChatbotItemModel';
import { ChatbotItemTagModel } from '../models/ChatbotItemTagModel';
import { ChatbotModel } from '../models/ChatbotModel';
import { TagModel } from '../models/TagModel';
import { LLMError, LLMService } from './LLMService';
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
// Feature 8.5 added tenant-scoped batch retrieval to build KnowledgeItem[] without N+1 queries.
// Feature 8.6 adds deterministic ranking + trimming so context stays inside LLM window budgets.
// Feature 8.7 completes this flow by delegating final answer generation to LLMService with Gemini.
export class ChatRuntimeService {
  // chat resolves tenant scope, classifies user intent, fetches knowledge, selects context, and returns source attribution.
  static async chat(input: ChatRuntimeInput): Promise<ChatRuntimeResult> {
    const { chatbotId, displayName } = await this.resolveChatbot(input);
    const queryTags = await TagService.classifyQuestion(input.message);

    if (queryTags.length === 0) {
      throw new AppError('No relevant tags for this question', 400, 'NO_RELEVANT_TAG');
    }

    const knowledgeItems = await this.fetchKnowledgeItems(chatbotId, queryTags);
    const selectedItems = this.selectContextItems(knowledgeItems);
    const contextText = this.buildContextText(selectedItems);

    try {
      const answer = await LLMService.askGemini({
        chatbotDisplayName: displayName || input.domain || 'Chatbot',
        message: input.message,
        history: input.history,
        contextText,
        maxHistoryMessages: MAX_CHAT_HISTORY_MESSAGES,
        // English runtime locale keeps chatbot answers aligned with the current product language requirement.
        locale: 'en'
      });

      return {
        answer,
        sourceItems: selectedItems.map((item) => ({
          entity_id: item.entityId,
          entity_type: item.kind,
          tags: queryTags
        }))
      };
    } catch (err: unknown) {
      // ChatRuntimeService maps low-level LLMError to a domain-level LLM_UNAVAILABLE error.
      if (err instanceof LLMError) {
        throw new AppError(
          'The answer generation service is temporarily unavailable.',
          503,
          'LLM_UNAVAILABLE'
        );
      }

      throw err;
    }
  }

  // handleChat remains as compatibility alias while existing callers migrate to chat(...).
  static async handleChat(input: ChatRuntimeInput): Promise<ChatRuntimeResult> {
    return this.chat(input);
  }

  // fetchKnowledgeItems retrieves all tenant-scoped entities matching query tags using batched table reads.
  // The method intentionally returns the full raw set; selection/ranking is performed later in selectContextItems.
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

    // Empty retrieval is a valid state; downstream policy decides how to answer with zero context.
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

  // getKindPriority enforces strict business precedence: CONTACT first, then SCHEDULE, then DYNAMIC.
  // This is intentionally non-proportional: once the limit is hit, lower-priority kinds are sacrificed first.
  private static getKindPriority(kind: KnowledgeItemKind): number {
    if (kind === 'CONTACT') return 1;
    if (kind === 'SCHEDULE') return 2;
    return 3;
  }

  // selectContextItems applies deterministic ordering and trims to MAX_CONTEXT_ITEMS.
  // Sorting policy: kind priority ASC, createdAt DESC, then entityId ASC for stable tie-breaking.
  // When CONTACT + SCHEDULE already fill the window, DYNAMIC items are fully excluded by design.
  private static selectContextItems(allItems: KnowledgeItem[]): KnowledgeItem[] {
    const sortedItems = [...allItems].sort((a, b) => {
      const priorityDiff = this.getKindPriority(a.kind) - this.getKindPriority(b.kind);
      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      const createdAtDiff = b.createdAt.getTime() - a.createdAt.getTime();
      if (createdAtDiff !== 0) {
        return createdAtDiff;
      }

      return a.entityId - b.entityId;
    });

    return sortedItems.slice(0, MAX_CONTEXT_ITEMS);
  }

  // buildContextText converts selected items into deterministic plain text consumed by Gemini prompts.
  // selectedItems are already tenant-scoped from resolveChatbot, so this context never leaks other chatbot/company data.
  // If a user asks about another chatbot, those records are absent here and systemInstruction forces an explicit unknown answer.
  private static buildContextText(selectedItems: KnowledgeItem[]): string {
    const lines: string[] = ['Chatbot knowledge context:'];

    for (const item of selectedItems) {
      if (item.kind === 'CONTACT') {
        lines.push(`CONTACT (entityId=${item.entityId}):`);
        for (const [key, value] of Object.entries(item.contact)) {
          lines.push(`  ${key}: ${String(value)}`);
        }
        continue;
      }

      if (item.kind === 'SCHEDULE') {
        lines.push(`SCHEDULE (entityId=${item.entityId}):`);
        for (const row of item.schedules) {
          const day = String(row.day_of_week ?? row.day ?? 'UNKNOWN_DAY');
          const open = String(row.open_time ?? row.open ?? 'N/A');
          const close = String(row.close_time ?? row.close ?? 'N/A');
          lines.push(`  day: ${day}, open: ${open}, close: ${close}`);
        }
        continue;
      }

      lines.push(`DYNAMIC (entityId=${item.entityId}, type=${item.typeName}):`);
      lines.push(`  data: ${JSON.stringify(item.data)}`);
    }

    return lines.join('\n');
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
