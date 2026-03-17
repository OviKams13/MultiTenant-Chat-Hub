import { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/AppError';
import { ChatbotAllowedOriginService } from '../services/ChatbotAllowedOriginService';
import {
  validateAllowedOriginIdParam,
  validateChatbotIdParam,
  validateCreateAllowedOrigin,
} from '../validations/allowedOriginValidation';

const chatbotAllowedOriginService = new ChatbotAllowedOriginService();

export const ChatbotAllowedOriginController = {
  async listAllowedOrigins(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as Request & { user?: { userId: number } }).user;
      if (!user) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }

      const chatbotIdParam = Array.isArray(req.params.chatbotId)
        ? req.params.chatbotId[0]
        : req.params.chatbotId;
      const chatbotId = validateChatbotIdParam(chatbotIdParam);
      const data = await chatbotAllowedOriginService.listAllowedOriginsForChatbot(
        user.userId,
        chatbotId,
      );

      res.status(200).json({ success: true, data, error: null });
    } catch (error) {
      next(error);
    }
  },

  async createAllowedOrigin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as Request & { user?: { userId: number } }).user;
      if (!user) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }

      const chatbotIdParam = Array.isArray(req.params.chatbotId)
        ? req.params.chatbotId[0]
        : req.params.chatbotId;
      const chatbotId = validateChatbotIdParam(chatbotIdParam);
      const payload = validateCreateAllowedOrigin(req.body as Record<string, unknown>);
      const data = await chatbotAllowedOriginService.createAllowedOriginForChatbot(
        user.userId,
        chatbotId,
        payload,
      );

      res.status(201).json({ success: true, data, error: null });
    } catch (error) {
      next(error);
    }
  },

  async deleteAllowedOrigin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as Request & { user?: { userId: number } }).user;
      if (!user) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }

      const chatbotIdParam = Array.isArray(req.params.chatbotId)
        ? req.params.chatbotId[0]
        : req.params.chatbotId;
      const allowedOriginIdParam = Array.isArray(req.params.allowedOriginId)
        ? req.params.allowedOriginId[0]
        : req.params.allowedOriginId;
      const chatbotId = validateChatbotIdParam(chatbotIdParam);
      const allowedOriginId = validateAllowedOriginIdParam(allowedOriginIdParam);

      await chatbotAllowedOriginService.deleteAllowedOriginForChatbot(
        user.userId,
        chatbotId,
        allowedOriginId,
      );

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
};
