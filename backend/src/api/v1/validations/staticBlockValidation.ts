import { AppError } from '../errors/AppError';
import { ContactCreatePayload, ContactUpdatePayload } from '../interfaces/ContactBlock';
import { ScheduleCreatePayload, ScheduleUpdatePayload } from '../interfaces/ScheduleBlock';

const DAY_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

// Validation helpers keep controller logic thin and return normalized payload objects.
// We enforce strict limits because static blocks are rendered directly in admin UI forms.
// All validation failures map to AppError(400, VALIDATION_ERROR) for consistent API semantics.
// Path id parsing is centralized to avoid duplicate integer checks across handlers.
export function validatePathId(value: string | string[], fieldName: 'chatbotId' | 'entityId'): number {
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

// Contact create requires org_name and applies optional field constraints aligned with DB schema.
export function validateCreateContact(body: Record<string, unknown>): ContactCreatePayload {
  if (typeof body.org_name !== 'string' || body.org_name.trim().length === 0 || body.org_name.trim().length > 120) {
    throw new AppError('Validation error', 400, 'VALIDATION_ERROR', {
      org_name: 'org_name is required and must be at most 120 characters'
    });
  }

  const email = ensureOptionalString(body.email, 190, 'email');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AppError('Validation error', 400, 'VALIDATION_ERROR', {
      email: 'email must be a valid email address'
    });
  }

  return {
    org_name: body.org_name.trim(),
    phone: ensureOptionalString(body.phone, 50, 'phone'),
    email,
    address_text: ensureOptionalString(body.address_text, 255, 'address_text'),
    city: ensureOptionalString(body.city, 120, 'city'),
    country: ensureOptionalString(body.country, 120, 'country'),
    hours_text: ensureOptionalString(body.hours_text, 255, 'hours_text')
  };
}

// Contact update is partial but requires at least one allowed field to prevent empty PUT requests.
export function validateUpdateContact(body: Record<string, unknown>): ContactUpdatePayload {
  const payload: ContactUpdatePayload = {
    org_name: ensureOptionalString(body.org_name, 120, 'org_name'),
    phone: ensureOptionalString(body.phone, 50, 'phone'),
    email: ensureOptionalString(body.email, 190, 'email'),
    address_text: ensureOptionalString(body.address_text, 255, 'address_text'),
    city: ensureOptionalString(body.city, 120, 'city'),
    country: ensureOptionalString(body.country, 120, 'country'),
    hours_text: ensureOptionalString(body.hours_text, 255, 'hours_text')
  };

  if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    throw new AppError('Validation error', 400, 'VALIDATION_ERROR', {
      email: 'email must be a valid email address'
    });
  }

  const hasAtLeastOneField = Object.values(payload).some((value) => typeof value !== 'undefined');
  if (!hasAtLeastOneField) {
    throw new AppError('Validation error', 400, 'VALIDATION_ERROR', {
      body: 'At least one field must be provided for contact update'
    });
  }

  return payload;
}

function ensureDayOfWeek(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new AppError('Validation error', 400, 'VALIDATION_ERROR', {
      [fieldName]: `${fieldName} is required`
    });
  }

  const normalized = value.trim();
  if (!DAY_OF_WEEK.includes(normalized as (typeof DAY_OF_WEEK)[number])) {
    throw new AppError('Validation error', 400, 'VALIDATION_ERROR', {
      [fieldName]: `${fieldName} must be one of: ${DAY_OF_WEEK.join(', ')}`
    });
  }

  return normalized;
}

function ensureTime(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || !/^([01]\d|2[0-3]):([0-5]\d)$/.test(value.trim())) {
    throw new AppError('Validation error', 400, 'VALIDATION_ERROR', {
      [fieldName]: `${fieldName} must match HH:MM format`
    });
  }

  return value.trim();
}

// Schedule create enforces business-valid day/time fields before persistence begins.
export function validateCreateSchedule(body: Record<string, unknown>): ScheduleCreatePayload {
  if (typeof body.title !== 'string' || body.title.trim().length === 0 || body.title.trim().length > 120) {
    throw new AppError('Validation error', 400, 'VALIDATION_ERROR', {
      title: 'title is required and must be at most 120 characters'
    });
  }

  const open_time = ensureTime(body.open_time, 'open_time');
  const close_time = ensureTime(body.close_time, 'close_time');
  if (open_time >= close_time) {
    throw new AppError('Validation error', 400, 'VALIDATION_ERROR', {
      close_time: 'close_time must be greater than open_time'
    });
  }

  return {
    title: body.title.trim(),
    day_of_week: ensureDayOfWeek(body.day_of_week, 'day_of_week'),
    open_time,
    close_time,
    notes: ensureOptionalString(body.notes, 5000, 'notes')
  };
}

// Schedule update is partial and validates cross-field time ordering when both values are present.
export function validateUpdateSchedule(body: Record<string, unknown>): ScheduleUpdatePayload {
  const payload: ScheduleUpdatePayload = {
    title: ensureOptionalString(body.title, 120, 'title'),
    notes: ensureOptionalString(body.notes, 5000, 'notes')
  };

  if (typeof body.day_of_week !== 'undefined') {
    payload.day_of_week = ensureDayOfWeek(body.day_of_week, 'day_of_week');
  }

  if (typeof body.open_time !== 'undefined') {
    payload.open_time = ensureTime(body.open_time, 'open_time');
  }

  if (typeof body.close_time !== 'undefined') {
    payload.close_time = ensureTime(body.close_time, 'close_time');
  }

  const hasAtLeastOneField = Object.values(payload).some((value) => typeof value !== 'undefined');
  if (!hasAtLeastOneField) {
    throw new AppError('Validation error', 400, 'VALIDATION_ERROR', {
      body: 'At least one field must be provided for schedule update'
    });
  }

  if (payload.open_time && payload.close_time && payload.open_time >= payload.close_time) {
    throw new AppError('Validation error', 400, 'VALIDATION_ERROR', {
      close_time: 'close_time must be greater than open_time'
    });
  }

  return payload;
}
