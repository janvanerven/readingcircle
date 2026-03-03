# UI Refresh & Features Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace all pill/badge UI patterns with colored border accents and inline icons, add book cover images from Open Library, and enhance the voting results with a bar chart visualization.

**Architecture:** Pure frontend refactor for pill removal (Tailwind class changes across 6 files). Book covers require a new DB column, a server-side Open Library integration module, and frontend image components. Voting results is a frontend-only enhancement to the existing VotingResultsSection.

**Tech Stack:** React 19, Tailwind CSS 4 (@theme), Drizzle ORM (SQLite), lucide-react icons, Open Library API

---

### Task 1: Extract Phase Color Utilities

**Files:**
- Create: `client/src/lib/phase-styles.ts`

This utility centralizes the duplicated `phaseColors` objects found in MeetsPage.tsx, DashboardPage.tsx, BookDetailPage.tsx, and MeetDetailPage.tsx. It provides border colors, text colors, and icon mappings.

**Step 1: Create the phase styles utility**

```typescript
// client/src/lib/phase-styles.ts
import { Pencil, BarChart3, BookOpen, CheckCircle, XCircle } from 'lucide-react';
import type { MeetPhase } from '@readingcircle/shared';
import type { LucideIcon } from 'lucide-react';

export const phaseBorderColors: Record<MeetPhase, string> = {
  draft: 'border-l-brown-lighter',
  voting: 'border-l-burgundy',
  reading: 'border-l-sage',
  completed: 'border-l-sage-light',
  cancelled: 'border-l-warm-gray',
};

export const phaseTextColors: Record<MeetPhase, string> = {
  draft: 'text-brown',
  voting: 'text-burgundy',
  reading: 'text-sage-dark',
  completed: 'text-sage-dark',
  cancelled: 'text-brown-light',
};

export const phaseDotColors: Record<MeetPhase, string> = {
  draft: 'bg-brown-lighter',
  voting: 'bg-burgundy',
  reading: 'bg-sage',
  completed: 'bg-sage-light',
  cancelled: 'bg-warm-gray',
};

export const phaseIcons: Record<MeetPhase, LucideIcon> = {
  draft: Pencil,
  voting: BarChart3,
  reading: BookOpen,
  completed: CheckCircle,
  cancelled: XCircle,
};
```

**Step 2: Verify it compiles**

Run: `cd client && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```
git add client/src/lib/phase-styles.ts
git commit -m "feat: extract shared phase color and icon utilities"
```

---

### Task 2: Replace Meet Card Pills

**Files:**
- Modify: `client/src/pages/MeetsPage.tsx`
- Modify: `client/src/pages/DashboardPage.tsx`

Replace the `rounded-full` phase badge on meet cards with a left border accent + inline phase icon and colored text.

**Step 1: Update MeetsPage.tsx**

Import the new utilities and replace the phaseColors object:
```typescript
import { phaseBorderColors, phaseTextColors, phaseIcons } from '@/lib/phase-styles';
import type { MeetPhase } from '@readingcircle/shared';
```

Remove the local `phaseColors` record (lines 53-59).

Update the meet card (lines 137-160). Replace:
```tsx
<Link
  key={meet.id}
  to={`/meets/${meet.id}`}
  className="bg-white rounded-xl border border-warm-gray p-5 hover:border-burgundy/30 hover:shadow-sm transition-all block"
>
  <div className="flex items-start justify-between gap-3">
    <div className="min-w-0">
      <h3 className="font-medium text-brown">{meet.label}</h3>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-sm text-brown-light">
        <span>{t('meets.host', { name: meet.hostUsername })}</span>
        {meet.location && (
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {meet.location}
          </span>
        )}
        {meet.selectedDate && <span>{formatDateTime(meet.selectedDate)}</span>}
      </div>
    </div>
    <span className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap ${phaseColors[meet.phase]}`}>
      {t(`meets.phases.${meet.phase}`)}
    </span>
  </div>
</Link>
```

