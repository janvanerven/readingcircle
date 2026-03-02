import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

export function LanguageToggle() {
  const { i18n } = useTranslation();

  const toggle = () => {
    const next = i18n.language === 'nl' ? 'en' : 'nl';
    i18n.changeLanguage(next);
    localStorage.setItem('locale', next);
  };

  return (
    <button
      onClick={toggle}
      className="inline-flex items-center gap-1.5 text-xs text-brown-light hover:text-burgundy transition-colors"
      title={i18n.language === 'nl' ? 'Switch to English' : 'Schakel naar Nederlands'}
    >
      <Globe className="w-3.5 h-3.5" />
      {i18n.language === 'nl' ? 'English' : 'Nederlands'}
    </button>
  );
}
