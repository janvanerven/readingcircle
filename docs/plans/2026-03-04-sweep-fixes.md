# Sweep Findings Fix — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all 22 findings from the SonarQube-style sweep plus secure the dummy hash.

**Architecture:** Server-side fixes for data integrity, security hardening, and input validation. Frontend fixes for error handling, race conditions, and React best practices. No new dependencies needed.

**Tech Stack:** Express/TypeScript (server), React/TypeScript (client), SQLite/Drizzle ORM, bcrypt

---

### Task 1: Secure the dummy hash constant

The `DUMMY_HASH` on line 11 of `server/src/services/auth.ts` is a static bcrypt hash used for timing oracle prevention. It's currently hardcoded — if an attacker identifies this specific hash value (e.g., from the source code), they could test whether the server is comparing against the dummy vs a real hash. Generate the dummy hash at startup instead.

**Files:**
- Modify: `server/src/services/auth.ts:10-11`

**Step 1: Replace static DUMMY_HASH with runtime-generated hash**

Replace lines 10-11:
```typescript
// A5: Dummy hash for timing oracle prevention — generated at startup to avoid leaking a static value
let DUMMY_HASH = '$2b$12$LJ3m4ys3Lg7E3cSWiSgAOeFMkYjWoyRXGMXKmBGelIQQnhaqbwKlC';

// Generate a fresh dummy hash at startup so the constant isn't predictable from source code
hashPassword('dummy-password-for-timing-oracle').then(h => { DUMMY_HASH = h; });
```

**Step 2: Verify build**

Run: `cd /home/jan/readingcircle && npm run build`

**Step 3: Commit**

```
fix(auth): generate dummy bcrypt hash at startup instead of hardcoding
```

---

### Task 2: Add /api 404 handler before SPA wildcard (Finding #1 — HIGH)

In production, `app.get('*')` catches ALL GET requests that don't match a route — including `/api/foo`. This means unknown API routes return the SPA HTML instead of a 404 JSON response.

**Files:**
- Modify: `server/src/index.ts:64-71`

**Step 1: Add API 404 handler before SPA wildcard**

Insert before the `express.static` block (before line 65):
```typescript
// API 404 handler — must come before SPA wildcard
app.all('/api/*', (_req, res) => {
  res.status(404).json({ error: 'Not found' });
});
```

**Step 2: Verify build**

Run: `cd /home/jan/readingcircle && npm run build`

**Step 3: Commit**

```
fix(server): add API 404 handler before SPA wildcard route
```

---

### Task 3: Fix password validation to use byte length (Finding #5 — HIGH)

bcrypt silently truncates input at 72 bytes. Multi-byte Unicode characters (e.g., emojis) mean `string.length` doesn't reflect actual byte count. A 72-character string of emojis is 288 bytes — bcrypt would only hash the first 18 characters.

**Files:**
- Modify: `server/src/utils/password.ts:17-21`

**Step 1: Switch maxLength check to Buffer.byteLength**

Replace the maxLength check in `validatePassword`:
```typescript
  if (Buffer.byteLength(password, 'utf8') > maxLength) {
    return `Password must be at most ${maxLength} bytes (multi-byte characters like emojis count as more than 1)`;
  }
```

**Step 2: Verify build**

Run: `cd /home/jan/readingcircle && npm run build`

**Step 3: Commit**

```
fix(auth): validate password byte length for bcrypt 72-byte limit
```

---

### Task 4: Validate Top5 duplicate ranks and bookIds (Finding #6 — HIGH)

The Top5 endpoint doesn't check for duplicate ranks or duplicate bookIds in the submission. This can hit a DB constraint error or create nonsensical data.

**Files:**
- Modify: `server/src/routes/meets.ts` (top5 endpoint, around line 1098-1126)

**Step 1: Add duplicate validation after `entries` parsing**

After `if (!entries || !Array.isArray(entries))` check, add:
```typescript
    // Validate no duplicate ranks
    const ranks = entries.map(e => e.rank);
    if (new Set(ranks).size !== ranks.length) {
      throw new AppError(400, 'Duplicate ranks are not allowed');
    }
    // Validate no duplicate bookIds
    const bookIds = entries.map(e => e.bookId);
    if (new Set(bookIds).size !== bookIds.length) {
      throw new AppError(400, 'Duplicate books are not allowed');
    }
```

**Step 2: Verify build**

Run: `cd /home/jan/readingcircle && npm run build`

**Step 3: Commit**

```
fix(meets): validate top5 for duplicate ranks and bookIds
```

---

### Task 5: Fix addColumn to only suppress "duplicate column" errors (Finding #3 — HIGH)

