import { Op } from 'sequelize';
import { AppError } from '../errors/AppError';
import { ChatRuntimeRequestPayload, ChatRuntimeResponseDTO, ChatRuntimeSourceItem } from '../interfaces/ChatRuntime';
import { BbContactModel } from '../models/BbContactModel';
import { BbEntityModel } from '../models/BbEntityModel';
import { BbScheduleModel } from '../models/BbScheduleModel';
import { BlockTypeModel } from '../models/BlockTypeModel';
import { ChatbotItemModel } from '../models/ChatbotItemModel';
import { ChatbotItemTagModel } from '../models/ChatbotItemTagModel';
import { ChatbotModel } from '../models/ChatbotModel';
import { TagModel } from '../models/TagModel';

interface ContextItem {
  entityId: number;
  entityType: string;
  tags: string[];
  payload: Record<string, unknown>;
}

// ChatRuntimeService orchestrates the public runtime flow for visitor questions.
// It resolves chatbot scope by chatbotId/domain, loads tenant-owned context blocks, and builds a safe answer payload.
// In v1 we keep answer generation deterministic and server-controlled to avoid trusting user-provided history.
// Source items are returned so frontend/debug tooling can explain where the response context came from.
export class ChatRuntimeService {
  async handleChat(payload: ChatRuntimeRequestPayload): Promise<ChatRuntimeResponseDTO> {
    const chatbot = await this.resolveChatbot(payload);
    const contextItems = await this.loadContextItems(Number(chatbot.chatbot_id));

    const answer = this.composeAnswer(chatbot.display_name, payload.message, payload.history ?? [], contextItems);

    return {
      answer,
      sourceItems: contextItems.map((item) => ({
        entity_id: item.entityId,
        entity_type: item.entityType,
        tags: item.tags
      }))
    };
  }

  private async resolveChatbot(payload: ChatRuntimeRequestPayload): Promise<ChatbotModel> {
    if (payload.chatbotId) {
      const chatbot = await ChatbotModel.findByPk(payload.chatbotId);
      if (!chatbot) {
        throw new AppError('Chatbot not found', 404, 'CHATBOT_NOT_FOUND');
      }

      return chatbot;
    }

    const chatbot = await ChatbotModel.findOne({
      where: { domain: payload.domain }
    });

    if (!chatbot) {
      throw new AppError('Chatbot not found for this domain', 404, 'CHATBOT_NOT_FOUND');
    }

    return chatbot;
  }

  private async loadContextItems(chatbotId: number): Promise<ContextItem[]> {
    const items = await ChatbotItemModel.findAll({
      where: { chatbot_id: chatbotId },
      order: [['created_at', 'DESC']]
    });

    const context: ContextItem[] = [];
    for (const item of items) {
      const entity = await BbEntityModel.findByPk(item.entity_id);
      if (!entity) {
        continue;
      }

      const tags = await this.findTagsForItem(Number(item.item_id));
      const contextItem = await this.hydrateContextEntity(Number(entity.entity_id), entity, tags);
      if (contextItem) {
        context.push(contextItem);
      }
    }

    return context;
  }

  private async findTagsForItem(itemId: number): Promise<string[]> {
    const itemTags = await ChatbotItemTagModel.findAll({
      where: { item_id: itemId },
      include: [{ model: TagModel, as: 'tag' }]
    });

    return itemTags
      .map((row) => (row.get('tag') as TagModel | undefined)?.tag_code)
      .filter((tagCode): tagCode is string => typeof tagCode === 'string');
  }

  private async hydrateContextEntity(entityId: number, entity: BbEntityModel, tags: string[]): Promise<ContextItem | null> {
    if (entity.entity_type === 'CONTACT') {
      const contact = await BbContactModel.findByPk(entityId);
      if (!contact) return null;

      return {
        entityId,
        entityType: 'CONTACT',
        tags,
        payload: {
          org_name: contact.org_name,
          phone: contact.phone,
          email: contact.email,
          address_text: contact.address_text,
          city: contact.city,
          country: contact.country,
          hours_text: contact.hours_text
        }
      };
    }

    if (entity.entity_type === 'SCHEDULE') {
      const schedule = await BbScheduleModel.findByPk(entityId);
      if (!schedule) return null;

      return {
        entityId,
        entityType: 'SCHEDULE',
        tags,
        payload: {
          title: schedule.title,
          day_of_week: schedule.day_of_week,
          open_time: schedule.open_time,
          close_time: schedule.close_time,
          notes: schedule.notes
        }
      };
    }

    if (entity.type_id) {
      const dynamicType = await BlockTypeModel.findOne({
        where: {
          type_id: entity.type_id,
          [Op.or]: [{ chatbot_id: null }, { chatbot_id: { [Op.ne]: null } }]
        }
      });

      return {
        entityId,
        entityType: dynamicType ? `DYNAMIC:${dynamicType.type_name}` : 'DYNAMIC',
        tags,
        payload: (entity.data ?? {}) as Record<string, unknown>
      };
    }

    return null;
  }

  private composeAnswer(
    chatbotName: string,
    message: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
    contextItems: ContextItem[]
  ): string {
    if (contextItems.length === 0) {
      return `I could not find configured knowledge for ${chatbotName} yet. Please ask the owner to add contact, schedules, or custom block data.`;
    }

    const lastTurns = history.slice(-10).map((entry) => `${entry.role}: ${entry.content}`).join(' | ');
    const condensedContext = contextItems
      .slice(0, 6)
      .map((item) => `${item.entityType} ${JSON.stringify(item.payload)}`)
      .join(' ; ');

    return `Based on ${chatbotName} data, here is the best answer to "${message}": ${condensedContext}.${
      lastTurns ? ` Previous conversation (for continuity only): ${lastTurns}` : ''
    }`;
  }
}
