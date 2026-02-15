import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { BookOpen, Calendar, Users, ArrowRight, Trophy } from 'lucide-react';
import type { MeetResponse, BookResponse, AggregatedRankingResponse, LatestTop5Response } from '@readingcircle/shared';

export function DashboardPage() {
  const { user } = useAuth();
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

  const phaseColors: Record<string, string> = {
    draft: 'bg-brown-lighter/20 text-brown',
    voting: 'bg-burgundy/10 text-burgundy',
    reading: 'bg-sage/20 text-sage-dark',
    completed: 'bg-sage-light/30 text-sage-dark',
    cancelled: 'bg-warm-gray text-brown-light',
  };

  if (loading) {
    return <div className="text-brown-light animate-pulse font-serif text-lg">Loading...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-serif font-bold text-burgundy">
          Welcome back, {user?.username}
        </h1>
        <p className="text-brown-light mt-1">Here's what's happening in your Reading Circle</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-warm-gray p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-burgundy/10 flex items-center justify-center">
            <Calendar className="w-6 h-6 text-burgundy" />
          </div>
          <div>
            <div className="text-2xl font-serif font-bold text-brown">{activeMeets.length}</div>
            <div className="text-sm text-brown-light">Active Meets</div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-warm-gray p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-sage/20 flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-sage-dark" />
          </div>
          <div>
            <div className="text-2xl font-serif font-bold text-brown">{books.length}</div>
            <div className="text-sm text-brown-light">Books on List</div>
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
            <div className="text-sm text-brown-light">Completed Meets</div>
          </div>
        </div>
      </div>

      {/* Active Meets */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-serif font-semibold text-brown">Active Meets</h2>
          <Link to="/meets" className="text-sm text-burgundy hover:text-burgundy-light flex items-center gap-1">
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        {activeMeets.length === 0 ? (
          <div className="bg-white rounded-xl border border-warm-gray p-8 text-center">
            <Calendar className="w-10 h-10 text-brown-lighter mx-auto mb-3" />
            <p className="text-brown-light">No active meets right now</p>
            <Link to="/meets" className="text-burgundy hover:text-burgundy-light text-sm mt-2 inline-block">
              Create one
            </Link>
          </div>
        ) : (
          <div className="grid gap-3">
            {activeMeets.map(meet => (
              <Link
                key={meet.id}
                to={`/meets/${meet.id}`}
                className="bg-white rounded-xl border border-warm-gray p-5 hover:border-burgundy/30 transition-colors block"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-brown">{meet.label}</h3>
                    <p className="text-sm text-brown-light mt-1">
                      Hosted by {meet.hostUsername}
                      {meet.location && ` — ${meet.location}`}
                    </p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${phaseColors[meet.phase]}`}>
                    {meet.phase}
                  </span>
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
            All-Time Group Ranking
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
                    <span className="text-sm text-brown-light ml-2">by {r.bookAuthor}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-medium text-burgundy">{r.totalPoints} pts</span>
                    <span className="text-xs text-brown-lighter ml-1">({r.appearances}x)</span>
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
              Latest Top 5
            </h2>
            <Link to={`/meets/${latestTop5.meetId}`} className="text-sm text-burgundy hover:text-burgundy-light flex items-center gap-1">
              {latestTop5.meetLabel} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {latestTop5.userTop5s.map(ut => (
              <div key={ut.userId} className="bg-white rounded-xl border border-warm-gray p-5">
                <h3 className="font-medium text-brown mb-3">{ut.username}'s Top 5</h3>
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
