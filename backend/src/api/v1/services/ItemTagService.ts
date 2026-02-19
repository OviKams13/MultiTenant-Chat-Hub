import { Transaction } from 'sequelize';
import { sequelize } from '../../../config/DatabaseConfig';
import { AppError } from '../errors/AppError';
import { ItemTagDTO, UpdateItemTagsPayload, UpdateItemTagsResponseDTO } from '../interfaces/ItemTag';
import { ChatbotItemModel } from '../models/ChatbotItemModel';
import { ChatbotItemTagModel } from '../models/ChatbotItemTagModel';
import { ChatbotModel } from '../models/ChatbotModel';
import { TagModel } from '../models/TagModel';
import { TagService } from './TagService';

// ItemTagService owns all business rules for reading/replacing tags on one chatbot item.
// Every public method starts with tenant ownership checks to protect cross-chatbot data.
// PUT uses transaction-wrapped delete+insert so replacement stays atomic under concurrency.
// Tag mapping is normalized into DTOs so controllers stay transport-focused and very thin.
export class ItemTagService {
  private readonly tagService = new TagService();

  // getTagsForItem powers the admin builder panel that displays current item semantics.
  async getTagsForItem(chatbotId: number, userId: number, itemId: number): Promise<ItemTagDTO[]> {
    await this.ensureOwnedChatbot(chatbotId, userId);
    await this.ensureItemBelongsToChatbot(chatbotId, itemId);

    const links = await this.findItemTagLinks(itemId);
    return links.map((link) => this.toTagDTO(link.tag));
  }

  // updateTagsForItem performs full-replacement semantics (new set completely replaces old set).
  // We accept tagCodes or tagIds and normalize into validated numeric IDs before writing.
  // Using one code path after normalization keeps behavior identical across both payload modes.
  // The method returns final resolved tags to support immediate UI refresh without extra GET call.
  async updateTagsForItem(
    chatbotId: number,
    userId: number,
    itemId: number,
    payload: UpdateItemTagsPayload
  ): Promise<UpdateItemTagsResponseDTO> {
    await this.ensureOwnedChatbot(chatbotId, userId);
    await this.ensureItemBelongsToChatbot(chatbotId, itemId);

    const targetTagIds = payload.tagCodes
      ? await this.resolveTagCodesToIds(payload.tagCodes)
      : await this.ensureTagIdsExist(payload.tagIds || []);

    await sequelize.transaction(async (transaction: Transaction) => {
      await ChatbotItemTagModel.destroy({ where: { item_id: itemId }, transaction });

      const rows = targetTagIds.map((tagId) => ({ item_id: itemId, tag_id: tagId }));
      await ChatbotItemTagModel.bulkCreate(rows, { transaction });
    });

    const links = await this.findItemTagLinks(itemId);
    return {
      item_id: itemId,
      chatbot_id: chatbotId,
      tags: links.map((link) => this.toTagDTO(link.tag))
    };
  }

  // ensureOwnedChatbot enforces tenant boundaries before touching item/tag association tables.
  private async ensureOwnedChatbot(chatbotId: number, userId: number): Promise<void> {
    const chatbot = await ChatbotModel.findOne({
      where: {
        chatbot_id: chatbotId,
        user_id: userId
      }
    });

    if (!chatbot) {
      throw new AppError('Chatbot not found', 404, 'CHATBOT_NOT_FOUND');
    }
  }

  // ensureItemBelongsToChatbot blocks access when itemId exists but belongs to another chatbot.
  private async ensureItemBelongsToChatbot(chatbotId: number, itemId: number): Promise<void> {
    const item = await ChatbotItemModel.findOne({ where: { item_id: itemId, chatbot_id: chatbotId } });
    if (!item) {
      throw new AppError('Item not found', 404, 'ITEM_NOT_FOUND');
    }
  }

  private async resolveTagCodesToIds(tagCodes: string[]): Promise<number[]> {
    const normalized = [...new Set(tagCodes.map((code) => code.trim().toUpperCase()).filter((code) => code.length > 0))];
    const mapping = await this.tagService.resolveTagCodesToIds(normalized);
    return normalized.map((code) => Number(mapping.get(code)));
  }

  private async ensureTagIdsExist(tagIds: number[]): Promise<number[]> {
    const normalized = [...new Set(tagIds.map((id) => Number(id)))];
    if (normalized.length === 0) {
      throw new AppError('Validation error', 400, 'VALIDATION_ERROR', {
        tagIds: 'tagIds must be a non-empty array'
      });
    }

    const tags = await TagModel.findAll({ where: { tag_id: normalized } });
    if (tags.length !== normalized.length) {
      const foundIds = new Set(tags.map((tag) => Number(tag.tag_id)));
      const missing = normalized.filter((id) => !foundIds.has(id));
      throw new AppError('One or more tags were not found', 400, 'TAG_NOT_FOUND', { missing });
    }

    return normalized;
  }

  private async findItemTagLinks(itemId: number): Promise<Array<ChatbotItemTagModel & { tag: TagModel }>> {
    const links = await ChatbotItemTagModel.findAll({
      where: { item_id: itemId },
      include: [{ model: TagModel, as: 'tag' }],
      order: [[{ model: TagModel, as: 'tag' }, 'tag_code', 'ASC']]
    });

    return links as Array<ChatbotItemTagModel & { tag: TagModel }>;
  }

  private toTagDTO(tag: TagModel): ItemTagDTO {
    const synonyms = Array.isArray(tag.synonyms_json) ? tag.synonyms_json : [];

    return {
      id: Number(tag.tag_id),
      tag_code: tag.tag_code,
      description: tag.description,
      category: tag.category,
      is_system: tag.is_system,
      synonyms
    };
  }
}
