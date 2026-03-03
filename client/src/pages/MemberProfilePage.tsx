import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { ArrowLeft, Shield, Calendar, BookOpen, User } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import type { MemberProfileResponse } from '@readingcircle/shared';
import { useTranslation } from 'react-i18next';

export function MemberProfilePage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [profile, setProfile] = useState<MemberProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api<MemberProfileResponse>(`/users/${id}/profile`)
      .then(setProfile)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="text-brown-light animate-pulse font-serif text-lg">{t('common.loading')}</div>;
  if (!profile) return <div className="text-brown-light">{t('memberProfile.memberNotFound')}</div>;

  return (
    <div className="space-y-6">
      <Link to="/members" className="inline-flex items-center gap-2 text-brown-light hover:text-burgundy transition-colors text-sm">
        <ArrowLeft className="w-4 h-4" />
        {t('memberProfile.backToMembers')}
      </Link>

      <div className="bg-white rounded-xl border border-warm-gray p-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-burgundy/10 flex items-center justify-center flex-shrink-0">
            <User className="w-7 h-7 text-burgundy" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-brown">{profile.username}</h1>
              {profile.isAdmin && (
                <span title={t('common.admin')}><Shield className="w-4 h-4 text-burgundy" /></span>
              )}
              {profile.id === user?.id && (
                <span className="text-xs text-brown-lighter">{t('common.you')}</span>
              )}
            </div>
            <p className="text-sm text-brown-lighter mt-1">{t('memberProfile.memberSince', { date: formatDate(profile.createdAt) })}</p>

            <div className="flex items-center gap-6 mt-4">
              <div className="flex items-center gap-2 text-sm text-brown-light">
                <Calendar className="w-4 h-4" />
                <span>{t('memberProfile.hosted', { count: profile.hostCount })}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-brown-light">
                <BookOpen className="w-4 h-4" />
                <span>{t('memberProfile.booksRead', { count: profile.readBooks.length })}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {profile.readBooks.length > 0 && (
        <div className="bg-white rounded-xl border border-warm-gray p-6 space-y-4">
          <h2 className="font-serif font-semibold text-brown text-lg">{t('memberProfile.booksReadTitle')}</h2>
          <div className="divide-y divide-warm-gray-light">
            {profile.readBooks.map(book => (
              <Link
                key={book.id}
                to={`/books/${book.id}`}
                className="flex items-center gap-3 py-3 hover:bg-warm-gray-light/50 -mx-2 px-2 rounded-lg transition-colors"
              >
                <BookOpen className="w-4 h-4 text-burgundy flex-shrink-0" />
                <div>
                  <span className="text-sm font-medium text-brown">{book.title}</span>
                  <span className="text-sm text-brown-light ml-2">{t('common.by')} {book.author}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
