import { AppError } from '../errors/AppError';
import { CreateBlockTypePayload, UpdateBlockTypePayload } from '../interfaces/BlockType';

const SUPPORTED_FIELD_TYPES = ['string', 'number', 'boolean', 'date', 'select'] as const;

// Path-id validation is shared across controllers to keep numeric checks consistent.
// All validation failures map to VALIDATION_ERROR so frontend can render deterministic messages.
// We intentionally return details payloads for field-level feedback in admin forms.
// Strict input constraints reduce malformed schema definitions reaching persistence layer.
export function validateBlockTypePathId(value: string | string[], fieldName: 'chatbotId' | 'typeId'): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError('Validation error', 400, 'VALIDATION_ERROR', {
      [fieldName]: `${fieldName} must be a positive integer`
    });
  }

  return parsed;
}

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

function ensureSchemaDefinition(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new AppError('Validation error', 400, 'VALIDATION_ERROR', {
      schema_definition: 'schema_definition must be an object'
    });
  }

  const schema = value as Record<string, unknown>;
  if (!Array.isArray(schema.fields) || schema.fields.length === 0) {
    throw new AppError('Validation error', 400, 'VALIDATION_ERROR', {
      schema_definition: 'schema_definition.fields must be a non-empty array'
    });
  }

  schema.fields.forEach((field, index) => {
    if (!field || typeof field !== 'object' || Array.isArray(field)) {
      throw new AppError('Validation error', 400, 'VALIDATION_ERROR', {
        schema_definition: `fields[${index}] must be an object`
      });
    }

    const typedField = field as Record<string, unknown>;
    const name = ensureOptionalString(typedField.name, 100, `fields[${index}].name`);
    if (!name) {
      throw new AppError('Validation error', 400, 'VALIDATION_ERROR', {
        schema_definition: `fields[${index}].name is required`
      });
    }

    const label = ensureOptionalString(typedField.label, 120, `fields[${index}].label`);
    if (!label) {
      throw new AppError('Validation error', 400, 'VALIDATION_ERROR', {
        schema_definition: `fields[${index}].label is required`
      });
    }

    const type = ensureOptionalString(typedField.type, 30, `fields[${index}].type`);
    if (!type || !SUPPORTED_FIELD_TYPES.includes(type as (typeof SUPPORTED_FIELD_TYPES)[number])) {
      throw new AppError('Validation error', 400, 'VALIDATION_ERROR', {
        schema_definition: `fields[${index}].type must be one of ${SUPPORTED_FIELD_TYPES.join(', ')}`
      });
    }

    if (typeof typedField.required !== 'undefined' && typeof typedField.required !== 'boolean') {
      throw new AppError('Validation error', 400, 'VALIDATION_ERROR', {
        schema_definition: `fields[${index}].required must be a boolean`
      });
    }

    if (type === 'select') {
      if (!Array.isArray(typedField.options) || typedField.options.length === 0) {
        throw new AppError('Validation error', 400, 'VALIDATION_ERROR', {
          schema_definition: `fields[${index}].options must be a non-empty string array when type is select`
        });
      }

      typedField.options.forEach((option, optionIndex) => {
        if (typeof option !== 'string' || option.trim().length === 0) {
          throw new AppError('Validation error', 400, 'VALIDATION_ERROR', {
            schema_definition: `fields[${index}].options[${optionIndex}] must be a non-empty string`
          });
        }
      });
    }
  });

  return schema;
}

// Create validation requires type_name and schema_definition and normalizes optional description.
export function validateCreateBlockType(body: Record<string, unknown>): CreateBlockTypePayload {
  if (typeof body.type_name !== 'string' || body.type_name.trim().length === 0 || body.type_name.trim().length > 100) {
    throw new AppError('Validation error', 400, 'VALIDATION_ERROR', {
      type_name: 'type_name is required and must be at most 100 characters'
    });
  }

  return {
    type_name: body.type_name.trim(),
    description: ensureOptionalString(body.description, 255, 'description'),
    schema_definition: ensureSchemaDefinition(body.schema_definition)
  };
}

// Update validation supports partial payloads but requires at least one updatable field.
export function validateUpdateBlockType(body: Record<string, unknown>): UpdateBlockTypePayload {
  const payload: UpdateBlockTypePayload = {
    type_name: ensureOptionalString(body.type_name, 100, 'type_name'),
    description: ensureOptionalString(body.description, 255, 'description')
  };

  if (typeof body.schema_definition !== 'undefined') {
    payload.schema_definition = ensureSchemaDefinition(body.schema_definition);
  }

  const hasAtLeastOneField = Object.values(payload).some((value) => typeof value !== 'undefined');
  if (!hasAtLeastOneField) {
    throw new AppError('Validation error', 400, 'VALIDATION_ERROR', {
      body: 'At least one field must be provided for block type update'
    });
  }

  return payload;
}
