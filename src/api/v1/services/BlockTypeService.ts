import { Op } from 'sequelize';
import { AppError } from '../errors/AppError';
import { BlockTypeDTO, CreateBlockTypePayload, UpdateBlockTypePayload } from '../interfaces/BlockType';
import { BbEntityModel } from '../models/BbEntityModel';
import { BlockTypeModel } from '../models/BlockTypeModel';
import { ChatbotModel } from '../models/ChatbotModel';

// BlockTypeService centralizes dynamic block-type business rules for Feature 5.
// Every public method verifies chatbot ownership to enforce tenant isolation.
// Global system block types are readable but protected from update/delete operations.
// DTO mapping exposes a stable API contract while hiding ORM-specific internals.
export class BlockTypeService {
  // createBlockType provisions a chatbot-scoped dynamic block definition.
  async createBlockType(chatbotId: number, userId: number, payload: CreateBlockTypePayload): Promise<BlockTypeDTO> {
    await this.ensureOwnedChatbot(chatbotId, userId);

    const normalizedTypeName = payload.type_name.trim().toUpperCase();
    const existing = await BlockTypeModel.findOne({
      where: {
        chatbot_id: chatbotId,
        type_name: normalizedTypeName
      }
    });

    if (existing) {
      throw new AppError('Block type name already exists', 409, 'BLOCK_TYPE_NAME_ALREADY_EXISTS');
    }

    const created = await BlockTypeModel.create({
      chatbot_id: chatbotId,
      type_name: normalizedTypeName,
      description: payload.description?.trim() || null,
      schema_definition: payload.schema_definition,
      is_system: false
    });

    return this.toDTO(created);
  }

  // listBlockTypesForChatbot returns chatbot-owned types plus global system templates.
  async listBlockTypesForChatbot(chatbotId: number, userId: number): Promise<BlockTypeDTO[]> {
    await this.ensureOwnedChatbot(chatbotId, userId);

    const records = await BlockTypeModel.findAll({
      where: {
        [Op.or]: [{ chatbot_id: chatbotId }, { chatbot_id: null, is_system: true }]
      },
      order: [
        ['is_system', 'DESC'],
        ['type_name', 'ASC']
      ]
    });

    return records.map((record) => this.toDTO(record));
  }

  // getBlockTypeForChatbot resolves one type by allowing chatbot-specific or global-system scope.
  async getBlockTypeForChatbot(chatbotId: number, userId: number, typeId: number): Promise<BlockTypeDTO> {
    await this.ensureOwnedChatbot(chatbotId, userId);

    const record = await this.findReadableType(chatbotId, typeId);
    if (!record) {
      throw new AppError('Block type not found', 404, 'BLOCK_TYPE_NOT_FOUND');
    }

    return this.toDTO(record);
  }

  // updateBlockTypeForChatbot modifies only chatbot-owned custom type definitions.
  async updateBlockTypeForChatbot(
    chatbotId: number,
    userId: number,
    typeId: number,
    payload: UpdateBlockTypePayload
  ): Promise<BlockTypeDTO> {
    await this.ensureOwnedChatbot(chatbotId, userId);

    const record = await BlockTypeModel.findOne({
      where: {
        type_id: typeId,
        chatbot_id: chatbotId,
        is_system: false
      }
    });

    if (!record) {
      throw new AppError('Block type not found', 404, 'BLOCK_TYPE_NOT_FOUND');
    }

    if (payload.type_name) {
      const normalizedTypeName = payload.type_name.trim().toUpperCase();
      const existing = await BlockTypeModel.findOne({
        where: {
          chatbot_id: chatbotId,
          type_name: normalizedTypeName,
          type_id: {
            [Op.ne]: typeId
          }
        }
      });

      if (existing) {
        throw new AppError('Block type name already exists', 409, 'BLOCK_TYPE_NAME_ALREADY_EXISTS');
      }

      record.type_name = normalizedTypeName;
    }

    if (typeof payload.description !== 'undefined') {
      record.description = payload.description?.trim() || null;
    }

    if (typeof payload.schema_definition !== 'undefined') {
      record.schema_definition = payload.schema_definition;
    }

    await record.save();
    return this.toDTO(record);
  }

  // deleteBlockTypeForChatbot removes one chatbot-owned type if not referenced by dynamic entities.
  async deleteBlockTypeForChatbot(chatbotId: number, userId: number, typeId: number): Promise<void> {
    await this.ensureOwnedChatbot(chatbotId, userId);

    const record = await BlockTypeModel.findOne({
      where: {
        type_id: typeId,
        chatbot_id: chatbotId,
        is_system: false
      }
    });

    if (!record) {
      throw new AppError('Block type not found', 404, 'BLOCK_TYPE_NOT_FOUND');
    }

    const inUseCount = await BbEntityModel.count({ where: { type_id: typeId } });
    if (inUseCount > 0) {
      throw new AppError('Block type is in use', 409, 'BLOCK_TYPE_IN_USE');
    }

    await record.destroy();
  }

  // ensureOwnedChatbot hides foreign chatbot existence and enforces multi-tenant boundaries.
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

  // findReadableType authorizes read access to chatbot-owned and global-system definitions.
  private async findReadableType(chatbotId: number, typeId: number): Promise<BlockTypeModel | null> {
    return BlockTypeModel.findOne({
      where: {
        type_id: typeId,
        [Op.or]: [{ chatbot_id: chatbotId }, { chatbot_id: null, is_system: true }]
      }
    });
  }

  // toDTO appends derived scope metadata required by admin UI clients.
  private toDTO(model: BlockTypeModel): BlockTypeDTO {
    return {
      type_id: Number(model.type_id),
      chatbot_id: model.chatbot_id === null ? null : Number(model.chatbot_id),
      type_name: model.type_name,
      description: model.description,
      schema_definition: (model.schema_definition || {}) as Record<string, unknown>,
      is_system: Boolean(model.is_system),
      scope: model.chatbot_id === null ? 'GLOBAL' : 'CHATBOT',
      created_at: model.created_at as Date
    };
  }
}
