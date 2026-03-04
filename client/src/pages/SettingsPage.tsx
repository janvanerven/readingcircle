import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { Settings, User, Lock, Globe } from 'lucide-react';
import { PASSWORD_REQUIREMENTS, USERNAME_REQUIREMENTS } from '@readingcircle/shared';

export function SettingsPage() {
  const { user, updateUser } = useAuth();
  const { t, i18n } = useTranslation();

  // Username change
  const [newUsername, setNewUsername] = useState('');
  const [usernamePassword, setUsernamePassword] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [usernameSuccess, setUsernameSuccess] = useState('');
  const [usernameSubmitting, setUsernameSubmitting] = useState(false);

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  // Language
  const [languageSaving, setLanguageSaving] = useState(false);

  const handleUsernameChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setUsernameError('');
    setUsernameSuccess('');

    const trimmed = newUsername.trim();

    if (trimmed.toLowerCase() === user?.username.toLowerCase()) {
      setUsernameError(t('settings.usernameSameAsCurrent'));
      return;
    }

    if (!USERNAME_REQUIREMENTS.pattern.test(trimmed)) {
      setUsernameError(t('settings.usernameInvalid'));
      return;
    }

    setUsernameSubmitting(true);
    try {
      const data = await api<{ accessToken: string; user: { id: string; username: string; isAdmin: boolean; isTemporary: boolean; locale: string } }>('/auth/username', {
        method: 'PATCH',
        body: JSON.stringify({ newUsername: trimmed, currentPassword: usernamePassword }),
      });
      updateUser(data.user, data.accessToken);
      setUsernameSuccess(t('settings.usernameUpdated'));
      setNewUsername('');
      setUsernamePassword('');
    } catch (err: unknown) {
      setUsernameError(err instanceof Error ? err.message : 'Failed to update username');
    } finally {
      setUsernameSubmitting(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword !== confirmPassword) {
      setPasswordError(t('auth.passwordsDoNotMatch'));
      return;
    }

    setPasswordSubmitting(true);
    try {
      await api('/auth/password', {
        method: 'PATCH',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setPasswordSuccess(t('settings.passwordUpdated'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setPasswordSubmitting(false);
    }
  };

  const handleLanguageChange = async (newLocale: string) => {
    setLanguageSaving(true);
    try {
      await api('/auth/locale', {
        method: 'PATCH',
        body: JSON.stringify({ locale: newLocale }),
      });
      i18n.changeLanguage(newLocale);
      localStorage.setItem('locale', newLocale);
    } catch {
      // ignore
    } finally {
      setLanguageSaving(false);
    }
  };

  const inputClass = 'w-full px-4 py-2.5 rounded-lg border border-warm-gray bg-cream/50 text-brown focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy transition';

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-serif font-bold text-burgundy flex items-center gap-3">
        <Settings className="w-8 h-8" />
        {t('settings.title')}
      </h1>

      {/* Change Username */}
      <div className="bg-white rounded-xl border border-warm-gray p-6 space-y-4">
        <h2 className="font-serif font-semibold text-brown text-lg flex items-center gap-2">
          <User className="w-5 h-5 text-burgundy" />
          {t('settings.changeUsername')}
        </h2>
        <p className="text-sm text-brown-light">{t('settings.currentUsername')} <strong className="text-brown">{user?.username}</strong></p>
        <p className="text-xs text-brown-light">{t('settings.usernameInvalid')}</p>

        {usernameError && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm border border-red-200">{usernameError}</div>}
        {usernameSuccess && <div className="bg-sage/10 text-sage-dark px-4 py-3 rounded-lg text-sm border border-sage/30">{usernameSuccess}</div>}

        <form onSubmit={handleUsernameChange} className="space-y-3">
          <div>
            <label htmlFor="settings-new-username" className="block text-sm font-medium text-brown mb-1">{t('settings.newUsername')}</label>
            <input
              id="settings-new-username"
              type="text"
              value={newUsername}
              onChange={e => setNewUsername(e.target.value)}
              required
              minLength={2}
              maxLength={30}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="settings-username-password" className="block text-sm font-medium text-brown mb-1">{t('settings.currentPassword')}</label>
            <input
              id="settings-username-password"
              type="password"
              value={usernamePassword}
              onChange={e => setUsernamePassword(e.target.value)}
              required
              className={inputClass}
            />
          </div>
          <button
            type="submit"
            disabled={usernameSubmitting}
            className="px-4 py-2 bg-burgundy hover:bg-burgundy-light text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
          >
            {usernameSubmitting ? t('settings.updating') : t('settings.updateUsername')}
          </button>
        </form>
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-xl border border-warm-gray p-6 space-y-4">
        <h2 className="font-serif font-semibold text-brown text-lg flex items-center gap-2">
          <Lock className="w-5 h-5 text-burgundy" />
          {t('settings.changePassword')}
        </h2>
        <p className="text-xs text-brown-light">{PASSWORD_REQUIREMENTS.description}</p>

        {passwordError && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm border border-red-200">{passwordError}</div>}
        {passwordSuccess && <div className="bg-sage/10 text-sage-dark px-4 py-3 rounded-lg text-sm border border-sage/30">{passwordSuccess}</div>}

        <form onSubmit={handlePasswordChange} className="space-y-3">
          <div>
            <label htmlFor="settings-current-password" className="block text-sm font-medium text-brown mb-1">{t('settings.currentPassword')}</label>
            <input
              id="settings-current-password"
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              required
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="settings-new-password" className="block text-sm font-medium text-brown mb-1">{t('settings.newPassword')}</label>
            <input
              id="settings-new-password"
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
              minLength={8}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="settings-confirm-password" className="block text-sm font-medium text-brown mb-1">{t('settings.confirmNewPassword')}</label>
            <input
              id="settings-confirm-password"
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
            disabled={passwordSubmitting}
            className="px-4 py-2 bg-burgundy hover:bg-burgundy-light text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
          >
            {passwordSubmitting ? t('settings.updating') : t('settings.updatePassword')}
          </button>
        </form>
      </div>

      {/* Language */}
      <div className="bg-white rounded-xl border border-warm-gray p-6 space-y-4">
        <h2 className="font-serif font-semibold text-brown text-lg flex items-center gap-2">
          <Globe className="w-5 h-5 text-burgundy" />
          {t('settings.language')}
        </h2>
        <div>
          <label htmlFor="settings-language" className="block text-sm font-medium text-brown mb-1">{t('settings.languageLabel')}</label>
          <select
            id="settings-language"
            value={i18n.language}
            onChange={e => handleLanguageChange(e.target.value)}
            disabled={languageSaving}
            className={inputClass}
          >
            <option value="en">{t('settings.english')}</option>
            <option value="nl">{t('settings.dutch')}</option>
          </select>
        </div>
      </div>
    </div>
  );
}
