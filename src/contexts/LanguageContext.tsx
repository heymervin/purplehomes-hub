import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { en } from '@/locales/en';
import { es } from '@/locales/es';

export type Language = 'en' | 'es';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations = { en, es };

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    // Check localStorage first
    const stored = localStorage.getItem('preferred_language') as Language;
    if (stored === 'en' || stored === 'es') return stored;

    // Fallback to browser language detection
    const browserLang = navigator.language.toLowerCase();
    return browserLang.startsWith('es') ? 'es' : 'en';
  });

  useEffect(() => {
    // Update localStorage when language changes
    localStorage.setItem('preferred_language', language);

    // Update HTML lang attribute for accessibility
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: string, fallback?: string): string => {
    const keys = key.split('.');
    let value: any = translations[language];

    for (const k of keys) {
      value = value?.[k];
      if (!value) break;
    }

    return value || fallback || key;
  };

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
