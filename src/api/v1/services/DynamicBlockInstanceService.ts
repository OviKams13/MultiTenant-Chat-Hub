import { Op, Transaction } from 'sequelize';
import { sequelize } from '../../../config/DatabaseConfig';
import { AppError } from '../errors/AppError';
import { CreateDynamicBlockPayload, DynamicBlockInstanceDTO, UpdateDynamicBlockPayload } from '../interfaces/DynamicBlockInstance';
import { BbEntityModel } from '../models/BbEntityModel';
import { BlockTypeModel } from '../models/BlockTypeModel';
import { ChatbotItemModel } from '../models/ChatbotItemModel';
import { ChatbotItemTagModel } from '../models/ChatbotItemTagModel';
import { ChatbotModel } from '../models/ChatbotModel';
import { TagService } from './TagService';

interface DynamicFieldDefinition {
  name: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'select';
  required?: boolean;
  options?: string[];
}

// DynamicBlockInstanceService drives the full lifecycle of dynamic entities stored in bb_entities.data JSON.
// It enforces tenant ownership, dynamic type visibility, schema-based data validation, and tag auto-assignment.
// Transactions protect create/delete workflows where entity, item, and tag links must stay in sync.
// Controllers remain thin because this service encapsulates all business decisions for Feature X.
export class DynamicBlockInstanceService {
  private readonly tagService = new TagService();

  // createInstance writes one dynamic entity, links it to chatbot_items, and applies default dynamic tags.
  async createInstance(
    chatbotId: number,
    userId: number,
    typeId: number,
    payload: CreateDynamicBlockPayload
  ): Promise<DynamicBlockInstanceDTO> {
    await this.ensureOwnedChatbot(chatbotId, userId);
    const blockType = await this.findAccessibleType(chatbotId, typeId);

    this.validateDataAgainstSchema(payload.data, blockType.schema_definition);

    const entity = await sequelize.transaction(async (transaction: Transaction) => {
      const createdEntity = await BbEntityModel.create(
        {
          entity_type: null,
          type_id: typeId,
          data: payload.data
        },
        { transaction }
      );

      const item = await ChatbotItemModel.create(
        {
          chatbot_id: chatbotId,
          entity_id: Number(createdEntity.entity_id)
        },
        { transaction }
      );

      await this.assignDynamicDefaultTags(item.item_id, blockType.type_name, transaction);
      return createdEntity;
    });

    return this.toDTO(entity, chatbotId, blockType.type_name);
  }

  // listInstances returns all dynamic entities for one chatbot and one type, filtered by ownership-safe item links.
  async listInstances(chatbotId: number, userId: number, typeId: number): Promise<DynamicBlockInstanceDTO[]> {
    await this.ensureOwnedChatbot(chatbotId, userId);
    const blockType = await this.findAccessibleType(chatbotId, typeId);

    const items = await ChatbotItemModel.findAll({
      where: { chatbot_id: chatbotId },
      include: [
        {
          model: BbEntityModel,
          as: 'entity',
          where: { type_id: typeId, entity_type: null },
          required: true
        }
      ],
      order: [[{ model: BbEntityModel, as: 'entity' }, 'created_at', 'DESC']]
    });

    return (items as Array<ChatbotItemModel & { entity: BbEntityModel }>).map((item) =>
      this.toDTO(item.entity, chatbotId, blockType.type_name)
    );
  }

  // getInstance validates the chatbot/item linkage and returns one dynamic entity DTO for admin editing screens.
  async getInstance(chatbotId: number, userId: number, typeId: number, entityId: number): Promise<DynamicBlockInstanceDTO> {
    await this.ensureOwnedChatbot(chatbotId, userId);
    const blockType = await this.findAccessibleType(chatbotId, typeId);
    await this.ensureEntityBelongsToChatbot(chatbotId, entityId);

    const entity = await BbEntityModel.findOne({ where: { entity_id: entityId, type_id: typeId, entity_type: null } });
    if (!entity) {
      throw new AppError('Dynamic block instance not found', 404, 'DYNAMIC_BLOCK_NOT_FOUND');
    }

    return this.toDTO(entity, chatbotId, blockType.type_name);
  }

