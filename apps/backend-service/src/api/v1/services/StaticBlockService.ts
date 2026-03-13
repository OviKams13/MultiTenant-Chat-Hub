import { Transaction } from 'sequelize';
import { sequelize } from '../../../config/DatabaseConfig';
import { AppError } from '../errors/AppError';
import { ContactCreatePayload, ContactDTO, ContactUpdatePayload } from '../interfaces/ContactBlock';
import { ScheduleCreatePayload, ScheduleDTO, ScheduleUpdatePayload } from '../interfaces/ScheduleBlock';
import { BbContactModel } from '../models/BbContactModel';
import { BbEntityModel } from '../models/BbEntityModel';
import { BbScheduleModel } from '../models/BbScheduleModel';
import { ChatbotItemModel } from '../models/ChatbotItemModel';
import { ChatbotItemTagModel } from '../models/ChatbotItemTagModel';
import { ChatbotModel } from '../models/ChatbotModel';
import { TagService } from './TagService';

// StaticBlockService centralizes Contact/Schedule static block rules for Feature 4.
// Every public method enforces tenant ownership before touching block-related tables.
// Create/delete operations use transactions to keep bb_entities, items, and tags consistent.
// Tag defaults are delegated to TagService so taxonomy logic stays in one dedicated module.
export class StaticBlockService {
  private readonly tagService = new TagService();

  // createContact provisions a single CONTACT block for the chatbot and applies default tags.
  async createContact(chatbotId: number, userId: number, payload: ContactCreatePayload): Promise<ContactDTO> {
    await this.ensureOwnedChatbot(chatbotId, userId);

    const existingContact = await ChatbotItemModel.findOne({
      where: { chatbot_id: chatbotId },
      include: [{ model: BbEntityModel, as: 'entity', where: { entity_type: 'CONTACT' }, required: true }]
    });

    if (existingContact) {
      throw new AppError('Contact already exists for this chatbot', 409, 'CONTACT_ALREADY_EXISTS');
    }

    const tagCodes = this.tagService.getDefaultTagsForStatic('CONTACT');
    const tagMap = await this.tagService.resolveTagCodesToIds(tagCodes);

    return sequelize.transaction(async (transaction) => {
      const entity = await BbEntityModel.create(
        {
          entity_type: 'CONTACT',
          type_id: null,
          data: null
        },
        { transaction }
      );

      const contact = await BbContactModel.create(
        {
          entity_id: Number(entity.entity_id),
          org_name: payload.org_name,
          phone: payload.phone ?? null,
          email: payload.email ?? null,
          address_text: payload.address_text ?? null,
          city: payload.city ?? null,
          country: payload.country ?? null,
          hours_text: payload.hours_text ?? null
        },
        { transaction }
      );

      const item = await ChatbotItemModel.create(
        {
          chatbot_id: chatbotId,
          entity_id: Number(entity.entity_id)
        },
        { transaction }
      );

      await this.assignDefaultTags(item.item_id, tagMap, transaction);
      return this.toContactDTO(chatbotId, contact);
    });
  }

  // getContact returns the chatbot contact block while hiding cross-tenant entities.
  async getContact(chatbotId: number, userId: number): Promise<ContactDTO> {
    await this.ensureOwnedChatbot(chatbotId, userId);

    const item = await ChatbotItemModel.findOne({
      where: { chatbot_id: chatbotId },
      include: [{ model: BbEntityModel, as: 'entity', where: { entity_type: 'CONTACT' }, required: true }]
    });

    if (!item) {
      throw new AppError('Contact not found', 404, 'CONTACT_NOT_FOUND');
    }

    const contact = await BbContactModel.findByPk(item.entity_id);
    if (!contact) {
      throw new AppError('Contact not found', 404, 'CONTACT_NOT_FOUND');
    }

    return this.toContactDTO(chatbotId, contact);
  }

  // updateContact edits only bb_contacts fields and keeps links/tags untouched.
  async updateContact(chatbotId: number, userId: number, payload: ContactUpdatePayload): Promise<ContactDTO> {
    await this.ensureOwnedChatbot(chatbotId, userId);

    const item = await ChatbotItemModel.findOne({
      where: { chatbot_id: chatbotId },
      include: [{ model: BbEntityModel, as: 'entity', where: { entity_type: 'CONTACT' }, required: true }]
    });

    if (!item) {
      throw new AppError('Contact not found', 404, 'CONTACT_NOT_FOUND');
    }

    const contact = await BbContactModel.findByPk(item.entity_id);
    if (!contact) {
      throw new AppError('Contact not found', 404, 'CONTACT_NOT_FOUND');
    }

    if (typeof payload.org_name !== 'undefined') contact.org_name = payload.org_name;
    if (typeof payload.phone !== 'undefined') contact.phone = payload.phone;
    if (typeof payload.email !== 'undefined') contact.email = payload.email;
    if (typeof payload.address_text !== 'undefined') contact.address_text = payload.address_text;
    if (typeof payload.city !== 'undefined') contact.city = payload.city;
    if (typeof payload.country !== 'undefined') contact.country = payload.country;
    if (typeof payload.hours_text !== 'undefined') contact.hours_text = payload.hours_text;

    await contact.save();
    return this.toContactDTO(chatbotId, contact);
  }

