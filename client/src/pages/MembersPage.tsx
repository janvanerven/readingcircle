import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Users, Shield, ShieldOff, Trash2, Mail, UserPlus } from 'lucide-react';
import type { UserResponse, InvitationResponse } from '@readingcircle/shared';
import { formatDate } from '@/lib/utils';

export function MembersPage() {
  const { user } = useAuth();
  const [members, setMembers] = useState<UserResponse[]>([]);
  const [invitations, setInvitations] = useState<InvitationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const membersData = await api<UserResponse[]>('/users');
      setMembers(membersData);

      if (user?.isAdmin) {
        const invData = await api<InvitationResponse[]>('/invitations');
        setInvitations(invData);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  const toggleAdmin = async (memberId: string) => {
    try {
      await api(`/users/${memberId}/admin`, { method: 'PATCH' });
      loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed');
    }
  };

  const removeMember = async (memberId: string, username: string) => {
    if (!confirm(`Are you sure you want to remove ${username} from the circle?`)) return;
    try {
      await api(`/users/${memberId}`, { method: 'DELETE' });
      loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed');
    }
  };

  const sendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInviting(true);
    try {
      await api('/invitations', {
        method: 'POST',
        body: JSON.stringify({ email: inviteEmail }),
      });
      setInviteEmail('');
      setShowInvite(false);
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  if (loading) return <div className="text-brown-light animate-pulse font-serif text-lg">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-serif font-bold text-burgundy">Circle Members</h1>
        {user?.isAdmin && (
          <button onClick={() => setShowInvite(!showInvite)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-burgundy hover:bg-burgundy-light text-white rounded-lg transition-colors text-sm font-medium">
            <UserPlus className="w-4 h-4" />
            Invite Member
          </button>
        )}
      </div>

      {showInvite && (
        <form onSubmit={sendInvite} className="bg-white rounded-xl border border-warm-gray p-6 space-y-4">
          <h3 className="font-serif font-semibold text-brown text-lg">Invite a New Member</h3>
          {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm border border-red-200">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-brown mb-1">Email Address</label>
            <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} required
              placeholder="friend@example.com"
              className="w-full px-4 py-2.5 rounded-lg border border-warm-gray bg-cream/50 text-brown focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy transition" />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={inviting}
              className="px-4 py-2 bg-burgundy hover:bg-burgundy-light text-white rounded-lg text-sm font-medium disabled:opacity-50">
              {inviting ? 'Sending...' : 'Send Invitation'}
            </button>
            <button type="button" onClick={() => setShowInvite(false)}
              className="px-4 py-2 text-brown hover:bg-warm-gray-light rounded-lg text-sm">Cancel</button>
          </div>
        </form>
      )}

      {/* Members list */}
      <div className="bg-white rounded-xl border border-warm-gray divide-y divide-warm-gray-light">
        {members.map(m => (
          <div key={m.id} className="flex items-center justify-between p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-burgundy/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-burgundy" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-brown">{m.username}</span>
                  {m.isAdmin && (
                    <span className="text-xs bg-burgundy/10 text-burgundy px-2 py-0.5 rounded-full">Admin</span>
                  )}
                  {m.id === user?.id && (
                    <span className="text-xs text-brown-lighter">(you)</span>
                  )}
                </div>
                <p className="text-sm text-brown-light">{m.email}</p>
              </div>
            </div>

            {user?.isAdmin && m.id !== user.id && (
              <div className="flex gap-1">
                <button onClick={() => toggleAdmin(m.id)} title={m.isAdmin ? 'Remove admin' : 'Make admin'}
                  className="p-2 text-brown-light hover:bg-warm-gray-light rounded-lg transition-colors">
                  {m.isAdmin ? <ShieldOff className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                </button>
                <button onClick={() => removeMember(m.id, m.username)} title="Remove from circle"
                  className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Invitations (admin only) */}
      {user?.isAdmin && invitations.length > 0 && (
        <div>
          <h2 className="text-lg font-serif font-semibold text-brown mb-3">Sent Invitations</h2>
          <div className="bg-white rounded-xl border border-warm-gray divide-y divide-warm-gray-light">
            {invitations.map(inv => (
              <div key={inv.id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-brown-lighter" />
                  <div>
                    <span className="text-sm font-medium text-brown">{inv.email}</span>
                    <p className="text-xs text-brown-lighter">
                      Invited by {inv.invitedByUsername} on {formatDate(inv.createdAt)}
                    </p>
                  </div>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full ${inv.used ? 'bg-sage/20 text-sage-dark' : 'bg-warm-gray text-brown-light'}`}>
                  {inv.used ? 'Accepted' : 'Pending'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
