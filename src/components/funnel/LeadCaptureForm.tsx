import * as React from "react";
import { cn } from "@/lib/utils";
import { CTAButton } from "./CTAButton";
import { TrustIndicators } from "./TrustBadge";
import { Loader2, CheckCircle, ArrowRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface LeadCaptureFormProps {
  title?: string;
  subtitle?: string;
  ctaText?: string;
  /** Fields to show */
  fields?: Array<"firstName" | "lastName" | "phone" | "email" | "budget" | "message">;
  /** Form submission handler */
  onSubmit?: (data: Record<string, string>) => Promise<void>;
  /** Show trust indicators */
  showTrust?: boolean;
  /** Variant style */
  variant?: "default" | "inline" | "floating" | "dark";
  /** Property context */
  propertyAddress?: string;
  className?: string;
}

const LeadCaptureForm: React.FC<LeadCaptureFormProps> = ({
  title,
  subtitle,
  ctaText,
  fields = ["firstName", "phone", "email"],
  onSubmit,
  showTrust = true,
  variant = "default",
  propertyAddress,
  className,
}) => {
  const { t } = useLanguage();
  const [formData, setFormData] = React.useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const resolvedTitle = title ?? t('cta.getPreQualifiedToday');
  const resolvedSubtitle = subtitle ?? t('cta.seeIfQualify');
  const resolvedCtaText = ctaText ?? t('cta.checkEligibility');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (onSubmit) {
        await onSubmit(formData);
      }
      setIsSuccess(true);
    } catch (err) {
      setError(t('form.errorMessage'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldComponents: Record<string, React.ReactNode> = {
    firstName: (
      <div key="firstName">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          {t('form.firstName')} *
        </label>
        <input
          type="text"
          name="firstName"
          required
          value={formData.firstName || ""}
          onChange={handleChange}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 outline-none transition-all"
          placeholder={t('form.placeholderFirstName')}
        />
      </div>
    ),
    lastName: (
      <div key="lastName">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          {t('form.lastName')}
        </label>
        <input
          type="text"
          name="lastName"
          value={formData.lastName || ""}
          onChange={handleChange}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 outline-none transition-all"
          placeholder={t('form.placeholderLastName')}
        />
      </div>
    ),
    phone: (
      <div key="phone">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          {t('form.phone')} *
        </label>
        <input
          type="tel"
          name="phone"
          required
          value={formData.phone || ""}
          onChange={handleChange}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 outline-none transition-all"
          placeholder={t('form.placeholderPhone')}
        />
      </div>
    ),
    email: (
      <div key="email">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          {t('form.emailAddress')} *
        </label>
        <input
          type="email"
          name="email"
          required
          value={formData.email || ""}
          onChange={handleChange}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 outline-none transition-all"
          placeholder={t('form.placeholderEmail')}
        />
      </div>
    ),
    budget: (
      <div key="budget">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          {t('form.monthlyBudget')}
        </label>
        <select
          name="budget"
          value={formData.budget || ""}
          onChange={handleChange}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 outline-none transition-all bg-white"
        >
          <option value="">{t('form.selectRange')}</option>
          <option value="under-1000">{t('form.budgetUnder1000')}</option>
          <option value="1000-1500">{t('form.budget1000to1500')}</option>
          <option value="1500-2000">{t('form.budget1500to2000')}</option>
          <option value="2000-2500">{t('form.budget2000to2500')}</option>
          <option value="over-2500">{t('form.budgetOver2500')}</option>
        </select>
      </div>
    ),
    message: (
      <div key="message">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          {t('form.messageOptional')}
        </label>
        <textarea
          name="message"
          rows={3}
          value={formData.message || ""}
          onChange={handleChange}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 outline-none transition-all resize-none"
          placeholder={t('form.tellUsAbout')}
        />
      </div>
    ),
  };

  if (isSuccess) {
    return (
      <div
        className={cn(
          "text-center py-12",
          variant === "default" && "bg-white rounded-2xl p-8 shadow-xl",
          variant === "dark" && "bg-gray-800 rounded-2xl p-8",
          className
        )}
      >
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="h-10 w-10 text-green-500" />
        </div>
        <h3
          className={cn(
            "text-2xl font-bold mb-2",
            variant === "dark" ? "text-white" : "text-gray-900"
          )}
        >
          {t('form.successTitle')}
        </h3>
        <p className={variant === "dark" ? "text-gray-300" : "text-gray-600"}>
          {t('form.successMessage')}
        </p>
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <form
        onSubmit={handleSubmit}
        className={cn("flex flex-col md:flex-row gap-3", className)}
      >
        <input
          type="text"
          name="firstName"
          required
          value={formData.firstName || ""}
          onChange={handleChange}
          className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 outline-none"
          placeholder={t('form.firstName')}
        />
        <input
          type="tel"
          name="phone"
          required
          value={formData.phone || ""}
          onChange={handleChange}
          className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 outline-none"
          placeholder={t('form.phone')}
        />
        <CTAButton type="submit" disabled={isSubmitting} className="md:w-auto">
          {isSubmitting ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            resolvedCtaText
          )}
        </CTAButton>
      </form>
    );
  }

  if (variant === "floating") {
    return (
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-2xl p-4 z-50 md:hidden",
          className
        )}
      >
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="tel"
            name="phone"
            required
            value={formData.phone || ""}
            onChange={handleChange}
            className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 outline-none"
            placeholder={t('form.yourPhoneNumber')}
          />
          <CTAButton type="submit" disabled={isSubmitting} size="md">
            {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />}
          </CTAButton>
        </form>
        {showTrust && (
          <p className="text-xs text-center text-gray-500 mt-2">
            {t('trustIndicators.yourInfoSecure')}
          </p>
        )}
      </div>
    );
  }

  if (variant === "dark") {
    return (
      <div
        className={cn(
          "bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 shadow-xl",
          className
        )}
      >
        <div className="text-center mb-8">
          <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">
            {resolvedTitle}
          </h3>
          {resolvedSubtitle && <p className="text-gray-400">{resolvedSubtitle}</p>}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map((field) => (
            <div key={field}>
              {React.cloneElement(fieldComponents[field] as React.ReactElement, {
                className: "w-full px-4 py-3 bg-white/10 border-2 border-white/20 rounded-xl text-white placeholder-gray-400 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 outline-none transition-all",
              })}
            </div>
          ))}

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <CTAButton type="submit" disabled={isSubmitting} size="full">
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                {t('common.processing')}
              </>
            ) : (
              resolvedCtaText
            )}
          </CTAButton>

          {showTrust && (
            <TrustIndicators
              className="justify-center text-gray-400"
              items={[t('trustIndicators.secureEncrypted'), t('trustIndicators.noSpam'), t('trustIndicators.freeConsultation')]}
            />
          )}
        </form>
      </div>
    );
  }

  // Default variant
  return (
    <div
      className={cn(
        "bg-white rounded-2xl p-8 shadow-xl border border-gray-100",
        className
      )}
    >
      <div className="text-center mb-8">
        <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
          {resolvedTitle}
        </h3>
        {resolvedSubtitle && <p className="text-gray-500">{resolvedSubtitle}</p>}
        {propertyAddress && (
          <p className="text-purple-600 font-medium mt-2">
            {t('form.forProperty')} {propertyAddress}
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {fields.map((field) => fieldComponents[field])}

        {error && (
          <p className="text-red-500 text-sm">{error}</p>
        )}

        <CTAButton type="submit" disabled={isSubmitting} size="full">
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              {t('common.processing')}
            </>
          ) : (
            resolvedCtaText
          )}
        </CTAButton>

        {showTrust && (
          <TrustIndicators className="justify-center" />
        )}
      </form>
    </div>
  );
};

// Quick Contact Bar
interface QuickContactBarProps {
  phoneNumber?: string;
  ctaText?: string;
  onCtaClick?: () => void;
  className?: string;
}

const QuickContactBar: React.FC<QuickContactBarProps> = ({
  phoneNumber = "(555) 123-4567",
  ctaText,
  onCtaClick,
  className,
}) => {
  const { t } = useLanguage();
  const resolvedCtaText = ctaText ?? t('cta.getPreQualified');

  return (
    <div
      className={cn(
        "bg-gradient-to-r from-purple-600 to-purple-700 py-4",
        className
      )}
    >
      <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-white text-center sm:text-left">
          <span className="opacity-80">{t('cta.questionsCallUs')} </span>
          <a href={`tel:${phoneNumber.replace(/\D/g, "")}`} className="font-bold hover:underline">
            {phoneNumber}
          </a>
        </div>
        <CTAButton onClick={onCtaClick} size="sm">
          {resolvedCtaText}
        </CTAButton>
      </div>
    </div>
  );
};

export { LeadCaptureForm, QuickContactBar };
