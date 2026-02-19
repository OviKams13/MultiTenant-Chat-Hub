import { timingSafeEqual, randomBytes, scrypt as scryptCallback } from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

// Password helper centralizes one-way hashing rules used by register, login, and seed flows.
// We rely on Node's scrypt to keep zero external dependency while preserving strong password derivation.
// The stored format includes both salt and hash, enabling deterministic verification during login.
// Timing-safe comparison is used to reduce side-channel leakage when checking credentials.
export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = (await scrypt(plain, salt, KEY_LENGTH)) as Buffer;
  return `${salt}:${derivedKey.toString('hex')}`;
}

// comparePassword re-derives the hash from provided plaintext and compares it with stored hash.
export async function comparePassword(plain: string, hash: string): Promise<boolean> {
  const [salt, storedHash] = hash.split(':');
  if (!salt || !storedHash) {
    return false;
  }

  const derivedKey = (await scrypt(plain, salt, KEY_LENGTH)) as Buffer;
  const storedBuffer = Buffer.from(storedHash, 'hex');

  if (storedBuffer.length !== derivedKey.length) {
    return false;
  }

  return timingSafeEqual(storedBuffer, derivedKey);
}
