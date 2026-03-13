import { AppError } from '../errors/AppError';
import { BbContactModel } from '../models/BbContactModel';
import { BbEntityModel } from '../models/BbEntityModel';
import { BbScheduleModel } from '../models/BbScheduleModel';
import { BlockTypeModel } from '../models/BlockTypeModel';
import { ChatbotItemModel } from '../models/ChatbotItemModel';
import { ChatbotModel } from '../models/ChatbotModel';
import { UserModel } from '../models/UserModel';

interface UserChatbotCard {
  id: number;
  display_name: string;
  domain: string;
  created_at: Date;
}

interface OwnerChatbotsGroup {
  owner_id: number;
  owner_email: string;
  chatbots: UserChatbotCard[];
}

interface UserChatbotDetail {
  id: number;
  display_name: string;
  domain: string;
  contact: {
    org_name: string;
    phone: string | null;
    email: string | null;
    address_text: string | null;
    city: string | null;
    country: string | null;
    hours_text: string | null;
  } | null;
  schedules: Array<{
    title: string;
    day_of_week: string;
    open_time: string;
    close_time: string;
    notes: string | null;
  }>;
  custom_blocks: Array<{
    type_id: number;
    type_name: string;
    description: string | null;
    instances: Array<Record<string, unknown>>;
  }>;
}

export class UserBrowseService {
  async listOwnersWithChatbots(): Promise<OwnerChatbotsGroup[]> {
    const rows = await ChatbotModel.findAll({
      include: [{ model: UserModel, as: 'owner', attributes: ['user_id', 'email'] }],
      order: [['created_at', 'DESC']]
    });

    const grouped = new Map<number, OwnerChatbotsGroup>();

    for (const chatbot of rows) {
      const owner = chatbot.get('owner') as UserModel | undefined;
      if (!owner) continue;

      const existing = grouped.get(owner.user_id) ?? {
        owner_id: owner.user_id,
        owner_email: owner.email,
        chatbots: []
      };

      existing.chatbots.push({
        id: chatbot.chatbot_id,
        display_name: chatbot.display_name,
        domain: chatbot.domain,
        created_at: chatbot.created_at as Date
      });

      grouped.set(owner.user_id, existing);
    }

    return Array.from(grouped.values());
  }

  async getChatbotDetail(chatbotId: number): Promise<UserChatbotDetail> {
    const chatbot = await ChatbotModel.findByPk(chatbotId);
    if (!chatbot) {
      throw new AppError('Chatbot not found', 404, 'CHATBOT_NOT_FOUND');
    }

    const contactItem = await ChatbotItemModel.findOne({
      where: { chatbot_id: chatbotId },
      include: [{ model: BbEntityModel, as: 'entity', where: { entity_type: 'CONTACT' }, required: true }]
    });

    const contact = contactItem ? await BbContactModel.findByPk(contactItem.entity_id) : null;

    const scheduleItems = await ChatbotItemModel.findAll({
      where: { chatbot_id: chatbotId },
      include: [{ model: BbEntityModel, as: 'entity', where: { entity_type: 'SCHEDULE' }, required: true }],
      order: [['entity_id', 'ASC']]
    });

    const schedules = scheduleItems.length
      ? await BbScheduleModel.findAll({ where: { entity_id: scheduleItems.map((i) => i.entity_id) }, order: [['entity_id', 'ASC']] })
      : [];

    const blockTypes = await BlockTypeModel.findAll({
      where: { chatbot_id: chatbotId, is_system: false },
      order: [['type_name', 'ASC']]
    });

    const dynamicItems = await ChatbotItemModel.findAll({
      where: { chatbot_id: chatbotId },
      include: [{ model: BbEntityModel, as: 'entity', required: true }]
    });

    const entitiesByType = new Map<number, Record<string, unknown>[]>();
    for (const item of dynamicItems) {
      const entity = item.get('entity') as BbEntityModel | undefined;
      if (!entity?.type_id) continue;
      const current = entitiesByType.get(Number(entity.type_id)) ?? [];
      current.push((entity.data as Record<string, unknown>) ?? {});
      entitiesByType.set(Number(entity.type_id), current);
    }

    const customBlocks = blockTypes.map((type) => ({
      type_id: Number(type.type_id),
      type_name: type.type_name,
      description: type.description,
      instances: entitiesByType.get(Number(type.type_id)) ?? []
    }));

    return {
      id: chatbot.chatbot_id,
      display_name: chatbot.display_name,
      domain: chatbot.domain,
      contact: contact
        ? {
            org_name: contact.org_name,
            phone: contact.phone,
            email: contact.email,
            address_text: contact.address_text,
            city: contact.city,
            country: contact.country,
            hours_text: contact.hours_text
          }
        : null,
      schedules: schedules.map((schedule) => ({
        title: schedule.title,
        day_of_week: schedule.day_of_week,
        open_time: String(schedule.open_time),
        close_time: String(schedule.close_time),
        notes: schedule.notes
      })),
      custom_blocks: customBlocks
    };
  }
}
