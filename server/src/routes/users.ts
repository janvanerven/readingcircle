import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireAdmin, requireSetupComplete } from '../middleware/auth';
import { db, schema } from '../db';
import { eq, and, sql } from 'drizzle-orm';
import { AppError } from '../middleware/error';

export const userRoutes = Router();

userRoutes.use(authenticate);
userRoutes.use(requireSetupComplete);

// List all circle members (basic info)
userRoutes.get('/', (_req: Request, res: Response) => {
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

// Public member profiles with host count and read book count
userRoutes.get('/profiles', (_req: Request, res: Response) => {
  const users = db.select({
    id: schema.users.id,
    username: schema.users.username,
    isAdmin: schema.users.isAdmin,
  }).from(schema.users)
    .where(eq(schema.users.isTemporary, false))
    .all();

  const profiles = users.map(u => {
    const hostCount = db.select({ count: sql<number>`count(*)` })
      .from(schema.meets)
      .where(and(
        eq(schema.meets.hostId, u.id),
        sql`${schema.meets.phase} != 'cancelled'`,
      ))
      .get()!.count;

    const readBookCount = db.select({ count: sql<number>`count(*)` })
      .from(schema.userBooks)
      .where(eq(schema.userBooks.userId, u.id))
      .get()!.count;

    return { ...u, hostCount, readBookCount };
  });

  profiles.sort((a, b) => b.hostCount - a.hostCount);
  res.json(profiles);
});

// Current user's read books
userRoutes.get('/me/books', (req: Request, res: Response) => {
  const books = db.select({
    id: schema.books.id,
    title: schema.books.title,
    author: schema.books.author,
  }).from(schema.userBooks)
    .leftJoin(schema.books, eq(schema.userBooks.bookId, schema.books.id))
    .where(eq(schema.userBooks.userId, req.user!.id))
    .all();

  res.json(books);
});

// Mark book as read
userRoutes.post('/me/books/:bookId', (req: Request, res: Response, next: NextFunction) => {
  try {
    const bookId = req.params.bookId as string;

    const book = db.select({ id: schema.books.id }).from(schema.books).where(eq(schema.books.id, bookId)).get();
    if (!book) throw new AppError(404, 'Book not found');

    const existing = db.select().from(schema.userBooks)
      .where(and(eq(schema.userBooks.userId, req.user!.id), eq(schema.userBooks.bookId, bookId)))
      .get();

    if (!existing) {
      db.insert(schema.userBooks).values({
        userId: req.user!.id,
        bookId,
        createdAt: new Date().toISOString(),
      }).run();
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Unmark book as read
userRoutes.delete('/me/books/:bookId', (req: Request, res: Response, next: NextFunction) => {
  try {
    const bookId = req.params.bookId as string;

    db.delete(schema.userBooks)
      .where(and(eq(schema.userBooks.userId, req.user!.id), eq(schema.userBooks.bookId, bookId)))
      .run();

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Single member profile
userRoutes.get('/:id/profile', (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const u = db.select({
      id: schema.users.id,
      username: schema.users.username,
      isAdmin: schema.users.isAdmin,
      createdAt: schema.users.createdAt,
    }).from(schema.users)
      .where(eq(schema.users.id, id))
      .get();

    if (!u) throw new AppError(404, 'User not found');

    const hostCount = db.select({ count: sql<number>`count(*)` })
      .from(schema.meets)
      .where(and(
        eq(schema.meets.hostId, id),
        sql`${schema.meets.phase} != 'cancelled'`,
      ))
      .get()!.count;

    const readBooks = db.select({
      id: schema.books.id,
      title: schema.books.title,
      author: schema.books.author,
    }).from(schema.userBooks)
      .leftJoin(schema.books, eq(schema.userBooks.bookId, schema.books.id))
      .where(eq(schema.userBooks.userId, id))
      .all();

    res.json({ ...u, hostCount, readBooks });
  } catch (err) {
    next(err);
  }
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