With:
```tsx
<Link
  key={meet.id}
  to={`/meets/${meet.id}`}
  className={`bg-white rounded-xl border border-warm-gray border-l-4 ${phaseBorderColors[meet.phase as MeetPhase]} p-5 hover:shadow-sm transition-all block`}
>
  <div className="min-w-0">
    <h3 className="font-medium text-brown">{meet.label}</h3>
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-sm text-brown-light">
      <span>{t('meets.host', { name: meet.hostUsername })}</span>
      {meet.location && (
        <span className="flex items-center gap-1">
          <MapPin className="w-3 h-3" /> {meet.location}
        </span>
      )}
      {meet.selectedDate && <span>{formatDateTime(meet.selectedDate)}</span>}
      {(() => {
        const PhaseIcon = phaseIcons[meet.phase as MeetPhase];
        return (
          <span className={`flex items-center gap-1 font-medium ${phaseTextColors[meet.phase as MeetPhase]}`}>
            <PhaseIcon className="w-3.5 h-3.5" />
            {t(`meets.phases.${meet.phase}`)}
          </span>
        );
      })()}
    </div>
  </div>
</Link>
```

**Step 2: Update DashboardPage.tsx active meets section**

Import the new utilities. Remove local `phaseColors` record (lines 42-48).

Replace the active meet card (lines 114-133) with the same left-border + inline pattern:
```tsx
<Link
  key={meet.id}
  to={`/meets/${meet.id}`}
  className={`bg-white rounded-xl border border-warm-gray border-l-4 ${phaseBorderColors[meet.phase as MeetPhase]} p-5 hover:shadow-sm transition-colors block`}
>
  <div>
    <h3 className="font-medium text-brown">{meet.label}</h3>
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-brown-light">
      <span>{t('dashboard.hostedBy', { name: meet.hostUsername })}{meet.location && ` — ${meet.location}`}</span>
      {(() => {
        const PhaseIcon = phaseIcons[meet.phase as MeetPhase];
        return (
          <span className={`flex items-center gap-1 font-medium ${phaseTextColors[meet.phase as MeetPhase]}`}>
            <PhaseIcon className="w-3.5 h-3.5" />
            {t('meets.phases.' + meet.phase)}
          </span>
        );
      })()}
    </div>
  </div>
</Link>
```

**Step 3: Verify visually**

Run: `npm run dev`
Check: Navigate to `/meets` and `/` (dashboard). Verify:
- Meet cards have colored left borders
- Phase shown inline with icon and colored text
- No rounded-full pills visible
- Grouped section headers still visible on meets page

**Step 4: Commit**

```
git add client/src/pages/MeetsPage.tsx client/src/pages/DashboardPage.tsx
git commit -m "feat: replace meet card phase pills with border accents and inline icons"
```

---

### Task 3: Replace Book Card Pills

**Files:**
- Modify: `client/src/pages/BooksPage.tsx`

Replace the "Read" pill, "Nominated" pill, and metadata pills on book cards with a left border accent, inline icons, and dot-separated metadata text.

**Step 1: Update BooksPage.tsx**

Add CheckCircle to the import if not already present, and ArrowUpDown. The `BookOpen`, `Plus`, `Search` imports stay.

Replace the book card rendering (lines 301-341). The key changes:

The card `<Link>` wrapper:
```tsx
<Link
  key={book.id}
  to={`/books/${book.id}`}
  className={`block bg-white rounded-xl border border-warm-gray ${book.isRead ? 'border-l-4 border-l-sage' : ''} p-6 hover:shadow-sm transition-all group`}
>
```

The title line — replace the pills inline with title:
```tsx
<div className="flex items-center gap-2 flex-wrap">
  <h3 className="font-serif font-semibold text-brown text-lg">{book.title}</h3>
  {book.isRead && (
    <CheckCircle className="w-4 h-4 text-sage-dark flex-shrink-0" />
  )}
</div>
```

The author line stays: `<p className="text-sm text-brown-light mt-0.5">{t('common.by')} {book.author}</p>`

