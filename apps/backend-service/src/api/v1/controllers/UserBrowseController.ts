import { NextFunction, Request, Response } from 'express';
import { UserBrowseService } from '../services/UserBrowseService';
import { AppError } from '../errors/AppError';

const userBrowseService = new UserBrowseService();

export const UserBrowseController = {
  async listOwnersWithChatbots(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as Request & { user?: { userId: number } }).user;
      if (!user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');

      const result = await userBrowseService.listOwnersWithChatbots();
      res.status(200).json({ success: true, data: result, error: null });
    } catch (error) {
      next(error);
    }
  },

  async getChatbotDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as Request & { user?: { userId: number } }).user;
      if (!user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');

      const chatbotId = Number(req.params.id);
      if (!Number.isInteger(chatbotId) || chatbotId <= 0) {
        throw new AppError('Validation error', 400, 'VALIDATION_ERROR', { id: 'id must be a positive integer' });
      }

      const result = await userBrowseService.getChatbotDetail(chatbotId);
      res.status(200).json({ success: true, data: result, error: null });
    } catch (error) {
      next(error);
    }
  }
};