The `addColumn` helper in `init.ts` catches ALL exceptions. If the ALTER TABLE fails for another reason (e.g., disk full, invalid SQL), the error is silently swallowed.

**Files:**
- Modify: `server/src/db/init.ts:123-125`

**Step 1: Only suppress "duplicate column" errors**

Replace the addColumn function:
```typescript
  const addColumn = (table: string, column: string, type: string) => {
    try {
      sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
    } catch (err: unknown) {
      // Only suppress "duplicate column" errors (column already exists)
      const msg = err instanceof Error ? err.message : '';
      if (!msg.includes('duplicate column')) throw err;
    }
  };
```

**Step 2: Verify build**

Run: `cd /home/jan/readingcircle && npm run build`

**Step 3: Commit**

```
fix(db): only suppress duplicate column errors in addColumn migration
```

---

### Task 6: Strip isTemporary from non-admin user list (Finding #4 — HIGH)

The `/users` endpoint returns `isTemporary` to all users. Non-admins shouldn't see this field.

**Files:**
- Modify: `server/src/routes/users.ts:13-28`

**Step 1: Strip isTemporary for non-admin users**

Replace the non-admin response (line 24):
```typescript
  if (!req.user?.isAdmin) {
    res.json(users.map(({ email: _email, isTemporary: _isTemp, ...rest }) => rest));
    return;
  }
```

**Step 2: Verify build**

Run: `cd /home/jan/readingcircle && npm run build`

**Step 3: Commit**

```
fix(users): strip isTemporary from non-admin user list response
```

---

### Task 7: Wrap phase transition in transaction (Finding #2 — HIGH)

The advance phase endpoint reads the meet, validates, then writes — not atomic. A concurrent request could cause race conditions.

**Files:**
- Modify: `server/src/routes/meets.ts` (phase endpoint, around line 440-521)

**Step 1: Wrap the phase validation + update in a transaction**

Refactor the phase endpoint body to wrap the read-validate-write in `sqlite.transaction()`. The email sending stays outside the transaction (fire-and-forget).

The key change: move the `db.select`, validation, and `db.update` into a single `sqlite.transaction(() => { ... })()` call. Keep the email notification sending after the transaction.

**Step 2: Verify build**

Run: `cd /home/jan/readingcircle && npm run build`

**Step 3: Commit**

```
fix(meets): wrap phase transition in transaction for atomicity
```

---

### Task 8: Fix Math.max on empty array (Finding #7 — HIGH)

In the vote tallying for book selection (`candidates/select` endpoint, around line 754), `Math.max(...candidatePoints.map(c => c.totalPoints))` returns `-Infinity` when the array is empty.

**Files:**
- Modify: `server/src/routes/meets.ts` (select endpoint, around line 754)

**Step 1: Guard against empty array**

Replace:
```typescript
      const maxPoints = Math.max(...candidatePoints.map(c => c.totalPoints));
```
With:
```typescript
      if (candidatePoints.length === 0) {
        throw new AppError(400, 'No candidates to select from');
      }
      const maxPoints = Math.max(...candidatePoints.map(c => c.totalPoints));
```

**Step 2: Verify build**

Run: `cd /home/jan/readingcircle && npm run build`

**Step 3: Commit**

```
fix(meets): guard against Math.max on empty candidate array
```

---

### Task 9: Add bulk import row-count limit (Finding #13)

The book and meet import endpoints have no limit on how many rows can be submitted.

**Files:**
- Modify: `server/src/routes/books.ts` (import endpoint, around line 396)
- Modify: `server/src/routes/meets.ts` (import endpoint, around line 549)

**Step 1: Add row limits**

In books import, after the `!rows || !Array.isArray(rows)` check:
```typescript
    if (rows.length > 500) {
      throw new AppError(400, 'Maximum 500 rows per import');
    }
```

In meets import, after the same check:
```typescript
    if (rows.length > 500) {
      throw new AppError(400, 'Maximum 500 rows per import');
    }
```

**Step 2: Verify build**

Run: `cd /home/jan/readingcircle && npm run build`

**Step 3: Commit**

```
fix(import): add 500-row limit to bulk import endpoints
```

---

### Task 10: Validate JWT_SECRET entropy at startup (Finding #15)

In production, the JWT secrets are required but their quality isn't checked. A weak secret undermines all token security.

**Files:**
- Modify: `server/src/config.ts:12-18`

**Step 1: Add entropy validation for production secrets**

After extracting the secrets, add:
```typescript
if (isProduction) {
  if (JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters in production');
  }
  if (JWT_REFRESH_SECRET.length < 32) {
    throw new Error('JWT_REFRESH_SECRET must be at least 32 characters in production');
  }
}
```

**Step 2: Verify build**

Run: `cd /home/jan/readingcircle && npm run build`