The metadata section — replace individual pills with dot-separated text:
```tsx
{(book.year || book.country || book.originalLanguage || book.type || book.candidateCount > 0) && (
  <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-1.5 text-xs text-brown-light">
    {book.year && <span>{book.year}</span>}
    {book.year && (book.country || book.originalLanguage || book.type) && <span>·</span>}
    {book.country && <span>{book.country}</span>}
    {book.country && (book.originalLanguage || book.type) && <span>·</span>}
    {book.originalLanguage && <span>{book.originalLanguage}</span>}
    {book.originalLanguage && book.type && <span>·</span>}
    {book.type && (
      <>
        <span className="inline-flex items-center gap-1 text-burgundy font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-burgundy inline-block" />
          {book.type}
        </span>
      </>
    )}
    {book.candidateCount > 0 && (
      <>
        {(book.year || book.country || book.originalLanguage || book.type) && <span>·</span>}
        <span className="inline-flex items-center gap-1">
          <ArrowUpDown className="w-3 h-3" />
          {t('books.nominated', { count: book.candidateCount })}
        </span>
      </>
    )}
  </div>
)}
```

**Step 2: Verify visually**

Run: `npm run dev`
Check `/books` page:
- Read books have sage left border, unread books have no left border
- CheckCircle icon next to read book titles (no green pill background)
- Metadata shown as dot-separated text line
- Type has small burgundy dot prefix and burgundy text
- Nominated count shown as plain text with icon
- No rounded-full or bg-* pills visible

**Step 3: Commit**

```
git add client/src/pages/BooksPage.tsx
git commit -m "feat: replace book card pills with border accents and dot-separated metadata"
```

---

### Task 4: Replace Book Detail Page Pills

**Files:**
- Modify: `client/src/pages/BookDetailPage.tsx`

Apply the same patterns to the book detail page: border accent, inline check icon, dot-separated metadata, and colored dots for meet history phase indicators.

**Step 1: Update BookDetailPage.tsx**

Import phase utilities:
```typescript
import { phaseDotColors, phaseTextColors } from '@/lib/phase-styles';
import type { MeetPhase } from '@readingcircle/shared';
```

Remove the local `phaseColors` record (lines 122-128).

**Card border** — update the outer card div (line 150) to add conditional border:
```tsx
<div className={`bg-white rounded-xl border border-warm-gray ${book.isRead ? 'border-l-4 border-l-sage' : ''} p-6 sm:p-8`}>
```

**"Book Club Read" badge** (lines 263-268) — replace the pill with just an icon:
```tsx
{book.isRead && (
  <CheckCircle className="w-5 h-5 text-sage-dark flex-shrink-0" />
)}
```

**Metadata section** (lines 271-278) — same dot-separated pattern as book cards:
```tsx
{(book.year || book.country || book.originalLanguage || book.type) && (
  <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-2 text-xs text-brown-light">
    {book.year && <span>{book.year}</span>}
    {book.year && (book.country || book.originalLanguage || book.type) && <span>·</span>}
    {book.country && <span>{book.country}</span>}
    {book.country && (book.originalLanguage || book.type) && <span>·</span>}
    {book.originalLanguage && <span>{book.originalLanguage}</span>}
    {book.originalLanguage && book.type && <span>·</span>}
    {book.type && (
      <span className="inline-flex items-center gap-1 text-burgundy font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-burgundy inline-block" />
        {book.type}
      </span>
    )}
  </div>
)}
```

**Meet history phase indicators** (lines 370-375 and 389-395) — replace `rounded-full` phase pills with colored dot + text:
```tsx
<span className="flex items-center gap-1.5 text-xs">
  <span className={`w-2 h-2 rounded-full ${phaseDotColors[m.phase as MeetPhase]}`} />
  <span className={phaseTextColors[m.phase as MeetPhase]}>{t('meets.phases.' + m.phase)}</span>
</span>
```

Apply this to both `selectedInMeets` (line 372) and `candidateInMeets` (line 392) loops.

**Step 2: Verify visually**

Run: `npm run dev`
Check a book detail page (`/books/:id`):
- Read books show sage left border on the main info card
- CheckCircle icon next to title (no green pill)
- Metadata is dot-separated with burgundy dot for type
- Meet history shows colored dots + text, not pills

**Step 3: Commit**

```
git add client/src/pages/BookDetailPage.tsx
git commit -m "feat: replace book detail page pills with border accents and inline indicators"
```

---

### Task 5: Replace Admin Badge and Remaining Pills

