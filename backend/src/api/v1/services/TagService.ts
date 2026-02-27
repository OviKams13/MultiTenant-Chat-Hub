import { col, fn, ForeignKeyConstraintError, Op, where } from 'sequelize';
import { AppError } from '../errors/AppError';
import { CreateTagPayload, TagDTO, TagFilter, TagResolutionMap, UpdateTagPayload } from '../interfaces/Tag';
import { TagModel } from '../models/TagModel';

// TagService centralizes tag business logic shared by static blocks, dynamic blocks, admin APIs, and runtime chat.
// Runtime classification is deterministic in v1 and uses synonyms_json only (no LLM) for predictable behavior.
// Instance methods keep existing admin flows intact, while static classifyQuestion serves public chat quickly.
// Every method returns normalized values so controllers/services remain thin and decoupled from raw ORM rows.
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

  // classifyQuestion maps a visitor message to tag codes using DB-managed synonyms_json dictionaries.
  // This method is intentionally case-insensitive and returns unique tag codes to avoid duplicate filtering later.
  // If no synonym matches, we return an empty array so runtime service can raise NO_RELEVANT_TAG explicitly.
  static async classifyQuestion(message: string): Promise<string[]> {
    const normalizedMessage = message.trim().toLowerCase();
    if (!normalizedMessage) {
      return [];
    }

    const tags = await TagModel.findAll();
    const matched = new Set<string>();

    for (const tag of tags) {
      const synonyms = this.extractSynonyms(tag.synonyms_json, tag.tag_code);
      const hasMatch = synonyms.some((synonym) => normalizedMessage.includes(synonym));
      if (hasMatch) {
        matched.add(tag.tag_code);
      }
    }

    return Array.from(matched.values());
  }

  // extractSynonyms converts DB JSON shape into normalized lower-case terms and includes tag_code fallback.
  // Including tag_code lets explicit words like "hours" map even if synonyms_json is missing for old seed data.
  private static extractSynonyms(rawSynonyms: unknown, tagCode: string): string[] {
    const fromJson = Array.isArray(rawSynonyms)
      ? rawSynonyms.filter((value): value is string => typeof value === 'string').map((value) => value.trim().toLowerCase())
      : [];

    const fallbackCode = tagCode.trim().toLowerCase();
    return [...new Set([...fromJson, fallbackCode].filter((value) => value.length > 0))];
  }

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


  // updateTag allows admins to refine existing tag semantics (code/category/description/synonyms).
  // tag_code remains globally unique and is normalized to uppercase before persistence.
  async updateTag(tagId: number, payload: UpdateTagPayload): Promise<TagDTO> {
    const tag = await TagModel.findByPk(tagId);
    if (!tag) {
      throw new AppError('Tag not found', 404, 'TAG_NOT_FOUND');
    }

    if (typeof payload.tag_code !== 'undefined') {
      const normalizedCode = payload.tag_code.trim().toUpperCase();

      const existing = await TagModel.findOne({
        where: where(fn('UPPER', col('tag_code')), normalizedCode)
      });

      if (existing && Number(existing.tag_id) !== Number(tag.tag_id)) {
        throw new AppError('Tag code already exists', 409, 'TAG_CODE_ALREADY_EXISTS');
      }

      tag.tag_code = normalizedCode;
    }

    if (typeof payload.description !== 'undefined') {
      tag.description = payload.description?.trim() || null;
    }

    if (typeof payload.category !== 'undefined') {
      tag.category = payload.category?.trim() || null;
    }

    if (typeof payload.synonyms !== 'undefined') {
      tag.synonyms_json = payload.synonyms.length > 0 ? payload.synonyms : null;
    }

    await tag.save();
    return this.toDTO(tag);
  }


  // deleteTag removes a tag that is no longer needed by admin taxonomy management.
  // If the tag is still linked to chatbot_item_tags, we return TAG_IN_USE so UI can guide cleanup first.
  async deleteTag(tagId: number): Promise<void> {
    const tag = await TagModel.findByPk(tagId);
    if (!tag) {
      throw new AppError('Tag not found', 404, 'TAG_NOT_FOUND');
    }

    try {
      await tag.destroy();
    } catch (error: unknown) {
      if (error instanceof ForeignKeyConstraintError) {
        throw new AppError('Tag is linked to one or more items and cannot be deleted', 409, 'TAG_IN_USE');
      }

      throw error;
    }
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
