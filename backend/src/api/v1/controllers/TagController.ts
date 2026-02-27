import { NextFunction, Request, Response } from 'express';
import { TagService } from '../services/TagService';
import { validateCreateTag, validateListTagsQuery, validateUpdateTag, validateUpdateTagPathId } from '../validations/tagValidation';

const tagService = new TagService();

// TagController keeps HTTP concerns isolated while delegating tag business rules to TagService.
// Query/body validation happens before service calls to maintain deterministic error semantics.
// All handlers return standardized { success, data, error } payloads expected by frontend clients.
// Errors are forwarded through next(err) for centralized formatting by the global error handler.
export const TagController = {
  async getTags(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filter = validateListTagsQuery(req.query as Record<string, unknown>);
      const tags = await tagService.listTags(filter);

      res.status(200).json({
        success: true,
        data: tags,
        error: null
      });
    } catch (error) {
      next(error);
    }
  },

  async createTag(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const payload = validateCreateTag(req.body as Record<string, unknown>);
      const createdTag = await tagService.createCustomTag(payload);

      res.status(201).json({
        success: true,
        data: createdTag,
        error: null
      });
    } catch (error) {
      next(error);
    }
  },

  async updateTag(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tagId = validateUpdateTagPathId(req.params.tagId);
      const payload = validateUpdateTag(req.body as Record<string, unknown>);
      const updatedTag = await tagService.updateTag(tagId, payload);

      res.status(200).json({
        success: true,
        data: updatedTag,
        error: null
      });
    } catch (error) {
      next(error);
    }
  },

  async deleteTag(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tagId = validateUpdateTagPathId(req.params.tagId);
      await tagService.deleteTag(tagId);

      res.status(200).json({
        success: true,
        data: { deleted: true, tag_id: tagId },
        error: null
      });
    } catch (error) {
      next(error);
    }
  }
};