**Step 3: Commit**

```
fix(config): validate JWT secret length in production
```

---

### Task 11: Add noImplicitReturns to tsconfigs (Finding #16)

Both server and client tsconfigs are missing `noImplicitReturns`, which catches functions that don't always return a value.

**Files:**
- Modify: `server/tsconfig.json`
- Modify: `client/tsconfig.json`

**Step 1: Add noImplicitReturns**

In `server/tsconfig.json`, add to compilerOptions:
```json
"noImplicitReturns": true
```

In `client/tsconfig.json`, add to compilerOptions:
```json
"noImplicitReturns": true
```

**Step 2: Verify build — fix any new errors**

Run: `cd /home/jan/readingcircle && npm run build`

Fix any functions flagged by the compiler.

**Step 3: Commit**

```
chore(tsconfig): enable noImplicitReturns
```

---

### Task 12: Fix ResetPasswordPage res.json() before res.ok check (Finding #12)

In `ResetPasswordPage.tsx`, `await res.json()` is called before checking `res.ok`. If the response isn't JSON (e.g., 500 HTML error page), this will throw an unhelpful error.

**Files:**
- Modify: `client/src/pages/ResetPasswordPage.tsx:29-37`

**Step 1: Check res.ok before parsing JSON**

Replace the fetch handling:
```typescript
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Something went wrong' }));
        throw new Error(data.error || 'Something went wrong');
      }
```

**Step 2: Verify build**

Run: `cd /home/jan/readingcircle && npm run build`

**Step 3: Commit**

```
fix(reset-password): check res.ok before parsing JSON response
```

---

### Task 13: Fix loadMeet stale-response guard (Finding #9)

`loadMeet` callback in `MeetDetailPage` is used for refreshing data after actions but has no stale-response guard. If the meet ID changes mid-flight, stale data overwrites current state.

Also remove the now-redundant `loadMeet` callback since the initial useEffect has cancellation but `loadMeet` is also called from child components.

**Files:**
- Modify: `client/src/pages/MeetDetailPage.tsx`

**Step 1: Add ID guard to loadMeet**

The `loadMeet` callback already has `[id]` dep. Add a guard:
```typescript
  const loadMeet = useCallback(async () => {
    const currentId = id;
    try {
      const [meetData, booksData] = await Promise.all([
        api<MeetDetailResponse>(`/meets/${currentId}`),
        api<BookResponse[]>('/books'),
      ]);
      if (currentId !== id) return; // stale
      setMeet(meetData);
      setBooks(booksData);

      if (meetData.phase === 'completed') {
        const ranking = await api<AggregatedRankingResponse[]>('/meets/top5/aggregate');
        if (currentId !== id) return;
        setAggregatedRanking(ranking);
      }
    } catch {
      if (currentId === id) setLoadError(true);
    } finally {
      if (currentId === id) setLoading(false);
    }
  }, [id]);
```

**Step 2: Verify build**

Run: `cd /home/jan/readingcircle && npm run build`

**Step 3: Commit**

```
fix(meet-detail): add stale-response guard to loadMeet callback
```

---

### Task 14: Fix hasOwnProperty anti-pattern (Finding #19)

In `VotingSection`, `init.hasOwnProperty(v.candidateId)` is a known anti-pattern. Use `Object.hasOwn()` or `in` operator.

**Files:**
- Modify: `client/src/pages/MeetDetailPage.tsx` (VotingSection, around line 448)

**Step 1: Replace hasOwnProperty with `in` operator**

Replace:
```typescript
        if (init.hasOwnProperty(v.candidateId)) {
```
With:
```typescript
        if (v.candidateId in init) {
```

**Step 2: Verify build**

Run: `cd /home/jan/readingcircle && npm run build`

**Step 3: Commit**

```
fix(voting): replace hasOwnProperty with in operator
```

---

### Task 15: Replace alert()/confirm() with inline error states (Finding #11)

Multiple components use `alert()` and `confirm()` for error handling and confirmation. Replace with inline error messages. For `confirm()`, keep it for now as a lower-priority UX improvement (it works, just not pretty).

**Files:**
- Modify: `client/src/pages/MeetDetailPage.tsx` (multiple sub-components)

**Step 1: Replace alert() calls with inline error state**

For each sub-component that uses `alert()`:
- Add an `error` state: `const [error, setError] = useState('');`
- Replace `alert(err instanceof Error ? err.message : 'Failed')` with `setError(err instanceof Error ? err.message : 'Failed')`
- Clear error at start of each action: `setError('')`
- Render error div in the component JSX

This affects: CandidatesSection, VotingSection, AvailabilitySection, Top5Section, and the edit form in the main component.

