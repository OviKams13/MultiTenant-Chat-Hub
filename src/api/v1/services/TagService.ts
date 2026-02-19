import { col, fn, Op, where } from 'sequelize';
import { AppError } from '../errors/AppError';
import { CreateTagPayload, TagDTO, TagFilter, TagResolutionMap } from '../interfaces/Tag';
import { TagModel } from '../models/TagModel';

// TagService centralizes tag business logic shared by static blocks, dynamic blocks, and admin APIs.
// Default tag resolvers are pure in-memory maps so future block services can reuse deterministic defaults.
// Database-backed methods enforce consistency for list/create flows and tag-code resolution to IDs.
// Every public method returns DTO-safe data to keep transport and persistence models loosely coupled.
export class TagService {
  // Default tags for static entities provide baseline semantics for contact and schedule builders.
  private staticDefaultMap: Record<string, string[]> = {
    CONTACT: ['CONTACT', 'PHONE', 'ADDRESS', 'HOURS'],
    SCHEDULE: ['SCHEDULE', 'HOURS']
  };

  // Default tags for dynamic entities map business type names to system tags for runtime evaluation.
  private dynamicDefaultMap: Record<string, string[]> = {
    PERSONAL_INFORMATION: ['PERSONAL_INFO']
  };

  // getDefaultTagsForStatic returns predefined tag codes used when creating static chatbot blocks.
  getDefaultTagsForStatic(entity_type: string): string[] {
    return this.staticDefaultMap[entity_type.toUpperCase()] || [];
  }

  // getDefaultTagsForDynamic returns predefined tag codes used for dynamic block categories.
  getDefaultTagsForDynamic(type_name: string): string[] {
    return this.dynamicDefaultMap[type_name.toUpperCase()] || [];
  }

  // resolveTagCodesToIds converts a list of tag codes to IDs and fails if at least one code is unknown.
  async resolveTagCodesToIds(tagCodes: string[]): Promise<TagResolutionMap> {
    const normalized = [...new Set(tagCodes.map((code) => code.trim().toUpperCase()).filter((code) => code.length > 0))];

    const tags = await TagModel.findAll({
      where: {
        tag_code: {
          [Op.in]: normalized
        }
      }
    });

    const mapping: TagResolutionMap = new Map();
    for (const tag of tags) {
      mapping.set(tag.tag_code, Number(tag.tag_id));
    }

    const unresolved = normalized.filter((code) => !mapping.has(code));
    if (unresolved.length > 0) {
      throw new AppError('One or more tags were not found', 404, 'TAG_NOT_FOUND', { missing: unresolved });
    }

    return mapping;
  }

  // listTags powers admin dropdowns and supports category/system/search filtering.
  async listTags(filter: TagFilter): Promise<TagDTO[]> {
    const whereClause: Record<string | symbol, unknown> = {};

    if (filter.category) {
      whereClause.category = filter.category.trim();
    }

    if (typeof filter.is_system === 'boolean') {
      whereClause.is_system = filter.is_system;
    }

    if (filter.search) {
      const term = `%${filter.search.trim()}%`;
      whereClause[Op.or] = [{ tag_code: { [Op.like]: term } }, { description: { [Op.like]: term } }];
    }

    const tags = await TagModel.findAll({
      where: whereClause,
      order: [['tag_code', 'ASC']]
    });

    return tags.map((tag) => this.toDTO(tag));
  }

  // createCustomTag creates non-system tags for tenant admins and prevents duplicate tag codes.
  async createCustomTag(payload: CreateTagPayload): Promise<TagDTO> {
    const normalizedCode = payload.tag_code.trim().toUpperCase();

    const existing = await TagModel.findOne({
      where: where(fn('UPPER', col('tag_code')), normalizedCode)
    });

    if (existing) {
      throw new AppError('Tag code already exists', 409, 'TAG_CODE_ALREADY_EXISTS');
    }

    const created = await TagModel.create({
      tag_code: normalizedCode,
      description: payload.description?.trim() || null,
      category: payload.category?.trim() || null,
      is_system: false,
      synonyms_json: payload.synonyms && payload.synonyms.length > 0 ? payload.synonyms : null
    });

    return this.toDTO(created);
  }

  // toDTO normalizes DB rows into API response shape with synonyms always exposed as a string array.
  private toDTO(tag: TagModel): TagDTO {
    const synonyms = Array.isArray(tag.synonyms_json) ? tag.synonyms_json : [];

    return {
      id: Number(tag.tag_id),
      tag_code: tag.tag_code,
      description: tag.description,
      category: tag.category,
      is_system: tag.is_system,
      synonyms
    };
  }
}
