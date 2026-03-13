import { AppError } from '../errors/AppError';

interface AuthPayload {
  email?: unknown;
  password?: unknown;
  role?: unknown;
}

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

function ensureRole(role: unknown): 'ADMIN' | 'USER' {
  if (typeof role === 'undefined') {
    return 'USER';
  }

  if (role !== 'ADMIN' && role !== 'USER') {
    throw new AppError('Validation error', 400, 'VALIDATION_ERROR', {
      role: 'Role must be either ADMIN or USER'
    });
  }

  return role;
}

export function validateRegister(payload: AuthPayload): { email: string; password: string; role: 'ADMIN' | 'USER' } {
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

  return { email, password: payload.password, role: ensureRole(payload.role) };
}

export function validateLogin(payload: AuthPayload): { email: string; password: string } {
  const email = ensureEmail(payload.email);

  if (typeof payload.password !== 'string' || payload.password.trim().length === 0) {
    throw new AppError('Validation error', 400, 'VALIDATION_ERROR', { password: 'Password is required' });
  }

  return { email, password: payload.password };
}
