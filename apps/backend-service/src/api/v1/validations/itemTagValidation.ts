import { AppError } from '../errors/AppError';
import { UpdateItemTagsPayload } from '../interfaces/ItemTag';

// Path validators keep route handlers clean and enforce positive integer IDs consistently.
// Multi-tenant endpoints rely on strict ID parsing so ownership checks run on trusted values only.
// All validation failures return VALIDATION_ERROR to match the global API error contract.
// This helper is shared by both GET and PUT item-tag endpoints.
export function validateItemTagPathId(value: string | string[], fieldName: 'chatbotId' | 'itemId'): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError('Validation error', 400, 'VALIDATION_ERROR', {
      [fieldName]: `${fieldName} must be a positive integer`
    });
  }

  return parsed;
}

function ensureStringArray(value: unknown, fieldName: 'tagCodes'): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new AppError('Validation error', 400, 'VALIDATION_ERROR', {
      [fieldName]: `${fieldName} must be a non-empty array`
    });
  }

  const normalized = value.map((item, index) => {
    if (typeof item !== 'string' || item.trim().length === 0 || item.trim().length > 50) {
      throw new AppError('Validation error', 400, 'VALIDATION_ERROR', {
        [fieldName]: `${fieldName}[${index}] must be a non-empty string up to 50 characters`
      });
    }

    return item.trim();
  });

  return [...new Set(normalized)];
}

function ensurePositiveIntArray(value: unknown, fieldName: 'tagIds'): number[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new AppError('Validation error', 400, 'VALIDATION_ERROR', {
      [fieldName]: `${fieldName} must be a non-empty array`
    });
  }

  const normalized = value.map((item, index) => {
    if (!Number.isInteger(item) || Number(item) <= 0) {
      throw new AppError('Validation error', 400, 'VALIDATION_ERROR', {
        [fieldName]: `${fieldName}[${index}] must be a positive integer`
      });
    }

    return Number(item);
  });

  return [...new Set(normalized)];
}

// validateUpdateItemTagsBody enforces one-input-mode semantics (codes XOR ids).
// Rejecting mixed payloads prevents ambiguous precedence decisions in business logic.
// The returned payload is deduplicated so service code can write deterministic links.
// This validation is intentionally strict because tag replacements are destructive operations.
export function validateUpdateItemTagsBody(body: Record<string, unknown>): UpdateItemTagsPayload {
  const hasTagCodes = typeof body.tagCodes !== 'undefined';
  const hasTagIds = typeof body.tagIds !== 'undefined';

  if (!hasTagCodes && !hasTagIds) {
    throw new AppError('Validation error', 400, 'VALIDATION_ERROR', {
      body: 'Either tagCodes or tagIds must be provided'
    });
  }

  if (hasTagCodes && hasTagIds) {
    throw new AppError('Validation error', 400, 'VALIDATION_ERROR', {
      body: 'Provide either tagCodes or tagIds, not both'
    });
  }

  if (hasTagCodes) {
    return { tagCodes: ensureStringArray(body.tagCodes, 'tagCodes') };
  }

  return { tagIds: ensurePositiveIntArray(body.tagIds, 'tagIds') };
}
