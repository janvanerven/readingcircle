import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth';
import { api, ApiError } from '@/lib/api';
import { BookOpen, ArrowLeft, MessageSquare, Calendar, Pencil, Trash2, X, CheckCircle } from 'lucide-react';
import { BookCover } from '@/components/BookCover';
import { formatDate } from '@/lib/utils';
import { phaseDotColors, phaseTextColors } from '@/lib/phase-styles';
import type { BookDetailResponse } from '@readingcircle/shared';
import { BOOK_TYPES } from '@readingcircle/shared';
import type { MeetPhase } from '@readingcircle/shared';

export function BookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [book, setBook] = useState<BookDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', author: '', introduction: '', year: '', country: '', originalLanguage: '', type: '' });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  // Delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await api<BookDetailResponse>(`/books/${id}`);
        if (!cancelled) setBook(data);
      } catch {
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id]);

  async function loadBook() {
    try {
      const data = await api<BookDetailResponse>(`/books/${id}`);
      setBook(data);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  const canEditOrDelete = book && user && (book.addedBy === user.id || user.isAdmin);
  const canDelete = canEditOrDelete && book.selectedInMeets.length === 0 && book.candidateInMeets.length === 0;

  const startEditing = () => {
    if (!book) return;
    setEditForm({ title: book.title, author: book.author, introduction: book.introduction || '', year: book.year || '', country: book.country || '', originalLanguage: book.originalLanguage || '', type: book.type || '' });
    setEditError('');
    setEditing(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.title.trim() || !editForm.author.trim()) return;
    setEditSaving(true);
    setEditError('');
    try {
      await api(`/books/${id}`, {
        method: 'PUT',
        body: JSON.stringify(editForm),
      });
      setEditing(false);
      loadBook();
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : 'Failed to update book');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError('');
    try {
      await api(`/books/${id}`, { method: 'DELETE' });
      navigate('/books');
    } catch (err: unknown) {
      setDeleteError(err instanceof ApiError ? err.message : 'Failed to delete book');
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setSubmitting(true);
    try {
      await api(`/books/${id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content: comment }),
      });
      setComment('');
      loadBook();
    } catch {
      // ignore
    } finally {
      setSubmitting(false);
    }
  };

  const toggleRead = async () => {
    if (!book) return;
    try {
      if (book.userHasRead) {
        await api(`/users/me/books/${id}`, { method: 'DELETE' });
      } else {
        await api(`/users/me/books/${id}`, { method: 'POST' });
      }
      loadBook();
    } catch {
      // ignore
    }
  };

  if (loading) {
    return <div className="text-brown-light animate-pulse font-serif text-lg">{t('common.loading')}</div>;
  }
  if (loadError) {
    return <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm border border-red-200">{t('common.loadError')}</div>;
  }

  if (!book) {
    return (
      <div className="text-center py-12">
        <BookOpen className="w-12 h-12 text-brown-lighter mx-auto mb-3" />
        <p className="text-brown-light">{t('bookDetail.bookNotFound')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link to="/books" className="inline-flex items-center gap-1 text-sm text-burgundy hover:text-burgundy-light">
        <ArrowLeft className="w-4 h-4" /> {t('bookDetail.backToReadingList')}
      </Link>

      {/* Book info */}
      <div className={`bg-white rounded-xl border border-warm-gray ${book.isRead ? 'border-l-4 border-l-sage' : ''} p-6 sm:p-8`}>
        {editing ? (
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif font-semibold text-brown text-lg">{t('bookDetail.editBook')}</h2>
              <button type="button" onClick={() => setEditing(false)} className="text-brown-lighter hover:text-brown" aria-label={t('common.close')}>
                <X className="w-5 h-5" />
              </button>
            </div>
            {editError && (
              <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm border border-red-200">{editError}</div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-brown mb-1">{t('books.titleLabel')} *</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 rounded-lg border border-warm-gray bg-cream/50 text-brown focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-brown mb-1">{t('books.authorLabel')} *</label>
                <input
                  type="text"
                  value={editForm.author}
                  onChange={e => setEditForm({ ...editForm, author: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 rounded-lg border border-warm-gray bg-cream/50 text-brown focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy transition"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-brown mb-1">{t('books.yearLabel')}</label>
                <input
                  type="text"
                  value={editForm.year}
                  onChange={e => setEditForm({ ...editForm, year: e.target.value })}
                  maxLength={30}
                  placeholder="e.g. 1984"
                  className="w-full px-4 py-2.5 rounded-lg border border-warm-gray bg-cream/50 text-brown focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-brown mb-1">{t('books.countryLabel')}</label>
                <input
                  type="text"
                  value={editForm.country}
                  onChange={e => setEditForm({ ...editForm, country: e.target.value })}
                  maxLength={50}
                  className="w-full px-4 py-2.5 rounded-lg border border-warm-gray bg-cream/50 text-brown focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-brown mb-1">{t('books.originalLanguageLabel')}</label>
                <input
                  type="text"
                  value={editForm.originalLanguage}
                  onChange={e => setEditForm({ ...editForm, originalLanguage: e.target.value })}
                  maxLength={50}
                  className="w-full px-4 py-2.5 rounded-lg border border-warm-gray bg-cream/50 text-brown focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-brown mb-1">{t('books.typeLabel')}</label>
                <select
                  value={editForm.type}
                  onChange={e => setEditForm({ ...editForm, type: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-warm-gray bg-cream/50 text-brown focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy transition"
                >
                  <option value="">--</option>
                  {BOOK_TYPES.map(bt => <option key={bt} value={bt}>{bt}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-brown mb-1">{t('books.introductionLabel')}</label>
              <textarea
                value={editForm.introduction}
                onChange={e => setEditForm({ ...editForm, introduction: e.target.value })}
                rows={4}
                className="w-full px-4 py-2.5 rounded-lg border border-warm-gray bg-cream/50 text-brown focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy transition resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={editSaving}
                className="px-4 py-2 bg-burgundy hover:bg-burgundy-light text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
              >
                {editSaving ? t('bookDetail.saving') : t('bookDetail.saveChanges')}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="px-4 py-2 text-brown hover:bg-warm-gray-light rounded-lg transition-colors text-sm"
              >
                {t('common.cancel')}
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="flex items-start gap-4">
              <BookCover coverUrl={book.coverUrl} title={book.title} size="lg" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-serif font-bold text-brown">{book.title}</h1>
                  {book.isRead && (
                    <CheckCircle className="w-5 h-5 text-sage-dark flex-shrink-0" />
                  )}
                </div>
                <p className="text-lg text-brown-light mt-1">{t('common.by')} {book.author}</p>
                {(book.year || book.country || book.originalLanguage || book.type) && (
                  <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-2 text-xs text-brown-light">
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
                  </div>
                )}
                <div className="flex items-center gap-3 mt-3">
                  <button
                    onClick={toggleRead}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      book.userHasRead
                        ? 'bg-sage/20 text-sage-dark hover:bg-sage/30'
                        : 'border border-warm-gray text-brown-light hover:bg-warm-gray-light'
                    }`}
                  >
                    <CheckCircle className="w-4 h-4" />
                    {book.userHasRead ? t('bookDetail.read') : t('bookDetail.markAsRead')}
                  </button>
                  <span className="text-sm text-brown-lighter">{t('bookDetail.addedByOn', { name: book.addedByUsername, date: formatDate(book.createdAt) })}</span>
                </div>
              </div>
              {canEditOrDelete && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={startEditing}
                    className="p-2 text-brown-lighter hover:text-burgundy hover:bg-burgundy/5 rounded-lg transition-colors"
                    title={t('bookDetail.editBook')}
                    aria-label={t('bookDetail.editBook')}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  {canDelete ? (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="p-2 text-brown-lighter hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title={t('common.delete')}
                      aria-label={t('common.delete')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      disabled
                      className="p-2 text-brown-lighter/40 rounded-lg cursor-not-allowed"
                      title={t('bookDetail.cannotDelete')}
                      aria-label={t('bookDetail.cannotDelete')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
            {book.introduction && (
              <div className="mt-6 p-4 bg-cream rounded-lg">
                <p className="text-brown whitespace-pre-wrap">{book.introduction}</p>
              </div>
            )}
          </>
        )}

        {/* Delete confirmation */}
        {showDeleteConfirm && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700 mb-3">{t('bookDetail.deleteConfirm', { title: book.title })}</p>
            {deleteError && (
              <p className="text-sm text-red-600 mb-3">{deleteError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
              >
                {deleting ? t('bookDetail.deleting') : t('bookDetail.yesDelete')}
              </button>
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeleteError(''); }}
                className="px-4 py-2 text-brown hover:bg-warm-gray-light rounded-lg transition-colors text-sm"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Meet history */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-warm-gray p-6">
          <h2 className="font-serif font-semibold text-brown mb-3 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-burgundy" />
            {t('bookDetail.selectedInMeets')}
          </h2>
          {book.selectedInMeets.length === 0 ? (
            <p className="text-sm text-brown-light">{t('bookDetail.notSelectedYet')}</p>
          ) : (
            <ul className="space-y-2">
              {book.selectedInMeets.map(m => (
                <li key={m.id}>
                  <Link to={`/meets/${m.id}`} className="text-sm text-burgundy hover:text-burgundy-light flex items-center justify-between">
                    <span>{m.label}</span>
                    <span className="flex items-center gap-1.5 text-xs">
                      <span className={`w-2 h-2 rounded-full ${phaseDotColors[m.phase as MeetPhase]}`} />
                      <span className={phaseTextColors[m.phase as MeetPhase]}>{t('meets.phases.' + m.phase)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-xl border border-warm-gray p-6">
          <h2 className="font-serif font-semibold text-brown mb-3 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-sage" />
            {t('bookDetail.candidateInMeets')}
          </h2>
          {book.candidateInMeets.length === 0 ? (
            <p className="text-sm text-brown-light">{t('bookDetail.notCandidateYet')}</p>
          ) : (
            <ul className="space-y-2">
              {book.candidateInMeets.map(m => (
                <li key={m.id}>
                  <Link to={`/meets/${m.id}`} className="text-sm text-burgundy hover:text-burgundy-light flex items-center justify-between">
                    <span>{m.label}</span>
                    <span className="flex items-center gap-1.5 text-xs">
                      <span className={`w-2 h-2 rounded-full ${phaseDotColors[m.phase as MeetPhase]}`} />
                      <span className={phaseTextColors[m.phase as MeetPhase]}>{t('meets.phases.' + m.phase)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Comments */}
      <div className="bg-white rounded-xl border border-warm-gray p-6">
        <h2 className="font-serif font-semibold text-brown mb-4 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-brown-light" />
          {t('bookDetail.comments', { count: book.comments.length })}
        </h2>

        {book.comments.length > 0 && (
          <div className="space-y-4 mb-6">
            {book.comments.map(c => (
              <div key={c.id} className="border-b border-warm-gray-light pb-4 last:border-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-brown">{c.username}</span>
                  <span className="text-xs text-brown-lighter">{formatDate(c.createdAt)}</span>
                </div>
                <p className="text-sm text-brown whitespace-pre-wrap">{c.content}</p>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleComment} className="flex gap-3">
          <label htmlFor="book-comment" className="sr-only">{t('bookDetail.addComment')}</label>
          <input
            id="book-comment"
            type="text"
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder={t('bookDetail.addComment')}
            className="flex-1 px-4 py-2.5 rounded-lg border border-warm-gray bg-cream/50 text-brown placeholder:text-brown-lighter focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy transition"
          />
          <button
            type="submit"
            disabled={submitting || !comment.trim()}
            className="px-4 py-2 bg-burgundy hover:bg-burgundy-light text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
          >
            {t('common.post')}
          </button>
        </form>
      </div>
    </div>
  );
}
