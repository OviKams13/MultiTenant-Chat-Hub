import { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/AppError';
import { ChatRuntimeRequestPayload } from '../interfaces/ChatRuntime';
import { ChatRuntimeService } from '../services/ChatRuntimeService';

const chatRuntimeService = new ChatRuntimeService();

// ChatRuntimeController is intentionally thin and only coordinates validated HTTP payloads.
// The route is public, so this controller never expects authenticated req.user context.
// Validation middleware injects a trusted payload onto req to avoid duplicate parsing logic here.
// Errors are passed to global errorHandler so public and private endpoints share one response contract.
export const ChatRuntimeController = {
  async handleChat(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const payload = (req as Request & { chatRuntimePayload?: ChatRuntimeRequestPayload }).chatRuntimePayload;
      if (!payload) {
        throw new AppError('Chat payload is missing', 400, 'VALIDATION_ERROR');
      }

      const result = await chatRuntimeService.handleChat(payload);
      res.status(200).json({
        success: true,
        data: result,
        error: null
      });
    } catch (error) {
      next(error);
    }
  }
};
