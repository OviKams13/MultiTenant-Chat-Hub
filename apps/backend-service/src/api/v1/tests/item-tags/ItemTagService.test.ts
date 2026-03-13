// @ts-nocheck
import { AppError } from '../../errors/AppError';
import { ItemTagService } from '../../services/ItemTagService';
import { ChatbotItemModel } from '../../models/ChatbotItemModel';
import { ChatbotItemTagModel } from '../../models/ChatbotItemTagModel';
import { ChatbotModel } from '../../models/ChatbotModel';
import { TagModel } from '../../models/TagModel';
import { TagService } from '../../services/TagService';
import { sequelize } from '../../../../config/DatabaseConfig';

// ItemTagService tests focus on ownership, item scoping, and full replacement semantics.
// Sequelize operations are mocked so assertions target business behavior rather than SQL plumbing.
// We cover both input modes (tagCodes and tagIds) to preserve API flexibility for admin UIs.
// Error-code checks ensure deterministic controller responses through the global error handler.
describe('ItemTagService', () => {
  let service: ItemTagService;

  beforeEach(() => {
    service = new ItemTagService();
    jest.restoreAllMocks();
  });

  it('getTagsForItem returns mapped tag DTOs for an owned chatbot item', async () => {
    jest.spyOn(ChatbotModel, 'findOne').mockResolvedValue({ chatbot_id: 1 } as ChatbotModel);
    jest.spyOn(ChatbotItemModel, 'findOne').mockResolvedValue({ item_id: 10, chatbot_id: 1 } as ChatbotItemModel);
    jest.spyOn(ChatbotItemTagModel, 'findAll').mockResolvedValue([
      {
        tag: {
          tag_id: 2,
          tag_code: 'PHONE',
          description: 'Phone related info',
          category: 'SYSTEM',
          is_system: true,
          synonyms_json: ['telephone']
        }
      }
    ] as unknown as ChatbotItemTagModel[]);

    const result = await service.getTagsForItem(1, 100, 10);

    expect(result).toEqual([
      {
        id: 2,
        tag_code: 'PHONE',
        description: 'Phone related info',
        category: 'SYSTEM',
        is_system: true,
        synonyms: ['telephone']
      }
    ]);
  });

  it('getTagsForItem throws CHATBOT_NOT_FOUND when ownership check fails', async () => {
    jest.spyOn(ChatbotModel, 'findOne').mockResolvedValue(null);

    await expect(service.getTagsForItem(1, 999, 5)).rejects.toEqual(
      new AppError('Chatbot not found', 404, 'CHATBOT_NOT_FOUND')
    );
  });

  it('updateTagsForItem replaces links using tagCodes mode in one transaction', async () => {
    jest.spyOn(ChatbotModel, 'findOne').mockResolvedValue({ chatbot_id: 1 } as ChatbotModel);
    jest.spyOn(ChatbotItemModel, 'findOne').mockResolvedValue({ item_id: 10, chatbot_id: 1 } as ChatbotItemModel);
    jest.spyOn(TagService.prototype, 'resolveTagCodesToIds').mockResolvedValue(new Map([['CONTACT', 1], ['PHONE', 2]]));

    const destroySpy = jest.spyOn(ChatbotItemTagModel, 'destroy').mockResolvedValue(1);
    const bulkCreateSpy = jest.spyOn(ChatbotItemTagModel, 'bulkCreate').mockResolvedValue([] as never);
    jest.spyOn(ChatbotItemTagModel, 'findAll').mockResolvedValue([
      {
        tag: {
          tag_id: 1,
          tag_code: 'CONTACT',
          description: null,
          category: 'SYSTEM',
          is_system: true,
          synonyms_json: []
        }
      },
      {
        tag: {
          tag_id: 2,
          tag_code: 'PHONE',
          description: null,
          category: 'SYSTEM',
          is_system: true,
          synonyms_json: []
        }
      }
    ] as unknown as ChatbotItemTagModel[]);

    jest.spyOn(sequelize, 'transaction').mockImplementation(async (callback: any) => callback({}));

    const result = await service.updateTagsForItem(1, 100, 10, { tagCodes: ['contact', 'PHONE'] });

    expect(destroySpy).toHaveBeenCalled();
    expect(bulkCreateSpy).toHaveBeenCalledWith(
      [
        { item_id: 10, tag_id: 1 },
        { item_id: 10, tag_id: 2 }
      ],
      expect.any(Object)
    );
    expect(result.tags).toHaveLength(2);
  });

  it('updateTagsForItem throws TAG_NOT_FOUND when tagIds contains unknown IDs', async () => {
    jest.spyOn(ChatbotModel, 'findOne').mockResolvedValue({ chatbot_id: 1 } as ChatbotModel);
    jest.spyOn(ChatbotItemModel, 'findOne').mockResolvedValue({ item_id: 10, chatbot_id: 1 } as ChatbotItemModel);
    jest.spyOn(TagModel, 'findAll').mockResolvedValue([{ tag_id: 5 }] as TagModel[]);

    await expect(service.updateTagsForItem(1, 100, 10, { tagIds: [5, 99] })).rejects.toEqual(
      expect.objectContaining({ code: 'TAG_NOT_FOUND', statusCode: 400 })
    );
  });

  it('updateTagsForItem throws ITEM_NOT_FOUND when item does not belong to chatbot', async () => {
    jest.spyOn(ChatbotModel, 'findOne').mockResolvedValue({ chatbot_id: 1 } as ChatbotModel);
    jest.spyOn(ChatbotItemModel, 'findOne').mockResolvedValue(null);

    await expect(service.updateTagsForItem(1, 100, 404, { tagCodes: ['CONTACT'] })).rejects.toEqual(
      expect.objectContaining({ code: 'ITEM_NOT_FOUND', statusCode: 404 })
    );
  });
});
