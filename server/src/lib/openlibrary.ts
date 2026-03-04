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

    const data = await res.json() as { docs?: { cover_i?: number }[] };
    const coverId = data?.docs?.[0]?.cover_i;
    if (!coverId) return null;

    return `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`;
  } catch {
    return null;
  }
}
