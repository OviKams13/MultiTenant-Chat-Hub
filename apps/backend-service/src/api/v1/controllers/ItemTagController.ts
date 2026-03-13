import { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/AppError';
import { ItemTagService } from '../services/ItemTagService';
import { validateItemTagPathId, validateUpdateItemTagsBody } from '../validations/itemTagValidation';

const itemTagService = new ItemTagService();

// ItemTagController orchestrates HTTP concerns for item-level tag management endpoints.
// Controllers keep business logic out so service code remains reusable in future admin modules.
// Authenticated owner context comes from requireAuth middleware and must exist on every call.
// Responses always follow the standard API envelope used across the whole backend.
export const ItemTagController = {
  async listChatbotItems(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as Request & { user?: { userId: number } }).user;
      if (!user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');

      const chatbotId = validateItemTagPathId(req.params.chatbotId, 'chatbotId');
      const items = await itemTagService.listChatbotItems(chatbotId, user.userId);

      res.status(200).json({ success: true, data: items, error: null });
    } catch (error) {
      next(error);
    }
  },

  async getItemTags(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as Request & { user?: { userId: number } }).user;
      if (!user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');

      const chatbotId = validateItemTagPathId(req.params.chatbotId, 'chatbotId');
      const itemId = validateItemTagPathId(req.params.itemId, 'itemId');
      const tags = await itemTagService.getTagsForItem(chatbotId, user.userId, itemId);

      res.status(200).json({ success: true, data: tags, error: null });
    } catch (error) {
      next(error);
    }
  },

  async updateItemTags(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as Request & { user?: { userId: number } }).user;
      if (!user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');

      const chatbotId = validateItemTagPathId(req.params.chatbotId, 'chatbotId');
      const itemId = validateItemTagPathId(req.params.itemId, 'itemId');
      const payload = validateUpdateItemTagsBody(req.body as Record<string, unknown>);
      const result = await itemTagService.updateTagsForItem(chatbotId, user.userId, itemId, payload);

      res.status(200).json({ success: true, data: result, error: null });
    } catch (error) {
      next(error);
    }
  }
};