  // createSchedule creates a SCHEDULE entity/item pair and tags it with schedule defaults.
  async createSchedule(chatbotId: number, userId: number, payload: ScheduleCreatePayload): Promise<ScheduleDTO> {
    await this.ensureOwnedChatbot(chatbotId, userId);

    const tagCodes = this.tagService.getDefaultTagsForStatic('SCHEDULE');
    const tagMap = await this.tagService.resolveTagCodesToIds(tagCodes);

    return sequelize.transaction(async (transaction) => {
      const entity = await BbEntityModel.create(
        {
          entity_type: 'SCHEDULE',
          type_id: null,
          data: null
        },
        { transaction }
      );

      const schedule = await BbScheduleModel.create(
        {
          entity_id: Number(entity.entity_id),
          title: payload.title,
          day_of_week: payload.day_of_week,
          open_time: payload.open_time,
          close_time: payload.close_time,
          notes: payload.notes ?? null
        },
        { transaction }
      );

      const item = await ChatbotItemModel.create(
        {
          chatbot_id: chatbotId,
          entity_id: Number(entity.entity_id)
        },
        { transaction }
      );

      await this.assignDefaultTags(item.item_id, tagMap, transaction);
      return this.toScheduleDTO(chatbotId, schedule);
    });
  }

  // listSchedules returns all schedule slots owned by the chatbot in deterministic order.
  async listSchedules(chatbotId: number, userId: number): Promise<ScheduleDTO[]> {
    await this.ensureOwnedChatbot(chatbotId, userId);

    const items = await ChatbotItemModel.findAll({
      where: { chatbot_id: chatbotId },
      include: [{ model: BbEntityModel, as: 'entity', where: { entity_type: 'SCHEDULE' }, required: true }],
      order: [['entity_id', 'ASC']]
    });

    if (items.length === 0) {
      return [];
    }

    const schedules = await BbScheduleModel.findAll({
      where: { entity_id: items.map((item) => item.entity_id) },
      order: [['entity_id', 'ASC']]
    });

    return schedules.map((record) => this.toScheduleDTO(chatbotId, record));
  }

  // updateSchedule validates ownership + entity type and then updates bb_schedules only.
  async updateSchedule(chatbotId: number, userId: number, entityId: number, payload: ScheduleUpdatePayload): Promise<ScheduleDTO> {
    await this.ensureOwnedChatbot(chatbotId, userId);
    await this.ensureOwnedScheduleEntity(chatbotId, entityId);

    const schedule = await BbScheduleModel.findByPk(entityId);
    if (!schedule) {
      throw new AppError('Schedule not found', 404, 'SCHEDULE_NOT_FOUND');
    }

    if (typeof payload.title !== 'undefined') schedule.title = payload.title;
    if (typeof payload.day_of_week !== 'undefined') schedule.day_of_week = payload.day_of_week;
    if (typeof payload.open_time !== 'undefined') schedule.open_time = payload.open_time;
    if (typeof payload.close_time !== 'undefined') schedule.close_time = payload.close_time;
    if (typeof payload.notes !== 'undefined') schedule.notes = payload.notes;

    await schedule.save();
    return this.toScheduleDTO(chatbotId, schedule);
  }

  // deleteSchedule removes tags/item/data/entity in a transaction to keep index consistency.
  async deleteSchedule(chatbotId: number, userId: number, entityId: number): Promise<void> {
    await this.ensureOwnedChatbot(chatbotId, userId);

    const item = await this.ensureOwnedScheduleEntity(chatbotId, entityId);

    await sequelize.transaction(async (transaction) => {
      await ChatbotItemTagModel.destroy({ where: { item_id: item.item_id }, transaction });
      await ChatbotItemModel.destroy({ where: { item_id: item.item_id }, transaction });
      await BbScheduleModel.destroy({ where: { entity_id: entityId }, transaction });
      await BbEntityModel.destroy({ where: { entity_id: entityId }, transaction });
    });
  }

  // ensureOwnedChatbot hides foreign-tenant resources by always returning CHATBOT_NOT_FOUND.
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

  // ensureOwnedScheduleEntity guarantees entity belongs to chatbot and is of SCHEDULE type.
  private async ensureOwnedScheduleEntity(chatbotId: number, entityId: number): Promise<ChatbotItemModel> {
    const item = await ChatbotItemModel.findOne({
      where: {
        chatbot_id: chatbotId,
        entity_id: entityId
      },
      include: [{ model: BbEntityModel, as: 'entity', where: { entity_type: 'SCHEDULE' }, required: true }]
    });

    if (!item) {
      throw new AppError('Schedule not found', 404, 'SCHEDULE_NOT_FOUND');
    }

    return item;
  }

  // assignDefaultTags inserts one row per default tag id for the newly created chatbot item.
  private async assignDefaultTags(itemId: number, tagMap: Map<string, number>, transaction: Transaction): Promise<void> {
    const rows = [...tagMap.values()].map((tagId) => ({ item_id: itemId, tag_id: tagId }));
    if (rows.length > 0) {
      await ChatbotItemTagModel.bulkCreate(rows, { transaction, ignoreDuplicates: true });
    }
  }

  // DTO mappers keep API contract stable even if model internals evolve later.
  private toContactDTO(chatbotId: number, model: BbContactModel): ContactDTO {
    return {
      entity_id: Number(model.entity_id),
      chatbot_id: chatbotId,
      org_name: model.org_name,
      phone: model.phone,
      email: model.email,
      address_text: model.address_text,
      city: model.city,
      country: model.country,
      hours_text: model.hours_text
    };
  }

  private toScheduleDTO(chatbotId: number, model: BbScheduleModel): ScheduleDTO {
    return {
      entity_id: Number(model.entity_id),
      chatbot_id: chatbotId,
      title: model.title,
      day_of_week: model.day_of_week,
      open_time: String(model.open_time),
      close_time: String(model.close_time),
      notes: model.notes
    };
  }
}
