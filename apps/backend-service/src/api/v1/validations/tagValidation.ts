import { AppError } from '../errors/AppError';
import { CreateTagPayload, TagFilter, UpdateTagPayload } from '../interfaces/Tag';

// Tag validation centralizes API input constraints for list and create endpoints.
// This protects service logic from malformed query/body payloads and keeps controllers minimal.
// Validation errors consistently map to AppError with VALIDATION_ERROR code.
// Rules are intentionally explicit to match DB limits and prevent future data cleanup costs.
function ensureOptionalString(value: unknown, maxLength: number, fieldName: string): string | undefined {
  if (typeof value === 'undefined') {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new AppError('Validation error', 400, 'VALIDATION_ERROR', { [fieldName]: `${fieldName} must be a string` });
  }

  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    throw new AppError('Validation error', 400, 'VALIDATION_ERROR', {
      [fieldName]: `${fieldName} must be at most ${maxLength} characters`
    });
  }

  return trimmed.length > 0 ? trimmed : undefined;
}

function ensureSynonyms(value: unknown): string[] {
  if (!Array.isArray(value)) {
    throw new AppError('Validation error', 400, 'VALIDATION_ERROR', {
      synonyms: 'synonyms must be an array of strings'
    });
  }

  const normalized = value.map((entry, index) => {
    if (typeof entry !== 'string' || entry.trim().length === 0 || entry.trim().length > 100) {
      throw new AppError('Validation error', 400, 'VALIDATION_ERROR', {
        synonyms: `synonyms[${index}] must be a non-empty string up to 100 chars`
      });
    }

    return entry.trim();
  });

  return [...new Set(normalized)];
}

// validateListTagsQuery parses and validates category/is_system/search query parameters.
export function validateListTagsQuery(query: Record<string, unknown>): TagFilter {
  const category = ensureOptionalString(query.category, 50, 'category');
  const search = ensureOptionalString(query.search, 100, 'search');

  let is_system: boolean | undefined;
  if (typeof query.is_system !== 'undefined') {
    if (query.is_system !== 'true' && query.is_system !== 'false') {
      throw new AppError('Validation error', 400, 'VALIDATION_ERROR', {
        is_system: 'is_system must be "true" or "false"'
      });
    }

    is_system = query.is_system === 'true';
  }

  return { category, is_system, search };
}

// validateCreateTag enforces required tag_code plus optional description/category/synonyms constraints.
export function validateCreateTag(body: Record<string, unknown>): CreateTagPayload {
  if (typeof body.tag_code !== 'string' || body.tag_code.trim().length === 0 || body.tag_code.trim().length > 50) {
    throw new AppError('Validation error', 400, 'VALIDATION_ERROR', {
      tag_code: 'tag_code is required and must be at most 50 characters'
    });
  }

  const description = ensureOptionalString(body.description, 255, 'description');
  const category = ensureOptionalString(body.category, 50, 'category');

  let synonyms: string[] | undefined;
  if (typeof body.synonyms !== 'undefined') {
    synonyms = ensureSynonyms(body.synonyms);
  }

  return {
    tag_code: body.tag_code.trim(),
    description,
    category,
    synonyms
  };
}

// validateUpdateTagPathId enforces numeric positive ids for tag mutation routes.
export function validateUpdateTagPathId(raw: string | string[]): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError('Validation error', 400, 'VALIDATION_ERROR', {
      tagId: 'tagId must be a positive integer'
    });
  }

  return parsed;
}

// validateUpdateTag validates PATCH/PUT payload for existing tags.
export function validateUpdateTag(body: Record<string, unknown>): UpdateTagPayload {
  const payload: UpdateTagPayload = {};

  if (typeof body.tag_code !== 'undefined') {
    if (typeof body.tag_code !== 'string' || body.tag_code.trim().length === 0 || body.tag_code.trim().length > 50) {
      throw new AppError('Validation error', 400, 'VALIDATION_ERROR', {
        tag_code: 'tag_code must be a non-empty string up to 50 characters'
      });
    }
    payload.tag_code = body.tag_code.trim();
  }

  if (typeof body.description !== 'undefined') {
    const normalized = ensureOptionalString(body.description, 255, 'description');
    payload.description = normalized;
  }

  if (typeof body.category !== 'undefined') {
    const normalized = ensureOptionalString(body.category, 50, 'category');
    payload.category = normalized;
  }

  if (typeof body.synonyms !== 'undefined') {
    payload.synonyms = ensureSynonyms(body.synonyms);
  }

  if (Object.keys(payload).length === 0) {
    throw new AppError('Validation error', 400, 'VALIDATION_ERROR', {
      body: 'At least one field must be provided'
    });
  }

  return payload;
}
