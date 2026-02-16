import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export function initializeDatabase() {
  const dbPath = process.env.DATABASE_PATH || './data/readingcircle.db';
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  // Create tables if they don't exist
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      is_admin INTEGER NOT NULL DEFAULT 0,
      is_temporary INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS invitations (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      invited_by TEXT NOT NULL REFERENCES users(id),
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      introduction TEXT,
      added_by TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS book_comments (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id),
      content TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS meets (
      id TEXT PRIMARY KEY,
      host_id TEXT NOT NULL REFERENCES users(id),
      phase TEXT NOT NULL DEFAULT 'draft',
      selected_book_id TEXT REFERENCES books(id),
      selected_date TEXT,
      location TEXT,
      description TEXT,
      voting_points_revealed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS meet_candidates (
      id TEXT PRIMARY KEY,
      meet_id TEXT NOT NULL REFERENCES meets(id) ON DELETE CASCADE,
      book_id TEXT NOT NULL REFERENCES books(id),
      motivation TEXT,
      added_by TEXT NOT NULL REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS meet_candidate_votes (
      id TEXT PRIMARY KEY,
      meet_id TEXT NOT NULL REFERENCES meets(id) ON DELETE CASCADE,
      candidate_id TEXT NOT NULL REFERENCES meet_candidates(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id),
      points INTEGER NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS candidate_user_unique ON meet_candidate_votes(candidate_id, user_id);

    CREATE TABLE IF NOT EXISTS meet_date_options (
      id TEXT PRIMARY KEY,
      meet_id TEXT NOT NULL REFERENCES meets(id) ON DELETE CASCADE,
      date_time TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS meet_date_votes (
      id TEXT PRIMARY KEY,
      date_option_id TEXT NOT NULL REFERENCES meet_date_options(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id),
      availability TEXT NOT NULL DEFAULT 'no_response'
    );

    CREATE UNIQUE INDEX IF NOT EXISTS date_option_user_unique ON meet_date_votes(date_option_id, user_id);

    CREATE TABLE IF NOT EXISTS meet_top5 (
      id TEXT PRIMARY KEY,
      meet_id TEXT NOT NULL REFERENCES meets(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id),
      book_id TEXT NOT NULL REFERENCES books(id),
      rank INTEGER NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS meet_user_rank_unique ON meet_top5(meet_id, user_id, rank);
  `);

  // Migrations for new book columns (safe to re-run — catch if column already exists)
  const addColumn = (table: string, column: string, type: string) => {
    try { sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`); } catch { /* column already exists */ }
  };
  addColumn('books', 'year', 'TEXT');
  addColumn('books', 'country', 'TEXT');
  addColumn('books', 'original_language', 'TEXT');
  addColumn('books', 'type', 'TEXT');

  sqlite.close();
}
