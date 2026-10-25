import bcrypt from 'bcrypt';

const ROUNDS = 12;

/** Hash a plain-text password. Throws on internal bcrypt failure. */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

/** Constant-time comparison of a plain password against a stored hash. */
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
