import { AppError } from '../errors/AppError';

interface ChatbotBody {
  domain?: unknown;
  display_name?: unknown;
}

// Chatbot validation enforces tenant-safe input rules before hitting database logic.
// We validate domain and display_name centrally so controllers remain thin and deterministic.
// Any malformed payload throws AppError with VALIDATION_ERROR for consistent client handling.
// Domain checks are intentionally pragmatic (no spaces + at least one dot) for this feature scope.
function ensureDomain(domain: unknown): string {
  if (typeof domain !== 'string' || domain.trim().length === 0 || domain.length > 255) {
    throw new AppError('Invalid request body', 400, 'VALIDATION_ERROR');
  }

  const normalized = domain.trim().toLowerCase();
  const domainRegex = /^\S+\.\S+$/;
  if (!domainRegex.test(normalized)) {
    throw new AppError('Invalid request body', 400, 'VALIDATION_ERROR');
  }

  return normalized;
}

// display_name must remain concise because it is used as a UI label in admin dashboard lists.
function ensureDisplayName(displayName: unknown): string {
  if (typeof displayName !== 'string' || displayName.trim().length === 0 || displayName.trim().length > 100) {
    throw new AppError('Invalid request body', 400, 'VALIDATION_ERROR');
  }

  return displayName.trim();
}

// validateChatbotId ensures route params reference a positive integer chatbot identifier.
export function validateChatbotId(id: string): number {
  const parsed = Number(id);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError('Invalid chatbot id', 400, 'VALIDATION_ERROR');
  }

  return parsed;
}

// validateCreateChatbot enforces required fields for POST /chatbots.
export function validateCreateChatbot(body: ChatbotBody): { domain: string; display_name: string } {
  return {
    domain: ensureDomain(body.domain),
    display_name: ensureDisplayName(body.display_name)
  };
}

// validateUpdateChatbot supports partial updates while requiring at least one mutable field.
export function validateUpdateChatbot(body: ChatbotBody): { domain?: string; display_name?: string } {
  const hasDomain = Object.prototype.hasOwnProperty.call(body, 'domain');
  const hasDisplayName = Object.prototype.hasOwnProperty.call(body, 'display_name');

  if (!hasDomain && !hasDisplayName) {
    throw new AppError('Invalid request body', 400, 'VALIDATION_ERROR');
  }

  const payload: { domain?: string; display_name?: string } = {};

  if (hasDomain) {
    payload.domain = ensureDomain(body.domain);
  }

  if (hasDisplayName) {
    payload.display_name = ensureDisplayName(body.display_name);
  }

  return payload;
}