**Files:**
- Modify: `client/src/components/Layout.tsx`
- Modify: `client/src/pages/MembersPage.tsx`
- Modify: `client/src/pages/MeetDetailPage.tsx`

**Step 1: Update Layout.tsx admin badge**

Desktop nav admin badge (line 65) — replace:
```tsx
<span className="ml-1 text-xs bg-burgundy/10 text-burgundy px-2 py-0.5 rounded-full">{t('common.admin')}</span>
```
With:
```tsx
<Shield className="w-3.5 h-3.5 ml-1 text-burgundy" title={t('common.admin')} />
```

Mobile menu admin badge (line 119) — same replacement:
```tsx
<Shield className="w-3.5 h-3.5 ml-1 text-burgundy" title={t('common.admin')} />
```

Shield is already imported in Layout.tsx.

**Step 2: Update MembersPage.tsx admin badge**

Replace the admin pill (lines 46-49):
```tsx
{m.isAdmin && (
  <span className="text-xs bg-burgundy/10 text-burgundy px-2 py-0.5 rounded-full flex items-center gap-1">
    <Shield className="w-3 h-3" />
    {t('common.admin')}
  </span>
)}
```
With:
```tsx
{m.isAdmin && (
  <Shield className="w-3.5 h-3.5 text-burgundy" title={t('common.admin')} />
)}
```

**Step 3: Update MeetDetailPage.tsx remaining pills**

There are several pills in MeetDetailPage.tsx that need updating:

a) **Vote status pills** in VotingSection (line 468) — replace `rounded-full` pills with plain styled text:
```tsx
{meet.voteStatus.map(v => (
  <span key={v.userId} className={`text-xs px-2 py-0.5 ${v.hasVoted ? 'text-sage-dark font-medium' : 'text-brown-light'}`}>
    {v.username}: {v.hasVoted ? t('meetDetail.decided') : t('meetDetail.undecided')}
  </span>
))}
```

b) **"Already selected" pill** in CandidatesSection (lines 355-358) — replace with inline icon + text:
```tsx
{c.alreadySelectedInMeet && (
  <span className="inline-flex items-center gap-1 text-xs text-amber-600">
    <AlertTriangle className="w-3 h-3" /> {t('meetDetail.alreadySelected')}
  </span>
)}
```

c) **"Top voted" pill** in CandidatesSection (lines 360-363) — replace with inline text:
```tsx
{canSelectAfterReveal && isTopCandidate && (
  <span className="text-xs text-sage-dark font-medium">{t('meetDetail.topVoted')}</span>
)}
```

d) **"Selected" pill** in VotingResultsSection (lines 771-773) — replace with inline icon + text:
```tsx
{isSelected && (
  <span className="inline-flex items-center gap-1 text-xs text-sage-dark font-medium">
    <Check className="w-3 h-3" /> {t('meetDetail.selectedBook')}
  </span>
)}
```

**Step 4: Verify visually**

Run: `npm run dev`
Check:
- Header shows Shield icon next to admin username (no pill)
- `/members` shows Shield icon next to admin names (no pill)
- `/meets/:id` in voting phase: vote status shown as plain text
- Candidate section: "already selected" shown as amber icon + text
- Voting results: "selected" shown as inline text

**Step 5: Commit**

```
git add client/src/components/Layout.tsx client/src/pages/MembersPage.tsx client/src/pages/MeetDetailPage.tsx
git commit -m "feat: replace admin badges and remaining pills with icon indicators"
```

---

### Task 6: Add Book Cover Images

**Files:**
- Modify: `server/src/db/schema.ts` (add coverUrl column)
- Create: `server/src/lib/openlibrary.ts` (Open Library API client)
- Modify: `server/src/routes/books.ts` (add cover fetching on create, add fetch-cover endpoint)
- Modify: `shared/src/index.ts` (add coverUrl to BookResponse)
- Create: `client/src/components/BookCover.tsx` (reusable cover component)
- Modify: `client/src/pages/BooksPage.tsx` (use BookCover)
- Modify: `client/src/pages/BookDetailPage.tsx` (use BookCover)
- Modify: `client/src/pages/MeetDetailPage.tsx` (use BookCover in candidates)
- Modify: `client/src/pages/DashboardPage.tsx` (use BookCover in rankings)

