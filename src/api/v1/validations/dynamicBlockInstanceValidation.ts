import { AppError } from '../errors/AppError';
import { CreateDynamicBlockPayload, UpdateDynamicBlockPayload } from '../interfaces/DynamicBlockInstance';

// Dynamic block path validation guarantees controllers pass trusted numeric identifiers to services.
// Keeping ID parsing centralized avoids copy/paste bugs across create/list/get/update/delete handlers.
// Every failure is mapped to VALIDATION_ERROR so admin UI receives deterministic field-level feedback.
// We intentionally enforce positive integers to preserve multi-tenant ownership checks integrity.
export function validateDynamicPathId(value: string | string[], fieldName: 'chatbotId' | 'typeId' | 'entityId'): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError('Validation error', 400, 'VALIDATION_ERROR', {
      [fieldName]: `${fieldName} must be a positive integer`
    });
  }

  return parsed;
}

function ensureDataObject(value: unknown, fieldName: 'data'): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new AppError('Validation error', 400, 'VALIDATION_ERROR', {
      [fieldName]: `${fieldName} must be an object`
    });
  }

  const data = value as Record<string, unknown>;
  if (Object.keys(data).length === 0) {
    throw new AppError('Validation error', 400, 'VALIDATION_ERROR', {
      [fieldName]: `${fieldName} must contain at least one field`
    });
  }

  return data;
}

// Create validation performs shape checks while deep schema checks run in service against DB type definitions.
// This split keeps HTTP concerns lightweight and business rules anchored to runtime block-type metadata.
export function validateCreateDynamicBlockPayload(body: Record<string, unknown>): CreateDynamicBlockPayload {
  return {
    data: ensureDataObject(body.data, 'data')
  };
}

// Update validation currently requires a full data object to prevent accidental empty writes.
// Service layer still decides whether field-level schema constraints are satisfied before persistence.
export function validateUpdateDynamicBlockPayload(body: Record<string, unknown>): UpdateDynamicBlockPayload {
  return {
    data: ensureDataObject(body.data, 'data')
  };
}
