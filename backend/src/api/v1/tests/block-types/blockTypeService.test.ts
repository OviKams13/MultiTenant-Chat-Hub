// @ts-nocheck
import { BlockTypeService } from '../../services/BlockTypeService';
import { BbEntityModel } from '../../models/BbEntityModel';
import { BlockTypeModel } from '../../models/BlockTypeModel';
import { ChatbotModel } from '../../models/ChatbotModel';

// BlockTypeService unit tests verify ownership, uniqueness, and read/write policy behavior.
// Sequelize methods are mocked to keep assertions focused on business decisions.
// Cases cover create/list/get/update/delete plus in-use conflict handling.
// Error code checks ensure controller and frontend can rely on deterministic semantics.
describe('BlockTypeService', () => {
  let service: BlockTypeService;

  beforeEach(() => {
    service = new BlockTypeService();
    jest.restoreAllMocks();
  });

  it('createBlockType should create a chatbot-owned type', async () => {
    jest.spyOn(ChatbotModel, 'findOne').mockResolvedValue({ chatbot_id: 1 } as ChatbotModel);
    jest.spyOn(BlockTypeModel, 'findOne').mockResolvedValue(null);
    jest.spyOn(BlockTypeModel, 'create').mockResolvedValue({
      type_id: 11,
      chatbot_id: 1,
      type_name: 'PERSONAL_INFORMATION',
      description: 'desc',
      schema_definition: { fields: [{ name: 'full_name', label: 'Full name', type: 'string' }] },
      is_system: false,
      created_at: new Date('2026-01-01T00:00:00.000Z')
    } as BlockTypeModel);

    const result = await service.createBlockType(1, 7, {
      type_name: 'personal_information',
      description: 'desc',
      schema_definition: { fields: [{ name: 'full_name', label: 'Full name', type: 'string' }] }
    });

    expect(result.type_name).toBe('PERSONAL_INFORMATION');
    expect(result.scope).toBe('CHATBOT');
  });

  it('createBlockType should throw BLOCK_TYPE_NAME_ALREADY_EXISTS on conflict', async () => {
    jest.spyOn(ChatbotModel, 'findOne').mockResolvedValue({ chatbot_id: 1 } as ChatbotModel);
    jest.spyOn(BlockTypeModel, 'findOne').mockResolvedValue({ type_id: 3 } as BlockTypeModel);

    await expect(
      service.createBlockType(1, 7, {
        type_name: 'FAQ_ITEM',
        schema_definition: { fields: [{ name: 'q', label: 'Question', type: 'string' }] }
      })
    ).rejects.toEqual(expect.objectContaining({ code: 'BLOCK_TYPE_NAME_ALREADY_EXISTS', statusCode: 409 }));
  });

  it('listBlockTypesForChatbot should return global + chatbot records with scope', async () => {
    jest.spyOn(ChatbotModel, 'findOne').mockResolvedValue({ chatbot_id: 1 } as ChatbotModel);
    jest.spyOn(BlockTypeModel, 'findAll').mockResolvedValue([
      {
        type_id: 1,
        chatbot_id: null,
        type_name: 'FAQ_ITEM',
        description: null,
        schema_definition: { fields: [{ name: 'question', label: 'Question', type: 'string' }] },
        is_system: true,
        created_at: new Date()
      },
      {
        type_id: 2,
        chatbot_id: 1,
        type_name: 'PERSONAL_INFORMATION',
        description: null,
        schema_definition: { fields: [{ name: 'name', label: 'Name', type: 'string' }] },
        is_system: false,
        created_at: new Date()
      }
    ] as BlockTypeModel[]);

    const result = await service.listBlockTypesForChatbot(1, 7);
    expect(result).toHaveLength(2);
    expect(result[0]).toHaveProperty('scope');
  });

  it('updateBlockTypeForChatbot should throw BLOCK_TYPE_NOT_FOUND when record is not chatbot-owned', async () => {
    jest.spyOn(ChatbotModel, 'findOne').mockResolvedValue({ chatbot_id: 1 } as ChatbotModel);
    jest.spyOn(BlockTypeModel, 'findOne').mockResolvedValue(null);

    await expect(service.updateBlockTypeForChatbot(1, 7, 22, { description: 'updated' })).rejects.toEqual(
      expect.objectContaining({ code: 'BLOCK_TYPE_NOT_FOUND', statusCode: 404 })
    );
  });

  it('deleteBlockTypeForChatbot should throw BLOCK_TYPE_IN_USE when referenced by entities', async () => {
    jest.spyOn(ChatbotModel, 'findOne').mockResolvedValue({ chatbot_id: 1 } as ChatbotModel);
    jest.spyOn(BlockTypeModel, 'findOne').mockResolvedValue({
      type_id: 9,
      chatbot_id: 1,
      is_system: false,
      destroy: jest.fn()
    } as unknown as BlockTypeModel);
    jest.spyOn(BbEntityModel, 'count').mockResolvedValue(3);

    await expect(service.deleteBlockTypeForChatbot(1, 7, 9)).rejects.toEqual(
      expect.objectContaining({ code: 'BLOCK_TYPE_IN_USE', statusCode: 409 })
    );
  });
});
