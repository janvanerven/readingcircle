# Book Search & Filtering Enhancement

## Summary

Extend the existing client-side filtering on the Books page with attribute-based dropdown filters (Type, Country, Language) and additional sort options (Author, Year, Recently Added).

## Scope

Client-side only. Single file change: `client/src/pages/BooksPage.tsx`. No API or backend changes.

## Current State

The BooksPage already has:
- Text search matching title or author
- Read/unread dropdown filter
- Sort by title (A-Z) or most nominated

## Design

### New Filters

Three dropdown filters populated dynamically from the loaded books data:

| Filter | Source | Default | Matching |
|--------|--------|---------|----------|
| Type | Unique non-null `book.type` values | `'all'` | Exact match |
| Country | Unique non-null `book.country` values | `'all'` | Exact match |
| Language | Unique non-null `book.originalLanguage` values | `'all'` | Exact match |

Dropdowns only show values that exist in the library (not from constants).

### New Sort Options

| Sort | Behavior |
|------|----------|
| Author (A-Z) | Alphabetical by author, then by title |
| Year | Ascending by year, books without year sorted last |
| Recently Added | Descending by `createdAt` |

### Filter Pipeline (in useMemo)

1. Text search (existing) - title or author substring match
2. Read/unread filter (existing)
3. Type filter - exact match on `book.type`
4. Country filter - exact match on `book.country`
5. Language filter - exact match on `book.originalLanguage`
6. Sort (existing + new options)

### UI Layout

- New dropdowns added to the existing filter row alongside read/unread and sort
- Responsive: wraps on mobile via existing flex layout
- Result count shown below the filter bar (e.g., "23 books")

### State

New state variables:
- `typeFilter: string` (default `'all'`)
- `countryFilter: string` (default `'all'`)
- `languageFilter: string` (default `'all'`)

Extend existing `SortValue` type with `'author' | 'year' | 'recent'`.
