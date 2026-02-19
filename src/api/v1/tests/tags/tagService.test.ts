// @ts-nocheck
import { TagService } from '../../services/TagService';
import { TagModel } from '../../models/TagModel';

// TagService unit tests validate default resolver mappings and DB-backed tag behaviors.
// Sequelize model calls are mocked to keep tests deterministic and isolated from MySQL runtime.
// Cases focus on required Feature 3 outcomes: mapping defaults, filtering, resolving IDs, and conflict handling.
// Assertions rely on semantic error codes for stable API behavior across future features.
describe('TagService', () => {
  let service: TagService;

  beforeEach(() => {
    service = new TagService();
    jest.restoreAllMocks();
  });

  it('getDefaultTagsForStatic CONTACT returns expected defaults', () => {
    const tags = service.getDefaultTagsForStatic('CONTACT');
    expect(tags).toEqual(expect.arrayContaining(['CONTACT', 'PHONE', 'ADDRESS', 'HOURS']));
  });

  it('getDefaultTagsForDynamic PERSONAL_INFORMATION returns PERSONAL_INFO', () => {
    const tags = service.getDefaultTagsForDynamic('PERSONAL_INFORMATION');
    expect(tags).toEqual(expect.arrayContaining(['PERSONAL_INFO']));
  });

  it('resolveTagCodesToIds should resolve all provided codes', async () => {
    jest.spyOn(TagModel, 'findAll').mockResolvedValue([
      { tag_code: 'CONTACT', tag_id: 1 },
      { tag_code: 'ADDRESS', tag_id: 2 }
    ] as TagModel[]);

    const result = await service.resolveTagCodesToIds(['CONTACT', 'ADDRESS']);

    expect(result.get('CONTACT')).toBe(1);
    expect(result.get('ADDRESS')).toBe(2);
  });

  it('resolveTagCodesToIds should throw TAG_NOT_FOUND when unresolved tag exists', async () => {
    jest.spyOn(TagModel, 'findAll').mockResolvedValue([{ tag_code: 'CONTACT', tag_id: 1 }] as TagModel[]);

    await expect(service.resolveTagCodesToIds(['CONTACT', 'MISSING_TAG'])).rejects.toEqual(
      expect.objectContaining({ code: 'TAG_NOT_FOUND' })
    );
  });

  it('createCustomTag should throw TAG_CODE_ALREADY_EXISTS when duplicate code exists', async () => {
    jest.spyOn(TagModel, 'findOne').mockResolvedValue({ tag_id: 5 } as TagModel);

    await expect(
      service.createCustomTag({ tag_code: 'CONTACT', description: 'dup', category: 'CUSTOM', synonyms: ['dup'] })
    ).rejects.toEqual(expect.objectContaining({ code: 'TAG_CODE_ALREADY_EXISTS' }));
  });
});
