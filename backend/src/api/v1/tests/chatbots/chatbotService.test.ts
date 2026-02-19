// @ts-nocheck
import { AppError } from '../../errors/AppError';
import { ChatbotModel } from '../../models/ChatbotModel';
import { ChatbotService } from '../../services/ChatbotService';

// ChatbotService tests focus on ownership filtering and domain uniqueness business constraints.
// Sequelize methods are mocked so tests remain deterministic without a running MySQL instance.
// Each case validates one multi-tenant rule expected by admin owners using chatbot CRUD endpoints.
// Error assertions rely on AppError codes to keep API contract behavior stable over time.
describe('ChatbotService', () => {
  let chatbotService: ChatbotService;

  beforeEach(() => {
    chatbotService = new ChatbotService();
    jest.restoreAllMocks();
  });

  it('createChatbot should create chatbot for user', async () => {
    jest.spyOn(ChatbotModel, 'findOne').mockResolvedValue(null);
    jest.spyOn(ChatbotModel, 'create').mockResolvedValue({
      chatbot_id: 1,
      user_id: 7,
      domain: 'admin-company.com',
      display_name: 'Admin Company Assistant',
      created_at: new Date('2026-01-01T00:00:00.000Z')
    } as ChatbotModel);

    const result = await chatbotService.createChatbot(7, {
      domain: 'admin-company.com',
      display_name: 'Admin Company Assistant'
    });

    expect(result.id).toBe(1);
    expect(result.domain).toBe('admin-company.com');
  });

  it('createChatbot should throw DOMAIN_ALREADY_IN_USE when domain already exists', async () => {
    jest.spyOn(ChatbotModel, 'findOne').mockResolvedValue({ chatbot_id: 22 } as ChatbotModel);

    await expect(
      chatbotService.createChatbot(7, {
        domain: 'admin-company.com',
        display_name: 'Admin Company Assistant'
      })
    ).rejects.toEqual(expect.objectContaining({ code: 'DOMAIN_ALREADY_IN_USE' }));
  });

  it('getChatbotByIdForUser should throw CHATBOT_NOT_FOUND when chatbot does not belong to user', async () => {
    jest.spyOn(ChatbotModel, 'findOne').mockResolvedValue(null);

    await expect(chatbotService.getChatbotByIdForUser(7, 100)).rejects.toEqual(
      expect.objectContaining({ code: 'CHATBOT_NOT_FOUND' })
    );
  });

  it('updateChatbotForUser should update display name', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    jest.spyOn(ChatbotModel, 'findOne').mockResolvedValueOnce({
      chatbot_id: 5,
      user_id: 7,
      domain: 'admin-company.com',
      display_name: 'Old name',
      created_at: new Date(),
      save
    } as unknown as ChatbotModel);

    const result = await chatbotService.updateChatbotForUser(7, 5, { display_name: 'New Name' });

    expect(result.display_name).toBe('New Name');
    expect(save).toHaveBeenCalled();
  });

  it('deleteChatbotForUser should throw CHATBOT_NOT_FOUND when nothing deleted', async () => {
    jest.spyOn(ChatbotModel, 'destroy').mockResolvedValue(0);

    await expect(chatbotService.deleteChatbotForUser(7, 9)).rejects.toEqual(
      expect.objectContaining({ code: 'CHATBOT_NOT_FOUND' })
    );
  });
});
