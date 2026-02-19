import { randomBytes, scrypt as scryptCallback } from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(scryptCallback);

// Password helper centralizes one-way hashing so seed logic never stores plain credentials.
// We use Node crypto primitives to avoid extra dependencies while keeping secure password derivation.
// The resulting format includes salt and hash, allowing future verify helpers during auth feature rollout.
const KEY_LENGTH = 64;

// hashPassword is called when creating the seeded admin and should never log secrets.
export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = (await scrypt(plain, salt, KEY_LENGTH)) as Buffer;
  return `${salt}:${derivedKey.toString('hex')}`;
}
