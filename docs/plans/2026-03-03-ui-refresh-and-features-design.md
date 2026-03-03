# UI Refresh & Feature Improvements Design

**Date**: 2026-03-03
**Status**: Approved

## Overview

A cohesive update to the Reading Circle app covering two areas:

1. **Visual overhaul**: Replace all `rounded-full` pill/badge elements with subtle, integrated card indicators (colored left borders, inline icons, dot-separated text)
2. **New features**: Book cover images from Open Library and voting results breakdown visualization

## Design Principles

- **Subtle & integrated**: Status information woven into card structure, not floating as separate badge elements
- **Mix of border accents + icons**: Colored left borders communicate state; small inline icons add clarity where needed
- **Consistency across all pages**: Same patterns everywhere — no page has pills while another uses borders

---

## Part 1: Remove All Pills

### 1.1 Meet Cards (MeetsPage + DashboardPage)

**Current**: White card with `rounded-full` phase pill floated top-right.

**New**:
- Card gets `border-l-4` colored by phase:
  - Draft: `border-l-brown-lighter`
  - Voting: `border-l-burgundy`
  - Reading: `border-l-sage`
  - Completed: `border-l-sage-light`
  - Cancelled: `border-l-warm-gray`
- Phase shown inline in the metadata line as colored text with a small phase icon (14px):
  - Draft: `Pencil` icon in brown
  - Voting: `BarChart3` icon in burgundy
  - Reading: `BookOpen` icon in sage
  - Completed: `CheckCircle` icon in sage-dark
  - Cancelled: `X` icon in brown-light
- Remove the `<span className="rounded-full ...">` element entirely

**Files**: `MeetsPage.tsx`, `DashboardPage.tsx`

### 1.2 Book Cards (BooksPage)

**Current**: BookOpen icon box + "Read" pill + "Nominated X" pill + row of metadata pills (year, country, language, type).

**New**:
- **Read indicator**: Sage left border (`border-l-4 border-l-sage`) on the card when `isRead` is true. Unread books have no colored left border. Small `CheckCircle` icon next to title in sage-dark, no background.
- **Metadata**: Single dot-separated text line: `"1925 · USA · English · Novel"` in `text-xs text-brown-light`. Type gets a small `w-1.5 h-1.5 rounded-full bg-burgundy inline-block` dot prefix and uses `text-burgundy font-medium` to distinguish it from other metadata.
- **Nominated count**: Shown as `"Nominated 3x"` in `text-xs text-brown-light` with `ArrowUpDown` icon (w-3 h-3). No `rounded-full` background.
- BookOpen icon box on the left stays (will be replaced by cover images in Part 2).

**Files**: `BooksPage.tsx`

### 1.3 Book Detail Page

**Current**: Same pill patterns as book cards, plus phase pills in meet history lists.

**New**:
- **"Book Club Read" badge** replaced with: sage left border on the info card + small `CheckCircle` next to title (no background)
- **Metadata** follows same dot-separated pattern as book cards
- **Meet history lists** (Selected In / Candidate In): Phase shown as a small colored dot (`w-2 h-2 rounded-full`) + phase name in colored text. No `rounded-full` pill background.

**Files**: `BookDetailPage.tsx`

### 1.4 Admin Badge (Layout + MembersPage)

**Current**: `rounded-full` burgundy pill with Shield icon + "Admin" text.

**New**: `Shield` icon only (w-3.5 h-3.5) in `text-burgundy`. No background, no text label, no pill. The icon is universally understood. Tooltip on hover shows "Admin".

**Files**: `Layout.tsx`, `MembersPage.tsx`

### 1.5 Phase Color Mapping (Shared)

The `phaseColors` record object appears in multiple files. After this change, it becomes a border-color mapping instead of background-color mapping:

```typescript
const phaseBorderColors: Record<string, string> = {
  draft: 'border-l-brown-lighter',
  voting: 'border-l-burgundy',
  reading: 'border-l-sage',
  completed: 'border-l-sage-light',
  cancelled: 'border-l-warm-gray',
};

const phaseTextColors: Record<string, string> = {
  draft: 'text-brown',
  voting: 'text-burgundy',
  reading: 'text-sage-dark',
  completed: 'text-sage-dark',
  cancelled: 'text-brown-light',
};
```

Consider extracting to a shared utility (e.g., `client/src/lib/phase-colors.ts`) to avoid duplication across MeetsPage, DashboardPage, BookDetailPage, and MeetDetailPage.

---

## Part 2: Book Cover Images

### 2.1 Data Model

Add `coverUrl` column to `books` table:

