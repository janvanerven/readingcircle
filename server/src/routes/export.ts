import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import { db, schema } from '../db';
import { eq, sql } from 'drizzle-orm';

export const exportRoutes = Router();

exportRoutes.use(authenticate);
exportRoutes.use(requireAdmin);

exportRoutes.get('/', (_req: Request, res: Response, next: NextFunction) => {
  try {
    // === Books ===
    const allBooks = db
      .select({
        id: schema.books.id,
        title: schema.books.title,
        author: schema.books.author,
        year: schema.books.year,
        type: schema.books.type,
        country: schema.books.country,
        language: schema.books.originalLanguage,
        description: schema.books.introduction,
      })
      .from(schema.books)
      .all();

    // Books selected in completed meets = "read by club"
    const completedSelections = db
      .select({ selectedBookId: schema.meets.selectedBookId })
      .from(schema.meets)
      .where(eq(schema.meets.phase, 'completed'))
      .all();
    const readByClubIds = new Set(completedSelections.map(m => m.selectedBookId).filter(Boolean));

    // Read-by-users: userBooks joined with users
    const allUserBooks = db
      .select({
        bookId: schema.userBooks.bookId,
        username: schema.users.username,
      })
      .from(schema.userBooks)
      .leftJoin(schema.users, eq(schema.userBooks.userId, schema.users.id))
      .all();

    const readByUsersMap = new Map<string, string[]>();
    for (const ub of allUserBooks) {
      const list = readByUsersMap.get(ub.bookId) || [];
      if (ub.username) list.push(ub.username);
      readByUsersMap.set(ub.bookId, list);
    }

    const books = allBooks.map(b => ({
      title: b.title,
      author: b.author,
      year: b.year,
      type: b.type,
      country: b.country,
      language: b.language,
      description: b.description,
      readByClub: readByClubIds.has(b.id),
      readByUsers: readByUsersMap.get(b.id) || [],
    }));

    // === Meets ===
    const allMeets = db
      .select({
        id: schema.meets.id,
        hostUsername: schema.users.username,
        selectedBookTitle: schema.books.title,
        selectedDate: schema.meets.selectedDate,
      })
      .from(schema.meets)
      .leftJoin(schema.users, eq(schema.meets.hostId, schema.users.id))
      .leftJoin(schema.books, eq(schema.meets.selectedBookId, schema.books.id))
      .all();

    const allCandidates = db
      .select({
        meetId: schema.meetCandidates.meetId,
        bookTitle: schema.books.title,
      })
      .from(schema.meetCandidates)
      .leftJoin(schema.books, eq(schema.meetCandidates.bookId, schema.books.id))
      .all();

    const candidatesByMeet = new Map<string, string[]>();
    for (const c of allCandidates) {
      const list = candidatesByMeet.get(c.meetId) || [];
      if (c.bookTitle) list.push(c.bookTitle);
      candidatesByMeet.set(c.meetId, list);
    }

    const meets = allMeets.map(m => ({
      host: m.hostUsername,
      selectedBook: m.selectedBookTitle,
      nominatedBooks: candidatesByMeet.get(m.id) || [],
      meetDate: m.selectedDate,
    }));

    // === Top 5 (latest meet) ===
    const latestMeetWithTop5 = db
      .select({ meetId: schema.meetTop5.meetId })
      .from(schema.meetTop5)
      .leftJoin(schema.meets, eq(schema.meetTop5.meetId, schema.meets.id))
      .orderBy(sql`${schema.meets.createdAt} DESC`)
      .limit(1)
      .get();

    let top5PerUser: { username: string; rankings: { rank: number; title: string; author: string }[] }[] = [];

    if (latestMeetWithTop5) {
      const entries = db
        .select({
          userId: schema.meetTop5.userId,
          username: schema.users.username,
          bookTitle: schema.books.title,
          bookAuthor: schema.books.author,
          rank: schema.meetTop5.rank,
        })
        .from(schema.meetTop5)
        .leftJoin(schema.users, eq(schema.meetTop5.userId, schema.users.id))
        .leftJoin(schema.books, eq(schema.meetTop5.bookId, schema.books.id))
        .where(eq(schema.meetTop5.meetId, latestMeetWithTop5.meetId))
        .all();

      const userMap = new Map<string, { username: string; rankings: { rank: number; title: string; author: string }[] }>();
      for (const e of entries) {
        const existing = userMap.get(e.userId);
        const ranking = { rank: e.rank, title: e.bookTitle!, author: e.bookAuthor! };
        if (existing) {
          existing.rankings.push(ranking);
        } else {
          userMap.set(e.userId, { username: e.username!, rankings: [ranking] });
        }
      }

      top5PerUser = Array.from(userMap.values()).map(u => ({
        ...u,
        rankings: u.rankings.sort((a, b) => a.rank - b.rank),
      }));
    }

    res.json({
      exportedAt: new Date().toISOString(),
      books,
      meets,
      top5PerUser,
    });
  } catch (err) {
    next(err);
  }
});
