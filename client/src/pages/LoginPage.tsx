import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { BookOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LanguageToggle } from '@/components/LanguageToggle';

export function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
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
          <h1 className="text-3xl font-serif font-bold text-burgundy">{t('auth.readingCircle')}</h1>
          <p className="text-brown-light mt-2">{t('auth.welcomeBack')}</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-warm-gray p-8 space-y-5">
          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm border border-red-200">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="username" className="block text-sm font-medium text-brown mb-1.5">
              {t('auth.username')}
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              autoFocus
              className="w-full px-4 py-2.5 rounded-lg border border-warm-gray bg-cream/50 text-brown placeholder:text-brown-lighter focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy transition"
              placeholder={t('auth.enterUsername')}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-brown mb-1.5">
              {t('auth.password')}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-lg border border-warm-gray bg-cream/50 text-brown placeholder:text-brown-lighter focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy transition"
              placeholder={t('auth.enterPassword')}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-burgundy hover:bg-burgundy-light text-white font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? t('auth.signingIn') : t('auth.signIn')}
          </button>

          <div className="text-center">
            <Link to="/forgot-password" className="text-sm text-burgundy hover:text-burgundy-light">
              {t('auth.forgotPassword')}
            </Link>
          </div>
        </form>

        <div className="text-center mt-4">
          <LanguageToggle />
        </div>
      </div>
    </div>
  );
}
