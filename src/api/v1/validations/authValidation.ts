import { AppError } from '../errors/AppError';

interface AuthPayload {
  email?: unknown;
  password?: unknown;
}

// Auth validation runs before service calls to fail fast on malformed client payloads.
// Register and login share email checks while password policy is stricter on registration.
// Throwing AppError keeps validation failures aligned with global API response contract.
// Validation logic stays framework-agnostic to simplify unit testing and service reuse.
function ensureEmail(email: unknown): string {
  if (typeof email !== 'string' || email.trim().length === 0) {
    throw new AppError('Validation error', 400, 'VALIDATION_ERROR', { email: 'Email is required' });
  }

  const normalized = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalized)) {
    throw new AppError('Validation error', 400, 'VALIDATION_ERROR', { email: 'Email format is invalid' });
  }

  return normalized;
}

// Registration enforces stronger password policy because this is where credentials are created.
export function validateRegister(payload: AuthPayload): { email: string; password: string } {
  const email = ensureEmail(payload.email);

  if (typeof payload.password !== 'string' || payload.password.length < 8) {
    throw new AppError('Validation error', 400, 'VALIDATION_ERROR', {
      password: 'Password must contain at least 8 characters'
    });
  }

  if (!/[A-Z]/.test(payload.password) || !/[a-z]/.test(payload.password) || !/[0-9]/.test(payload.password)) {
    throw new AppError('Validation error', 400, 'VALIDATION_ERROR', {
      password: 'Password must contain uppercase, lowercase and numeric characters'
    });
  }

  return { email, password: payload.password };
}

// Login only verifies presence/basic shape because complexity rules are only required at creation time.
export function validateLogin(payload: AuthPayload): { email: string; password: string } {
  const email = ensureEmail(payload.email);

  if (typeof payload.password !== 'string' || payload.password.trim().length === 0) {
    throw new AppError('Validation error', 400, 'VALIDATION_ERROR', { password: 'Password is required' });
  }

  return { email, password: payload.password };
}