**Step 1: Add coverUrl to database schema**

In `server/src/db/schema.ts`, add `coverUrl` to the books table:
```typescript
export const books = sqliteTable('books', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  author: text('author').notNull(),
  year: text('year'),
  country: text('country'),
  originalLanguage: text('original_language'),
  type: text('type'),
  introduction: text('introduction'),
  coverUrl: text('cover_url'),  // <-- NEW
  addedBy: text('added_by').notNull().references(() => users.id),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});
```

Run: `npm run db:generate && npm run db:migrate`

**Step 2: Add coverUrl to shared types**

In `shared/src/index.ts`, add `coverUrl` to `BookResponse`:
```typescript
export interface BookResponse {
  id: string;
  title: string;
  author: string;
  year: string | null;
  country: string | null;
  originalLanguage: string | null;
  type: string | null;
  introduction: string | null;
  coverUrl: string | null;  // <-- NEW
  addedBy: string;
  addedByUsername: string;
  createdAt: string;
  updatedAt: string;
  isRead: boolean;
  candidateCount: number;
}
```

**Step 3: Create Open Library client**

Create `server/src/lib/openlibrary.ts`:
```typescript
/**
 * Fetches a book cover URL from the Open Library API.
 * Returns the cover URL or null if not found.
 */
export async function fetchCoverUrl(title: string, author: string): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      title,
      author,
      limit: '1',
      fields: 'cover_i',
    });
    const res = await fetch(`https://openlibrary.org/search.json?${params}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;

    const data = await res.json();
    const coverId = data?.docs?.[0]?.cover_i;
    if (!coverId) return null;

    return `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`;
  } catch {
    return null;
  }
}
```

**Step 4: Update book routes to include coverUrl**

In `server/src/routes/books.ts`:

Add coverUrl to the `bookSelectFields` object (line 14-27):
```typescript
const bookSelectFields = {
  id: schema.books.id,
  title: schema.books.title,
  author: schema.books.author,
  year: schema.books.year,
  country: schema.books.country,
  originalLanguage: schema.books.originalLanguage,
  type: schema.books.type,
  introduction: schema.books.introduction,
  coverUrl: schema.books.coverUrl,  // <-- NEW
  addedBy: schema.books.addedBy,
  addedByUsername: schema.users.username,
  createdAt: schema.books.createdAt,
  updatedAt: schema.books.updatedAt,
};
```

In the POST / (create book) handler, after inserting the book, fire off a background cover fetch:
```typescript
import { fetchCoverUrl } from '../lib/openlibrary';

// After the insert, kick off a non-blocking cover fetch
fetchCoverUrl(title, author).then(coverUrl => {
  if (coverUrl) {
    db.update(schema.books)
      .set({ coverUrl })
      .where(eq(schema.books.id, id))
      .run();
  }
});
```

Add a new endpoint for manual cover re-fetch:
```typescript
// Fetch/refresh cover for a book
bookRoutes.post('/:id/fetch-cover', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const book = db.select().from(schema.books).where(eq(schema.books.id, req.params.id as string)).get();
    if (!book) throw new AppError(404, 'Book not found');

    const coverUrl = await fetchCoverUrl(book.title, book.author);
    if (coverUrl) {
      db.update(schema.books)
        .set({ coverUrl })
        .where(eq(schema.books.id, req.params.id as string))
        .run();
    }

    res.json({ coverUrl });
  } catch (err) {
    next(err);
  }
});
```

Also add a bulk endpoint for backfilling all books without covers:
```typescript
// Backfill covers for all books missing them (admin only)
bookRoutes.post('/backfill-covers', requireAdmin, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const booksWithoutCovers = db.select({ id: schema.books.id, title: schema.books.title, author: schema.books.author })
      .from(schema.books)
      .where(sql`${schema.books.coverUrl} IS NULL`)
      .all();

    let updated = 0;
    for (const book of booksWithoutCovers) {
      const coverUrl = await fetchCoverUrl(book.title, book.author);
      if (coverUrl) {
        db.update(schema.books).set({ coverUrl }).where(eq(schema.books.id, book.id)).run();
        updated++;
      }
      // Rate limit: wait 100ms between requests to be polite to Open Library
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    res.json({ total: booksWithoutCovers.length, updated });
  } catch (err) {
    next(err);
  }
});
```

Also update the `CandidateResponse` in the meets route to include `bookCoverUrl`. In `server/src/routes/meets.ts`, find where candidates are built and add the coverUrl from a join on the books table. The candidate already joins books — add `coverUrl` to the selected fields.

In `shared/src/index.ts`, add to `CandidateResponse`:
```typescript
export interface CandidateResponse {
  // ... existing fields
  bookCoverUrl: string | null;  // <-- NEW
}
```

**Step 5: Create BookCover component**

Create `client/src/components/BookCover.tsx`:
```tsx
import { BookOpen } from 'lucide-react';
import { useState } from 'react';

