import { sqliteTable, text, integer, uniqueIndex, primaryKey } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  email: text('email').notNull(),
  passwordHash: text('password_hash').notNull(),
  isAdmin: integer('is_admin', { mode: 'boolean' }).notNull().default(false),
  isTemporary: integer('is_temporary', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const invitations = sqliteTable('invitations', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  token: text('token').notNull().unique(),
  invitedBy: text('invited_by').notNull().references(() => users.id),
  expiresAt: text('expires_at').notNull(),
  usedAt: text('used_at'),
  createdAt: text('created_at').notNull(),
});

export const books = sqliteTable('books', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  author: text('author').notNull(),
  year: text('year'),
  country: text('country'),
  originalLanguage: text('original_language'),
  type: text('type'),
  introduction: text('introduction'),
  addedBy: text('added_by').notNull().references(() => users.id),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const bookComments = sqliteTable('book_comments', {
  id: text('id').primaryKey(),
  bookId: text('book_id').notNull().references(() => books.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id),
  content: text('content').notNull(),
  createdAt: text('created_at').notNull(),
});

export const meets = sqliteTable('meets', {
  id: text('id').primaryKey(),
  hostId: text('host_id').notNull().references(() => users.id),
  phase: text('phase', { enum: ['draft', 'voting', 'reading', 'completed', 'cancelled'] }).notNull().default('draft'),
  selectedBookId: text('selected_book_id').references(() => books.id),
  selectedDate: text('selected_date'),
  location: text('location'),
  description: text('description'),
  votingPointsRevealed: integer('voting_points_revealed', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const meetCandidates = sqliteTable('meet_candidates', {
  id: text('id').primaryKey(),
  meetId: text('meet_id').notNull().references(() => meets.id, { onDelete: 'cascade' }),
  bookId: text('book_id').notNull().references(() => books.id),
  motivation: text('motivation'),
  addedBy: text('added_by').notNull().references(() => users.id),
});

export const meetCandidateVotes = sqliteTable('meet_candidate_votes', {
  id: text('id').primaryKey(),
  meetId: text('meet_id').notNull().references(() => meets.id, { onDelete: 'cascade' }),
  candidateId: text('candidate_id').notNull().references(() => meetCandidates.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id),
  points: integer('points').notNull(),
}, (table) => [
  uniqueIndex('candidate_user_unique').on(table.candidateId, table.userId),
]);

export const meetDateOptions = sqliteTable('meet_date_options', {
  id: text('id').primaryKey(),
  meetId: text('meet_id').notNull().references(() => meets.id, { onDelete: 'cascade' }),
  dateTime: text('date_time').notNull(),
});

export const meetDateVotes = sqliteTable('meet_date_votes', {
  id: text('id').primaryKey(),
  dateOptionId: text('date_option_id').notNull().references(() => meetDateOptions.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id),
  availability: text('availability', { enum: ['available', 'not_available', 'maybe', 'no_response'] }).notNull().default('no_response'),
}, (table) => [
  uniqueIndex('date_option_user_unique').on(table.dateOptionId, table.userId),
]);

export const userBooks = sqliteTable('user_books', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  bookId: text('book_id').notNull().references(() => books.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').notNull(),
}, (table) => [
  primaryKey({ columns: [table.userId, table.bookId] }),
]);

export const passwordResetTokens = sqliteTable('password_reset_tokens', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: text('expires_at').notNull(),
  usedAt: text('used_at'),
  createdAt: text('created_at').notNull(),
});

export const meetTop5 = sqliteTable('meet_top5', {
  id: text('id').primaryKey(),
  meetId: text('meet_id').notNull().references(() => meets.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id),
  bookId: text('book_id').notNull().references(() => books.id),
  rank: integer('rank').notNull(),
}, (table) => [
  uniqueIndex('meet_user_rank_unique').on(table.meetId, table.userId, table.rank),
]);
