import { NextFunction, Request, RequestHandler, Response } from 'express';
import { AppError } from '../errors/AppError';
import { ChatHistoryMessage, ChatRuntimeRequestBody } from '../interfaces/ChatRuntime';

export const MAX_MESSAGE_LENGTH = 1000;
export const MAX_DOMAIN_LENGTH = 255;
export const MAX_HISTORY_MESSAGES = 20;
export const MAX_HISTORY_CONTENT_LENGTH = 1000;

interface ValidationDetail {
  field: string;
  issue: string;
  index?: number;
}

// validateChatRuntimeBody enforces the HTTP contract of the public chat endpoint before business logic runs.
// This function is intentionally pure so unit tests can verify every rule without spinning up Express.
// We validate only shape/limits; runtime trust boundaries (prompt handling strategy) stay in service layer.
// The returned object is normalized and safe for controller/service consumption in strict TypeScript mode.
export function validateChatRuntimeBody(raw: unknown): ChatRuntimeRequestBody {
  const body = (raw ?? {}) as Record<string, unknown>;
  const errors: ValidationDetail[] = [];

  const message = normalizeMessage(body.message, errors);
  const chatbotId = normalizeChatbotId(body.chatbotId, errors);
  const domain = normalizeDomain(body.domain, errors);
  const history = normalizeHistory(body.history, errors);

  if (typeof chatbotId === 'undefined' && typeof domain === 'undefined') {
    errors.push({ field: 'chatbotId|domain', issue: 'ONE_REQUIRED' });
  }

  if (errors.length > 0) {
    throw new AppError('Invalid chat runtime request body', 400, 'VALIDATION_ERROR', {
      errors
    });
  }

  return {
    chatbotId,
    domain,
    message,
    history
  };
}

// validateChatRuntimeRequest is the Express middleware used by /api/v1/public/chat route.
// It stores a normalized payload on req to keep controller logic thin and deterministic.
// The middleware never authenticates users because this endpoint is intentionally visitor-facing.
// Any AppError is forwarded to errorHandler to preserve the API envelope format.
export const validateChatRuntimeRequest: RequestHandler = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    const validated = validateChatRuntimeBody(req.body);
    // Validation middleware normalizes req.body so downstream controller can consume typed fields directly.
    req.body = validated;
    (req as Request & { chatRuntimePayload?: ChatRuntimeRequestBody }).chatRuntimePayload = validated;
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }

    next(new AppError('Invalid chat runtime request body', 400, 'VALIDATION_ERROR'));
  }
};

// normalizeMessage checks requiredness, emptiness, and payload size to prevent oversized public requests.
// Message trim is applied here so downstream services receive canonical text without duplicated sanitation.
function normalizeMessage(value: unknown, errors: ValidationDetail[]): string {
  if (typeof value !== 'string') {
    errors.push({ field: 'message', issue: 'REQUIRED' });
    return '';
  }

  const normalized = value.trim();
  if (normalized.length === 0) {
    errors.push({ field: 'message', issue: 'EMPTY' });
  }

  if (normalized.length > MAX_MESSAGE_LENGTH) {
    errors.push({ field: 'message', issue: 'TOO_LONG' });
  }

  return normalized;
}

// normalizeChatbotId validates dashboard mode identifier and rejects non-integer or non-positive values.
// We do not coerce strings to numbers to keep contract strict and prevent ambiguous client behavior.
function normalizeChatbotId(value: unknown, errors: ValidationDetail[]): number | undefined {
  if (typeof value === 'undefined') {
    return undefined;
  }

  if (typeof value !== 'number') {
    errors.push({ field: 'chatbotId', issue: 'INVALID_TYPE' });
    return undefined;
  }

  if (!Number.isInteger(value) || value <= 0) {
    errors.push({ field: 'chatbotId', issue: 'INVALID_VALUE' });
    return undefined;
  }

  return value;
}

// normalizeDomain validates widget mode identifier and applies lightweight normalization through trim/lowercase.
// Domain format rules stay pragmatic in v1 (simple dot-based shape + max length), not DNS-perfect validation.
function normalizeDomain(value: unknown, errors: ValidationDetail[]): string | undefined {
  if (typeof value === 'undefined') {
    return undefined;
  }

  if (typeof value !== 'string') {
    errors.push({ field: 'domain', issue: 'INVALID_TYPE' });
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized.length === 0) {
    errors.push({ field: 'domain', issue: 'EMPTY' });
    return undefined;
  }

  if (normalized.length > MAX_DOMAIN_LENGTH) {
    errors.push({ field: 'domain', issue: 'TOO_LONG' });
  }

  const domainRegex = /^\S+\.\S+$/;
  if (!domainRegex.test(normalized)) {
    errors.push({ field: 'domain', issue: 'INVALID_FORMAT' });
  }

  return normalized;
}

// normalizeHistory validates shape and limits of previous conversation without trusting its semantic truth.
// History remains optional and is never interpreted as system-level instruction in this middleware.
// We reject abusive sizes here; deeper truncation strategy remains a service-layer responsibility.
function normalizeHistory(value: unknown, errors: ValidationDetail[]): ChatHistoryMessage[] | undefined {
  if (typeof value === 'undefined') {
    return undefined;
  }

  if (!Array.isArray(value)) {
    errors.push({ field: 'history', issue: 'INVALID_TYPE' });
    return undefined;
  }

  if (value.length > MAX_HISTORY_MESSAGES) {
    errors.push({ field: 'history', issue: 'TOO_MANY_MESSAGES' });
  }

  const normalized: ChatHistoryMessage[] = [];

  value.forEach((entry, index) => {
    if (!entry || typeof entry !== 'object') {
      errors.push({ field: 'history', issue: 'INVALID_ITEM', index });
      return;
    }

    const role = (entry as Record<string, unknown>).role;
    const content = (entry as Record<string, unknown>).content;

    if (role !== 'user' && role !== 'assistant') {
      errors.push({ field: 'history.role', issue: 'INVALID_ROLE', index });
    }

    if (typeof content !== 'string') {
      errors.push({ field: 'history.content', issue: 'INVALID_TYPE', index });
      return;
    }

    const trimmedContent = content.trim();
    if (trimmedContent.length === 0) {
      errors.push({ field: 'history.content', issue: 'EMPTY', index });
    }

    if (trimmedContent.length > MAX_HISTORY_CONTENT_LENGTH) {
      errors.push({ field: 'history.content', issue: 'TOO_LONG', index });
    }

    if ((role === 'user' || role === 'assistant') && trimmedContent.length > 0) {
      normalized.push({ role, content: trimmedContent });
    }
  });

  return normalized;
}
