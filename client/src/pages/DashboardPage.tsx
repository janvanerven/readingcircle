import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { BookOpen, Calendar, Users, ArrowRight } from 'lucide-react';
import type { MeetResponse, BookResponse } from '@readingcircle/shared';

export function DashboardPage() {
  const { user } = useAuth();
  const [meets, setMeets] = useState<(MeetResponse & { label: string })[]>([]);
  const [books, setBooks] = useState<BookResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [meetsData, booksData] = await Promise.all([
          api<(MeetResponse & { label: string })[]>('/meets'),
          api<BookResponse[]>('/books'),
        ]);
        setMeets(meetsData);
        setBooks(booksData);
      } catch {
        // Ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const activeMeets = meets.filter(m => m.phase !== 'completed' && m.phase !== 'cancelled');
  const recentBooks = books.slice(0, 5);

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

      {/* Recent Books */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-serif font-semibold text-brown">Recent Books</h2>
          <Link to="/books" className="text-sm text-burgundy hover:text-burgundy-light flex items-center gap-1">
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        {recentBooks.length === 0 ? (
          <div className="bg-white rounded-xl border border-warm-gray p-8 text-center">
            <BookOpen className="w-10 h-10 text-brown-lighter mx-auto mb-3" />
            <p className="text-brown-light">No books on the reading list yet</p>
            <Link to="/books" className="text-burgundy hover:text-burgundy-light text-sm mt-2 inline-block">
              Add a book
            </Link>
          </div>
        ) : (
          <div className="grid gap-3">
            {recentBooks.map(book => (
              <Link
                key={book.id}
                to={`/books/${book.id}`}
                className="bg-white rounded-xl border border-warm-gray p-5 hover:border-burgundy/30 transition-colors block"
              >
                <h3 className="font-medium text-brown">{book.title}</h3>
                <p className="text-sm text-brown-light mt-0.5">by {book.author}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
