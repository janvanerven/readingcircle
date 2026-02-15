import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuid } from 'uuid';
import { authenticate, requireSetupComplete } from '../middleware/auth';
import { db, schema } from '../db';
import { eq, and, sql } from 'drizzle-orm';
import { AppError } from '../middleware/error';
import { VOTING_POINTS_TOTAL } from '@readingcircle/shared';

export const meetRoutes = Router();

meetRoutes.use(authenticate);
meetRoutes.use(requireSetupComplete);

function isHostOrAdmin(meet: { hostId: string }, userId: string, isAdmin: boolean): boolean {
  return meet.hostId === userId || isAdmin;
}

function getMeetLabel(hostUsername: string, selectedBookTitle: string | null): string {
  return selectedBookTitle
    ? `${selectedBookTitle} at ${hostUsername}`
    : `Draft Meet by ${hostUsername}`;
}

// List all meets
meetRoutes.get('/', (_req: Request, res: Response) => {
  const meets = db
    .select({
      id: schema.meets.id,
      hostId: schema.meets.hostId,
      hostUsername: schema.users.username,
      phase: schema.meets.phase,
      selectedBookId: schema.meets.selectedBookId,
      selectedBookTitle: schema.books.title,
      selectedDate: schema.meets.selectedDate,
      location: schema.meets.location,
      description: schema.meets.description,
      votingPointsRevealed: schema.meets.votingPointsRevealed,
      createdAt: schema.meets.createdAt,
      updatedAt: schema.meets.updatedAt,
    })
    .from(schema.meets)
    .leftJoin(schema.users, eq(schema.meets.hostId, schema.users.id))
    .leftJoin(schema.books, eq(schema.meets.selectedBookId, schema.books.id))
    .all()
    .map(m => ({
      ...m,
      label: getMeetLabel(m.hostUsername!, m.selectedBookTitle),
    }));

  res.json(meets);
});

