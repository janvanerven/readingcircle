import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { AuthUser } from '../middleware/auth';
import { JWT_SECRET, JWT_REFRESH_SECRET, JWT_ALGORITHM } from '../config';

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

export function generateAccessToken(user: AuthUser): string {
  return jwt.sign(
    { id: user.id, username: user.username, isAdmin: user.isAdmin, isTemporary: user.isTemporary },
    JWT_SECRET,
    { algorithm: JWT_ALGORITHM, expiresIn: ACCESS_TOKEN_EXPIRY },
  );
}

export function generateRefreshToken(userId: string): string {
  return jwt.sign(
    { id: userId, type: 'refresh' },
    JWT_REFRESH_SECRET,
    { algorithm: JWT_ALGORITHM, expiresIn: REFRESH_TOKEN_EXPIRY },
  );
}

export function verifyRefreshToken(token: string): { id: string } {
  return jwt.verify(token, JWT_REFRESH_SECRET, { algorithms: [JWT_ALGORITHM] }) as { id: string };
}

export function generateMagicLinkToken(): string {
  return crypto.randomBytes(32).toString('hex');
}
