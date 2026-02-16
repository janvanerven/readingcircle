import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuid } from 'uuid';
import { authenticate, requireAdmin, requireSetupComplete } from '../middleware/auth';
import { db, schema } from '../db';
import { eq, ne, and, sql } from 'drizzle-orm';
import { AppError } from '../middleware/error';
import { isValidStringField, isValidBookType } from '../utils/validation';

export const bookRoutes = Router();

bookRoutes.use(authenticate);
bookRoutes.use(requireSetupComplete);

const bookSelectFields = {
  id: schema.books.id,
  title: schema.books.title,
  author: schema.books.author,
  year: schema.books.year,
  country: schema.books.country,
  originalLanguage: schema.books.originalLanguage,
  type: schema.books.type,
  introduction: schema.books.introduction,
  addedBy: schema.books.addedBy,
  addedByUsername: schema.users.username,
  createdAt: schema.books.createdAt,
  updatedAt: schema.books.updatedAt,
};

// List all books
bookRoutes.get('/', (_req: Request, res: Response) => {
  const books = db
    .select(bookSelectFields)
    .from(schema.books)
    .leftJoin(schema.users, eq(schema.books.addedBy, schema.users.id))
    .all();

  // Books that are selected in completed meets = "read"
  const readBookIds = new Set(
    db.select({ selectedBookId: schema.meets.selectedBookId })
      .from(schema.meets)
      .where(eq(schema.meets.phase, 'completed'))
      .all()
      .map(m => m.selectedBookId)
      .filter(Boolean)
  );

  // Count how many times each book appeared as a candidate
  const candidateCounts = new Map(
    db.select({
      bookId: schema.meetCandidates.bookId,
      count: sql<number>`count(*)`.as('count'),
    })
      .from(schema.meetCandidates)
      .groupBy(schema.meetCandidates.bookId)
      .all()
      .map(r => [r.bookId, r.count])
  );

  res.json(books.map(b => ({
    ...b,
    isRead: readBookIds.has(b.id),
    candidateCount: candidateCounts.get(b.id) || 0,
  })));
});

// Get book detail
bookRoutes.get('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const book = db
      .select(bookSelectFields)
      .from(schema.books)
      .leftJoin(schema.users, eq(schema.books.addedBy, schema.users.id))
      .where(eq(schema.books.id, req.params.id as string))
      .get();

    if (!book) throw new AppError(404, 'Book not found');

    // Find meets where this book was selected
    const selectedInMeets = db
      .select({
        id: schema.meets.id,
        phase: schema.meets.phase,
        selectedDate: schema.meets.selectedDate,
        hostId: schema.meets.hostId,
        hostUsername: schema.users.username,
        selectedBookTitle: schema.books.title,
      })
      .from(schema.meets)
      .leftJoin(schema.users, eq(schema.meets.hostId, schema.users.id))
      .leftJoin(schema.books, eq(schema.meets.selectedBookId, schema.books.id))
      .where(and(
        eq(schema.meets.selectedBookId, req.params.id as string),
        ne(schema.meets.phase, 'cancelled'),
      ))
      .all()
      .map(m => ({
        id: m.id,
        label: m.selectedBookTitle
          ? `${m.selectedBookTitle} at ${m.hostUsername}`
          : `Draft Meet by ${m.hostUsername}`,
        phase: m.phase,
        selectedDate: m.selectedDate,
      }));

    // Find meets where this book was a candidate (exclude cancelled)
    const candidateInMeets = db
      .select({
        meetId: schema.meetCandidates.meetId,
        meetPhase: schema.meets.phase,
        meetSelectedDate: schema.meets.selectedDate,
        hostUsername: schema.users.username,
        selectedBookTitle: schema.books.title,
      })
      .from(schema.meetCandidates)
      .leftJoin(schema.meets, eq(schema.meetCandidates.meetId, schema.meets.id))
      .leftJoin(schema.users, eq(schema.meets.hostId, schema.users.id))
      .leftJoin(schema.books, eq(schema.meets.selectedBookId, schema.books.id))
      .where(and(
        eq(schema.meetCandidates.bookId, req.params.id as string),
        ne(schema.meets.phase, 'cancelled'),
      ))
      .all()
      .map(m => ({
        id: m.meetId,
        label: m.selectedBookTitle
          ? `${m.selectedBookTitle} at ${m.hostUsername}`
          : `Draft Meet by ${m.hostUsername}`,
        phase: m.meetPhase,
        selectedDate: m.meetSelectedDate,
      }));

    // Get comments
    const comments = db
      .select({
        id: schema.bookComments.id,
        bookId: schema.bookComments.bookId,
        userId: schema.bookComments.userId,
        username: schema.users.username,
        content: schema.bookComments.content,
        createdAt: schema.bookComments.createdAt,
      })
      .from(schema.bookComments)
      .leftJoin(schema.users, eq(schema.bookComments.userId, schema.users.id))
      .where(eq(schema.bookComments.bookId, req.params.id as string))
      .all();

    res.json({ ...book, selectedInMeets, candidateInMeets, comments });
  } catch (err) {
    next(err);
  }
});

function validateBookFields(body: Record<string, string | undefined>) {
  const { title, author, year, country, originalLanguage, type, introduction } = body;

  if (title !== undefined && !isValidStringField(title, 500)) {
    throw new AppError(400, 'Title must be between 1 and 500 characters');
  }
  if (author !== undefined && !isValidStringField(author, 200)) {
    throw new AppError(400, 'Author must be between 1 and 200 characters');
  }
  if (year && year.length > 30) {
    throw new AppError(400, 'Year must be under 30 characters');
  }
  if (country && country.length > 50) {
    throw new AppError(400, 'Country must be under 50 characters');
  }
  if (originalLanguage && originalLanguage.length > 50) {
    throw new AppError(400, 'Original language must be under 50 characters');
  }
  if (type && !isValidBookType(type)) {
    throw new AppError(400, 'Invalid book type');
  }
  if (introduction && introduction.length > 5000) {
    throw new AppError(400, 'Introduction must be under 5000 characters');
  }
}