// Get meet detail
meetRoutes.get('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const meet = db
      .select({
        id: schema.meets.id,
        hostId: schema.meets.hostId,
        hostUsername: schema.users.username,
        phase: schema.meets.phase,
        selectedBookId: schema.meets.selectedBookId,
        selectedBookTitle: schema.books.title,
        selectedDate: schema.meets.selectedDate,
        location: schema.meets.location,
        description: schema.meets.description,
        votingPointsRevealed: schema.meets.votingPointsRevealed,
        createdAt: schema.meets.createdAt,
        updatedAt: schema.meets.updatedAt,
      })
      .from(schema.meets)
      .leftJoin(schema.users, eq(schema.meets.hostId, schema.users.id))
      .leftJoin(schema.books, eq(schema.meets.selectedBookId, schema.books.id))
      .where(eq(schema.meets.id, req.params.id as string))
      .get();

    if (!meet) throw new AppError(404, 'Meet not found');

    // Candidates
    const candidates = db
      .select({
        id: schema.meetCandidates.id,
        meetId: schema.meetCandidates.meetId,
        bookId: schema.meetCandidates.bookId,
        bookTitle: schema.books.title,
        bookAuthor: schema.books.author,
        motivation: schema.meetCandidates.motivation,
        addedBy: schema.meetCandidates.addedBy,
        addedByUsername: schema.users.username,
      })
      .from(schema.meetCandidates)
      .leftJoin(schema.books, eq(schema.meetCandidates.bookId, schema.books.id))
      .leftJoin(schema.users, eq(schema.meetCandidates.addedBy, schema.users.id))
      .where(eq(schema.meetCandidates.meetId, req.params.id as string))
      .all();

    // Check which candidate books were already selected in other meets
    const candidatesWithWarning = candidates.map(c => {
      const alreadySelected = db
        .select({ id: schema.meets.id })
        .from(schema.meets)
        .where(and(
          eq(schema.meets.selectedBookId, c.bookId),
          eq(schema.meets.phase, 'completed'),
        ))
        .all();
      return { ...c, alreadySelectedInMeet: alreadySelected.length > 0 };
    });

    // Add points if revealed
    const candidatesWithPoints = candidatesWithWarning.map(c => {
      if (meet.votingPointsRevealed || meet.phase === 'reading' || meet.phase === 'completed') {
        const votes = db
          .select({ points: schema.meetCandidateVotes.points })
          .from(schema.meetCandidateVotes)
          .where(eq(schema.meetCandidateVotes.candidateId, c.id))
          .all();
        const totalPoints = votes.reduce((sum, v) => sum + v.points, 0);
        return { ...c, points: totalPoints };
      }
      return c;
    });

    // Vote status (who has voted)
    const allUsers = db.select({ id: schema.users.id, username: schema.users.username })
      .from(schema.users)
      .where(eq(schema.users.isTemporary, false))
      .all();

    const usersWhoVoted = db
      .select({ userId: schema.meetCandidateVotes.userId })
      .from(schema.meetCandidateVotes)
      .where(eq(schema.meetCandidateVotes.meetId, req.params.id as string))
      .all();

    const votedUserIds = new Set(usersWhoVoted.map(v => v.userId));
    const voteStatus = allUsers.map(u => ({
      userId: u.id,
      username: u.username,
      hasVoted: votedUserIds.has(u.id),
    }));

    // Date options
    const dateOptions = db
      .select()
      .from(schema.meetDateOptions)
      .where(eq(schema.meetDateOptions.meetId, req.params.id as string))
      .all();

    const dateOptionsWithVotes = dateOptions.map(opt => {
      const votes = db
        .select({
          userId: schema.meetDateVotes.userId,
          username: schema.users.username,
          availability: schema.meetDateVotes.availability,
        })
        .from(schema.meetDateVotes)
        .leftJoin(schema.users, eq(schema.meetDateVotes.userId, schema.users.id))
        .where(eq(schema.meetDateVotes.dateOptionId, opt.id))
        .all();

      return { ...opt, votes };
    });

    // Top 5
    const top5Entries = db
      .select({
        id: schema.meetTop5.id,
        meetId: schema.meetTop5.meetId,
        userId: schema.meetTop5.userId,
        username: schema.users.username,
        bookId: schema.meetTop5.bookId,
        bookTitle: schema.books.title,
        bookAuthor: schema.books.author,
        rank: schema.meetTop5.rank,
      })
      .from(schema.meetTop5)
      .leftJoin(schema.users, eq(schema.meetTop5.userId, schema.users.id))
      .leftJoin(schema.books, eq(schema.meetTop5.bookId, schema.books.id))
      .where(eq(schema.meetTop5.meetId, req.params.id as string))
      .all();

    // Get current user's own votes (always visible to them)
    const myVotes = db
      .select({
        candidateId: schema.meetCandidateVotes.candidateId,
        points: schema.meetCandidateVotes.points,
      })
      .from(schema.meetCandidateVotes)
      .where(and(
        eq(schema.meetCandidateVotes.meetId, req.params.id as string),
        eq(schema.meetCandidateVotes.userId, req.user!.id),
      ))
      .all();

    res.json({
      ...meet,
      label: getMeetLabel(meet.hostUsername!, meet.selectedBookTitle),
      candidates: candidatesWithPoints,
      dateOptions: dateOptionsWithVotes,
      top5Entries,
      voteStatus,
      myVotes,
    });
  } catch (err) {
    next(err);
  }
});

// Create a meet
meetRoutes.post('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { location, description } = req.body;
    const id = uuid();
    const now = new Date().toISOString();

    db.insert(schema.meets).values({
      id,
      hostId: req.user!.id,
      phase: 'draft',
      location: location || null,
      description: description || null,
      createdAt: now,
      updatedAt: now,
    }).run();

    res.status(201).json({
      id,
      hostId: req.user!.id,
      hostUsername: req.user!.username,
      phase: 'draft',
      selectedBookId: null,
      selectedBookTitle: null,
      selectedDate: null,
      location: location || null,
      description: description || null,
      votingPointsRevealed: false,
      label: `Draft Meet by ${req.user!.username}`,
      createdAt: now,
      updatedAt: now,
    });
  } catch (err) {
    next(err);
  }
});

