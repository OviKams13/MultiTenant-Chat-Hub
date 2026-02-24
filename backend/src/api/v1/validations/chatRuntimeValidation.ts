import { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/AppError';
import { ChatHistoryMessage, ChatRuntimeRequestPayload } from '../interfaces/ChatRuntime';

const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY_ITEMS = 10;

// This validator protects the public chat entrypoint before any database or AI-related work starts.
// We support two caller modes: chatbotId (internal dashboard) and domain (embedded widget runtime).
// History is intentionally bounded and normalized to reduce prompt-injection surface in v1.
// The middleware stores a trusted payload on req so controllers can stay thin and deterministic.
export function validateChatRuntimeRequest(req: Request, _res: Response, next: NextFunction): void {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;

    const chatbotId = parseOptionalChatbotId(body.chatbotId);
    const domain = parseOptionalDomain(body.domain);

    if (!chatbotId && !domain) {
      throw new AppError('chatbotId or domain is required', 400, 'VALIDATION_ERROR', {
        chatbotId: 'Provide chatbotId (number) or domain (string)'
      });
    }

    const message = parseMessage(body.message);
    const history = parseHistory(body.history);

    (req as Request & { chatRuntimePayload?: ChatRuntimeRequestPayload }).chatRuntimePayload = {
      chatbotId,
      domain,
      message,
      history
    };

    next();
  } catch (error) {
    next(error);
  }
}

function parseOptionalChatbotId(value: unknown): number | undefined {
  if (typeof value === 'undefined' || value === null || value === '') {
    return undefined;
  }

  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new AppError('Validation error', 400, 'VALIDATION_ERROR', {
      chatbotId: 'chatbotId must be a positive integer'
    });
  }

  return value;
}

function parseOptionalDomain(value: unknown): string | undefined {
  if (typeof value === 'undefined' || value === null || value === '') {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new AppError('Validation error', 400, 'VALIDATION_ERROR', {
      domain: 'domain must be a non-empty string'
    });
  }

  const normalized = value.trim().toLowerCase();
  const domainRegex = /^\S+\.\S+$/;
  if (!domainRegex.test(normalized)) {
    throw new AppError('Validation error', 400, 'VALIDATION_ERROR', {
      domain: 'domain format is invalid'
    });
  }

  return normalized;
}

function parseMessage(value: unknown): string {
  if (typeof value !== 'string') {
    throw new AppError('Validation error', 400, 'VALIDATION_ERROR', {
      message: 'message is required and must be a string'
    });
  }

  const normalized = value.trim();
  if (!normalized || normalized.length > MAX_MESSAGE_LENGTH) {
    throw new AppError('Validation error', 400, 'VALIDATION_ERROR', {
      message: `message must be between 1 and ${MAX_MESSAGE_LENGTH} characters`
    });
  }

  return normalized;
}

function parseHistory(value: unknown): ChatHistoryMessage[] {
  if (typeof value === 'undefined') {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new AppError('Validation error', 400, 'VALIDATION_ERROR', {
      history: 'history must be an array when provided'
    });
  }

  const normalized: ChatHistoryMessage[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') {
      throw new AppError('Validation error', 400, 'VALIDATION_ERROR', {
        history: 'history items must be objects'
      });
    }

    const role = (item as Record<string, unknown>).role;
    const content = (item as Record<string, unknown>).content;

    if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string' || content.trim().length === 0) {
      throw new AppError('Validation error', 400, 'VALIDATION_ERROR', {
        history: 'each history item requires role (user|assistant) and non-empty content'
      });
    }

    normalized.push({ role, content: content.trim().slice(0, MAX_MESSAGE_LENGTH) });
  }

  return normalized.slice(-MAX_HISTORY_ITEMS);
}
