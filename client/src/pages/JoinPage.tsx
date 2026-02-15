import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { BookOpen } from 'lucide-react';
import { PASSWORD_REQUIREMENTS } from '@readingcircle/shared';

export function JoinPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const [invitation, setInvitation] = useState<{ email: string; invitedByUsername: string } | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function validate() {
      try {
        const data = await api<{ email: string; invitedByUsername: string }>(`/auth/invitation/${token}`);
        setInvitation(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Invalid invitation');
      } finally {
        setLoading(false);
      }
    }
    validate();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSubmitting(true);
    try {
      const data = await api<{ accessToken: string; user: { id: string; username: string; isAdmin: boolean; isTemporary: boolean } }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ token, username, password }),
      });
      updateUser(data.user, data.accessToken);
      navigate('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-brown-light animate-pulse font-serif text-xl">Validating invitation...</div>
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-4">
        <div className="text-center">
          <BookOpen className="w-12 h-12 text-burgundy mx-auto mb-4" />
          <h1 className="text-2xl font-serif font-bold text-burgundy mb-2">Invalid Invitation</h1>
          <p className="text-brown-light">{error || 'This invitation link is invalid or has expired.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-burgundy rounded-full mb-4">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-serif font-bold text-burgundy">Join Reading Circle</h1>
          <p className="text-brown-light mt-2">
            <strong>{invitation.invitedByUsername}</strong> invited you to join
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-warm-gray p-8 space-y-5">
          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm border border-red-200">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-brown mb-1.5">Email</label>
            <input
              type="email"
              value={invitation.email}
              disabled
              className="w-full px-4 py-2.5 rounded-lg border border-warm-gray bg-warm-gray-light text-brown-light"
            />
          </div>

          <div>
            <label htmlFor="username" className="block text-sm font-medium text-brown mb-1.5">
              Choose a Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              autoFocus
              className="w-full px-4 py-2.5 rounded-lg border border-warm-gray bg-cream/50 text-brown focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy transition"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-brown mb-1.5">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-lg border border-warm-gray bg-cream/50 text-brown focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy transition"
            />
            <p className="mt-1.5 text-xs text-brown-light">{PASSWORD_REQUIREMENTS.description}</p>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-brown mb-1.5">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-lg border border-warm-gray bg-cream/50 text-brown focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy transition"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 bg-burgundy hover:bg-burgundy-light text-white font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {submitting ? 'Creating account...' : 'Join the Circle'}
          </button>
        </form>
      </div>
    </div>
  );
}
