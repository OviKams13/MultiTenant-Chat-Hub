import { AppError } from '../errors/AppError';
import { AllowedOriginDTO, CreateAllowedOriginPayload } from '../interfaces/ChatbotAllowedOrigin';
import { ChatbotAllowedOriginModel } from '../models/ChatbotAllowedOriginModel';
import { ChatbotModel } from '../models/ChatbotModel';

export class ChatbotAllowedOriginService {
  async listAllowedOriginsForChatbot(
    userId: number,
    chatbotId: number,
  ): Promise<AllowedOriginDTO[]> {
    await this.ensureOwnership(userId, chatbotId);

    const records = await ChatbotAllowedOriginModel.findAll({
      where: { chatbot_id: chatbotId },
      order: [['allowed_origin_id', 'ASC']],
    });

    return records.map((record) => this.toDTO(record));
  }

  async createAllowedOriginForChatbot(
    userId: number,
    chatbotId: number,
    payload: CreateAllowedOriginPayload,
  ): Promise<AllowedOriginDTO> {
    await this.ensureOwnership(userId, chatbotId);

    const existing = await ChatbotAllowedOriginModel.findOne({
      where: {
        chatbot_id: chatbotId,
        origin: payload.origin,
      },
    });

    if (existing) {
      throw new AppError('Allowed origin already exists', 409, 'ALLOWED_ORIGIN_ALREADY_EXISTS');
    }

    const created = await ChatbotAllowedOriginModel.create({
      chatbot_id: chatbotId,
      origin: payload.origin,
    });

    return this.toDTO(created);
  }

  async deleteAllowedOriginForChatbot(
    userId: number,
    chatbotId: number,
    allowedOriginId: number,
  ): Promise<void> {
    await this.ensureOwnership(userId, chatbotId);

    const deletedRows = await ChatbotAllowedOriginModel.destroy({
      where: {
        chatbot_id: chatbotId,
        allowed_origin_id: allowedOriginId,
      },
    });

    if (deletedRows === 0) {
      throw new AppError('Allowed origin not found', 404, 'ALLOWED_ORIGIN_NOT_FOUND');
    }
  }

  private async ensureOwnership(userId: number, chatbotId: number): Promise<void> {
    const chatbot = await ChatbotModel.findOne({
      where: {
        chatbot_id: chatbotId,
        user_id: userId,
      },
    });

    if (!chatbot) {
      throw new AppError('Chatbot not found', 404, 'CHATBOT_NOT_FOUND');
    }
  }

  private toDTO(record: ChatbotAllowedOriginModel): AllowedOriginDTO {
    return {
      id: Number(record.allowed_origin_id),
      chatbot_id: Number(record.chatbot_id),
      origin: record.origin,
      created_at: record.created_at as Date,
    };
  }
}
