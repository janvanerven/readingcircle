import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { Calendar, Plus, MapPin } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';
import { phaseBorderColors, phaseTextColors, phaseIcons } from '@/lib/phase-styles';
import type { MeetResponse, MeetPhase } from '@readingcircle/shared';

type MeetWithLabel = MeetResponse & { label: string };

export function MeetsPage() {
  const { t } = useTranslation();
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

  if (loading) {
    return <div className="text-brown-light animate-pulse font-serif text-lg">{t('meets.loadingMeets')}</div>;
  }

  const groupedMeets = phaseOrder
    .map(phase => ({
      phase,
      meets: meets
        .filter(m => m.phase === phase)
        .sort((a, b) => {
          // Sort by selectedDate descending (newest first), nulls last
          if (a.selectedDate && b.selectedDate) return b.selectedDate.localeCompare(a.selectedDate);
          if (a.selectedDate) return -1;
          if (b.selectedDate) return 1;
          return b.createdAt.localeCompare(a.createdAt);
        }),
    }))
    .filter(g => g.meets.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-serif font-bold text-burgundy">{t('meets.title')}</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-burgundy hover:bg-burgundy-light text-white rounded-lg transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          {t('meets.createMeet')}
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border border-warm-gray p-6 space-y-4">
          <h3 className="font-serif font-semibold text-brown text-lg">{t('meets.createNewMeet')}</h3>
          <div>
            <label className="block text-sm font-medium text-brown mb-1">{t('meets.locationLabel')}</label>
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder={t('meets.locationPlaceholder')}
              className="w-full px-4 py-2.5 rounded-lg border border-warm-gray bg-cream/50 text-brown focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy transition"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-brown mb-1">{t('meets.descriptionLabel')}</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              className="w-full px-4 py-2.5 rounded-lg border border-warm-gray bg-cream/50 text-brown focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy transition resize-none"
            />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={creating} className="px-4 py-2 bg-burgundy hover:bg-burgundy-light text-white rounded-lg text-sm font-medium disabled:opacity-50">
              {creating ? t('meets.creating') : t('meets.create')}
            </button>
            <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-brown hover:bg-warm-gray-light rounded-lg text-sm">
              {t('common.cancel')}
            </button>
          </div>
        </form>
      )}

      {groupedMeets.length === 0 ? (
        <div className="bg-white rounded-xl border border-warm-gray p-12 text-center">
          <Calendar className="w-12 h-12 text-brown-lighter mx-auto mb-3" />
          <p className="text-brown-light">{t('meets.noMeetsYet')}</p>
        </div>
      ) : (
        groupedMeets.map(group => (
          <div key={group.phase}>
            <h2 className="text-lg font-serif font-semibold text-brown mb-3">{t(`meets.phases.${group.phase}`)}</h2>
            <div className="grid gap-3">
              {group.meets.map(meet => (
                <Link
                  key={meet.id}
                  to={`/meets/${meet.id}`}
                  className={`bg-white rounded-xl border border-warm-gray border-l-4 ${phaseBorderColors[meet.phase as MeetPhase]} p-5 hover:shadow-sm transition-all block`}
                >
                  <div className="min-w-0">
                    <h3 className="font-medium text-brown">{meet.label}</h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-sm text-brown-light">
                      <span>{t('meets.host', { name: meet.hostUsername })}</span>
                      {meet.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {meet.location}
                        </span>
                      )}
                      {meet.selectedDate && <span>{formatDateTime(meet.selectedDate)}</span>}
                      {(() => {
                        const PhaseIcon = phaseIcons[meet.phase as MeetPhase];
                        return (
                          <span className={`flex items-center gap-1 font-medium ${phaseTextColors[meet.phase as MeetPhase]}`}>
                            <PhaseIcon className="w-3.5 h-3.5" />
                            {t(`meets.phases.${meet.phase}`)}
                          </span>
                        );
                      })()}
                    </div>
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
