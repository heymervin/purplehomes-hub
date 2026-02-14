import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { CTAButton } from '@/components/funnel/CTAButton';
import { useCreateContact } from '@/services/ghlApi';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Home, CheckCircle, Loader2 } from 'lucide-react';

interface ExitIntentModalProps {
  open: boolean;
  onClose: () => void;
  onSubmitted: () => void;
  isDarkMode: boolean;
  propertyCount?: number;
}

export function ExitIntentModal({
  open,
  onClose,
  onSubmitted,
  isDarkMode,
  propertyCount,
}: ExitIntentModalProps) {
  const [form, setForm] = useState({ firstName: '', email: '', phone: '' });
  const [isSuccess, setIsSuccess] = useState(false);
  const createContact = useCreateContact();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createContact.mutateAsync({
        firstName: form.firstName,
        email: form.email,
        phone: form.phone,
        tags: ['Exit Intent Lead', 'Listings Browser', 'Website Lead'],
        customFields: [
          {
            id: 'wAnKlytGK8s8dmL1vBkV',
            value: 'Captured via exit intent popup on listings page',
          },
        ],
      });
      setIsSuccess(true);
      setTimeout(() => {
        onSubmitted();
        // Reset for next potential use
        setIsSuccess(false);
        setForm({ firstName: '', email: '', phone: '' });
      }, 2000);
    } catch {
      toast.error('Something went wrong. Please try again.');
    }
  };

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <DialogContent
        className={cn(
          'max-w-md p-0 overflow-hidden gap-0 border-0',
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
              You're All Set!
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              We'll send you the best listings. Keep an eye on your inbox!
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
                Wait — Don't Miss Out!
              </h2>
              <p className="text-purple-100 text-sm leading-relaxed">
                Get personalized listings sent straight to your inbox.
                <br />
                New properties added weekly.
              </p>
              {propertyCount && propertyCount > 0 && (
                <p className="text-purple-200/80 text-xs mt-3">
                  {propertyCount.toLocaleString()} properties currently
                  available
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
              <Input
                placeholder="First Name"
                value={form.firstName}
                onChange={(e) => handleChange('firstName', e.target.value)}
                required
                className={cn(
                  'h-11',
                  isDarkMode
                    ? 'bg-gray-800 border-gray-700 text-white placeholder:text-gray-400'
                    : 'bg-gray-50 border-gray-200'
                )}
              />
              <Input
                type="email"
                placeholder="Email Address"
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                required
                className={cn(
                  'h-11',
                  isDarkMode
                    ? 'bg-gray-800 border-gray-700 text-white placeholder:text-gray-400'
                    : 'bg-gray-50 border-gray-200'
                )}
              />
              <Input
                type="tel"
                placeholder="Phone Number"
                value={form.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                required
                className={cn(
                  'h-11',
                  isDarkMode
                    ? 'bg-gray-800 border-gray-700 text-white placeholder:text-gray-400'
                    : 'bg-gray-50 border-gray-200'
                )}
              />

              <CTAButton
                type="submit"
                variant="primary"
                size="full"
                icon="sparkle"
                disabled={createContact.isPending}
                className="mt-2"
              >
                {createContact.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  'Send Me Listings'
                )}
              </CTAButton>

              <p
                className={cn(
                  'text-center text-xs pt-1',
                  isDarkMode ? 'text-gray-500' : 'text-gray-400'
                )}
              >
                No spam, ever. Unsubscribe anytime.
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
                No thanks, I'll keep browsing
              </button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
