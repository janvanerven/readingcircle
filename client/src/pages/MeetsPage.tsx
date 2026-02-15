import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { Calendar, Plus, MapPin } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';
import type { MeetResponse } from '@readingcircle/shared';

type MeetWithLabel = MeetResponse & { label: string };

export function MeetsPage() {
  const navigate = useNavigate();
  const [meets, setMeets] = useState<MeetWithLabel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadMeets();
  }, []);

  async function loadMeets() {
    try {
      const data = await api<MeetWithLabel[]>('/meets');
      setMeets(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const meet = await api<MeetWithLabel>('/meets', {
        method: 'POST',
        body: JSON.stringify({ location: location || undefined, description: description || undefined }),
      });
      navigate(`/meets/${meet.id}`);
    } catch {
      // ignore
    } finally {
      setCreating(false);
    }
  };

  const phaseOrder = ['draft', 'voting', 'reading', 'completed', 'cancelled'];
  const phaseLabels: Record<string, string> = {
    draft: 'Drafts',
    voting: 'Voting',
    reading: 'Currently Reading',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };
  const phaseColors: Record<string, string> = {
    draft: 'bg-brown-lighter/20 text-brown',
    voting: 'bg-burgundy/10 text-burgundy',
    reading: 'bg-sage/20 text-sage-dark',
    completed: 'bg-sage-light/30 text-sage-dark',
    cancelled: 'bg-warm-gray text-brown-light',
  };

  if (loading) {
    return <div className="text-brown-light animate-pulse font-serif text-lg">Loading meets...</div>;
  }

  const groupedMeets = phaseOrder
    .map(phase => ({
      phase,
      meets: meets.filter(m => m.phase === phase),
    }))
    .filter(g => g.meets.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-serif font-bold text-burgundy">Meets</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-burgundy hover:bg-burgundy-light text-white rounded-lg transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Create Meet
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border border-warm-gray p-6 space-y-4">
          <h3 className="font-serif font-semibold text-brown text-lg">Create a New Meet</h3>
          <div>
            <label className="block text-sm font-medium text-brown mb-1">Location</label>
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="e.g., My place, Online, ..."
              className="w-full px-4 py-2.5 rounded-lg border border-warm-gray bg-cream/50 text-brown focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy transition"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-brown mb-1">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              className="w-full px-4 py-2.5 rounded-lg border border-warm-gray bg-cream/50 text-brown focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy transition resize-none"
            />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={creating} className="px-4 py-2 bg-burgundy hover:bg-burgundy-light text-white rounded-lg text-sm font-medium disabled:opacity-50">
              {creating ? 'Creating...' : 'Create'}
            </button>
            <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-brown hover:bg-warm-gray-light rounded-lg text-sm">
              Cancel
            </button>
          </div>
        </form>
      )}

      {groupedMeets.length === 0 ? (
        <div className="bg-white rounded-xl border border-warm-gray p-12 text-center">
          <Calendar className="w-12 h-12 text-brown-lighter mx-auto mb-3" />
          <p className="text-brown-light">No meets yet. Create one to get started!</p>
        </div>
      ) : (
        groupedMeets.map(group => (
          <div key={group.phase}>
            <h2 className="text-lg font-serif font-semibold text-brown mb-3">{phaseLabels[group.phase]}</h2>
            <div className="grid gap-3">
              {group.meets.map(meet => (
                <Link
                  key={meet.id}
                  to={`/meets/${meet.id}`}
                  className="bg-white rounded-xl border border-warm-gray p-5 hover:border-burgundy/30 hover:shadow-sm transition-all block"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-medium text-brown">{meet.label}</h3>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-sm text-brown-light">
                        <span>Host: {meet.hostUsername}</span>
                        {meet.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {meet.location}
                          </span>
                        )}
                        {meet.selectedDate && <span>{formatDateTime(meet.selectedDate)}</span>}
                      </div>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize whitespace-nowrap ${phaseColors[meet.phase]}`}>
                      {meet.phase}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
