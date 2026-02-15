import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireAdmin, requireSetupComplete } from '../middleware/auth';
import { db, schema } from '../db';
import { eq } from 'drizzle-orm';
import { AppError } from '../middleware/error';

export const userRoutes = Router();

userRoutes.use(authenticate);
userRoutes.use(requireSetupComplete);

// List all circle members
userRoutes.get('/', (req: Request, res: Response) => {
  const users = db.select({
    id: schema.users.id,
    username: schema.users.username,
    email: schema.users.email,
    isAdmin: schema.users.isAdmin,
    isTemporary: schema.users.isTemporary,
    createdAt: schema.users.createdAt,
  }).from(schema.users).all();

  res.json(users);
});

// Toggle admin status
userRoutes.patch('/:id/admin', requireAdmin, (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;

    if (id === req.user!.id) {
      throw new AppError(400, 'Cannot change your own admin status');
    }

    const user = db.select().from(schema.users).where(eq(schema.users.id, id)).get();
    if (!user) throw new AppError(404, 'User not found');

    db.update(schema.users)
      .set({ isAdmin: !user.isAdmin, updatedAt: new Date().toISOString() })
      .where(eq(schema.users.id, id))
      .run();

    res.json({ id, isAdmin: !user.isAdmin });
  } catch (err) {
    next(err);
  }
});

// Remove user
userRoutes.delete('/:id', requireAdmin, (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;

    if (id === req.user!.id) {
      throw new AppError(400, 'Cannot remove yourself');
    }

    const user = db.select().from(schema.users).where(eq(schema.users.id, id)).get();
    if (!user) throw new AppError(404, 'User not found');

    db.delete(schema.users).where(eq(schema.users.id, id)).run();
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
