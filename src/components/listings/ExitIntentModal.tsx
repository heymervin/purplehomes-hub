import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CTAButton } from '@/components/funnel/CTAButton';
import { useCreateContact } from '@/services/ghlApi';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Home, CheckCircle, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface ExitIntentModalProps {
  open: boolean;
  onClose: () => void;
  onSubmitted: () => void;
  isDarkMode: boolean;
  propertyCount?: number;
  propertyAddress?: string;
  source?: 'listings' | 'property-detail';
}

export function ExitIntentModal({
  open,
  onClose,
  onSubmitted,
  isDarkMode,
  propertyCount,
  propertyAddress,
  source = 'listings',
}: ExitIntentModalProps) {
  const { t } = useLanguage();
  const [form, setForm] = useState({ firstName: '', email: '', phone: '', whatLooking: '' });
  const [isSuccess, setIsSuccess] = useState(false);
  const createContact = useCreateContact();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const noteValue = source === 'property-detail'
        ? [
            propertyAddress ? `Exit intent on property: ${propertyAddress}` : 'Exit intent on property detail page',
            form.whatLooking ? `Looking for: ${form.whatLooking}` : '',
          ].filter(Boolean).join(' | ')
        : 'Exit intent on listings page';

      await createContact.mutateAsync({
        firstName: form.firstName,
        email: form.email || undefined,
        phone: form.phone,
        tags: [
          'propertypro',
          source === 'property-detail' ? 'lead-exitintent' : 'lead-map',
          ...(source === 'property-detail' && propertyAddress
            ? [`Property: ${propertyAddress}`]
            : []),
        ],
        customFields: [
          { id: 'wAnKlytGK8s8dmL1vBkV', value: noteValue },
          ...(propertyAddress
            ? [{ id: 'UcJ0Qoz3kh0OjC9oLVsK', value: propertyAddress }]
            : []),
        ],
      });
      setIsSuccess(true);
      setTimeout(() => {
        onSubmitted();
        setIsSuccess(false);
        setForm({ firstName: '', email: '', phone: '', whatLooking: '' });
      }, 2000);
    } catch {
      toast.error(t('form.errorMessage'));
    }
  };

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const inputClass = cn(
    'h-11',
    isDarkMode
      ? 'bg-gray-800 border-gray-700 text-white placeholder:text-gray-400'
      : 'bg-gray-50 border-gray-200'
  );

  const isPropertyDetail = source === 'property-detail';

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <DialogContent
        className={cn(
          'max-w-md w-[calc(100vw-2rem)] p-0 gap-0 border-0 max-h-[90vh] overflow-y-auto',
          isDarkMode ? 'bg-gray-900' : 'bg-white'
        )}
      >
        {isSuccess ? (
          /* Success State */
          <div className="p-10 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {t('exitIntent.successTitle')}
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              {t('exitIntent.successMessage')}
            </p>
          </div>
        ) : (
          <>
            {/* Purple Gradient Header */}
            <div className="bg-gradient-to-br from-purple-600 via-purple-700 to-purple-900 p-8 text-center text-white">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4">
                <Home className="h-7 w-7" />
              </div>
              <h2 className="text-2xl font-bold mb-2">
                {isPropertyDetail
                  ? t('exitIntent.headingProperty')
                  : t('exitIntent.headingListings')}
              </h2>
              <p className="text-purple-100 text-sm leading-relaxed">
                {isPropertyDetail ? (
                  <>
                    {t('exitIntent.subtitleProperty')}
                    <br /><br />
                    {t('exitIntent.subtitlePropertyLine2')}
                  </>
                ) : (
                  <>{t('exitIntent.subtitleListings')}<br />{t('exitIntent.subtitleListingsLine2')}</>
                )}
              </p>
              {!isPropertyDetail && propertyCount && propertyCount > 0 && (
                <p className="text-purple-200/80 text-xs mt-3">
                  {propertyCount.toLocaleString()} {t('exitIntent.propertiesAvailable')}
                </p>
              )}
            </div>

            {/* Form */}
            <form
              onSubmit={handleSubmit}
              className={cn(
                'p-6 space-y-3',
                isDarkMode ? 'bg-gray-900' : 'bg-white'
              )}
            >
              {isPropertyDetail ? (
                /* Property-detail variant: First Name*, Phone*, Email (optional), What looking for (optional) */
                <>
                  <Input
                    placeholder={`${t('form.firstName')} *`}
                    value={form.firstName}
                    onChange={(e) => handleChange('firstName', e.target.value)}
                    required
                    className={inputClass}
                  />
                  <Input
                    type="tel"
                    placeholder={`${t('form.phone')} *`}
                    value={form.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    required
                    className={inputClass}
                  />
                  <Input
                    type="email"
                    placeholder={t('form.emailOptional')}
                    value={form.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className={inputClass}
                  />
                  <Textarea
                    placeholder={t('exitIntent.whatLookingPlaceholder')}
                    value={form.whatLooking}
                    onChange={(e) => handleChange('whatLooking', e.target.value)}
                    rows={3}
                    className={cn(
                      'resize-none',
                      isDarkMode
                        ? 'bg-gray-800 border-gray-700 text-white placeholder:text-gray-400'
                        : 'bg-gray-50 border-gray-200'
                    )}
                  />
                </>
              ) : (
                /* Listings variant: First Name*, Email*, Phone* */
                <>
                  <Input
                    placeholder={t('form.firstName')}
                    value={form.firstName}
                    onChange={(e) => handleChange('firstName', e.target.value)}
                    required
                    className={inputClass}
                  />
                  <Input
                    type="email"
                    placeholder={t('form.emailAddress')}
                    value={form.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    required
                    className={inputClass}
                  />
                  <Input
                    type="tel"
                    placeholder={t('form.phone')}
                    value={form.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    required
                    className={inputClass}
                  />
                </>
              )}

              <CTAButton
                type="submit"
                variant="primary"
                size="full"
                icon={isPropertyDetail ? undefined : 'sparkle'}
                disabled={createContact.isPending}
                className="mt-2"
              >
                {createContact.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : isPropertyDetail ? (
                  t('exitIntent.sendMatchingHomes')
                ) : (
                  t('cta.sendListings')
                )}
              </CTAButton>

              <p
                className={cn(
                  'text-center text-xs pt-1',
                  isDarkMode ? 'text-gray-500' : 'text-gray-400'
                )}
              >
                {t('exitIntent.noSpam')}
              </p>

              <button
                type="button"
                onClick={onClose}
                className={cn(
                  'w-full text-center text-xs pt-1 transition-colors',
                  isDarkMode
                    ? 'text-gray-500 hover:text-gray-300'
                    : 'text-gray-400 hover:text-gray-600'
                )}
              >
                {t('exitIntent.noThanks')}
              </button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
