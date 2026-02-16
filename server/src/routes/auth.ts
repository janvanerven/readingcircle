import { Router, Request, Response, NextFunction, CookieOptions } from 'express';
import { v4 as uuid } from 'uuid';
import { rateLimit } from 'express-rate-limit';
import { login, refreshAccessToken, setupAccount, registerWithInvitation, validateInvitation } from '../services/auth';
import { authenticate, requireSetupComplete } from '../middleware/auth';
import { IS_PRODUCTION } from '../config';
import { db, schema } from '../db';
import { eq } from 'drizzle-orm';
import { hashPassword, verifyPassword, validatePassword } from '../utils/password';
import { generateAccessToken, generateRefreshToken, generateMagicLinkToken } from '../utils/tokens';
import { isValidUsername, isValidEmail } from '../utils/validation';
import { AppError } from '../middleware/error';
import { sendPasswordResetEmail } from '../services/email';

export const authRoutes = Router();

const REFRESH_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  sameSite: 'strict',
  secure: IS_PRODUCTION,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/api/auth/refresh',
};

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many attempts, please try again later' },
});

authRoutes.post('/login', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required' });
      return;
    }
    const result = await login(username, password);
    res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS);
    res.json({ accessToken: result.accessToken, user: result.user });
  } catch (err) {
    next(err);
  }
});

authRoutes.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      res.status(401).json({ error: 'No refresh token' });
      return;
    }
    const result = await refreshAccessToken(token);
    res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS);
    res.json({ accessToken: result.accessToken, user: result.user });
  } catch (err) {
    next(err);
  }
});

authRoutes.post('/setup', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.isTemporary) {
      res.status(400).json({ error: 'Account setup already completed' });
      return;
    }
    const { username, password, email } = req.body;
    if (!username || !password || !email) {
      res.status(400).json({ error: 'Username, password, and email are required' });
      return;
    }
    const result = await setupAccount(req.user.id, username, password, email);
    res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS);
    res.json({ accessToken: result.accessToken, user: result.user });
  } catch (err) {
    next(err);
  }
});

authRoutes.get('/invitation/:token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await validateInvitation(req.params.token as string);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

authRoutes.post('/register', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, username, password } = req.body;
    if (!token || !username || !password) {
      res.status(400).json({ error: 'Token, username, and password are required' });
      return;
    }
    const result = await registerWithInvitation(token, username, password);
    res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS);
    res.json({ accessToken: result.accessToken, user: result.user });
  } catch (err) {
    next(err);
  }
});

authRoutes.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
  res.json({ ok: true });
});

authRoutes.get('/me', authenticate, (req: Request, res: Response) => {
  res.json({ user: req.user });
});

// Change username
authRoutes.patch('/username', authenticate, requireSetupComplete, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { newUsername, currentPassword } = req.body;
    if (!newUsername || !currentPassword) {
      res.status(400).json({ error: 'New username and current password are required' });
      return;
    }

    if (!isValidUsername(newUsername)) {
      throw new AppError(400, 'Username must be between 2 and 30 characters');
    }

    const user = db.select().from(schema.users).where(eq(schema.users.id, req.user!.id)).get();
    if (!user) throw new AppError(404, 'User not found');

    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) throw new AppError(401, 'Current password is incorrect');

    const existing = db.select().from(schema.users).where(eq(schema.users.username, newUsername)).get();
    if (existing && existing.id !== req.user!.id) {
      throw new AppError(400, 'Username already taken');
    }

    const now = new Date().toISOString();
    db.update(schema.users)
      .set({ username: newUsername, updatedAt: now })
      .where(eq(schema.users.id, req.user!.id))
      .run();

    const authUser = { id: user.id, username: newUsername, isAdmin: user.isAdmin, isTemporary: user.isTemporary };
    const accessToken = generateAccessToken(authUser);
    const refreshToken = generateRefreshToken(user.id);

    res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);
    res.json({ accessToken, user: authUser });
  } catch (err) {
    next(err);
  }
});

// Change password
authRoutes.patch('/password', authenticate, requireSetupComplete, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'Current password and new password are required' });
      return;
    }

    const user = db.select().from(schema.users).where(eq(schema.users.id, req.user!.id)).get();
    if (!user) throw new AppError(404, 'User not found');

    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) throw new AppError(401, 'Current password is incorrect');

    const validationError = validatePassword(newPassword);
    if (validationError) throw new AppError(400, validationError);

    const passwordHash = await hashPassword(newPassword);
    const now = new Date().toISOString();

    db.update(schema.users)
      .set({ passwordHash, updatedAt: now })
      .where(eq(schema.users.id, req.user!.id))
      .run();

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Forgot password - request reset
authRoutes.post('/forgot-password', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    if (!email || !isValidEmail(email)) {
      // Always return 200 to prevent enumeration
      res.json({ ok: true });
      return;
    }

    const user = db.select().from(schema.users).where(eq(schema.users.email, email)).get();
    if (user) {
      const token = generateMagicLinkToken();
      const now = new Date().toISOString();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

      db.insert(schema.passwordResetTokens).values({
        id: uuid(),
        userId: user.id,
        token,
        expiresAt,
        createdAt: now,
      }).run();

      await sendPasswordResetEmail(email, token);
    }

    // Always return 200
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Reset password with token
authRoutes.post('/reset-password', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      res.status(400).json({ error: 'Token and password are required' });
      return;
    }

    const resetToken = db.select().from(schema.passwordResetTokens).where(eq(schema.passwordResetTokens.token, token)).get();
    if (!resetToken) throw new AppError(400, 'Invalid or expired reset link');
    if (resetToken.usedAt) throw new AppError(400, 'This reset link has already been used');
    if (new Date(resetToken.expiresAt) < new Date()) throw new AppError(400, 'This reset link has expired');

    const validationError = validatePassword(password);
    if (validationError) throw new AppError(400, validationError);

    const passwordHash = await hashPassword(password);
    const now = new Date().toISOString();

    db.update(schema.users)
      .set({ passwordHash, updatedAt: now })
      .where(eq(schema.users.id, resetToken.userId))
      .run();

    db.update(schema.passwordResetTokens)
      .set({ usedAt: now })
      .where(eq(schema.passwordResetTokens.id, resetToken.id))
      .run();

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
