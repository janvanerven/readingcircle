import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatDateTime, toLocalDateTimeInput } from '@/lib/utils';
import { ArrowLeft, Calendar, MapPin, BookOpen, Vote, Clock, Trophy, AlertTriangle, Check, X, Minus, Eye, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import type { MeetDetailResponse, BookResponse, Top5EntryResponse, AggregatedRankingResponse } from '@readingcircle/shared';
import { VOTING_POINTS_TOTAL } from '@readingcircle/shared';

export function MeetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [meet, setMeet] = useState<MeetDetailResponse | null>(null);
  const [books, setBooks] = useState<BookResponse[]>([]);
  const [aggregatedRanking, setAggregatedRanking] = useState<AggregatedRankingResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMeet = useCallback(async () => {
    try {
      const [meetData, booksData] = await Promise.all([
        api<MeetDetailResponse>(`/meets/${id}`),
        api<BookResponse[]>('/books'),
      ]);
      setMeet(meetData);
      setBooks(booksData);

      if (meetData.phase === 'completed') {
        const ranking = await api<AggregatedRankingResponse[]>('/meets/top5/aggregate');
        setAggregatedRanking(ranking);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadMeet(); }, [loadMeet]);

  if (loading) return <div className="text-brown-light animate-pulse font-serif text-lg">Loading...</div>;
  if (!meet) return <div className="text-center py-12"><p className="text-brown-light">Meet not found</p></div>;

  const isHostOrAdmin = meet.hostId === user?.id || user?.isAdmin;

  const phaseColors: Record<string, string> = {
    draft: 'bg-brown-lighter/20 text-brown',
    voting: 'bg-burgundy/10 text-burgundy',
    reading: 'bg-sage/20 text-sage-dark',
    completed: 'bg-sage-light/30 text-sage-dark',
    cancelled: 'bg-warm-gray text-brown-light',
  };

  return (
    <div className="space-y-6">
      <Link to="/meets" className="inline-flex items-center gap-1 text-sm text-burgundy hover:text-burgundy-light">
        <ArrowLeft className="w-4 h-4" /> Back to Meets
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl border border-warm-gray p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-brown">{meet.label}</h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-brown-light">
              <span>Host: {meet.hostUsername}</span>
              {meet.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {meet.location}</span>}
              {meet.selectedDate && <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {formatDateTime(meet.selectedDate)}</span>}
            </div>
            {meet.description && <p className="text-brown mt-3 whitespace-pre-wrap">{meet.description}</p>}
          </div>
          <span className={`text-sm px-3 py-1.5 rounded-full font-medium capitalize whitespace-nowrap ${phaseColors[meet.phase]}`}>
            {meet.phase}
          </span>
        </div>

        {/* Phase controls */}
        {isHostOrAdmin && meet.phase !== 'completed' && (
          <PhaseControls meet={meet} onUpdate={loadMeet} navigate={navigate} />
        )}
      </div>

      {/* Candidates: shown in draft and voting */}
      {(meet.phase === 'draft' || meet.phase === 'voting') && (
        <CandidatesSection meet={meet} books={books} isHostOrAdmin={!!isHostOrAdmin} onUpdate={loadMeet} />
      )}

      {/* Date options: shown in draft and voting */}
      {(meet.phase === 'draft' || meet.phase === 'voting') && (
        <AvailabilitySection meet={meet} onUpdate={loadMeet} isHostOrAdmin={!!isHostOrAdmin} />
      )}

      {/* Voting: shown in voting phase */}
      {meet.phase === 'voting' && (
        <VotingSection meet={meet} onUpdate={loadMeet} isHostOrAdmin={!!isHostOrAdmin} />
      )}

      {(meet.phase === 'reading' || meet.phase === 'completed') && (
        <>
          <SelectedBookSection meet={meet} />
          <Top5Section meet={meet} onUpdate={loadMeet} />
        </>
      )}

      {meet.phase === 'completed' && aggregatedRanking.length > 0 && (
        <AggregatedRankingSection ranking={aggregatedRanking} />
      )}
    </div>
  );
}

// --- Sub-components ---

function PhaseControls({ meet, onUpdate, navigate }: { meet: MeetDetailResponse; onUpdate: () => void; navigate: (path: string) => void }) {
  const [changing, setChanging] = useState(false);

  const changePhase = async (phase: string) => {
    if (!confirm(`Are you sure you want to move this meet to "${phase}"?`)) return;
    setChanging(true);
    try {
      await api(`/meets/${meet.id}/phase`, { method: 'POST', body: JSON.stringify({ phase }) });
      onUpdate();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed');
    } finally {
      setChanging(false);
    }
  };

  const deleteMeet = async () => {
    if (!confirm('Are you sure you want to delete this meet?')) return;
    try {
      await api(`/meets/${meet.id}`, { method: 'DELETE' });
      navigate('/meets');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed');
    }
  };

  const hasBookAndDate = !!meet.selectedBookId && !!meet.selectedDate;

  const transitions: Record<string, { label: string; phase: string; color: string }[]> = {
    draft: hasBookAndDate
      ? [{ label: 'Start Reading', phase: 'reading', color: 'bg-sage text-white' }]
      : [
          { label: 'Start Voting', phase: 'voting', color: 'bg-burgundy text-white' },
          { label: 'Skip to Reading', phase: 'reading', color: 'bg-sage text-white' },
        ],
    voting: [
      { label: 'Move to Reading', phase: 'reading', color: 'bg-sage text-white' },
    ],
    reading: [
      { label: 'Complete', phase: 'completed', color: 'bg-sage text-white' },
    ],
  };

  const available = transitions[meet.phase] || [];

  if (meet.phase === 'cancelled') {
    return (
      <div className="flex flex-wrap gap-2 mt-5 pt-5 border-t border-warm-gray-light">
        <button onClick={deleteMeet} className="px-4 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 flex items-center gap-1.5">
          <Trash2 className="w-4 h-4" /> Delete Meet
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2 mt-5 pt-5 border-t border-warm-gray-light">
      {available.map(t => (
        <button key={t.phase} onClick={() => changePhase(t.phase)} disabled={changing}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${t.color} hover:opacity-90 disabled:opacity-50`}>
          {t.label}
        </button>
      ))}
      <button onClick={() => changePhase('cancelled')} disabled={changing}
        className="px-4 py-2 rounded-lg text-sm font-medium text-brown hover:bg-warm-gray-light">
        Cancel Meet
      </button>
      <button onClick={deleteMeet} className="px-4 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 ml-auto">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

type BookFilterValue = 'unread' | 'read' | 'all';

function CandidatesSection({ meet, books, isHostOrAdmin, onUpdate }: {
  meet: MeetDetailResponse; books: BookResponse[]; isHostOrAdmin: boolean; onUpdate: () => void;
}) {
  const [showAddCandidate, setShowAddCandidate] = useState(false);
  const [selectedBookId, setSelectedBookId] = useState('');
  const [motivation, setMotivation] = useState('');
  const [adding, setAdding] = useState(false);
  const [bookFilter, setBookFilter] = useState<BookFilterValue>('unread');

  const addCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookId) return;
    setAdding(true);
    try {
      await api(`/meets/${meet.id}/candidates`, {
        method: 'POST',
        body: JSON.stringify({ bookId: selectedBookId, motivation: motivation || undefined }),
      });
      setSelectedBookId('');
      setMotivation('');
      setShowAddCandidate(false);
      onUpdate();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed');
    } finally {
      setAdding(false);
    }
  };

  const selectBook = async (bookId: string) => {
    try {
      await api(`/meets/${meet.id}/candidates/select`, {
        method: 'POST',
        body: JSON.stringify({ bookId }),
      });
      onUpdate();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed');
    }
  };

  const removeCandidate = async (candidateId: string) => {
    try {
      await api(`/meets/${meet.id}/candidates/${candidateId}`, { method: 'DELETE' });
      onUpdate();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed');
    }
  };

  const candidateBookIds = new Set(meet.candidates.map(c => c.bookId));
  const availableBooks = books
    .filter(b => !candidateBookIds.has(b.id) && b.id !== meet.selectedBookId)
    .filter(b => bookFilter === 'all' ? true : bookFilter === 'read' ? b.isRead : !b.isRead)
    .sort((a, b) => a.title.localeCompare(b.title));

  // Determine if selection is allowed
  const canSelectInDraft = meet.phase === 'draft' && meet.candidates.length === 1;
  const isRevealed = meet.votingPointsRevealed;
  const maxPoints = isRevealed ? Math.max(...meet.candidates.map(c => c.points ?? 0)) : 0;
  const topCandidateBookIds = isRevealed
    ? new Set(meet.candidates.filter(c => (c.points ?? 0) === maxPoints).map(c => c.bookId))
    : new Set<string>();
  const canSelectAfterReveal = meet.phase === 'voting' && isRevealed && !meet.selectedBookId;

  return (
    <div className="bg-white rounded-xl border border-warm-gray p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-serif font-semibold text-brown text-lg flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-burgundy" />
          {meet.selectedBookId ? 'Selected Book' : 'Book Candidates'}
        </h2>
        {isHostOrAdmin && meet.phase === 'draft' && (
          <button onClick={() => setShowAddCandidate(!showAddCandidate)}
            className="text-sm text-burgundy hover:text-burgundy-light font-medium">
            + Add Candidate
          </button>
        )}
      </div>

      {meet.selectedBookId && (
        <div className="p-4 bg-sage/10 rounded-lg border border-sage/20 mb-4">
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-sage-dark" />
            <span className="font-medium text-brown">{meet.selectedBookTitle}</span>
          </div>
        </div>
      )}

      {showAddCandidate && (
        <form onSubmit={addCandidate} className="bg-cream rounded-lg p-4 mb-4 space-y-3">
          <div className="flex gap-2">
            <select value={selectedBookId} onChange={e => setSelectedBookId(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-lg border border-warm-gray bg-white text-brown focus:outline-none focus:ring-2 focus:ring-burgundy/30 transition">
              <option value="">Select a book...</option>
              {availableBooks.map(b => <option key={b.id} value={b.id}>{b.title} — {b.author}</option>)}
            </select>
            <select value={bookFilter} onChange={e => { setBookFilter(e.target.value as BookFilterValue); setSelectedBookId(''); }}
              className="px-3 py-2.5 rounded-lg border border-warm-gray bg-white text-brown text-sm focus:outline-none focus:ring-2 focus:ring-burgundy/30">
              <option value="unread">Unread</option>
              <option value="read">Read</option>
              <option value="all">All Books</option>
            </select>
          </div>
          <input type="text" value={motivation} onChange={e => setMotivation(e.target.value)}
            placeholder="Motivation (optional)"
            className="w-full px-4 py-2.5 rounded-lg border border-warm-gray bg-white text-brown focus:outline-none focus:ring-2 focus:ring-burgundy/30 transition" />
          <div className="flex gap-2">
            <button type="submit" disabled={adding || !selectedBookId}
              className="px-4 py-2 bg-burgundy text-white rounded-lg text-sm font-medium disabled:opacity-50">Add</button>
            <button type="button" onClick={() => setShowAddCandidate(false)}
              className="px-4 py-2 text-brown hover:bg-warm-gray-light rounded-lg text-sm">Cancel</button>
          </div>
        </form>
      )}

      {meet.candidates.length > 0 && (
        <div className="space-y-3">
          {meet.candidates.map(c => {
            const isTopCandidate = topCandidateBookIds.has(c.bookId);
            return (
              <div key={c.id} className={`flex items-start justify-between p-3 rounded-lg ${
                canSelectAfterReveal && isTopCandidate ? 'bg-sage/5 border border-sage/20' : 'bg-cream/50'
              }`}>
                <div>
                  <div className="flex items-center gap-2">
                    <Link to={`/books/${c.bookId}`} className="font-medium text-brown hover:text-burgundy">{c.bookTitle}</Link>
                    {c.alreadySelectedInMeet && (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                        <AlertTriangle className="w-3 h-3" /> Already selected before
                      </span>
                    )}
                    {canSelectAfterReveal && isTopCandidate && (
                      <span className="inline-flex items-center gap-1 text-xs text-sage-dark bg-sage/20 px-2 py-0.5 rounded-full">
                        Top voted
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-brown-light">by {c.bookAuthor}
                    {(() => { const book = books.find(b => b.id === c.bookId); return book && book.candidateCount > 1 ? ` — ${book.candidateCount}x nominated` : ''; })()}
                  </p>
                  {c.motivation && <p className="text-sm text-brown-light mt-1 italic">"{c.motivation}"</p>}
                  {c.points !== undefined && (
                    <p className="text-sm font-medium text-burgundy mt-1">{c.points} points</p>
                  )}
                </div>
                <div className="flex gap-1">
                  {/* Draft: select only if single candidate */}
                  {isHostOrAdmin && canSelectInDraft && (
                    <button onClick={() => selectBook(c.bookId)} title="Select this book"
                      className="p-1.5 text-sage hover:bg-sage/20 rounded-lg"><Check className="w-4 h-4" /></button>
                  )}
                  {/* Voting revealed: select only top candidates */}
                  {isHostOrAdmin && canSelectAfterReveal && isTopCandidate && (
                    <button onClick={() => selectBook(c.bookId)} title="Select this book"
                      className="p-1.5 text-sage hover:bg-sage/20 rounded-lg"><Check className="w-4 h-4" /></button>
                  )}
                  {isHostOrAdmin && meet.phase === 'draft' && c.bookId !== meet.selectedBookId && (
                    <button onClick={() => removeCandidate(c.id)} title="Remove candidate"
                      className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"><X className="w-4 h-4" /></button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function VotingSection({ meet, onUpdate, isHostOrAdmin }: {
  meet: MeetDetailResponse; onUpdate: () => void; isHostOrAdmin: boolean;
}) {
  const [points, setPoints] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // Initialize with user's existing votes or empty distribution
    const init: Record<string, number> = {};
    meet.candidates.forEach(c => { init[c.id] = 0; });

    // Populate with existing votes
    if (meet.myVotes && meet.myVotes.length > 0) {
      for (const v of meet.myVotes) {
        if (init.hasOwnProperty(v.candidateId)) {
          init[v.candidateId] = v.points;
        }
      }
    }
    setPoints(init);
    setInitialized(true);
  }, [meet.candidates, meet.myVotes]);

  const totalUsed = Object.values(points).reduce((s, v) => s + v, 0);
  const remaining = VOTING_POINTS_TOTAL - totalUsed;
  const hasVoted = meet.myVotes && meet.myVotes.length > 0;

  const submitVotes = async () => {
    setSubmitting(true);
    try {
      const votes = Object.entries(points).map(([candidateId, pts]) => ({ candidateId, points: pts }));
      await api(`/meets/${meet.id}/votes`, { method: 'POST', body: JSON.stringify({ votes }) });
      onUpdate();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  const revealScores = async () => {
    try {
      await api(`/meets/${meet.id}/votes/reveal`, { method: 'POST' });
      onUpdate();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed');
    }
  };

  if (meet.candidates.length === 0 || meet.selectedBookId || !initialized) return null;

  return (
    <div className="bg-white rounded-xl border border-warm-gray p-6">
      <h2 className="font-serif font-semibold text-brown text-lg mb-4 flex items-center gap-2">
        <Vote className="w-5 h-5 text-burgundy" />
        Vote on Candidates
      </h2>

      {/* Vote status */}
      <div className="mb-4 p-3 bg-cream rounded-lg">
        <p className="text-sm font-medium text-brown mb-2">Voting Status</p>
        <div className="flex flex-wrap gap-2">
          {meet.voteStatus.map(v => (
            <span key={v.userId} className={`text-xs px-2.5 py-1 rounded-full ${v.hasVoted ? 'bg-sage/20 text-sage-dark' : 'bg-warm-gray text-brown-light'}`}>
              {v.username}: {v.hasVoted ? 'Decided' : 'Undecided'}
            </span>
          ))}
        </div>
      </div>

      {/* Point distribution */}
      <div className="space-y-3 mb-4">
        <p className="text-sm text-brown-light">
          Distribute <strong>{VOTING_POINTS_TOTAL}</strong> points among the candidates.
          Remaining: <strong className={remaining === 0 ? 'text-sage-dark' : 'text-burgundy'}>{remaining}</strong>
          {hasVoted && <span className="ml-2 text-sage-dark">(Your votes are saved)</span>}
        </p>
        {meet.candidates.map(c => (
          <div key={c.id} className="flex items-center gap-3">
            <span className="text-sm text-brown flex-1 min-w-0 truncate">{c.bookTitle}</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPoints({ ...points, [c.id]: Math.max(0, (points[c.id] || 0) - 1) })}
                className="w-8 h-8 rounded-lg border border-warm-gray text-brown hover:bg-warm-gray-light flex items-center justify-center">
                <Minus className="w-3 h-3" />
              </button>
              <span className="w-8 text-center font-medium text-brown">{points[c.id] || 0}</span>
              <button onClick={() => {
                if (remaining > 0) setPoints({ ...points, [c.id]: (points[c.id] || 0) + 1 });
              }}
                className="w-8 h-8 rounded-lg border border-warm-gray text-brown hover:bg-warm-gray-light flex items-center justify-center">
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={submitVotes} disabled={submitting || remaining !== 0}
          className="px-4 py-2 bg-burgundy text-white rounded-lg text-sm font-medium disabled:opacity-50">
          {submitting ? 'Submitting...' : hasVoted ? 'Update Votes' : 'Submit Votes'}
        </button>
        {isHostOrAdmin && !meet.votingPointsRevealed && (
          <button onClick={revealScores}
            className="px-4 py-2 border border-burgundy text-burgundy rounded-lg text-sm font-medium hover:bg-burgundy/5 flex items-center gap-1.5">
            <Eye className="w-4 h-4" /> Reveal Scores
          </button>
        )}
      </div>
    </div>
  );
}

function AvailabilitySection({ meet, onUpdate, isHostOrAdmin }: {
  meet: MeetDetailResponse; onUpdate: () => void; isHostOrAdmin: boolean;
}) {
  const { user } = useAuth();
  const [votes, setVotes] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showAddDate, setShowAddDate] = useState(false);
  const [newDateTime, setNewDateTime] = useState(() => {
    // Default to today at 19:00 local time
    const d = new Date();
    d.setHours(19, 0, 0, 0);
    return toLocalDateTimeInput(d);
  });

  // Initialize votes from existing data for the current user
  useEffect(() => {
    if (!user || !meet.dateOptions.length) return;
    const init: Record<string, string> = {};
    for (const opt of meet.dateOptions) {
      const myVote = opt.votes.find(v => v.userId === user.id);
      init[opt.id] = myVote?.availability || 'no_response';
    }
    setVotes(init);
  }, [meet.dateOptions, user]);

  const addDateOption = async () => {
    if (!newDateTime) return;
    try {
      await api(`/meets/${meet.id}/date-options`, {
        method: 'POST',
        body: JSON.stringify({ dateTime: new Date(newDateTime).toISOString() }),
      });
      setNewDateTime('');
      setShowAddDate(false);
      onUpdate();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed');
    }
  };

  const removeDateOption = async (optionId: string) => {
    try {
      await api(`/meets/${meet.id}/date-options/${optionId}`, { method: 'DELETE' });
      onUpdate();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed');
    }
  };

  const submitAvailability = async () => {
    setSubmitting(true);
    try {
      const voteArray = Object.entries(votes).map(([dateOptionId, availability]) => ({ dateOptionId, availability }));
      await api(`/meets/${meet.id}/date-votes`, { method: 'PUT', body: JSON.stringify({ votes: voteArray }) });
      onUpdate();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  const selectDate = async (dateOptionId: string) => {
    try {
      await api(`/meets/${meet.id}/date-options/select`, {
        method: 'POST',
        body: JSON.stringify({ dateOptionId }),
      });
      onUpdate();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed');
    }
  };

  const availabilityOptions = [
    { value: 'available', label: 'Available', icon: Check, color: 'text-sage-dark bg-sage/20' },
    { value: 'not_available', label: 'Not Available', icon: X, color: 'text-red-500 bg-red-50' },
    { value: 'maybe', label: 'Maybe', icon: Minus, color: 'text-amber-600 bg-amber-50' },
  ];

  // In draft phase: show date management (add/remove)
  // In voting phase: show availability polling + date selection
  const isDraft = meet.phase === 'draft';
  const isVoting = meet.phase === 'voting';

  return (
    <div className="bg-white rounded-xl border border-warm-gray p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-serif font-semibold text-brown text-lg flex items-center gap-2">
          <Clock className="w-5 h-5 text-burgundy" />
          {isDraft ? 'Date Options' : 'Availability Poll'}
        </h2>
        {isHostOrAdmin && isDraft && !meet.selectedDate && (
          <button onClick={() => {
            if (!showAddDate) {
              // Set default date: last date option + 1 day, or today at 19:00
              if (meet.dateOptions.length > 0) {
                const lastOpt = meet.dateOptions[meet.dateOptions.length - 1]!;
                const lastDate = new Date(lastOpt.dateTime);
                lastDate.setDate(lastDate.getDate() + 1);
                setNewDateTime(toLocalDateTimeInput(lastDate));
              } else {
                const d = new Date();
                d.setHours(19, 0, 0, 0);
                setNewDateTime(toLocalDateTimeInput(d));
              }
            }
            setShowAddDate(!showAddDate);
          }}
            className="text-sm text-burgundy hover:text-burgundy-light font-medium">+ Add Date</button>
        )}
      </div>

      {meet.selectedDate && (
        <div className="p-3 bg-sage/10 rounded-lg border border-sage/20 mb-4">
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-sage-dark" />
            <span className="font-medium text-brown">Selected: {formatDateTime(meet.selectedDate)}</span>
          </div>
        </div>
      )}

      {showAddDate && (
        <div className="bg-cream rounded-lg p-4 mb-4 flex gap-2">
          <input type="datetime-local" value={newDateTime} onChange={e => setNewDateTime(e.target.value)}
            className="flex-1 px-4 py-2 rounded-lg border border-warm-gray bg-white text-brown focus:outline-none focus:ring-2 focus:ring-burgundy/30" />
          <button onClick={addDateOption} className="px-4 py-2 bg-burgundy text-white rounded-lg text-sm font-medium">Add</button>
        </div>
      )}

      {meet.dateOptions.length > 0 && isDraft && (
        <div className="space-y-2">
          {meet.dateOptions.map(opt => (
            <div key={opt.id} className="flex items-center justify-between p-3 bg-cream/50 rounded-lg">
              <span className="text-sm text-brown">{formatDateTime(opt.dateTime)}</span>
              {isHostOrAdmin && (
                <div className="flex gap-1">
                  {meet.dateOptions.length === 1 && !meet.selectedDate && (
                    <button onClick={() => selectDate(opt.id)} title="Select this date"
                      className="p-1.5 text-sage hover:bg-sage/20 rounded-lg"><Check className="w-4 h-4" /></button>
                  )}
                  <button onClick={() => removeDateOption(opt.id)} title="Remove date option"
                    className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"><X className="w-4 h-4" /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {meet.dateOptions.length > 0 && isVoting && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-warm-gray">
                <th className="text-left py-2 text-brown font-medium">Date</th>
                {meet.dateOptions[0]?.votes.map(v => (
                  <th key={v.userId} className="text-center py-2 text-brown font-medium px-2">{v.username}</th>
                ))}
                <th className="text-center py-2 text-brown font-medium">Your Vote</th>
                {isHostOrAdmin && <th className="w-10"></th>}
              </tr>
            </thead>
            <tbody>
              {meet.dateOptions.map(opt => (
                <tr key={opt.id} className="border-b border-warm-gray-light">
                  <td className="py-3 text-brown">{formatDateTime(opt.dateTime)}</td>
                  {opt.votes.map(v => {
                    const av = availabilityOptions.find(a => a.value === v.availability);
                    return (
                      <td key={v.userId} className="text-center py-3 px-2">
                        {av ? (
                          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full ${av.color}`}>
                            <av.icon className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <span className="text-brown-lighter">—</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="text-center py-3">
                    <select
                      value={votes[opt.id] || 'no_response'}
                      onChange={e => setVotes({ ...votes, [opt.id]: e.target.value })}
                      className="text-xs px-2 py-1 rounded border border-warm-gray bg-cream/50"
                    >
                      <option value="no_response">—</option>
                      <option value="available">Available</option>
                      <option value="not_available">Not Available</option>
                      <option value="maybe">Maybe</option>
                    </select>
                  </td>
                  {isHostOrAdmin && (
                    <td className="text-center py-3">
                      <button onClick={() => selectDate(opt.id)} title="Select this date"
                        className="p-1.5 text-sage hover:bg-sage/20 rounded-lg"><Check className="w-4 h-4" /></button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={submitAvailability} disabled={submitting}
            className="mt-3 px-4 py-2 bg-burgundy text-white rounded-lg text-sm font-medium disabled:opacity-50">
            {submitting ? 'Saving...' : 'Save Availability'}
          </button>
        </div>
      )}

      {meet.dateOptions.length === 0 && !showAddDate && (
        <p className="text-sm text-brown-light">No date options added yet.</p>
      )}
    </div>
  );
}

function SelectedBookSection({ meet }: { meet: MeetDetailResponse }) {
  if (!meet.selectedBookId) return null;
  return (
    <div className="bg-white rounded-xl border border-warm-gray p-6">
      <h2 className="font-serif font-semibold text-brown text-lg mb-3 flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-sage" />
        Selected Book
      </h2>
      <Link to={`/books/${meet.selectedBookId}`} className="text-burgundy hover:text-burgundy-light font-medium text-lg">
        {meet.selectedBookTitle}
      </Link>
      {meet.selectedDate && (
        <p className="text-sm text-brown-light mt-2 flex items-center gap-1">
          <Calendar className="w-4 h-4" /> Meeting on {formatDateTime(meet.selectedDate)}
          {meet.location && <span> at {meet.location}</span>}
        </p>
      )}
    </div>
  );
}

function Top5Section({ meet, onUpdate }: { meet: MeetDetailResponse; onUpdate: () => void }) {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [entries, setEntries] = useState<{ bookId: string; rank: number }[]>([]);
  const [eligibleBooks, setEligibleBooks] = useState<BookResponse[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Load eligible books (selected in completed/reading meets)
    async function load() {
      try {
        const allMeets = await api<{ id: string; phase: string; selectedBookId: string | null }[]>('/meets');
        const validBookIds = allMeets
          .filter(m => (m.phase === 'completed' || m.phase === 'reading') && m.selectedBookId)
          .map(m => m.selectedBookId!);

        const allBooks = await api<BookResponse[]>('/books');
        setEligibleBooks(allBooks.filter(b => validBookIds.includes(b.id)));
      } catch { /* ignore */ }
    }
    load();
  }, []);

  const myEntries = meet.top5Entries.filter(e => e.userId === user?.id);
  const otherEntries = meet.top5Entries.filter(e => e.userId !== user?.id);

  // Group by user
  const userGroups = new Map<string, Top5EntryResponse[]>();
  otherEntries.forEach(e => {
    const list = userGroups.get(e.userId) || [];
    list.push(e);
    userGroups.set(e.userId, list);
  });

  const submitTop5 = async () => {
    setSubmitting(true);
    try {
      await api(`/meets/${meet.id}/top5`, { method: 'POST', body: JSON.stringify({ entries }) });
      setShowForm(false);
      onUpdate();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  const maxEntries = Math.min(5, eligibleBooks.length);

  return (
    <div className="bg-white rounded-xl border border-warm-gray p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-serif font-semibold text-brown text-lg flex items-center gap-2">
          <Trophy className="w-5 h-5 text-burgundy" />
          Top 5 Books
        </h2>
        <button onClick={() => setShowForm(!showForm)} className="text-sm text-burgundy hover:text-burgundy-light font-medium">
          {myEntries.length > 0 ? 'Update My Top 5' : 'Add My Top 5'}
        </button>
      </div>

      {showForm && (
        <div className="bg-cream rounded-lg p-4 mb-4 space-y-3">
          <p className="text-sm text-brown-light">Select up to {maxEntries} books, ranked from 1 (best) to {maxEntries}. Use arrows to reorder.</p>

          {/* Add book to ranking */}
          <select
            value=""
            onChange={e => {
              if (!e.target.value) return;
              const nextRank = entries.length + 1;
              if (nextRank > maxEntries) return;
              setEntries([...entries, { bookId: e.target.value, rank: nextRank }]);
            }}
            disabled={entries.length >= maxEntries}
            className="w-full px-3 py-2 rounded-lg border border-warm-gray bg-white text-brown text-sm focus:outline-none focus:ring-2 focus:ring-burgundy/30"
          >
            <option value="">Add a book to your ranking...</option>
            {eligibleBooks
              .filter(b => !entries.some(en => en.bookId === b.id))
              .sort((a, b) => a.title.localeCompare(b.title))
              .map(b => (
                <option key={b.id} value={b.id}>{b.title} — {b.author}</option>
              ))}
          </select>

          {/* Ranked list with up/down arrows */}
          {entries
            .sort((a, b) => a.rank - b.rank)
            .map((entry, idx) => {
              const book = eligibleBooks.find(b => b.id === entry.bookId);
              return (
                <div key={entry.bookId} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-warm-gray-light">
                  <span className="w-6 h-6 rounded-full bg-burgundy text-white text-xs flex items-center justify-center font-medium flex-shrink-0">{idx + 1}</span>
                  <span className="text-sm text-brown flex-1 min-w-0 truncate">{book ? `${book.title} — ${book.author}` : entry.bookId}</span>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <button
                      onClick={() => {
                        if (idx === 0) return;
                        const sorted = [...entries].sort((a, b) => a.rank - b.rank);
                        const prev = sorted[idx - 1]!;
                        setEntries(entries.map(en =>
                          en.bookId === entry.bookId ? { ...en, rank: prev.rank } :
                          en.bookId === prev.bookId ? { ...en, rank: entry.rank } : en
                        ));
                      }}
                      disabled={idx === 0}
                      className="p-1 text-brown-lighter hover:text-burgundy disabled:opacity-30"
                      title="Move up"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (idx === entries.length - 1) return;
                        const sorted = [...entries].sort((a, b) => a.rank - b.rank);
                        const next = sorted[idx + 1]!;
                        setEntries(entries.map(en =>
                          en.bookId === entry.bookId ? { ...en, rank: next.rank } :
                          en.bookId === next.bookId ? { ...en, rank: entry.rank } : en
                        ));
                      }}
                      disabled={idx === entries.length - 1}
                      className="p-1 text-brown-lighter hover:text-burgundy disabled:opacity-30"
                      title="Move down"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        const removed = entries.filter(en => en.bookId !== entry.bookId);
                        // Re-rank remaining entries
                        const sorted = removed.sort((a, b) => a.rank - b.rank);
                        setEntries(sorted.map((en, i) => ({ ...en, rank: i + 1 })));
                      }}
                      className="p-1 text-red-400 hover:text-red-600"
                      title="Remove"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}

          <button onClick={submitTop5} disabled={submitting || entries.length === 0}
            className="px-4 py-2 bg-burgundy text-white rounded-lg text-sm font-medium disabled:opacity-50">
            {submitting ? 'Saving...' : 'Save Top 5'}
          </button>
        </div>
      )}

      {/* My entries */}
      {myEntries.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-medium text-brown mb-2">Your Top 5</h3>
          <ol className="space-y-1">
            {myEntries.sort((a, b) => a.rank - b.rank).map(e => (
              <li key={e.id} className="flex items-center gap-2 text-sm">
                <span className="w-5 h-5 rounded-full bg-burgundy/10 text-burgundy text-xs flex items-center justify-center font-medium">{e.rank}</span>
                <span className="text-brown">{e.bookTitle}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Others' entries */}
      {Array.from(userGroups.entries()).map(([userId, userEntries]) => (
        <div key={userId} className="mb-4 last:mb-0">
          <h3 className="text-sm font-medium text-brown mb-2">{userEntries[0]?.username}'s Top 5</h3>
          <ol className="space-y-1">
            {userEntries.sort((a, b) => a.rank - b.rank).map(e => (
              <li key={e.id} className="flex items-center gap-2 text-sm">
                <span className="w-5 h-5 rounded-full bg-warm-gray text-brown text-xs flex items-center justify-center font-medium">{e.rank}</span>
                <span className="text-brown">{e.bookTitle}</span>
              </li>
            ))}
          </ol>
        </div>
      ))}

      {meet.top5Entries.length === 0 && !showForm && (
        <p className="text-sm text-brown-light">No one has submitted their Top 5 yet.</p>
      )}
    </div>
  );
}

function AggregatedRankingSection({ ranking }: { ranking: AggregatedRankingResponse[] }) {
  return (
    <div className="bg-white rounded-xl border border-warm-gray p-6">
      <h2 className="font-serif font-semibold text-brown text-lg mb-4 flex items-center gap-2">
        <Trophy className="w-5 h-5 text-sage" />
        All-Time Group Ranking
      </h2>
      <div className="space-y-2">
        {ranking.map((r, i) => (
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
  );
}
