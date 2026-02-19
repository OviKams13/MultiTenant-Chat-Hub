import { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/AppError';
import { DynamicBlockInstanceService } from '../services/DynamicBlockInstanceService';
import {
  validateCreateDynamicBlockPayload,
  validateDynamicPathId,
  validateUpdateDynamicBlockPayload
} from '../validations/dynamicBlockInstanceValidation';

const dynamicBlockInstanceService = new DynamicBlockInstanceService();

// DynamicBlockInstanceController handles HTTP orchestration for dynamic entity CRUD operations.
// It extracts authenticated owner context, validates input shape, and delegates all business rules.
// Keeping this layer thin preserves testability and makes service logic reusable across transports.
// Responses follow the global API envelope so admin clients can consume all modules uniformly.
export const DynamicBlockInstanceController = {
  async createInstance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as Request & { user?: { userId: number } }).user;
      if (!user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');

      const chatbotId = validateDynamicPathId(req.params.chatbotId, 'chatbotId');
      const typeId = validateDynamicPathId(req.params.typeId, 'typeId');
      const payload = validateCreateDynamicBlockPayload(req.body as Record<string, unknown>);
      const instance = await dynamicBlockInstanceService.createInstance(chatbotId, user.userId, typeId, payload);

      res.status(201).json({ success: true, data: instance, error: null });
    } catch (error) {
      next(error);
    }
  },

  async listInstances(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as Request & { user?: { userId: number } }).user;
      if (!user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');

      const chatbotId = validateDynamicPathId(req.params.chatbotId, 'chatbotId');
      const typeId = validateDynamicPathId(req.params.typeId, 'typeId');
      const instances = await dynamicBlockInstanceService.listInstances(chatbotId, user.userId, typeId);

      res.status(200).json({ success: true, data: instances, error: null });
    } catch (error) {
      next(error);
    }
  },

  async getInstance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as Request & { user?: { userId: number } }).user;
      if (!user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');

      const chatbotId = validateDynamicPathId(req.params.chatbotId, 'chatbotId');
      const typeId = validateDynamicPathId(req.params.typeId, 'typeId');
      const entityId = validateDynamicPathId(req.params.entityId, 'entityId');
      const instance = await dynamicBlockInstanceService.getInstance(chatbotId, user.userId, typeId, entityId);

      res.status(200).json({ success: true, data: instance, error: null });
    } catch (error) {
      next(error);
    }
  },

  async updateInstance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as Request & { user?: { userId: number } }).user;
      if (!user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');

      const chatbotId = validateDynamicPathId(req.params.chatbotId, 'chatbotId');
      const typeId = validateDynamicPathId(req.params.typeId, 'typeId');
      const entityId = validateDynamicPathId(req.params.entityId, 'entityId');
      const payload = validateUpdateDynamicBlockPayload(req.body as Record<string, unknown>);
      const instance = await dynamicBlockInstanceService.updateInstance(chatbotId, user.userId, typeId, entityId, payload);

      res.status(200).json({ success: true, data: instance, error: null });
    } catch (error) {
      next(error);
    }
  },

  async deleteInstance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as Request & { user?: { userId: number } }).user;
      if (!user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');

      const chatbotId = validateDynamicPathId(req.params.chatbotId, 'chatbotId');
      const typeId = validateDynamicPathId(req.params.typeId, 'typeId');
      const entityId = validateDynamicPathId(req.params.entityId, 'entityId');
      await dynamicBlockInstanceService.deleteInstance(chatbotId, user.userId, typeId, entityId);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
};
