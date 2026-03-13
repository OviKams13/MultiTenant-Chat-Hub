// @ts-nocheck
import { AppError } from '../../errors/AppError';
import { DynamicBlockInstanceService } from '../../services/DynamicBlockInstanceService';
import { BbEntityModel } from '../../models/BbEntityModel';
import { BlockTypeModel } from '../../models/BlockTypeModel';
import { ChatbotItemModel } from '../../models/ChatbotItemModel';
import { ChatbotItemTagModel } from '../../models/ChatbotItemTagModel';
import { ChatbotModel } from '../../models/ChatbotModel';
import { TagService } from '../../services/TagService';
import { sequelize } from '../../../../config/DatabaseConfig';

// Dynamic block service tests guard ownership, schema validation, and relational write consistency.
// We mock Sequelize interactions to keep feedback focused on business rules rather than SQL execution.
// Cases cover create/list/get/update/delete and key error contracts expected by controllers.
// Error code assertions are critical because admin UI relies on deterministic API semantics.
describe('DynamicBlockInstanceService', () => {
  let service: DynamicBlockInstanceService;

  beforeEach(() => {
    service = new DynamicBlockInstanceService();
    jest.restoreAllMocks();
  });

  it('createInstance should create entity and link default dynamic tags', async () => {
    jest.spyOn(ChatbotModel, 'findOne').mockResolvedValue({ chatbot_id: 1 } as ChatbotModel);
    jest.spyOn(BlockTypeModel, 'findOne').mockResolvedValue({
      type_id: 5,
      type_name: 'PERSONAL_INFORMATION',
      chatbot_id: 1,
      schema_definition: { fields: [{ name: 'full_name', label: 'Full Name', type: 'string', required: true }] }
    } as BlockTypeModel);
    jest.spyOn(BbEntityModel, 'create').mockResolvedValue({ entity_id: 30, type_id: 5, data: { full_name: 'Ada' } } as BbEntityModel);
    jest.spyOn(ChatbotItemModel, 'create').mockResolvedValue({ item_id: 77 } as ChatbotItemModel);
    jest.spyOn(TagService.prototype, 'getDefaultTagsForDynamic').mockReturnValue(['PERSONAL_INFO']);
    jest.spyOn(TagService.prototype, 'resolveTagCodesToIds').mockResolvedValue(new Map([['PERSONAL_INFO', 9]]));
    jest.spyOn(ChatbotItemTagModel, 'bulkCreate').mockResolvedValue([] as never);
    jest.spyOn(sequelize, 'transaction').mockImplementation(async (callback: any) => callback({}));

    const result = await service.createInstance(1, 100, 5, { data: { full_name: 'Ada' } });

    expect(result).toEqual(expect.objectContaining({ chatbot_id: 1, type_id: 5, type_name: 'PERSONAL_INFORMATION' }));
  });

  it('createInstance should throw INVALID_DYNAMIC_DATA on missing required field', async () => {
    jest.spyOn(ChatbotModel, 'findOne').mockResolvedValue({ chatbot_id: 1 } as ChatbotModel);
    jest.spyOn(BlockTypeModel, 'findOne').mockResolvedValue({
      type_id: 5,
      type_name: 'PERSONAL_INFORMATION',
      chatbot_id: 1,
      schema_definition: { fields: [{ name: 'full_name', label: 'Full Name', type: 'string', required: true }] }
    } as BlockTypeModel);

    await expect(service.createInstance(1, 100, 5, { data: { nick_name: 'Ada' } })).rejects.toEqual(
      expect.objectContaining({ code: 'INVALID_DYNAMIC_DATA', statusCode: 400 })
    );
  });

  it('listInstances should return only linked dynamic entities for the target type', async () => {
    jest.spyOn(ChatbotModel, 'findOne').mockResolvedValue({ chatbot_id: 1 } as ChatbotModel);
    jest.spyOn(BlockTypeModel, 'findOne').mockResolvedValue({ type_id: 5, type_name: 'PERSONAL_INFORMATION', schema_definition: { fields: [] } } as BlockTypeModel);
    jest.spyOn(ChatbotItemModel, 'findAll').mockResolvedValue([
      { entity: { entity_id: 10, type_id: 5, data: { full_name: 'Ada' }, created_at: new Date() } }
    ] as unknown as ChatbotItemModel[]);

    const result = await service.listInstances(1, 100, 5);
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty('entity_id', 10);
  });

  it('updateInstance should throw DYNAMIC_BLOCK_NOT_FOUND when item is not linked to chatbot', async () => {
    jest.spyOn(ChatbotModel, 'findOne').mockResolvedValue({ chatbot_id: 1 } as ChatbotModel);
    jest.spyOn(BlockTypeModel, 'findOne').mockResolvedValue({ type_id: 5, type_name: 'PERSONAL_INFORMATION', schema_definition: { fields: [] } } as BlockTypeModel);
    jest.spyOn(ChatbotItemModel, 'findOne').mockResolvedValue(null);

    await expect(service.updateInstance(1, 100, 5, 44, { data: { full_name: 'Ada' } })).rejects.toEqual(
      expect.objectContaining({ code: 'DYNAMIC_BLOCK_NOT_FOUND', statusCode: 404 })
    );
  });

  it('deleteInstance should delete tags, item link, and entity in transaction', async () => {
    jest.spyOn(ChatbotModel, 'findOne').mockResolvedValue({ chatbot_id: 1 } as ChatbotModel);
    jest.spyOn(BlockTypeModel, 'findOne').mockResolvedValue({ type_id: 5, type_name: 'PERSONAL_INFORMATION', schema_definition: { fields: [] } } as BlockTypeModel);
    jest.spyOn(ChatbotItemModel, 'findOne').mockResolvedValue({ item_id: 7, entity_id: 44 } as ChatbotItemModel);
    jest.spyOn(BbEntityModel, 'findOne').mockResolvedValue({ entity_id: 44, type_id: 5 } as BbEntityModel);
    const tagDestroySpy = jest.spyOn(ChatbotItemTagModel, 'destroy').mockResolvedValue(1);
    const itemDestroySpy = jest.spyOn(ChatbotItemModel, 'destroy').mockResolvedValue(1);
    const entityDestroySpy = jest.spyOn(BbEntityModel, 'destroy').mockResolvedValue(1);
    jest.spyOn(sequelize, 'transaction').mockImplementation(async (callback: any) => callback({}));

    await service.deleteInstance(1, 100, 5, 44);

    expect(tagDestroySpy).toHaveBeenCalled();
    expect(itemDestroySpy).toHaveBeenCalled();
    expect(entityDestroySpy).toHaveBeenCalled();
  });

  it('getInstance should throw CHATBOT_NOT_FOUND when chatbot ownership fails', async () => {
    jest.spyOn(ChatbotModel, 'findOne').mockResolvedValue(null);

    await expect(service.getInstance(1, 300, 5, 10)).rejects.toEqual(new AppError('Chatbot not found', 404, 'CHATBOT_NOT_FOUND'));
  });
});