// Create a book
bookRoutes.post('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, author, year, country, originalLanguage, type, introduction } = req.body;
    if (!title || !author) {
      throw new AppError(400, 'Title and author are required');
    }
    validateBookFields(req.body);

    const now = new Date().toISOString();
    const id = uuid();

    db.insert(schema.books).values({
      id,
      title,
      author,
      year: year || null,
      country: country || null,
      originalLanguage: originalLanguage || null,
      type: type || null,
      introduction: introduction || null,
      addedBy: req.user!.id,
      createdAt: now,
      updatedAt: now,
    }).run();

    const book = db
      .select(bookSelectFields)
      .from(schema.books)
      .leftJoin(schema.users, eq(schema.books.addedBy, schema.users.id))
      .where(eq(schema.books.id, id))
      .get();

    res.status(201).json(book);
  } catch (err) {
    next(err);
  }
});

// Update a book (creator or admin only)
bookRoutes.put('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const book = db.select().from(schema.books).where(eq(schema.books.id, req.params.id as string)).get();
    if (!book) throw new AppError(404, 'Book not found');

    if (book.addedBy !== req.user!.id && !req.user!.isAdmin) {
      throw new AppError(403, 'Only the person who added this book or an admin can edit it');
    }

    const { title, author, year, country, originalLanguage, type, introduction } = req.body;
    validateBookFields(req.body);
    const now = new Date().toISOString();

    db.update(schema.books)
      .set({
        ...(title !== undefined && { title }),
        ...(author !== undefined && { author }),
        ...(year !== undefined && { year: year || null }),
        ...(country !== undefined && { country: country || null }),
        ...(originalLanguage !== undefined && { originalLanguage: originalLanguage || null }),
        ...(type !== undefined && { type: type || null }),
        ...(introduction !== undefined && { introduction }),
        updatedAt: now,
      })
      .where(eq(schema.books.id, req.params.id as string))
      .run();

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Delete a book (creator or admin only, unless used in a Meet)
bookRoutes.delete('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const book = db.select().from(schema.books).where(eq(schema.books.id, req.params.id as string)).get();
    if (!book) throw new AppError(404, 'Book not found');

    if (book.addedBy !== req.user!.id && !req.user!.isAdmin) {
      throw new AppError(403, 'Only the person who added this book or an admin can delete it');
    }

    // Check if book is selected in any meet
    const selectedIn = db.select({ id: schema.meets.id })
      .from(schema.meets)
      .where(eq(schema.meets.selectedBookId, req.params.id as string))
      .get();

    if (selectedIn) {
      throw new AppError(400, 'Cannot delete this book because it is selected in a Meet');
    }

    // Check if book is a candidate in any meet
    const candidateIn = db.select({ id: schema.meetCandidates.id })
      .from(schema.meetCandidates)
      .where(eq(schema.meetCandidates.bookId, req.params.id as string))
      .get();

    if (candidateIn) {
      throw new AppError(400, 'Cannot delete this book because it is a candidate in a Meet');
    }

    // Delete comments first, then the book
    db.delete(schema.bookComments).where(eq(schema.bookComments.bookId, req.params.id as string)).run();
    db.delete(schema.books).where(eq(schema.books.id, req.params.id as string)).run();

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Add comment
bookRoutes.post('/:id/comments', (req: Request, res: Response, next: NextFunction) => {
  try {
    const book = db.select().from(schema.books).where(eq(schema.books.id, req.params.id as string)).get();
    if (!book) throw new AppError(404, 'Book not found');

    const { content } = req.body;
    if (!content?.trim()) throw new AppError(400, 'Comment content is required');
    if (content.length > 2000) throw new AppError(400, 'Comment must be under 2000 characters');

    const id = uuid();
    const now = new Date().toISOString();

    db.insert(schema.bookComments).values({
      id,
      bookId: req.params.id as string,
      userId: req.user!.id,
      content: content.trim(),
      createdAt: now,
    }).run();

    res.status(201).json({
      id,
      bookId: req.params.id as string,
      userId: req.user!.id,
      username: req.user!.username,
      content: content.trim(),
      createdAt: now,
    });
  } catch (err) {
    next(err);
  }
});

// Bulk import books (admin only)
bookRoutes.post('/import', requireAdmin, (req: Request, res: Response, next: NextFunction) => {
  try {
    const { books: rows } = req.body as { books: Record<string, string>[] };
    if (!rows || !Array.isArray(rows)) {
      throw new AppError(400, 'books array is required');
    }

    const now = new Date().toISOString();
    let imported = 0;
    const errors: { row: number; error: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        if (!row.title?.trim() || !row.author?.trim()) {
          errors.push({ row: i + 1, error: 'Title and author are required' });
          continue;
        }
        validateBookFields(row);

        db.insert(schema.books).values({
          id: uuid(),
          title: row.title.trim(),
          author: row.author.trim(),
          year: row.year?.trim() || null,
          country: row.country?.trim() || null,
          originalLanguage: row.originalLanguage?.trim() || null,
          type: row.type?.trim() || null,
          introduction: row.introduction?.trim() || null,
          addedBy: req.user!.id,
          createdAt: now,
          updatedAt: now,
        }).run();
        imported++;
      } catch (err) {
        errors.push({ row: i + 1, error: err instanceof AppError ? err.message : 'Unknown error' });
      }
    }

    res.json({ imported, errors });
  } catch (err) {
    next(err);
  }
});
