import { useLanguage } from '@/contexts/LanguageContext';
import { useLocation } from 'react-router-dom';

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  const location = useLocation();

  // Only show on public funnel pages
  const isPublicPage = location.pathname.startsWith('/listing/');

  if (!isPublicPage) {
    return null;
  }

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'es' : 'en');
  };

  return (
    <button
      onClick={toggleLanguage}
      className="fixed bottom-24 right-6 z-40 w-14 h-14 bg-white border-2 border-purple-500 rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
      aria-label={language === 'en' ? 'Switch to Spanish / Cambiar a Español' : 'Switch to English / Cambiar a Inglés'}
    >
      <span className="text-xl font-bold text-purple-900">
        {language === 'en' ? 'ES' : 'EN'}
      </span>
    </button>
  );
}
