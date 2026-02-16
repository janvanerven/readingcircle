import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { BookOpen, Plus, Search, CheckCircle, ArrowUpDown } from 'lucide-react';
import type { BookResponse, CreateBookRequest } from '@readingcircle/shared';
import { BOOK_TYPES } from '@readingcircle/shared';

type FilterValue = 'all' | 'read' | 'unread';
type SortValue = 'title' | 'voted-down';

const emptyBook: CreateBookRequest = { title: '', author: '', year: '', country: '', originalLanguage: '', type: '', introduction: '' };

export function BooksPage() {
  const [books, setBooks] = useState<BookResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterValue>('all');
  const [sort, setSort] = useState<SortValue>('title');
  const [showAdd, setShowAdd] = useState(false);
  const [newBook, setNewBook] = useState<CreateBookRequest>({ ...emptyBook });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadBooks();
  }, []);

  async function loadBooks() {
    try {
      const data = await api<BookResponse[]>('/books');
      setBooks(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  const displayedBooks = useMemo(() => {
    let result = books.filter(b =>
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      b.author.toLowerCase().includes(search.toLowerCase())
    );

    if (filter === 'read') result = result.filter(b => b.isRead);
    if (filter === 'unread') result = result.filter(b => !b.isRead);

    if (sort === 'title') {
      result = [...result].sort((a, b) => a.title.localeCompare(b.title));
    } else if (sort === 'voted-down') {
      result = [...result].sort((a, b) => b.candidateCount - a.candidateCount || a.title.localeCompare(b.title));
    }

    return result;
  }, [books, search, filter, sort]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const book = await api<BookResponse>('/books', {
        method: 'POST',
        body: JSON.stringify(newBook),
      });
      setBooks([book, ...books]);
      setNewBook({ ...emptyBook });
      setShowAdd(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add book');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-brown-light animate-pulse font-serif text-lg">Loading books...</div>;
  }

  const inputClass = "w-full px-4 py-2.5 rounded-lg border border-warm-gray bg-cream/50 text-brown focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy transition";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-serif font-bold text-burgundy">Reading List</h1>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-burgundy hover:bg-burgundy-light text-white rounded-lg transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Book
        </button>
      </div>

      {/* Add book form */}
      {showAdd && (
        <form onSubmit={handleAdd} className="bg-white rounded-xl border border-warm-gray p-6 space-y-4">
          <h3 className="font-serif font-semibold text-brown text-lg">Add a New Book</h3>
          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm border border-red-200">{error}</div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brown mb-1">Title *</label>
              <input
                type="text"
                value={newBook.title}
                onChange={e => setNewBook({ ...newBook, title: e.target.value })}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brown mb-1">Author *</label>
              <input
                type="text"
                value={newBook.author}
                onChange={e => setNewBook({ ...newBook, author: e.target.value })}
                required
                className={inputClass}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-brown mb-1">Year</label>
              <input
                type="text"
                value={newBook.year || ''}
                onChange={e => setNewBook({ ...newBook, year: e.target.value })}
                maxLength={30}
                placeholder="e.g. 1984"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brown mb-1">Country</label>
              <input
                type="text"
                value={newBook.country || ''}
                onChange={e => setNewBook({ ...newBook, country: e.target.value })}
                maxLength={50}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brown mb-1">Original Language</label>
              <input
                type="text"
                value={newBook.originalLanguage || ''}
                onChange={e => setNewBook({ ...newBook, originalLanguage: e.target.value })}
                maxLength={50}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brown mb-1">Type</label>
              <select
                value={newBook.type || ''}
                onChange={e => setNewBook({ ...newBook, type: e.target.value })}
                className={inputClass}
              >
                <option value="">--</option>
                {BOOK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-brown mb-1">Introduction</label>
            <textarea
              value={newBook.introduction || ''}
              onChange={e => setNewBook({ ...newBook, introduction: e.target.value })}
              rows={3}
              className={`${inputClass} resize-none`}
            />
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-burgundy hover:bg-burgundy-light text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
            >
              {saving ? 'Adding...' : 'Add Book'}
            </button>
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="px-4 py-2 text-brown hover:bg-warm-gray-light rounded-lg transition-colors text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brown-lighter" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search books by title or author..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-warm-gray bg-white text-brown placeholder:text-brown-lighter focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy transition"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filter}
            onChange={e => setFilter(e.target.value as FilterValue)}
            className="px-3 py-2.5 rounded-lg border border-warm-gray bg-white text-brown text-sm focus:outline-none focus:ring-2 focus:ring-burgundy/30"
          >
            <option value="all">All Books</option>
            <option value="read">Read</option>
            <option value="unread">Unread</option>
          </select>
          <select
            value={sort}
            onChange={e => setSort(e.target.value as SortValue)}
            className="px-3 py-2.5 rounded-lg border border-warm-gray bg-white text-brown text-sm focus:outline-none focus:ring-2 focus:ring-burgundy/30"
          >
            <option value="title">Sort: A-Z</option>
            <option value="voted-down">Sort: Most Nominated</option>
          </select>
        </div>
      </div>

      {/* Book list */}
      {displayedBooks.length === 0 ? (
        <div className="bg-white rounded-xl border border-warm-gray p-12 text-center">
          <BookOpen className="w-12 h-12 text-brown-lighter mx-auto mb-3" />
          <p className="text-brown-light">{books.length === 0 ? 'No books on the list yet' : 'No books match your search'}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayedBooks.map(book => (
            <Link
              key={book.id}
              to={`/books/${book.id}`}
              className="block bg-white rounded-xl border border-warm-gray p-6 hover:border-burgundy/30 hover:shadow-sm transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-burgundy/10 flex items-center justify-center flex-shrink-0 group-hover:bg-burgundy/20 transition-colors">
                  <BookOpen className="w-6 h-6 text-burgundy" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-serif font-semibold text-brown text-lg">{book.title}</h3>
                    {book.isRead && (
                      <span className="inline-flex items-center gap-1 text-xs text-sage-dark bg-sage/20 px-2 py-0.5 rounded-full">
                        <CheckCircle className="w-3 h-3" /> Read
                      </span>
                    )}
                    {book.candidateCount > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs text-brown-light bg-warm-gray px-2 py-0.5 rounded-full">
                        <ArrowUpDown className="w-3 h-3" /> {book.candidateCount}x nominated
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-brown-light mt-0.5">by {book.author}</p>
                  {(book.year || book.country || book.originalLanguage || book.type) && (
                    <div className="flex flex-wrap gap-2 mt-1.5">
                      {book.year && <span className="text-xs text-brown-light bg-warm-gray-light px-2 py-0.5 rounded">{book.year}</span>}
                      {book.country && <span className="text-xs text-brown-light bg-warm-gray-light px-2 py-0.5 rounded">{book.country}</span>}
                      {book.originalLanguage && <span className="text-xs text-brown-light bg-warm-gray-light px-2 py-0.5 rounded">{book.originalLanguage}</span>}
                      {book.type && <span className="text-xs text-burgundy bg-burgundy/10 px-2 py-0.5 rounded">{book.type}</span>}
                    </div>
                  )}
                  {book.introduction && (
                    <p className="text-sm text-brown mt-2 line-clamp-2">{book.introduction}</p>
                  )}
                  <p className="text-xs text-brown-lighter mt-2">Added by {book.addedByUsername}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
