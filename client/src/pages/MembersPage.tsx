import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Users, Shield, Calendar, BookOpen } from 'lucide-react';
import type { MemberSummaryResponse } from '@readingcircle/shared';
import { useTranslation } from 'react-i18next';

export function MembersPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [members, setMembers] = useState<MemberSummaryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api<MemberSummaryResponse[]>('/users/profiles')
      .then(data => { if (!cancelled) setMembers(data); })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className="text-brown-light animate-pulse font-serif text-lg">{t('common.loading')}</div>;
  if (error) return <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm border border-red-200">{t('common.loadError')}</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-serif font-bold text-burgundy flex items-center gap-3">
        <Users className="w-8 h-8" />
        {t('members.title')}
      </h1>

      <div className="bg-white rounded-xl border border-warm-gray divide-y divide-warm-gray-light">
        {members.map((m, i) => (
          <Link
            key={m.id}
            to={`/members/${m.id}`}
            className="flex items-center justify-between p-4 sm:p-5 hover:bg-warm-gray-light/50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-burgundy/10 flex items-center justify-center flex-shrink-0">
                <span className="text-burgundy font-serif font-bold text-sm">{i + 1}</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-brown">{m.username}</span>
                  {m.isAdmin && (
                    <span title={t('common.admin')}><Shield className="w-3.5 h-3.5 text-burgundy" /></span>
                  )}
                  {m.id === user?.id && (
                    <span className="text-xs text-brown-lighter">{t('common.you')}</span>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-xs text-brown-light flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {t('members.hosted', { count: m.hostCount })}
                  </span>
                  <span className="text-xs text-brown-light flex items-center gap-1">
                    <BookOpen className="w-3 h-3" />
                    {t('members.booksRead', { count: m.readBookCount })}
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
