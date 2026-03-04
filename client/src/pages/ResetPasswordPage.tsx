import { useState, useRef, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { PASSWORD_REQUIREMENTS } from '@readingcircle/shared';
import { useTranslation } from 'react-i18next';
import { LanguageToggle } from '@/components/LanguageToggle';

export function ResetPasswordPage() {
  const { t } = useTranslation();
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError(t('auth.passwordsDoNotMatch'));
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Something went wrong' }));
        throw new Error(data.error || 'Something went wrong');
      }
      setSuccess(true);
      timeoutRef.current = setTimeout(() => navigate('/login'), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = 'w-full px-4 py-2.5 rounded-lg border border-warm-gray bg-cream/50 text-brown focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy transition';

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <BookOpen className="w-12 h-12 text-burgundy mx-auto mb-3" />
          <h1 className="text-3xl font-serif font-bold text-burgundy">{t('auth.readingCircle')}</h1>
        </div>

        <div className="bg-white rounded-xl border border-warm-gray p-8 space-y-6">
          <h2 className="text-xl font-serif font-semibold text-brown text-center">{t('auth.reset.setNewPassword')}</h2>

          {success ? (
            <div className="space-y-4">
              <div className="bg-sage/10 border border-sage/30 px-4 py-3 rounded-lg text-sm text-sage-dark text-center">
                {t('auth.reset.successMessage')}
              </div>
              <Link to="/login" className="block text-center text-sm text-burgundy hover:text-burgundy-light">
                {t('auth.reset.goToLogin')}
              </Link>
            </div>
          ) : (
            <>
              <p className="text-xs text-brown-light text-center">{PASSWORD_REQUIREMENTS.description}</p>

              {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm border border-red-200">{error}</div>}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="reset-password" className="block text-sm font-medium text-brown mb-1">{t('auth.reset.newPassword')}</label>
                  <input
                    id="reset-password"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="reset-confirm-password" className="block text-sm font-medium text-brown mb-1">{t('auth.reset.confirmPassword')}</label>
                  <input
                    id="reset-confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    className={inputClass}
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 bg-burgundy hover:bg-burgundy-light text-white rounded-lg transition-colors font-medium disabled:opacity-50"
                >
                  {submitting ? t('auth.reset.resetting') : t('auth.reset.resetPassword')}
                </button>
              </form>

              <Link to="/login" className="block text-center text-sm text-burgundy hover:text-burgundy-light">
                {t('auth.forgot.backToLogin')}
              </Link>
            </>
          )}
        </div>

        <div className="text-center mt-4">
          <LanguageToggle />
        </div>
      </div>
    </div>
  );
}
