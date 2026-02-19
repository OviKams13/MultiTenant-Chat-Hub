import { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/AppError';
import { ChatbotService } from '../services/ChatbotService';
import { validateChatbotId, validateCreateChatbot, validateUpdateChatbot } from '../validations/chatbotValidation';

const chatbotService = new ChatbotService();

// ChatbotController handles HTTP orchestration and delegates business rules to ChatbotService.
// Each handler reads authenticated user context populated by requireAuth middleware.
// Input validation is centralized before service calls to keep controllers deterministic.
// Any errors are passed to next(err) so global errorHandler can standardize responses.
export const ChatbotController = {
  async createChatbot(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as Request & { user?: { userId: number } }).user;
      if (!user) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }

      const payload = validateCreateChatbot(req.body as Record<string, unknown>);
      const chatbot = await chatbotService.createChatbot(user.userId, payload);

      res.status(201).json({
        success: true,
        data: chatbot,
        error: null
      });
    } catch (error) {
      next(error);
    }
  },

  async listChatbots(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as Request & { user?: { userId: number } }).user;
      if (!user) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }

      const chatbots = await chatbotService.listChatbotsForUser(user.userId);
      res.status(200).json({
        success: true,
        data: chatbots,
        error: null
      });
    } catch (error) {
      next(error);
    }
  },

  async getChatbotById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as Request & { user?: { userId: number } }).user;
      if (!user) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }

      const chatbotIdParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const chatbotId = validateChatbotId(chatbotIdParam);
      const chatbot = await chatbotService.getChatbotByIdForUser(user.userId, chatbotId);
      res.status(200).json({
        success: true,
        data: chatbot,
        error: null
      });
    } catch (error) {
      next(error);
    }
  },

  async updateChatbot(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as Request & { user?: { userId: number } }).user;
      if (!user) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }

      const chatbotIdParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const chatbotId = validateChatbotId(chatbotIdParam);
      const payload = validateUpdateChatbot(req.body as Record<string, unknown>);
      const chatbot = await chatbotService.updateChatbotForUser(user.userId, chatbotId, payload);

      res.status(200).json({
        success: true,
        data: chatbot,
        error: null
      });
    } catch (error) {
      next(error);
    }
  },

  async deleteChatbot(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as Request & { user?: { userId: number } }).user;
      if (!user) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }

      const chatbotIdParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const chatbotId = validateChatbotId(chatbotIdParam);
      await chatbotService.deleteChatbotForUser(user.userId, chatbotId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
};
