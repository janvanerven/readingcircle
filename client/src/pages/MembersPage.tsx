import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Users, Shield, Calendar, BookOpen } from 'lucide-react';
import type { MemberSummaryResponse } from '@readingcircle/shared';

export function MembersPage() {
  const { user } = useAuth();
  const [members, setMembers] = useState<MemberSummaryResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<MemberSummaryResponse[]>('/users/profiles')
      .then(setMembers)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-brown-light animate-pulse font-serif text-lg">Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-serif font-bold text-burgundy flex items-center gap-3">
        <Users className="w-8 h-8" />
        Members
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
                    <span className="text-xs bg-burgundy/10 text-burgundy px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      Admin
                    </span>
                  )}
                  {m.id === user?.id && (
                    <span className="text-xs text-brown-lighter">(you)</span>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-xs text-brown-light flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Hosted {m.hostCount} meet{m.hostCount !== 1 ? 's' : ''}
                  </span>
                  <span className="text-xs text-brown-light flex items-center gap-1">
                    <BookOpen className="w-3 h-3" />
                    {m.readBookCount} book{m.readBookCount !== 1 ? 's' : ''} read
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
