
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';

const SALT_ROUNDS = 10;
const JWT_EXPIRES_IN = '12h';

export const strongPasswordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must not exceed 128 characters')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/\d/, 'Password must contain at least one number')
  .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character');

export class Security {
  /**
   * Retrieves and validates the JWT secret key.
   * Throws a fatal security error in production if the key is missing or uses the default insecure secret.
   */
  static getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    const isProduction = process.env.NODE_ENV === 'production';

    if (isProduction && (!secret || secret === 'masuma_secret_key_123' || secret.length < 16)) {
      throw new Error(
        'FATAL SECURITY VIOLATION: JWT_SECRET must be configured with a secure, unique key in production. Refusing to start with insecure default secret.'
      );
    }

    return secret || 'masuma_secret_key_123';
  }

  /**
   * Hash a plain text password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  /**
   * Compare plain text password with hash
   */
  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate a JWT token
   */
  static generateToken(payload: object): string {
    return jwt.sign(payload, Security.getJwtSecret(), { expiresIn: JWT_EXPIRES_IN });
  }

  /**
   * Verify a JWT token
   */
  static verifyToken(token: string): any {
    try {
      return jwt.verify(token, Security.getJwtSecret());
    } catch (error) {
      return null;
    }
  }

  /**
   * Compute a secure SHA-256 hash of a string (e.g. for storing reset tokens or API keys)
   */
  static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Escape special SQL wildcard characters (%, _) for safe usage in TypeORM LIKE queries
   */
  static escapeLikeString(input: string): string {
    if (!input) return '';
    return input.replace(/[\\%_]/g, '\\$&');
  }
}

