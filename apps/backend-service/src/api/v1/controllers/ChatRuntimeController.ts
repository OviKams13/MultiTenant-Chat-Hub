import { NextFunction, Request, Response } from 'express';
import { ChatRuntimeRequestBody, ChatRuntimeResponseSuccess } from '../interfaces/ChatRuntime';
import { ChatRuntimeService } from '../services/ChatRuntimeService';

// ChatRuntimeController remains intentionally thin and only bridges validated HTTP payloads to service logic.
// Validation middleware already normalized req.body, so this layer avoids duplicate input checks.
// Business concerns (tenant resolution, tag classification, context retrieval, LLM calls) belong to service layer.
// Errors are delegated to errorHandler through next(err) to preserve a single API error envelope policy.
export const ChatRuntimeController = {
  // handleChat forwards normalized runtime input to ChatRuntimeService and returns a strongly typed success contract.
  // The method never catches and reformats domain errors because error shape is centralized in errorHandler middleware.
  async handleChat(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { chatbotId, domain, message, history } = req.body as ChatRuntimeRequestBody;
      const result = await ChatRuntimeService.chat({ chatbotId, domain, message, history });

      const response: ChatRuntimeResponseSuccess = {
        success: true,
        data: {
          answer: result.answer,
          sourceItems: result.sourceItems
        },
        error: null
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
};
