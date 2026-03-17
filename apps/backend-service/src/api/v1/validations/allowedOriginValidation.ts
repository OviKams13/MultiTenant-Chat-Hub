import { AppError } from '../errors/AppError';

interface AllowedOriginBody {
  origin?: unknown;
}

export function validateChatbotIdParam(chatbotIdParam: string): number {
  const chatbotId = Number(chatbotIdParam);
  if (!Number.isInteger(chatbotId) || chatbotId <= 0) {
    throw new AppError('Invalid chatbot id', 400, 'VALIDATION_ERROR');
  }

  return chatbotId;
}

export function validateAllowedOriginIdParam(allowedOriginIdParam: string): number {
  const allowedOriginId = Number(allowedOriginIdParam);
  if (!Number.isInteger(allowedOriginId) || allowedOriginId <= 0) {
    throw new AppError('Invalid allowed origin id', 400, 'VALIDATION_ERROR');
  }

  return allowedOriginId;
}

export function normalizeOrigin(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0 || value.trim().length > 255) {
    throw new AppError('Invalid allowed origin payload', 400, 'VALIDATION_ERROR');
  }

  const trimmed = value.trim();

  if (trimmed === '*') {
    return '*';
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new AppError('Invalid allowed origin payload', 400, 'VALIDATION_ERROR', {
      field: 'origin',
      issue: 'INVALID_URL',
    });
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new AppError('Invalid allowed origin payload', 400, 'VALIDATION_ERROR', {
      field: 'origin',
      issue: 'INVALID_PROTOCOL',
    });
  }

  return parsed.origin.toLowerCase();
}

export function validateCreateAllowedOrigin(body: AllowedOriginBody): { origin: string } {
  return {
    origin: normalizeOrigin(body.origin),
  };
}
