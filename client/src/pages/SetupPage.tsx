import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { BookOpen } from 'lucide-react';
import { PASSWORD_REQUIREMENTS } from '@readingcircle/shared';

export function SetupPage() {
  const { user, updateUser } = useAuth();
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const data = await api<{ accessToken: string; user: typeof user }>('/auth/setup', {
        method: 'POST',
        body: JSON.stringify({ username, password, email }),
      });
      updateUser(data.user!, data.accessToken);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Setup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-burgundy rounded-full mb-4">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-serif font-bold text-burgundy">Complete Your Setup</h1>
          <p className="text-brown-light mt-2">Please update your account details to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-warm-gray p-8 space-y-5">
          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm border border-red-200">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="username" className="block text-sm font-medium text-brown mb-1.5">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-lg border border-warm-gray bg-cream/50 text-brown focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy transition"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-brown mb-1.5">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-lg border border-warm-gray bg-cream/50 text-brown focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy transition"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-brown mb-1.5">
              New Password
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
            disabled={loading}
            className="w-full py-2.5 bg-burgundy hover:bg-burgundy-light text-white font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Complete Setup'}
          </button>
        </form>
      </div>
    </div>
  );
}
