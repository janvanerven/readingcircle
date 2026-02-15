import { Router, Request, Response, NextFunction, CookieOptions } from 'express';
import { rateLimit } from 'express-rate-limit';
import { login, refreshAccessToken, setupAccount, registerWithInvitation, validateInvitation } from '../services/auth';
import { authenticate } from '../middleware/auth';
import { IS_PRODUCTION } from '../config';

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