// Update meet
meetRoutes.put('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const meet = db.select().from(schema.meets).where(eq(schema.meets.id, req.params.id as string)).get();
    if (!meet) throw new AppError(404, 'Meet not found');
    if (!isHostOrAdmin(meet, req.user!.id, req.user!.isAdmin)) {
      throw new AppError(403, 'Only the host or an admin can update this meet');
    }

    const { location, description, selectedBookId, selectedDate } = req.body;
    const now = new Date().toISOString();

    db.update(schema.meets)
      .set({
        ...(location !== undefined && { location }),
        ...(description !== undefined && { description }),
        ...(selectedBookId !== undefined && { selectedBookId }),
        ...(selectedDate !== undefined && { selectedDate }),
        updatedAt: now,
      })
      .where(eq(schema.meets.id, req.params.id as string))
      .run();

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Advance phase
meetRoutes.post('/:id/phase', (req: Request, res: Response, next: NextFunction) => {
  try {
    const meet = db.select().from(schema.meets).where(eq(schema.meets.id, req.params.id as string)).get();
    if (!meet) throw new AppError(404, 'Meet not found');
    if (!isHostOrAdmin(meet, req.user!.id, req.user!.isAdmin)) {
      throw new AppError(403, 'Only the host or an admin can change the phase');
    }

    const { phase } = req.body;
    const validTransitions: Record<string, string[]> = {
      draft: ['voting', 'reading', 'cancelled'],
      voting: ['reading', 'cancelled'],
      reading: ['completed', 'cancelled'],
    };

    const allowed = validTransitions[meet.phase];
    if (!allowed || !allowed.includes(phase)) {
      throw new AppError(400, `Cannot transition from ${meet.phase} to ${phase}`);
    }

    // Validate transition to reading: must have selected book and date
    if (phase === 'reading') {
      const updatedMeet = db.select().from(schema.meets).where(eq(schema.meets.id, req.params.id as string)).get();
      if (!updatedMeet?.selectedBookId) {
        throw new AppError(400, 'A book must be selected before moving to the reading phase');
      }
      if (!updatedMeet?.selectedDate) {
        throw new AppError(400, 'A date must be selected before moving to the reading phase');
      }
    }

    const now = new Date().toISOString();
    db.update(schema.meets)
      .set({ phase, updatedAt: now })
      .where(eq(schema.meets.id, req.params.id as string))
      .run();

    res.json({ phase });
  } catch (err) {
    next(err);
  }
});

// Delete/cancel meet
meetRoutes.delete('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const meet = db.select().from(schema.meets).where(eq(schema.meets.id, req.params.id as string)).get();
    if (!meet) throw new AppError(404, 'Meet not found');
    if (!isHostOrAdmin(meet, req.user!.id, req.user!.isAdmin)) {
      throw new AppError(403, 'Only the host or an admin can delete this meet');
    }

    db.delete(schema.meets).where(eq(schema.meets.id, req.params.id as string)).run();
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// === Candidates ===

// Add candidate
meetRoutes.post('/:id/candidates', (req: Request, res: Response, next: NextFunction) => {
  try {
    const meet = db.select().from(schema.meets).where(eq(schema.meets.id, req.params.id as string)).get();
    if (!meet) throw new AppError(404, 'Meet not found');
    if (meet.phase !== 'draft') throw new AppError(400, 'Candidates can only be added during the draft phase');
    if (!isHostOrAdmin(meet, req.user!.id, req.user!.isAdmin)) {
      throw new AppError(403, 'Only the host or an admin can add candidates');
    }

    const { bookId, motivation } = req.body;
    if (!bookId) throw new AppError(400, 'bookId is required');

    const book = db.select().from(schema.books).where(eq(schema.books.id, bookId)).get();
    if (!book) throw new AppError(404, 'Book not found');

    const id = uuid();
    db.insert(schema.meetCandidates).values({
      id,
      meetId: req.params.id as string,
      bookId,
      motivation: motivation || null,
      addedBy: req.user!.id,
    }).run();

    // Check if book was already selected in another completed meet
    const alreadySelected = db
      .select({ id: schema.meets.id })
      .from(schema.meets)
      .where(and(eq(schema.meets.selectedBookId, bookId), eq(schema.meets.phase, 'completed')))
      .all();

    res.status(201).json({
      id,
      meetId: req.params.id as string,
      bookId,
      bookTitle: book.title,
      bookAuthor: book.author,
      motivation: motivation || null,
      addedBy: req.user!.id,
      addedByUsername: req.user!.username,
      alreadySelectedInMeet: alreadySelected.length > 0,
    });
  } catch (err) {
    next(err);
  }
});

// Remove candidate
meetRoutes.delete('/:id/candidates/:candidateId', (req: Request, res: Response, next: NextFunction) => {
  try {
    const meet = db.select().from(schema.meets).where(eq(schema.meets.id, req.params.id as string)).get();
    if (!meet) throw new AppError(404, 'Meet not found');
    if (meet.phase !== 'draft') throw new AppError(400, 'Candidates can only be removed during the draft phase');
    if (!isHostOrAdmin(meet, req.user!.id, req.user!.isAdmin)) {
      throw new AppError(403, 'Only the host or an admin can remove candidates');
    }

    db.delete(schema.meetCandidates).where(eq(schema.meetCandidates.id, req.params.candidateId as string)).run();
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Select a book (only allowed with 1 candidate in draft, or after reveal from top scorers)
meetRoutes.post('/:id/candidates/select', (req: Request, res: Response, next: NextFunction) => {
  try {
    const meet = db.select().from(schema.meets).where(eq(schema.meets.id, req.params.id as string)).get();
    if (!meet) throw new AppError(404, 'Meet not found');
    if (!isHostOrAdmin(meet, req.user!.id, req.user!.isAdmin)) {
      throw new AppError(403, 'Only the host or an admin can select a book');
    }

    const { bookId } = req.body;
    if (!bookId) throw new AppError(400, 'bookId is required');

    const candidates = db.select().from(schema.meetCandidates)
      .where(eq(schema.meetCandidates.meetId, req.params.id as string)).all();

    if (meet.phase === 'draft') {
      // In draft: only allow direct selection if there's exactly 1 candidate
      if (candidates.length > 1) {
        throw new AppError(400, 'Cannot directly select a book when there are multiple candidates. Start the voting phase instead.');
      }
      // Verify the bookId is the single candidate
      if (candidates.length === 1 && candidates[0].bookId !== bookId) {
        throw new AppError(400, 'Can only select the sole candidate book');
      }
    } else if (meet.phase === 'voting') {
      // In voting: only after reveal, and only from top scorers
      if (!meet.votingPointsRevealed) {
        throw new AppError(400, 'Scores must be revealed before selecting a book');
      }

      // Calculate points for each candidate
      const candidatePoints = candidates.map(c => {
        const votes = db.select({ points: schema.meetCandidateVotes.points })
          .from(schema.meetCandidateVotes)
          .where(eq(schema.meetCandidateVotes.candidateId, c.id))
          .all();
        return { bookId: c.bookId, totalPoints: votes.reduce((sum, v) => sum + v.points, 0) };
      });

      const maxPoints = Math.max(...candidatePoints.map(c => c.totalPoints));
      const topCandidates = candidatePoints.filter(c => c.totalPoints === maxPoints);

      if (!topCandidates.some(c => c.bookId === bookId)) {
        throw new AppError(400, 'Can only select a book that has the highest number of votes');
      }
    } else {
      throw new AppError(400, 'Cannot select a book in this phase');
    }

    const now = new Date().toISOString();
    db.update(schema.meets)
      .set({ selectedBookId: bookId, updatedAt: now })
      .where(eq(schema.meets.id, req.params.id as string))
      .run();

    // Check if already selected elsewhere
    const alreadySelected = db
      .select({ id: schema.meets.id })
      .from(schema.meets)
      .where(and(
        eq(schema.meets.selectedBookId, bookId),
        eq(schema.meets.phase, 'completed'),
      ))
      .all();

    res.json({ selectedBookId: bookId, alreadySelectedInMeet: alreadySelected.length > 0 });
  } catch (err) {
    next(err);
  }
});

// === Voting ===

// Submit/update votes
meetRoutes.post('/:id/votes', (req: Request, res: Response, next: NextFunction) => {
  try {
    const meet = db.select().from(schema.meets).where(eq(schema.meets.id, req.params.id as string)).get();
    if (!meet) throw new AppError(404, 'Meet not found');
    if (meet.phase !== 'voting') throw new AppError(400, 'Voting is only allowed during the voting phase');

    const { votes } = req.body as { votes: { candidateId: string; points: number }[] };
    if (!votes || !Array.isArray(votes)) throw new AppError(400, 'votes array is required');

    const totalPoints = votes.reduce((sum, v) => sum + v.points, 0);
    if (totalPoints !== VOTING_POINTS_TOTAL) {
      throw new AppError(400, `You must distribute exactly ${VOTING_POINTS_TOTAL} points (you distributed ${totalPoints})`);
    }

    // Verify all candidates belong to this meet
    for (const vote of votes) {
      const candidate = db.select().from(schema.meetCandidates)
        .where(and(eq(schema.meetCandidates.id, vote.candidateId), eq(schema.meetCandidates.meetId, req.params.id as string)))
        .get();
      if (!candidate) throw new AppError(400, `Candidate ${vote.candidateId} not found in this meet`);
    }

    // Delete existing votes for this user in this meet
    db.delete(schema.meetCandidateVotes)
      .where(and(
        eq(schema.meetCandidateVotes.meetId, req.params.id as string),
        eq(schema.meetCandidateVotes.userId, req.user!.id),
      ))
      .run();

    // Insert new votes
    for (const vote of votes) {
      if (vote.points > 0) {
        db.insert(schema.meetCandidateVotes).values({
          id: uuid(),
          meetId: req.params.id as string,
          candidateId: vote.candidateId,
          userId: req.user!.id,
          points: vote.points,
        }).run();
      }
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Vote status
meetRoutes.get('/:id/votes/status', (req: Request, res: Response, next: NextFunction) => {
  try {
    const allUsers = db.select({ id: schema.users.id, username: schema.users.username })
      .from(schema.users)
      .where(eq(schema.users.isTemporary, false))
      .all();

    const usersWhoVoted = db
      .select({ userId: schema.meetCandidateVotes.userId })
      .from(schema.meetCandidateVotes)
      .where(eq(schema.meetCandidateVotes.meetId, req.params.id as string))
      .all();

    const votedUserIds = new Set(usersWhoVoted.map(v => v.userId));

    res.json(allUsers.map(u => ({
      userId: u.id,
      username: u.username,
      hasVoted: votedUserIds.has(u.id),
    })));
  } catch (err) {
    next(err);
  }
});

// Reveal scores
meetRoutes.post('/:id/votes/reveal', (req: Request, res: Response, next: NextFunction) => {
  try {
    const meet = db.select().from(schema.meets).where(eq(schema.meets.id, req.params.id as string)).get();
    if (!meet) throw new AppError(404, 'Meet not found');
    if (!isHostOrAdmin(meet, req.user!.id, req.user!.isAdmin)) {
      throw new AppError(403, 'Only the host or an admin can reveal scores');
    }

    const now = new Date().toISOString();
    db.update(schema.meets)
      .set({ votingPointsRevealed: true, updatedAt: now })
      .where(eq(schema.meets.id, req.params.id as string))
      .run();

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Resolve tie
meetRoutes.post('/:id/candidates/resolve-tie', (req: Request, res: Response, next: NextFunction) => {
  try {
    const meet = db.select().from(schema.meets).where(eq(schema.meets.id, req.params.id as string)).get();
    if (!meet) throw new AppError(404, 'Meet not found');
    if (!isHostOrAdmin(meet, req.user!.id, req.user!.isAdmin)) {
      throw new AppError(403, 'Only the host or an admin can resolve a tie');
    }

    const { bookId } = req.body;
    if (!bookId) throw new AppError(400, 'bookId is required');

    const now = new Date().toISOString();
    db.update(schema.meets)
      .set({ selectedBookId: bookId, updatedAt: now })
      .where(eq(schema.meets.id, req.params.id as string))
      .run();

    res.json({ selectedBookId: bookId });
  } catch (err) {
    next(err);
  }
});

// === Date Options & Availability Poll ===

// Add date option
meetRoutes.post('/:id/date-options', (req: Request, res: Response, next: NextFunction) => {
  try {
    const meet = db.select().from(schema.meets).where(eq(schema.meets.id, req.params.id as string)).get();
    if (!meet) throw new AppError(404, 'Meet not found');
    if (meet.phase !== 'draft') throw new AppError(400, 'Date options can only be added during the draft phase');
    if (!isHostOrAdmin(meet, req.user!.id, req.user!.isAdmin)) {
      throw new AppError(403, 'Only the host or an admin can add date options');
    }

    const { dateTime } = req.body;
    if (!dateTime) throw new AppError(400, 'dateTime is required');

    const id = uuid();
    db.insert(schema.meetDateOptions).values({
      id,
      meetId: req.params.id as string,
      dateTime,
    }).run();

    res.status(201).json({ id, meetId: req.params.id as string, dateTime, votes: [] });
  } catch (err) {
    next(err);
  }
});

// Remove date option
meetRoutes.delete('/:id/date-options/:optionId', (req: Request, res: Response, next: NextFunction) => {
  try {
    const meet = db.select().from(schema.meets).where(eq(schema.meets.id, req.params.id as string)).get();
    if (!meet) throw new AppError(404, 'Meet not found');
    if (meet.phase !== 'draft') throw new AppError(400, 'Date options can only be removed during the draft phase');
    if (!isHostOrAdmin(meet, req.user!.id, req.user!.isAdmin)) {
      throw new AppError(403, 'Only the host or an admin can remove date options');
    }

    db.delete(schema.meetDateOptions).where(eq(schema.meetDateOptions.id, req.params.optionId as string)).run();
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Submit/update availability votes
meetRoutes.put('/:id/date-votes', (req: Request, res: Response, next: NextFunction) => {
  try {
    const meet = db.select().from(schema.meets).where(eq(schema.meets.id, req.params.id as string)).get();
    if (!meet) throw new AppError(404, 'Meet not found');
    if (meet.phase !== 'voting') throw new AppError(400, 'Availability voting is only allowed during the voting phase');

    const { votes } = req.body as { votes: { dateOptionId: string; availability: string }[] };
    if (!votes || !Array.isArray(votes)) throw new AppError(400, 'votes array is required');

    for (const vote of votes) {
      const existing = db.select().from(schema.meetDateVotes)
        .where(and(
          eq(schema.meetDateVotes.dateOptionId, vote.dateOptionId),
          eq(schema.meetDateVotes.userId, req.user!.id),
        ))
        .get();

      if (existing) {
        db.update(schema.meetDateVotes)
          .set({ availability: vote.availability as any })
          .where(eq(schema.meetDateVotes.id, existing.id))
          .run();
      } else {
        db.insert(schema.meetDateVotes).values({
          id: uuid(),
          dateOptionId: vote.dateOptionId,
          userId: req.user!.id,
          availability: vote.availability as any,
        }).run();
      }
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Select final date
meetRoutes.post('/:id/date-options/select', (req: Request, res: Response, next: NextFunction) => {
  try {
    const meet = db.select().from(schema.meets).where(eq(schema.meets.id, req.params.id as string)).get();
    if (!meet) throw new AppError(404, 'Meet not found');
    if (!isHostOrAdmin(meet, req.user!.id, req.user!.isAdmin)) {
      throw new AppError(403, 'Only the host or an admin can select a date');
    }

    const { dateOptionId } = req.body;
    if (!dateOptionId) throw new AppError(400, 'dateOptionId is required');

    const option = db.select().from(schema.meetDateOptions).where(eq(schema.meetDateOptions.id, dateOptionId)).get();
    if (!option) throw new AppError(404, 'Date option not found');

    const now = new Date().toISOString();
    db.update(schema.meets)
      .set({ selectedDate: option.dateTime, updatedAt: now })
      .where(eq(schema.meets.id, req.params.id as string))
      .run();

    res.json({ selectedDate: option.dateTime });
  } catch (err) {
    next(err);
  }
});

// === Top 5 ===

// Submit top 5
meetRoutes.post('/:id/top5', (req: Request, res: Response, next: NextFunction) => {
  try {
    const meet = db.select().from(schema.meets).where(eq(schema.meets.id, req.params.id as string)).get();
    if (!meet) throw new AppError(404, 'Meet not found');
    if (meet.phase !== 'reading' && meet.phase !== 'completed') {
      throw new AppError(400, 'Top 5 can only be submitted during reading or completed phase');
    }

    const { entries } = req.body as { entries: { bookId: string; rank: number }[] };
    if (!entries || !Array.isArray(entries)) throw new AppError(400, 'entries array is required');

    // Validate: only books that were selectedBook in completed meets
    const completedMeets = db.select({ selectedBookId: schema.meets.selectedBookId })
      .from(schema.meets)
      .where(eq(schema.meets.phase, 'completed'))
      .all();
    const validBookIds = new Set(completedMeets.map(m => m.selectedBookId).filter(Boolean));

    // Also allow books from meets in reading phase (including current)
    const readingMeets = db.select({ selectedBookId: schema.meets.selectedBookId })
      .from(schema.meets)
      .where(eq(schema.meets.phase, 'reading'))
      .all();
    readingMeets.forEach(m => { if (m.selectedBookId) validBookIds.add(m.selectedBookId); });

    for (const entry of entries) {
      if (!validBookIds.has(entry.bookId)) {
        throw new AppError(400, 'Only books that have been selected in completed or current meets can be in your Top 5');
      }
      if (entry.rank < 1 || entry.rank > 5) {
        throw new AppError(400, 'Rank must be between 1 and 5');
      }
    }

    if (entries.length > Math.min(5, validBookIds.size)) {
      throw new AppError(400, `You can only select up to ${Math.min(5, validBookIds.size)} books`);
    }

    // Delete existing top5 for this user in this meet
    db.delete(schema.meetTop5)
      .where(and(
        eq(schema.meetTop5.meetId, req.params.id as string),
        eq(schema.meetTop5.userId, req.user!.id),
      ))
      .run();

    // Insert new entries
    for (const entry of entries) {
      db.insert(schema.meetTop5).values({
        id: uuid(),
        meetId: req.params.id as string,
        userId: req.user!.id,
        bookId: entry.bookId,
        rank: entry.rank,
      }).run();
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Aggregated ranking
meetRoutes.get('/top5/aggregate', (_req: Request, res: Response, next: NextFunction) => {
  try {
    // Score: rank 1 = 5 points, rank 2 = 4 points, etc.
    const entries = db
      .select({
        bookId: schema.meetTop5.bookId,
        bookTitle: schema.books.title,
        bookAuthor: schema.books.author,
        rank: schema.meetTop5.rank,
      })
      .from(schema.meetTop5)
      .leftJoin(schema.books, eq(schema.meetTop5.bookId, schema.books.id))
      .all();

    const aggregation = new Map<string, { bookTitle: string; bookAuthor: string; totalPoints: number; appearances: number }>();

    for (const entry of entries) {
      const points = 6 - entry.rank; // rank 1 = 5pts, rank 2 = 4pts, etc.
      const existing = aggregation.get(entry.bookId);
      if (existing) {
        existing.totalPoints += points;
        existing.appearances += 1;
      } else {
        aggregation.set(entry.bookId, {
          bookTitle: entry.bookTitle!,
          bookAuthor: entry.bookAuthor!,
          totalPoints: points,
          appearances: 1,
        });
      }
    }

    const result = Array.from(aggregation.entries())
      .map(([bookId, data]) => ({ bookId, ...data }))
      .sort((a, b) => b.totalPoints - a.totalPoints);

    res.json(result);
  } catch (err) {
    next(err);
  }
});
