import { Op } from 'sequelize';
import { AppError } from '../errors/AppError';
import { ChatbotDTO, CreateChatbotPayload, UpdateChatbotPayload } from '../interfaces/Chatbot';
import { ChatbotModel } from '../models/ChatbotModel';

// ChatbotService encapsulates multi-tenant rules so users can only manage their own chatbots.
// Domain uniqueness is global because chatbot mounting conflicts would break runtime routing.
// All methods return API-safe DTOs with normalized field names.
// Controllers rely on this layer for business consistency and explicit domain errors.
export class ChatbotService {
  // createChatbot provisions a chatbot owned by the authenticated ADMIN user.
  async createChatbot(userId: number, payload: CreateChatbotPayload): Promise<ChatbotDTO> {
    const existingDomain = await ChatbotModel.findOne({ where: { domain: payload.domain } });
    if (existingDomain) {
      throw new AppError('Domain already in use', 409, 'DOMAIN_ALREADY_IN_USE');
    }

    const created = await ChatbotModel.create({
      user_id: userId,
      domain: payload.domain,
      display_name: payload.display_name,
      created_by: userId
    });

    return this.toDTO(created);
  }

  // listChatbotsForUser returns only resources belonging to the current tenant owner.
  async listChatbotsForUser(userId: number): Promise<ChatbotDTO[]> {
    const records = await ChatbotModel.findAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']]
    });

    return records.map((record) => this.toDTO(record));
  }

  // getChatbotByIdForUser enforces ownership checks and hides cross-tenant resource existence.
  async getChatbotByIdForUser(userId: number, chatbotId: number): Promise<ChatbotDTO> {
    const record = await ChatbotModel.findOne({
      where: { chatbot_id: chatbotId, user_id: userId }
    });

    if (!record) {
      throw new AppError('Chatbot not found', 404, 'CHATBOT_NOT_FOUND');
    }

    return this.toDTO(record);
  }

  // updateChatbotForUser updates mutable chatbot fields after uniqueness and ownership checks.
  async updateChatbotForUser(userId: number, chatbotId: number, payload: UpdateChatbotPayload): Promise<ChatbotDTO> {
    const record = await ChatbotModel.findOne({
      where: { chatbot_id: chatbotId, user_id: userId }
    });

    if (!record) {
      throw new AppError('Chatbot not found', 404, 'CHATBOT_NOT_FOUND');
    }

    if (payload.domain && payload.domain !== record.domain) {
      const existingDomain = await ChatbotModel.findOne({
        where: {
          domain: payload.domain,
          chatbot_id: { [Op.ne]: chatbotId }
        }
      });

      if (existingDomain) {
        throw new AppError('Domain already in use', 409, 'DOMAIN_ALREADY_IN_USE');
      }

      record.domain = payload.domain;
    }

    if (payload.display_name) {
      record.display_name = payload.display_name;
    }

    await record.save();
    return this.toDTO(record);
  }

  // deleteChatbotForUser performs hard delete; soft delete can be introduced in future roadmap.
  async deleteChatbotForUser(userId: number, chatbotId: number): Promise<void> {
    const deletedRows = await ChatbotModel.destroy({
      where: { chatbot_id: chatbotId, user_id: userId }
    });

    if (deletedRows === 0) {
      throw new AppError('Chatbot not found', 404, 'CHATBOT_NOT_FOUND');
    }
  }

  // toDTO keeps database column names decoupled from outward API contract names.
  private toDTO(record: ChatbotModel): ChatbotDTO {
    return {
      id: record.chatbot_id,
      domain: record.domain,
      display_name: record.display_name,
      created_at: record.created_at as Date
    };
  }
}
