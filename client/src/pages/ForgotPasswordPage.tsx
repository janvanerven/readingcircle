import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ArrowLeft, Mail } from 'lucide-react';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Something went wrong');
      }
      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <BookOpen className="w-12 h-12 text-burgundy mx-auto mb-3" />
          <h1 className="text-3xl font-serif font-bold text-burgundy">Reading Circle</h1>
        </div>

        <div className="bg-white rounded-xl border border-warm-gray p-8 space-y-6">
          <h2 className="text-xl font-serif font-semibold text-brown text-center">Reset Password</h2>

          {submitted ? (
            <div className="space-y-4">
              <div className="bg-sage/10 border border-sage/30 px-4 py-3 rounded-lg text-sm text-sage-dark flex items-start gap-2">
                <Mail className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>If an account with that email exists, we've sent a password reset link. Check your inbox.</span>
              </div>
              <Link to="/login" className="block text-center text-sm text-burgundy hover:text-burgundy-light">
                Back to Login
              </Link>
            </div>
          ) : (
            <>
              <p className="text-sm text-brown-light text-center">
                Enter your email address and we'll send you a link to reset your password.
              </p>

              {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm border border-red-200">{error}</div>}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-brown mb-1">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder="your@email.com"
                    className="w-full px-4 py-2.5 rounded-lg border border-warm-gray bg-cream/50 text-brown focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy transition"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 bg-burgundy hover:bg-burgundy-light text-white rounded-lg transition-colors font-medium disabled:opacity-50"
                >
                  {submitting ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>

              <Link to="/login" className="flex items-center gap-1 text-sm text-burgundy hover:text-burgundy-light justify-center">
                <ArrowLeft className="w-4 h-4" /> Back to Login
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
