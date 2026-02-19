// @ts-nocheck
import { AppError } from '../../errors/AppError';
import { StaticBlockService } from '../../services/StaticBlockService';
import { BbContactModel } from '../../models/BbContactModel';
import { BbEntityModel } from '../../models/BbEntityModel';
import { BbScheduleModel } from '../../models/BbScheduleModel';
import { ChatbotItemModel } from '../../models/ChatbotItemModel';
import { ChatbotItemTagModel } from '../../models/ChatbotItemTagModel';
import { ChatbotModel } from '../../models/ChatbotModel';
import { TagService } from '../../services/TagService';

// StaticBlockService unit tests focus on ownership, uniqueness, and block lifecycle rules.
// Heavy DB work is mocked so tests validate business decisions instead of SQL behavior.
// We cover required Feature 4 branches: create contact, duplicate contact, schedule CRUD.
// Error code assertions guarantee stable API contracts for controller/error-handler layers.
describe('StaticBlockService', () => {
  let service: StaticBlockService;

  beforeEach(() => {
    service = new StaticBlockService();
    jest.restoreAllMocks();
  });

  it('createContact should create contact when chatbot belongs to user', async () => {
    jest.spyOn(ChatbotModel, 'findOne').mockResolvedValue({ chatbot_id: 1 } as ChatbotModel);
    jest.spyOn(ChatbotItemModel, 'findOne').mockResolvedValue(null);
    jest.spyOn(TagService.prototype, 'getDefaultTagsForStatic').mockReturnValue(['CONTACT']);
    jest.spyOn(TagService.prototype, 'resolveTagCodesToIds').mockResolvedValue(new Map([['CONTACT', 10]]));

    jest.spyOn(BbEntityModel, 'create').mockResolvedValue({ entity_id: 99 } as BbEntityModel);
    jest.spyOn(BbContactModel, 'create').mockResolvedValue({
      entity_id: 99,
      org_name: 'Acme',
      phone: null,
      email: null,
      address_text: null,
      city: null,
      country: null,
      hours_text: null
    } as BbContactModel);
    jest.spyOn(ChatbotItemModel, 'create').mockResolvedValue({ item_id: 500, entity_id: 99 } as ChatbotItemModel);
    jest.spyOn(ChatbotItemTagModel, 'bulkCreate').mockResolvedValue([]);

    const result = await service.createContact(1, 1, { org_name: 'Acme' });
    expect(result).toEqual(expect.objectContaining({ entity_id: 99, chatbot_id: 1, org_name: 'Acme' }));
  });

  it('createContact should throw CONTACT_ALREADY_EXISTS when contact already linked', async () => {
    jest.spyOn(ChatbotModel, 'findOne').mockResolvedValue({ chatbot_id: 1 } as ChatbotModel);
    jest.spyOn(ChatbotItemModel, 'findOne').mockResolvedValue({ item_id: 1 } as ChatbotItemModel);

    await expect(service.createContact(1, 1, { org_name: 'Acme' })).rejects.toEqual(
      expect.objectContaining({ code: 'CONTACT_ALREADY_EXISTS', statusCode: 409 })
    );
  });

  it('updateSchedule should throw SCHEDULE_NOT_FOUND when entity is not linked', async () => {
    jest.spyOn(ChatbotModel, 'findOne').mockResolvedValue({ chatbot_id: 1 } as ChatbotModel);
    jest.spyOn(ChatbotItemModel, 'findOne').mockResolvedValue(null);

    await expect(service.updateSchedule(1, 1, 99, { title: 'Updated' })).rejects.toEqual(
      expect.objectContaining({ code: 'SCHEDULE_NOT_FOUND', statusCode: 404 })
    );
  });

  it('deleteSchedule should remove linked schedule resources', async () => {
    jest.spyOn(ChatbotModel, 'findOne').mockResolvedValue({ chatbot_id: 1 } as ChatbotModel);
    jest.spyOn(ChatbotItemModel, 'findOne').mockResolvedValue({ item_id: 9, entity_id: 77 } as ChatbotItemModel);
    const tagsSpy = jest.spyOn(ChatbotItemTagModel, 'destroy').mockResolvedValue(1);
    const itemsSpy = jest.spyOn(ChatbotItemModel, 'destroy').mockResolvedValue(1);
    const schedulesSpy = jest.spyOn(BbScheduleModel, 'destroy').mockResolvedValue(1);
    const entitySpy = jest.spyOn(BbEntityModel, 'destroy').mockResolvedValue(1);

    await service.deleteSchedule(1, 1, 77);

    expect(tagsSpy).toHaveBeenCalled();
    expect(itemsSpy).toHaveBeenCalled();
    expect(schedulesSpy).toHaveBeenCalled();
    expect(entitySpy).toHaveBeenCalled();
  });

  it('getContact should throw CHATBOT_NOT_FOUND when tenant ownership fails', async () => {
    jest.spyOn(ChatbotModel, 'findOne').mockResolvedValue(null);

    await expect(service.getContact(10, 999)).rejects.toEqual(
      new AppError('Chatbot not found', 404, 'CHATBOT_NOT_FOUND')
    );
  });
});
