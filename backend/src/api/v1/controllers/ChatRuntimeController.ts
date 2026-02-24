import { NextFunction, Request, Response } from 'express';
import { ChatRuntimeRequestBody } from '../interfaces/ChatRuntime';
import { ChatRuntimeService } from '../services/ChatRuntimeService';

const chatRuntimeService = new ChatRuntimeService();

// ChatRuntimeController is intentionally thin and maps HTTP concerns to service calls.
// Feature 8.2 guarantees req.body is already validated/normalized before entering this handler.
// This controller never talks to DB/LLM directly; it only forwards payload and returns API envelope.
// Any thrown error is delegated to global errorHandler via next(err) for consistent formatting.
export const ChatRuntimeController = {
  // handleChat reads normalized public-chat input and forwards it to ChatRuntimeService.chat.
  // The success response always uses the project contract: { success, data, error }.
  async handleChat(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { chatbotId, domain, message, history } = req.body as ChatRuntimeRequestBody;

      const result = await chatRuntimeService.chat({
        chatbotId,
        domain,
        message,
        history
      });

      res.status(200).json({
        success: true,
        data: {
          answer: result.answer,
          sourceItems: result.sourceItems
        },
        error: null
      });
    } catch (error) {
      next(error);
    }
  }
};
