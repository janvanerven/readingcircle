import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { AuthUser } from '../middleware/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me';

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

export function generateAccessToken(user: AuthUser): string {
  return jwt.sign(
    { id: user.id, username: user.username, isAdmin: user.isAdmin, isTemporary: user.isTemporary },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY },
  );
}

export function generateRefreshToken(userId: string): string {
  return jwt.sign(
    { id: userId, type: 'refresh' },
    JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY },
  );
}

export function verifyRefreshToken(token: string): { id: string } {
  return jwt.verify(token, JWT_REFRESH_SECRET) as { id: string };
}

export function generateMagicLinkToken(): string {
  return crypto.randomBytes(32).toString('hex');
}