interface BookCoverProps {
  coverUrl: string | null | undefined;
  title: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'w-10 h-14 rounded-lg',
  md: 'w-12 h-16 rounded-lg',
  lg: 'w-32 h-48 rounded-xl',
};

const iconSizes = {
  sm: 'w-5 h-5',
  md: 'w-6 h-6',
  lg: 'w-10 h-10',
};

const fallbackSizes = {
  sm: 'w-10 h-14 rounded-lg',
  md: 'w-12 h-16 rounded-lg',
  lg: 'w-32 h-48 rounded-xl',
};

export function BookCover({ coverUrl, title, size = 'md' }: BookCoverProps) {
  const [failed, setFailed] = useState(false);

  if (!coverUrl || failed) {
    return (
      <div className={`${fallbackSizes[size]} bg-burgundy/10 flex items-center justify-center flex-shrink-0`}>
        <BookOpen className={`${iconSizes[size]} text-burgundy`} />
      </div>
    );
  }

  return (
    <img
      src={coverUrl}
      alt={title}
      onError={() => setFailed(true)}
      className={`${sizeClasses[size]} object-cover shadow-sm flex-shrink-0`}
    />
  );
}
```

**Step 6: Update BooksPage.tsx to use BookCover**

Replace the BookOpen icon box on book cards (line 308-309):
```tsx
<div className="w-12 h-12 rounded-lg bg-burgundy/10 flex items-center justify-center flex-shrink-0 group-hover:bg-burgundy/20 transition-colors">
  <BookOpen className="w-6 h-6 text-burgundy" />
</div>
```
With:
```tsx
<BookCover coverUrl={book.coverUrl} title={book.title} size="md" />
```

Import `BookCover` at the top.

**Step 7: Update BookDetailPage.tsx to use BookCover**

Replace the icon box (lines 257-259):
```tsx
<div className="w-14 h-14 rounded-xl bg-burgundy/10 flex items-center justify-center flex-shrink-0">
  <BookOpen className="w-7 h-7 text-burgundy" />