  // updateInstance replaces the JSON payload after validating against the dynamic type schema definition.
  async updateInstance(
    chatbotId: number,
    userId: number,
    typeId: number,
    entityId: number,
    payload: UpdateDynamicBlockPayload
  ): Promise<DynamicBlockInstanceDTO> {
    await this.ensureOwnedChatbot(chatbotId, userId);
    const blockType = await this.findAccessibleType(chatbotId, typeId);
    await this.ensureEntityBelongsToChatbot(chatbotId, entityId);

    const entity = await BbEntityModel.findOne({ where: { entity_id: entityId, type_id: typeId, entity_type: null } });
    if (!entity) {
      throw new AppError('Dynamic block instance not found', 404, 'DYNAMIC_BLOCK_NOT_FOUND');
    }

    this.validateDataAgainstSchema(payload.data, blockType.schema_definition);
    entity.data = payload.data;
    await entity.save();

    return this.toDTO(entity, chatbotId, blockType.type_name);
  }

  // deleteInstance removes item tags, item link, and entity in one transaction to avoid orphaned rows.
  async deleteInstance(chatbotId: number, userId: number, typeId: number, entityId: number): Promise<void> {
    await this.ensureOwnedChatbot(chatbotId, userId);
    await this.findAccessibleType(chatbotId, typeId);

    const item = await ChatbotItemModel.findOne({ where: { chatbot_id: chatbotId, entity_id: entityId } });
    if (!item) {
      throw new AppError('Dynamic block instance not found', 404, 'DYNAMIC_BLOCK_NOT_FOUND');
    }

    const entity = await BbEntityModel.findOne({ where: { entity_id: entityId, type_id: typeId, entity_type: null } });
    if (!entity) {
      throw new AppError('Dynamic block instance not found', 404, 'DYNAMIC_BLOCK_NOT_FOUND');
    }

    await sequelize.transaction(async (transaction: Transaction) => {
      await ChatbotItemTagModel.destroy({ where: { item_id: item.item_id }, transaction });
      await ChatbotItemModel.destroy({ where: { item_id: item.item_id }, transaction });
      await BbEntityModel.destroy({ where: { entity_id: entityId }, transaction });
    });
  }

  private async ensureOwnedChatbot(chatbotId: number, userId: number): Promise<void> {
    const chatbot = await ChatbotModel.findOne({ where: { chatbot_id: chatbotId, user_id: userId } });
    if (!chatbot) {
      throw new AppError('Chatbot not found', 404, 'CHATBOT_NOT_FOUND');
    }
  }

  private async findAccessibleType(chatbotId: number, typeId: number): Promise<BlockTypeModel> {
    const type = await BlockTypeModel.findOne({
      where: {
        type_id: typeId,
        [Op.or]: [{ chatbot_id: chatbotId }, { chatbot_id: null, is_system: true }]
      }
    });

    if (!type) {
      throw new AppError('Block type not found', 404, 'BLOCK_TYPE_NOT_FOUND');
    }

    return type;
  }

  private async ensureEntityBelongsToChatbot(chatbotId: number, entityId: number): Promise<void> {
    const item = await ChatbotItemModel.findOne({ where: { chatbot_id: chatbotId, entity_id: entityId } });
    if (!item) {
      throw new AppError('Dynamic block instance not found', 404, 'DYNAMIC_BLOCK_NOT_FOUND');
    }
  }

  private async assignDynamicDefaultTags(itemId: number, typeName: string, transaction: Transaction): Promise<void> {
    const tagCodes = this.tagService.getDefaultTagsForDynamic(typeName);
    if (tagCodes.length === 0) {
      return;
    }

    const tagMap = await this.tagService.resolveTagCodesToIds(tagCodes);
    const rows = Array.from(tagMap.values()).map((tagId) => ({ item_id: itemId, tag_id: tagId }));
    if (rows.length > 0) {
      await ChatbotItemTagModel.bulkCreate(rows, { transaction });
    }
  }

