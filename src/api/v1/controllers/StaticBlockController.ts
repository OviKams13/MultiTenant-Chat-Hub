import { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/AppError';
import { StaticBlockService } from '../services/StaticBlockService';
import {
  validateCreateContact,
  validateCreateSchedule,
  validatePathId,
  validateUpdateContact,
  validateUpdateSchedule
} from '../validations/staticBlockValidation';

const staticBlockService = new StaticBlockService();

// StaticBlockController keeps HTTP parsing separate from static-block business logic.
// Each handler validates path/body inputs before calling the service layer.
// Authenticated user context comes from requireAuth and is mandatory for all operations.
// Responses follow the project's standard { success, data, error } envelope.
export const StaticBlockController = {
  async createContact(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as Request & { user?: { userId: number } }).user;
      if (!user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');

      const chatbotId = validatePathId(req.params.chatbotId, 'chatbotId');
      const payload = validateCreateContact(req.body as Record<string, unknown>);
      const contact = await staticBlockService.createContact(chatbotId, user.userId, payload);

      res.status(201).json({ success: true, data: contact, error: null });
    } catch (error) {
      next(error);
    }
  },

  async getContact(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as Request & { user?: { userId: number } }).user;
      if (!user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');

      const chatbotId = validatePathId(req.params.chatbotId, 'chatbotId');
      const contact = await staticBlockService.getContact(chatbotId, user.userId);

      res.status(200).json({ success: true, data: contact, error: null });
    } catch (error) {
      next(error);
    }
  },

  async updateContact(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as Request & { user?: { userId: number } }).user;
      if (!user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');

      const chatbotId = validatePathId(req.params.chatbotId, 'chatbotId');
      const payload = validateUpdateContact(req.body as Record<string, unknown>);
      const contact = await staticBlockService.updateContact(chatbotId, user.userId, payload);

      res.status(200).json({ success: true, data: contact, error: null });
    } catch (error) {
      next(error);
    }
  },

  async createSchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as Request & { user?: { userId: number } }).user;
      if (!user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');

      const chatbotId = validatePathId(req.params.chatbotId, 'chatbotId');
      const payload = validateCreateSchedule(req.body as Record<string, unknown>);
      const schedule = await staticBlockService.createSchedule(chatbotId, user.userId, payload);

      res.status(201).json({ success: true, data: schedule, error: null });
    } catch (error) {
      next(error);
    }
  },

  async listSchedules(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as Request & { user?: { userId: number } }).user;
      if (!user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');

      const chatbotId = validatePathId(req.params.chatbotId, 'chatbotId');
      const schedules = await staticBlockService.listSchedules(chatbotId, user.userId);

      res.status(200).json({ success: true, data: schedules, error: null });
    } catch (error) {
      next(error);
    }
  },

  async updateSchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as Request & { user?: { userId: number } }).user;
      if (!user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');

      const chatbotId = validatePathId(req.params.chatbotId, 'chatbotId');
      const entityId = validatePathId(req.params.entityId, 'entityId');
      const payload = validateUpdateSchedule(req.body as Record<string, unknown>);
      const schedule = await staticBlockService.updateSchedule(chatbotId, user.userId, entityId, payload);

      res.status(200).json({ success: true, data: schedule, error: null });
    } catch (error) {
      next(error);
    }
  },

  async deleteSchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as Request & { user?: { userId: number } }).user;
      if (!user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');

      const chatbotId = validatePathId(req.params.chatbotId, 'chatbotId');
      const entityId = validatePathId(req.params.entityId, 'entityId');
      await staticBlockService.deleteSchedule(chatbotId, user.userId, entityId);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
};