**Step 2: Verify build**

Run: `cd /home/jan/readingcircle && npm run build`

**Step 3: Commit**

```
fix(meet-detail): replace alert() calls with inline error messages
```

---

### Task 16: Clear setTimeout on unmount in ResetPasswordPage (Finding #20)

Line 39: `setTimeout(() => navigate('/login'), 3000)` — if the component unmounts before 3 seconds, this navigates a destroyed component.

**Files:**
- Modify: `client/src/pages/ResetPasswordPage.tsx`

**Step 1: Store and clean up timeout**

Add a ref:
```typescript
const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
```

Replace `setTimeout(...)` with:
```typescript
timeoutRef.current = setTimeout(() => navigate('/login'), 3000);
```

Add cleanup effect:
```typescript
useEffect(() => {
  return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
}, []);
```

**Step 2: Verify build**

Run: `cd /home/jan/readingcircle && npm run build`

**Step 3: Commit**

```
fix(reset-password): clear navigation timeout on unmount
```

---

### Task 17: Add React ErrorBoundary (Finding #8)

No error boundary means any unhandled render error crashes the entire app with a blank screen.

**Files:**
- Create: `client/src/components/ErrorBoundary.tsx`
- Modify: `client/src/App.tsx` (or `main.tsx`)

**Step 1: Create ErrorBoundary component**

```tsx
import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-cream p-4">
          <div className="bg-white rounded-xl border border-warm-gray p-8 max-w-md text-center space-y-4">
            <h1 className="text-2xl font-serif font-bold text-burgundy">Something went wrong</h1>
            <p className="text-brown-light">An unexpected error occurred. Please refresh the page.</p>
            <button onClick={() => window.location.reload()}
              className="px-4 py-2 bg-burgundy text-white rounded-lg text-sm font-medium hover:bg-burgundy-light">
              Refresh page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
```

**Step 2: Wrap app in ErrorBoundary**

In `main.tsx` or the top-level component, wrap the app:
```tsx
<ErrorBoundary>
  <App />
</ErrorBoundary>
```

**Step 3: Verify build**

Run: `cd /home/jan/readingcircle && npm run build`

**Step 4: Commit**

```
feat(client): add React ErrorBoundary for crash recovery
```

---

### Task 18: Fix MeetsPage.handleCreate error swallowing (Finding #15 frontend)

`handleCreate` in MeetsPage swallows errors silently with an empty catch block.

**Files:**
- Modify: `client/src/pages/MeetsPage.tsx:40-54`

**Step 1: Add error state and display**

Add error state and show it:
```typescript
const [createError, setCreateError] = useState('');
```

In handleCreate, replace the catch block:
```typescript
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create meet');
    } finally {
```

Clear error at start: `setCreateError('');` after `e.preventDefault();`

Render error in the form JSX.

**Step 2: Verify build**

Run: `cd /home/jan/readingcircle && npm run build`

**Step 3: Commit**

```
fix(meets): show error message when meet creation fails
```

---

### Task 19: Fix BookDetailPage.loadBook error swallowing (Finding #3 frontend)

The `loadBook` callback in `BookDetailPage` has an empty catch — errors are silently swallowed.

**Files:**
- Modify: `client/src/pages/BookDetailPage.tsx`

**Step 1: Add error handling to loadBook**

Ensure the catch block sets `setLoadError(true)` so the error state shows.

**Step 2: Verify build**

Run: `cd /home/jan/readingcircle && npm run build`

**Step 3: Commit**

```
fix(book-detail): show error when loadBook fails
```

---

### Task 20: Remove redundant /books fetch in Top5Section (Finding #18)

Top5Section fetches `/meets` and `/books` independently to determine eligible books — but the parent already fetches `/books`.

**Files:**
- Modify: `client/src/pages/MeetDetailPage.tsx` (Top5Section)

**Step 1: Pass books from parent**

Change Top5Section to accept `books` prop from parent instead of fetching its own. Update the parent call site to pass `books`.

Only fetch `/meets` for eligibility check (which the parent doesn't have in the right format).

**Step 2: Verify build**

Run: `cd /home/jan/readingcircle && npm run build`

**Step 3: Commit**

```
fix(meet-detail): pass books to Top5Section to avoid redundant fetch
```

---

### Task 21: Final build verification and commit

**Step 1: Run full build**

```bash
cd /home/jan/readingcircle && npm run build
```

**Step 2: Quick smoke test of critical paths**

Verify the server starts and key endpoints respond.

---

## Verification
1. `npm run build` passes with zero errors
2. No `alert()` or `confirm()` remaining in the codebase (grep check)
3. No `hasOwnProperty` remaining
4. API `/api/nonexistent` returns 404 JSON in production mode
