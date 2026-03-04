import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { BookOpen, Plus, Search, CheckCircle, ArrowUpDown } from 'lucide-react';
import { BookCover } from '@/components/BookCover';
import type { BookResponse, CreateBookRequest } from '@readingcircle/shared';
import { BOOK_TYPES } from '@readingcircle/shared';

type FilterValue = 'all' | 'read' | 'unread';
type SortValue = 'title' | 'author' | 'year' | 'recent' | 'voted-down';

const emptyBook: CreateBookRequest = { title: '', author: '', year: '', country: '', originalLanguage: '', type: '', introduction: '' };

export function BooksPage() {
  const { t } = useTranslation();
  const [books, setBooks] = useState<BookResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterValue>('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [countryFilter, setCountryFilter] = useState('all');
  const [languageFilter, setLanguageFilter] = useState('all');
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

  const filterOptions = useMemo(() => {
    const types = [...new Set(books.map(b => b.type).filter(Boolean))].sort() as string[];
    const countries = [...new Set(books.map(b => b.country).filter(Boolean))].sort() as string[];
    const languages = [...new Set(books.map(b => b.originalLanguage).filter(Boolean))].sort() as string[];
    return { types, countries, languages };
  }, [books]);

  const displayedBooks = useMemo(() => {
    let result = books.filter(b =>
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      b.author.toLowerCase().includes(search.toLowerCase())
    );

    if (filter === 'read') result = result.filter(b => b.isRead);
    if (filter === 'unread') result = result.filter(b => !b.isRead);
    if (typeFilter !== 'all') result = result.filter(b => b.type === typeFilter);
    if (countryFilter !== 'all') result = result.filter(b => b.country === countryFilter);
    if (languageFilter !== 'all') result = result.filter(b => b.originalLanguage === languageFilter);

    if (sort === 'title') {
      result = [...result].sort((a, b) => a.title.localeCompare(b.title));
    } else if (sort === 'author') {
      result = [...result].sort((a, b) => a.author.localeCompare(b.author) || a.title.localeCompare(b.title));
    } else if (sort === 'year') {
      result = [...result].sort((a, b) => {
        if (!a.year && !b.year) return a.title.localeCompare(b.title);
        if (!a.year) return 1;
        if (!b.year) return -1;
        return a.year.localeCompare(b.year) || a.title.localeCompare(b.title);
      });
    } else if (sort === 'recent') {
      result = [...result].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } else if (sort === 'voted-down') {
      result = [...result].sort((a, b) => b.candidateCount - a.candidateCount || a.title.localeCompare(b.title));
    }

    return result;
  }, [books, search, filter, typeFilter, countryFilter, languageFilter, sort]);

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
    return <div className="text-brown-light animate-pulse font-serif text-lg">{t('common.loading')}</div>;
  }

  const inputClass = "w-full px-4 py-2.5 rounded-lg border border-warm-gray bg-cream/50 text-brown focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy transition";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-serif font-bold text-burgundy">{t('books.title')}</h1>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-burgundy hover:bg-burgundy-light text-white rounded-lg transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          {t('books.addBook')}
        </button>
      </div>

      {/* Add book form */}
      {showAdd && (
        <form onSubmit={handleAdd} className="bg-white rounded-xl border border-warm-gray p-6 space-y-4">
          <h3 className="font-serif font-semibold text-brown text-lg">{t('books.addNewBook')}</h3>
          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm border border-red-200">{error}</div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brown mb-1">{t('books.titleLabel')} *</label>
              <input
                type="text"
                value={newBook.title}
                onChange={e => setNewBook({ ...newBook, title: e.target.value })}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brown mb-1">{t('books.authorLabel')} *</label>
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
              <label className="block text-sm font-medium text-brown mb-1">{t('books.yearLabel')}</label>
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
              <label className="block text-sm font-medium text-brown mb-1">{t('books.countryLabel')}</label>
              <input
                type="text"
                value={newBook.country || ''}
                onChange={e => setNewBook({ ...newBook, country: e.target.value })}
                maxLength={50}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brown mb-1">{t('books.originalLanguageLabel')}</label>
              <input
                type="text"
                value={newBook.originalLanguage || ''}
                onChange={e => setNewBook({ ...newBook, originalLanguage: e.target.value })}
                maxLength={50}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brown mb-1">{t('books.typeLabel')}</label>
              <select
                value={newBook.type || ''}
                onChange={e => setNewBook({ ...newBook, type: e.target.value })}
                className={inputClass}
              >
                <option value="">--</option>
                {BOOK_TYPES.map(bt => <option key={bt} value={bt}>{bt}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-brown mb-1">{t('books.introductionLabel')}</label>
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
              {saving ? t('books.adding') : t('books.addBook')}
            </button>
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="px-4 py-2 text-brown hover:bg-warm-gray-light rounded-lg transition-colors text-sm"
            >
              {t('common.cancel')}
            </button>
          </div>
        </form>
      )}

      {/* Search + filters */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brown-lighter" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('books.searchPlaceholder')}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-warm-gray bg-white text-brown placeholder:text-brown-lighter focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy transition"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filter}
              onChange={e => setFilter(e.target.value as FilterValue)}
              className="px-3 py-2.5 rounded-lg border border-warm-gray bg-white text-brown text-sm focus:outline-none focus:ring-2 focus:ring-burgundy/30"
            >
              <option value="all">{t('books.allBooks')}</option>
              <option value="read">{t('books.read')}</option>
              <option value="unread">{t('books.unread')}</option>
            </select>
            <select
              value={sort}
              onChange={e => setSort(e.target.value as SortValue)}
              className="px-3 py-2.5 rounded-lg border border-warm-gray bg-white text-brown text-sm focus:outline-none focus:ring-2 focus:ring-burgundy/30"
            >
              <option value="title">{t('books.sortTitle')}</option>
              <option value="author">{t('books.sortAuthor')}</option>
              <option value="year">{t('books.sortYear')}</option>
              <option value="recent">{t('books.sortRecent')}</option>
              <option value="voted-down">{t('books.sortNominated')}</option>
            </select>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {filterOptions.types.length > 0 && (
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-warm-gray bg-white text-brown text-sm focus:outline-none focus:ring-2 focus:ring-burgundy/30"
            >
              <option value="all">{t('books.allTypes')}</option>
              {filterOptions.types.map(tp => <option key={tp} value={tp}>{tp}</option>)}
            </select>
          )}
          {filterOptions.countries.length > 0 && (
            <select
              value={countryFilter}
              onChange={e => setCountryFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-warm-gray bg-white text-brown text-sm focus:outline-none focus:ring-2 focus:ring-burgundy/30"
            >
              <option value="all">{t('books.allCountries')}</option>
              {filterOptions.countries.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          {filterOptions.languages.length > 0 && (
            <select
              value={languageFilter}
              onChange={e => setLanguageFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-warm-gray bg-white text-brown text-sm focus:outline-none focus:ring-2 focus:ring-burgundy/30"
            >
              <option value="all">{t('books.allLanguages')}</option>
              {filterOptions.languages.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          )}
        </div>
        <p className="text-sm text-brown-light">{t('books.count', { count: displayedBooks.length })}</p>
      </div>

      {/* Book list */}
      {displayedBooks.length === 0 ? (
        <div className="bg-white rounded-xl border border-warm-gray p-12 text-center">
          <BookOpen className="w-12 h-12 text-brown-lighter mx-auto mb-3" />
          <p className="text-brown-light">{books.length === 0 ? t('books.noBooksYet') : t('books.noMatchingBooks')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayedBooks.map(book => (
            <Link
              key={book.id}
              to={`/books/${book.id}`}
              className={`block bg-white rounded-xl border border-warm-gray ${book.isRead ? 'border-l-4 border-l-sage' : ''} p-6 hover:shadow-sm transition-all group`}
            >
              <div className="flex items-start gap-4">
                <BookCover coverUrl={book.coverUrl} title={book.title} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-serif font-semibold text-brown text-lg">{book.title}</h3>
                    {book.isRead && (
                      <CheckCircle className="w-4 h-4 text-sage-dark flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-sm text-brown-light mt-0.5">{t('common.by')} {book.author}</p>
                  {(book.year || book.country || book.originalLanguage || book.type || book.candidateCount > 0) && (
                    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-1.5 text-xs text-brown-light">
                      {[book.year, book.country, book.originalLanguage].filter(Boolean).map((val, i, arr) => (
                        <span key={i}>
                          {val}{i < arr.length - 1 && <span className="ml-1.5">·</span>}
                        </span>
                      ))}
                      {[book.year, book.country, book.originalLanguage].some(Boolean) && book.type && <span>·</span>}
                      {book.type && (
                        <span className="inline-flex items-center gap-1 text-burgundy font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-burgundy inline-block" />
                          {book.type}
                        </span>
                      )}
                      {(book.year || book.country || book.originalLanguage || book.type) && book.candidateCount > 0 && <span>·</span>}
                      {book.candidateCount > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <ArrowUpDown className="w-3 h-3" />
                          {t('books.nominated', { count: book.candidateCount })}
                        </span>
                      )}
                    </div>
                  )}
                  {book.introduction && (
                    <p className="text-sm text-brown mt-2 line-clamp-2">{book.introduction}</p>
                  )}
                  <p className="text-xs text-brown-lighter mt-2">{t('books.addedBy', { name: book.addedByUsername })}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
