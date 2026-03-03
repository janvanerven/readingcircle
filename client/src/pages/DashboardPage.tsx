import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { BookOpen, Calendar, Users, ArrowRight, Trophy } from 'lucide-react';
import { phaseBorderColors, phaseTextColors, phaseIcons } from '@/lib/phase-styles';
import type { MeetResponse, BookResponse, AggregatedRankingResponse, LatestTop5Response, MeetPhase } from '@readingcircle/shared';

export function DashboardPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [meets, setMeets] = useState<(MeetResponse & { label: string })[]>([]);
  const [books, setBooks] = useState<BookResponse[]>([]);
  const [aggregatedRanking, setAggregatedRanking] = useState<AggregatedRankingResponse[]>([]);
  const [latestTop5, setLatestTop5] = useState<LatestTop5Response | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [meetsData, booksData, rankingData, latestData] = await Promise.all([
          api<(MeetResponse & { label: string })[]>('/meets'),
          api<BookResponse[]>('/books'),
          api<AggregatedRankingResponse[]>('/meets/top5/aggregate'),
          api<LatestTop5Response | null>('/meets/top5/latest'),
        ]);
        setMeets(meetsData);
        setBooks(booksData);
        setAggregatedRanking(rankingData);
        setLatestTop5(latestData);
      } catch {
        // Ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const activeMeets = meets.filter(m => m.phase !== 'completed' && m.phase !== 'cancelled');


  if (loading) {
    return <div className="text-brown-light animate-pulse font-serif text-lg">{t('common.loading')}</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-serif font-bold text-burgundy">
          {t('dashboard.welcomeBack', { username: user?.username })}
        </h1>
        <p className="text-brown-light mt-1">{t('dashboard.subtitle')}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-warm-gray p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-burgundy/10 flex items-center justify-center">
            <Calendar className="w-6 h-6 text-burgundy" />
          </div>
          <div>
            <div className="text-2xl font-serif font-bold text-brown">{activeMeets.length}</div>
            <div className="text-sm text-brown-light">{t('dashboard.activeMeets')}</div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-warm-gray p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-sage/20 flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-sage-dark" />
          </div>
          <div>
            <div className="text-2xl font-serif font-bold text-brown">{books.length}</div>
            <div className="text-sm text-brown-light">{t('dashboard.booksOnList')}</div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-warm-gray p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-brown-lighter/20 flex items-center justify-center">
            <Users className="w-6 h-6 text-brown" />
          </div>
          <div>
            <div className="text-2xl font-serif font-bold text-brown">
              {meets.filter(m => m.phase === 'completed').length}
            </div>
            <div className="text-sm text-brown-light">{t('dashboard.completedMeets')}</div>
          </div>
        </div>
      </div>

      {/* Active Meets */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-serif font-semibold text-brown">{t('dashboard.activeMeets')}</h2>
          <Link to="/meets" className="text-sm text-burgundy hover:text-burgundy-light flex items-center gap-1">
            {t('dashboard.viewAll')} <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        {activeMeets.length === 0 ? (
          <div className="bg-white rounded-xl border border-warm-gray p-8 text-center">
            <Calendar className="w-10 h-10 text-brown-lighter mx-auto mb-3" />
            <p className="text-brown-light">{t('dashboard.noActiveMeets')}</p>
            <Link to="/meets" className="text-burgundy hover:text-burgundy-light text-sm mt-2 inline-block">
              {t('dashboard.createOne')}
            </Link>
          </div>
        ) : (
          <div className="grid gap-3">
            {activeMeets.map(meet => (
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
            ))}
          </div>
        )}
      </div>

      {/* All-Time Group Ranking */}
      {aggregatedRanking.length > 0 && (
        <div>
          <h2 className="text-xl font-serif font-semibold text-brown mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-burgundy" />
            {t('dashboard.allTimeGroupRanking')}
          </h2>
          <div className="bg-white rounded-xl border border-warm-gray p-6">
            <div className="space-y-2">
              {aggregatedRanking.map((r, i) => (
                <div key={r.bookId} className="flex items-center gap-3 p-3 bg-cream/50 rounded-lg">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    i === 0 ? 'bg-yellow-100 text-yellow-700' :
                    i === 1 ? 'bg-gray-100 text-gray-600' :
                    i === 2 ? 'bg-orange-100 text-orange-700' :
                    'bg-warm-gray text-brown'
                  }`}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-brown">{r.bookTitle}</span>
                    <span className="text-sm text-brown-light ml-2">{t('common.by')} {r.bookAuthor}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-medium text-burgundy">{t('dashboard.pts', { points: r.totalPoints })}</span>
                    <span className="text-xs text-brown-lighter ml-1">{t('dashboard.appearances', { count: r.appearances })}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Latest Top 5 per Member */}
      {latestTop5 && latestTop5.userTop5s.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-serif font-semibold text-brown flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-sage-dark" />
              {t('dashboard.latestTop5')}
            </h2>
            <Link to={`/meets/${latestTop5.meetId}`} className="text-sm text-burgundy hover:text-burgundy-light flex items-center gap-1">
              {latestTop5.meetLabel} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {latestTop5.userTop5s.map(ut => (
              <div key={ut.userId} className="bg-white rounded-xl border border-warm-gray p-5">
                <h3 className="font-medium text-brown mb-3">{t('dashboard.usersTop5', { name: ut.username })}</h3>
                <ol className="space-y-1.5">
                  {ut.entries.map(e => (
                    <li key={e.bookId} className="flex items-center gap-2 text-sm">
                      <span className="w-5 h-5 rounded-full bg-burgundy/10 text-burgundy text-xs flex items-center justify-center font-medium flex-shrink-0">{e.rank}</span>
                      <span className="text-brown truncate">{e.bookTitle}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
