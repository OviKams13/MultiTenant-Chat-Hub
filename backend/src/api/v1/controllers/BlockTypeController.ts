import { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/AppError';
import { BlockTypeService } from '../services/BlockTypeService';
import { validateBlockTypePathId, validateCreateBlockType, validateUpdateBlockType } from '../validations/blockTypeValidation';

const blockTypeService = new BlockTypeService();

// BlockTypeController orchestrates HTTP concerns while delegating business rules to service layer.
// Handlers always read user context injected by requireAuth middleware.
// Input normalization/validation happens before service calls to keep behavior deterministic.
// Errors are forwarded to global errorHandler for standardized API error envelopes.
export const BlockTypeController = {
  async createBlockType(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as Request & { user?: { userId: number } }).user;
      if (!user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');

      const chatbotId = validateBlockTypePathId(req.params.chatbotId, 'chatbotId');
      const payload = validateCreateBlockType(req.body as Record<string, unknown>);
      const blockType = await blockTypeService.createBlockType(chatbotId, user.userId, payload);

      res.status(201).json({ success: true, data: blockType, error: null });
    } catch (error) {
      next(error);
    }
  },

  async listBlockTypes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as Request & { user?: { userId: number } }).user;
      if (!user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');

      const chatbotId = validateBlockTypePathId(req.params.chatbotId, 'chatbotId');
      const blockTypes = await blockTypeService.listBlockTypesForChatbot(chatbotId, user.userId);

      res.status(200).json({ success: true, data: blockTypes, error: null });
    } catch (error) {
      next(error);
    }
  },

  async getBlockType(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as Request & { user?: { userId: number } }).user;
      if (!user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');

      const chatbotId = validateBlockTypePathId(req.params.chatbotId, 'chatbotId');
      const typeId = validateBlockTypePathId(req.params.typeId, 'typeId');
      const blockType = await blockTypeService.getBlockTypeForChatbot(chatbotId, user.userId, typeId);

      res.status(200).json({ success: true, data: blockType, error: null });
    } catch (error) {
      next(error);
    }
  },

  async updateBlockType(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as Request & { user?: { userId: number } }).user;
      if (!user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');

      const chatbotId = validateBlockTypePathId(req.params.chatbotId, 'chatbotId');
      const typeId = validateBlockTypePathId(req.params.typeId, 'typeId');
      const payload = validateUpdateBlockType(req.body as Record<string, unknown>);
      const blockType = await blockTypeService.updateBlockTypeForChatbot(chatbotId, user.userId, typeId, payload);

      res.status(200).json({ success: true, data: blockType, error: null });
    } catch (error) {
      next(error);
    }
  },

  async deleteBlockType(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as Request & { user?: { userId: number } }).user;
      if (!user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');

      const chatbotId = validateBlockTypePathId(req.params.chatbotId, 'chatbotId');
      const typeId = validateBlockTypePathId(req.params.typeId, 'typeId');
      await blockTypeService.deleteBlockTypeForChatbot(chatbotId, user.userId, typeId);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
};
