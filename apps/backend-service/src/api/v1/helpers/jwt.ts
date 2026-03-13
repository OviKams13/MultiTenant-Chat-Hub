import { createHmac } from 'crypto';
import dotenv from 'dotenv';
import { AppError } from '../errors/AppError';

export interface AuthTokenPayload {
  userId: number;
  email: string;
  role: string;
  exp?: number;
  iat?: number;
}

// JWT helper implements HS256 token signing/verification without external packages.
// Feature 1 keeps payload minimal (id, email, role) so private data never sits in bearer tokens.
// Startup crashes when JWT_SECRET is missing to avoid issuing unverifiable tokens in production.
// Verification validates signature and expiration before request is marked authenticated.
// dotenv is loaded here so JWT configuration is available even when this module is imported early.
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN_SECONDS = Number(process.env.JWT_EXPIRES_IN_SECONDS || 3600);

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is required to start the application.');
}

const SECRET_KEY: string = JWT_SECRET;

function base64UrlEncode(input: string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(input: string): string {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  return Buffer.from(padded, 'base64').toString('utf8');
}

// signToken creates a standard 3-part JWT using HMAC-SHA256 signature.
export function signToken(payload: AuthTokenPayload): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const completePayload = { ...payload, iat: now, exp: now + JWT_EXPIRES_IN_SECONDS };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(completePayload));
  const signature = createHmac('sha256', SECRET_KEY).update(`${encodedHeader}.${encodedPayload}`).digest('base64url');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

// verifyToken validates structure, signature, and expiration before returning trusted claims.
export function verifyToken(token: string): AuthTokenPayload {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new AppError('Invalid or expired token', 401, 'INVALID_TOKEN');
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const expectedSignature = createHmac('sha256', SECRET_KEY).update(`${encodedHeader}.${encodedPayload}`).digest('base64url');

  if (signature !== expectedSignature) {
    throw new AppError('Invalid or expired token', 401, 'INVALID_TOKEN');
  }

  const payload = JSON.parse(base64UrlDecode(encodedPayload)) as AuthTokenPayload;
  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== 'number' || payload.exp < now) {
    throw new AppError('Invalid or expired token', 401, 'INVALID_TOKEN');
  }

  return payload;
}
