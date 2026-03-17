/// <reference types="jest" />
import { AppError } from '../../errors/AppError';
import { ChatbotAllowedOriginService } from '../../services/ChatbotAllowedOriginService';
import { ChatbotAllowedOriginModel } from '../../models/ChatbotAllowedOriginModel';
import { ChatbotModel } from '../../models/ChatbotModel';

describe('ChatbotAllowedOriginService', () => {
  const service = new ChatbotAllowedOriginService();

  const originalChatbotFindOne = ChatbotModel.findOne;
  const originalAllowedOriginFindAll = ChatbotAllowedOriginModel.findAll;
  const originalAllowedOriginFindOne = ChatbotAllowedOriginModel.findOne;
  const originalAllowedOriginCreate = ChatbotAllowedOriginModel.create;
  const originalAllowedOriginDestroy = ChatbotAllowedOriginModel.destroy;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    ChatbotModel.findOne = originalChatbotFindOne;
    ChatbotAllowedOriginModel.findAll = originalAllowedOriginFindAll;
    ChatbotAllowedOriginModel.findOne = originalAllowedOriginFindOne;
    ChatbotAllowedOriginModel.create = originalAllowedOriginCreate;
    ChatbotAllowedOriginModel.destroy = originalAllowedOriginDestroy;
  });

  it('lists allowed origins for owner chatbot', async () => {
    ChatbotModel.findOne = jest.fn().mockResolvedValue({ chatbot_id: 7 } as never);
    ChatbotAllowedOriginModel.findAll = jest.fn().mockResolvedValue([
      {
        allowed_origin_id: 1,
        chatbot_id: 7,
        origin: 'https://shop.example.com',
        created_at: new Date('2026-01-01T00:00:00.000Z'),
      },
    ] as never);

    const result = await service.listAllowedOriginsForChatbot(10, 7);

    expect(result).toHaveLength(1);
    expect(result[0].origin).toBe('https://shop.example.com');
  });

  it('creates allowed origin', async () => {
    ChatbotModel.findOne = jest.fn().mockResolvedValue({ chatbot_id: 7 } as never);
    ChatbotAllowedOriginModel.findOne = jest.fn().mockResolvedValue(null as never);
    ChatbotAllowedOriginModel.create = jest.fn().mockResolvedValue({
      allowed_origin_id: 2,
      chatbot_id: 7,
      origin: 'https://www.shop.example.com',
      created_at: new Date('2026-01-01T00:00:00.000Z'),
    } as never);

    const result = await service.createAllowedOriginForChatbot(10, 7, {
      origin: 'https://www.shop.example.com',
    });

    expect(result.origin).toBe('https://www.shop.example.com');
  });

  it('deletes allowed origin and enforces ownership', async () => {
    ChatbotModel.findOne = jest.fn().mockResolvedValue({ chatbot_id: 7 } as never);
    ChatbotAllowedOriginModel.destroy = jest.fn().mockResolvedValue(1 as never);

    await service.deleteAllowedOriginForChatbot(10, 7, 2);

    expect(ChatbotAllowedOriginModel.destroy).toHaveBeenCalledWith({
      where: {
        chatbot_id: 7,
        allowed_origin_id: 2,
      },
    });
  });

  it('rejects when chatbot ownership check fails', async () => {
    ChatbotModel.findOne = jest.fn().mockResolvedValue(null as never);

    await expect(service.listAllowedOriginsForChatbot(99, 999)).rejects.toEqual(
      expect.objectContaining({
        code: 'CHATBOT_NOT_FOUND',
        statusCode: 404,
      }),
    );
  });


  it('accepts wildcard origin values in validation layer', async () => {
    const { normalizeOrigin } = await import('../../validations/allowedOriginValidation');

    expect(normalizeOrigin('*')).toBe('*');
  });

  it('rejects malformed origin values in validation layer', async () => {
    const { normalizeOrigin } = await import('../../validations/allowedOriginValidation');

    expect(() => normalizeOrigin('not-a-valid-origin')).toThrow(AppError);
  });
});