```typescript
coverUrl: text('cover_url'),  // nullable, stores Open Library cover URL
```

### 2.2 Open Library Integration

**Search API**: `GET https://openlibrary.org/search.json?title={title}&author={author}&limit=1`
- Returns `docs[0].cover_i` (cover ID) if a cover exists
- Cover URL: `https://covers.openlibrary.org/b/id/{cover_i}-{size}.jpg`
  - Sizes: `S` (small, ~40px wide), `M` (medium, ~180px wide), `L` (large)

**Fetching strategy**:
- On book creation: attempt to fetch cover URL from Open Library, store in `coverUrl`
- For existing books: one-time migration script or on-demand fetch when `coverUrl` is null and book is viewed
- Server-side fetch only (avoid CORS issues, keep API key management server-side if ever needed)

**New endpoint**:
```
POST /books/:id/fetch-cover  (admin or book owner)
```
Triggers a re-fetch of the cover from Open Library. Useful if the initial fetch failed or returned nothing.

### 2.3 UI Changes

**Book list cards** (BooksPage):
- Replace `w-12 h-12 rounded-lg bg-burgundy/10` icon box with cover image: `w-12 h-16 rounded-lg object-cover shadow-sm`
- Fallback: Keep current BookOpen icon box when `coverUrl` is null

**Book detail page**:
- Replace `w-14 h-14 rounded-xl bg-burgundy/10` icon box with larger cover: `w-32 h-48 rounded-xl object-cover shadow-md`
- Fallback: Larger BookOpen icon in same styled box

**Meet candidates** (MeetDetailPage):
- Small cover thumbnail (`w-10 h-14 rounded-lg object-cover`) next to each candidate
- Fallback: Small BookOpen icon

**Dashboard rankings**:
- Small cover (`w-8 h-11 rounded`) next to ranked book titles
- Fallback: No icon (just text, keep it compact)

**Files**: `BooksPage.tsx`, `BookDetailPage.tsx`, `MeetDetailPage.tsx`, `DashboardPage.tsx`, `schema.ts`, new `server/src/lib/openlibrary.ts`

---

## Part 3: Voting Results Breakdown

### 3.1 When Visible

Show the results breakdown when:
- `votingPointsRevealed === true`, OR
- `phase === 'reading'` or `phase === 'completed'`

Hidden during `draft` and active `voting` phases.

### 3.2 UI Design

A horizontal bar chart section on the MeetDetailPage, below the candidates list:

- Each candidate shown as a row: book title + proportional colored bar + point total
- Bars use `bg-burgundy` fill (proportional width) on a `bg-warm-gray-light` track
- The selected/winning book's row gets a subtle sage accent (`bg-sage/10` background, `border-l-4 border-l-sage`)
- Bars are proportional to the highest-scoring candidate (max score = 100% width)
- Sort order: highest points first

### 3.3 Data Source

No new API endpoints needed. The existing `MeetDetailResponse.candidates[].points` field is already populated when scores are revealed. The frontend just needs to render it as a bar chart instead of (or in addition to) showing points as plain text.

### 3.4 Component

New component: `VotingResults.tsx`

```typescript
interface VotingResultsProps {
  candidates: CandidateResponse[];
  selectedBookId: string | null;
}
```

**Files**: New `client/src/components/VotingResults.tsx`, modified `MeetDetailPage.tsx`

---

## Summary of Changes

| Area | Files Modified | Files Created |
|------|---------------|---------------|
| Meet cards | `MeetsPage.tsx`, `DashboardPage.tsx` | — |
| Book cards | `BooksPage.tsx` | — |
| Book detail | `BookDetailPage.tsx` | — |
| Admin badge | `Layout.tsx`, `MembersPage.tsx` | — |
| Phase colors | Multiple pages | `client/src/lib/phase-colors.ts` |
| Book covers | `BooksPage.tsx`, `BookDetailPage.tsx`, `MeetDetailPage.tsx`, `DashboardPage.tsx`, `schema.ts`, routes | `server/src/lib/openlibrary.ts` |
| Voting results | `MeetDetailPage.tsx` | `client/src/components/VotingResults.tsx` |
| i18n | `en.json`, `nl.json` | — |

## Implementation Priority

1. **Phase colors utility** — extract shared mapping first (unblocks all card changes)
2. **Meet card pills** — most visible, quick win
3. **Book card pills** — larger change, metadata restructure
4. **Book detail pills** — follows book card patterns
5. **Admin badge** — small, isolated
6. **Book covers** — backend + frontend, can be done in parallel with pill removal
7. **Voting results** — frontend only, smallest scope