</div>
```
With:
```tsx
<BookCover coverUrl={book.coverUrl} title={book.title} size="lg" />
```

**Step 8: Update MeetDetailPage.tsx candidates to show covers**

In CandidatesSection, add a small cover next to each candidate book title. In the candidate map (around line 351), add before the text div:
```tsx
<BookCover coverUrl={c.bookCoverUrl} title={c.bookTitle} size="sm" />
```

Also update VotingResultsSection similarly.

**Step 9: Update DashboardPage.tsx rankings to show covers**

In the aggregated ranking list items and latest top 5, add small covers. This requires the API to return cover URLs for ranked books — check if the aggregated ranking endpoint already includes this. If not, add `bookCoverUrl` to `AggregatedRankingResponse` in shared types and to the server aggregation query.

**Step 10: Verify**

Run: `npm run dev`
- Add a new book → check if cover appears after a moment
- Visit `/books` → covers should show where available
- Visit a book detail page → larger cover
- Check a meet with candidates → small covers next to candidates
- Dashboard rankings → small covers

**Step 11: Commit**

```
git add server/src/db/schema.ts server/src/lib/openlibrary.ts server/src/routes/books.ts server/src/routes/meets.ts shared/src/index.ts client/src/components/BookCover.tsx client/src/pages/BooksPage.tsx client/src/pages/BookDetailPage.tsx client/src/pages/MeetDetailPage.tsx client/src/pages/DashboardPage.tsx
git commit -m "feat: add book cover images from Open Library API"
```

---

### Task 7: Enhance Voting Results with Bar Chart

**Files:**
- Modify: `client/src/pages/MeetDetailPage.tsx` (update VotingResultsSection)

The VotingResultsSection already exists (line 736). Enhance it with proportional horizontal bars.

**Step 1: Update VotingResultsSection**

Replace the current simple list with a bar chart visualization:

```tsx
function VotingResultsSection({ meet }: { meet: MeetDetailResponse }) {
  const { t } = useTranslation();
  const hasVotes = meet.candidates.some(c => (c.points ?? 0) > 0);

  if (!hasVotes) {
    return (
      <div className="bg-white rounded-xl border border-warm-gray p-6">
        <h2 className="font-serif font-semibold text-brown text-lg mb-3 flex items-center gap-2">
          <Vote className="w-5 h-5 text-burgundy" />
          {t('meetDetail.votingResults')}
        </h2>
        <p className="text-brown-light text-sm">{t('meetDetail.noVotesCast')}</p>
      </div>
    );
  }

  const sorted = [...meet.candidates].sort((a, b) => (b.points ?? 0) - (a.points ?? 0));
  const maxPoints = sorted[0]?.points ?? 0;

  return (
    <div className="bg-white rounded-xl border border-warm-gray p-6">
      <h2 className="font-serif font-semibold text-brown text-lg mb-4 flex items-center gap-2">
        <Vote className="w-5 h-5 text-burgundy" />
        {t('meetDetail.votingResults')}
      </h2>
      <div className="space-y-3">
        {sorted.map(c => {
          const pts = c.points ?? 0;
          const pct = maxPoints > 0 ? (pts / maxPoints) * 100 : 0;
          const isSelected = c.bookId === meet.selectedBookId;

          return (
            <div key={c.id} className={`p-3 rounded-lg ${isSelected ? 'bg-sage/5 border-l-4 border-l-sage' : ''}`}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <Link to={`/books/${c.bookId}`} className="font-medium text-brown hover:text-burgundy truncate">
                    {c.bookTitle}
                  </Link>
                  {isSelected && (
                    <span className="inline-flex items-center gap-1 text-xs text-sage-dark font-medium flex-shrink-0">
                      <Check className="w-3 h-3" /> {t('meetDetail.selectedBook')}
                    </span>
                  )}
                </div>
                <span className="text-sm font-medium text-burgundy whitespace-nowrap ml-3">
                  {t('meetDetail.points', { count: pts })}
                </span>
              </div>
              <div className="w-full bg-warm-gray-light rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${isSelected ? 'bg-sage' : 'bg-burgundy/30'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-xs text-brown-light mt-1">{t('common.by')} {c.bookAuthor}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

**Step 2: Verify visually**

Run: `npm run dev`
Navigate to a meet in reading or completed phase that has voting data.
Check:
- Horizontal bars appear proportional to points
- Selected book has sage accent + left border
- Bars are wider for higher scores, zero-point candidates have no bar
- Book titles link to book detail
- Points shown on the right

**Step 3: Commit**

```
git add client/src/pages/MeetDetailPage.tsx
git commit -m "feat: enhance voting results with proportional bar chart visualization"
```

---

### Task 8: Update i18n Translations

**Files:**
- Modify: `client/src/i18n/en.json`
- Modify: `client/src/i18n/nl.json`

Any new translation keys added during the above tasks. Review each modified file for new `t()` calls and add corresponding entries to both translation files.

Likely no new keys needed since all text labels already exist — the changes are structural (removing pill backgrounds, adding borders) rather than content changes. But verify by checking the browser console for missing i18n key warnings during visual testing.

**Step 1: Run the app and check console for missing translation warnings**

Run: `npm run dev`
Navigate through all pages and check browser console for i18n warnings.

**Step 2: Add any missing keys to both en.json and nl.json**

**Step 3: Commit**

```
git add client/src/i18n/en.json client/src/i18n/nl.json
git commit -m "chore: update translations for UI refresh"
```
