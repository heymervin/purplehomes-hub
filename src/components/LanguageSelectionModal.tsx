import { useState, useEffect } from 'react';
import { useLanguage, Language } from '@/contexts/LanguageContext';
import { Dialog, DialogContent } from '@/components/ui/dialog';

export function LanguageSelectionModal() {
  const { setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Only show on first visit to funnel pages
    const hasPreference = localStorage.getItem('preferred_language');
    const hasSeenModal = sessionStorage.getItem('language_modal_shown');
    const isPublicPage = window.location.pathname.startsWith('/listing/');

    if (!hasPreference && !hasSeenModal && isPublicPage) {
      setIsOpen(true);
      sessionStorage.setItem('language_modal_shown', 'true');
    }
  }, []);

  const handleSelect = (lang: Language) => {
    setLanguage(lang);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="text-center space-y-6 p-6">
          <h2 className="text-2xl font-bold">
            Choose Your Language
            <br />
            <span className="text-purple-600">Elige Tu Idioma</span>
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleSelect('en')}
              className="flex flex-col items-center gap-3 p-6 border-2 border-gray-300 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
              aria-label="Select English"
            >
              <span className="text-4xl" role="img" aria-label="United States flag">
                🇺🇸
              </span>
              <span className="text-lg font-bold">English</span>
            </button>

            <button
              onClick={() => handleSelect('es')}
              className="flex flex-col items-center gap-3 p-6 border-2 border-gray-300 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
              aria-label="Seleccionar Español"
            >
              <span className="text-4xl" role="img" aria-label="Mexico flag">
                🇲🇽
              </span>
              <span className="text-lg font-bold">Español</span>
            </button>
          </div>

          <p className="text-sm text-gray-500">
            You can change this later / Puedes cambiar esto más tarde
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