  // Schema validation is intentionally explicit so reviewers can trace every rule back to business requirements.
  // Required fields must exist, known fields must match declared types, and select fields must respect options.
  // Unknown keys are rejected to keep bb_entities.data aligned with the block type contract.
  // Violations are returned as INVALID_DYNAMIC_DATA with field-level details for admin form troubleshooting.
  private validateDataAgainstSchema(data: Record<string, unknown>, schemaDefinition: Record<string, unknown>): void {
    const fields = Array.isArray((schemaDefinition as { fields?: unknown[] }).fields)
      ? ((schemaDefinition as { fields: unknown[] }).fields as DynamicFieldDefinition[])
      : null;

    if (!fields || fields.length === 0) {
      throw new AppError('Block type schema is invalid', 400, 'INVALID_DYNAMIC_SCHEMA');
    }

    const fieldByName = new Map<string, DynamicFieldDefinition>();
    for (const field of fields) {
      fieldByName.set(field.name, field);
    }

    const unknownKeys = Object.keys(data).filter((key) => !fieldByName.has(key));
    if (unknownKeys.length > 0) {
      throw new AppError('Validation error', 400, 'INVALID_DYNAMIC_DATA', { unknownFields: unknownKeys });
    }

    for (const field of fields) {
      const value = data[field.name];
      const isMissing = typeof value === 'undefined' || value === null || value === '';

      if (field.required && isMissing) {
        throw new AppError('Validation error', 400, 'INVALID_DYNAMIC_DATA', {
          field: field.name,
          reason: 'MISSING_REQUIRED_FIELD'
        });
      }

      if (isMissing) {
        continue;
      }

      switch (field.type) {
        case 'string':
          if (typeof value !== 'string') {
            throw new AppError('Validation error', 400, 'INVALID_DYNAMIC_DATA', { field: field.name, expected: 'string' });
          }
          break;
        case 'number':
          if (typeof value !== 'number' || Number.isNaN(value)) {
            throw new AppError('Validation error', 400, 'INVALID_DYNAMIC_DATA', { field: field.name, expected: 'number' });
          }
          break;
        case 'boolean':
          if (typeof value !== 'boolean') {
            throw new AppError('Validation error', 400, 'INVALID_DYNAMIC_DATA', { field: field.name, expected: 'boolean' });
          }
          break;
        case 'date':
          if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
            throw new AppError('Validation error', 400, 'INVALID_DYNAMIC_DATA', { field: field.name, expected: 'date' });
          }
          break;
        case 'select': {
          const options = Array.isArray(field.options) ? field.options : [];
          if (options.length === 0) {
            throw new AppError('Block type schema is invalid', 400, 'INVALID_DYNAMIC_SCHEMA', {
              field: field.name,
              reason: 'SELECT_OPTIONS_REQUIRED'
            });
          }

          if (typeof value !== 'string' || !options.includes(value)) {
            throw new AppError('Validation error', 400, 'INVALID_DYNAMIC_DATA', {
              field: field.name,
              reason: 'INVALID_SELECT_OPTION',
              options
            });
          }
          break;
        }
        default:
          throw new AppError('Block type schema is invalid', 400, 'INVALID_DYNAMIC_SCHEMA', {
            field: field.name,
            reason: 'UNSUPPORTED_FIELD_TYPE'
          });
      }
    }
  }

  private toDTO(entity: BbEntityModel, chatbotId: number, typeName: string): DynamicBlockInstanceDTO {
    return {
      entity_id: Number(entity.entity_id),
      chatbot_id: chatbotId,
      type_id: Number(entity.type_id),
      type_name: typeName,
      data: (entity.data || {}) as Record<string, unknown>,
      created_at: entity.created_at as Date
    };
  }
}
