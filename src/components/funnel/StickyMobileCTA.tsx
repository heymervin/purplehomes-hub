import * as React from "react";
import { cn } from "@/lib/utils";
import { CTAButton } from "./CTAButton";
import { Phone, MessageCircle, X } from "lucide-react";

interface StickyMobileCTAProps {
  /** Primary CTA text */
  ctaText?: string;
  /** Primary CTA action */
  onCtaClick?: () => void;
  /** Phone number for call button */
  phoneNumber?: string;
  /** Show text/SMS option */
  showTextOption?: boolean;
  /** Price display */
  price?: string;
  /** Monthly payment */
  monthlyPayment?: string;
  /** Variant style */
  variant?: "simple" | "expanded" | "minimal";
  /** Allow dismissing (shows X button) */
  dismissible?: boolean;
  className?: string;
}

const StickyMobileCTA: React.FC<StickyMobileCTAProps> = ({
  ctaText = "Get Pre-Qualified",
  onCtaClick,
  phoneNumber = "(555) 123-4567",
  showTextOption = true,
  price,
  monthlyPayment,
  variant = "simple",
  dismissible = false,
  className,
}) => {
  const [isDismissed, setIsDismissed] = React.useState(false);
  const [isVisible, setIsVisible] = React.useState(false);

  // Show after scrolling down a bit
  React.useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 300);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (isDismissed || !isVisible) return null;

  const cleanPhone = phoneNumber.replace(/\D/g, "");

  if (variant === "minimal") {
    return (
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 md:hidden",
          "transform transition-transform duration-300",
          isVisible ? "translate-y-0" : "translate-y-full",
          className
        )}
      >
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-4 shadow-2xl safe-area-pb">
          <CTAButton
            onClick={onCtaClick}
            variant="white"
            size="full"
            className="text-orange-600"
          >
            {ctaText}
          </CTAButton>
        </div>
      </div>
    );
  }

  if (variant === "expanded") {
    return (
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 md:hidden",
          "transform transition-transform duration-300",
          isVisible ? "translate-y-0" : "translate-y-full",
          className
        )}
      >
        <div className="bg-white border-t border-gray-200 shadow-2xl safe-area-pb">
          {/* Dismiss button */}
          {dismissible && (
            <button
              onClick={() => setIsDismissed(true)}
              className="absolute -top-10 right-4 w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {/* Price bar */}
          {(price || monthlyPayment) && (
            <div className="bg-purple-50 px-4 py-2 flex items-center justify-between border-b border-purple-100">
              {price && (
                <span className="text-lg font-bold text-gray-900">{price}</span>
              )}
              {monthlyPayment && (
                <span className="text-purple-600 font-semibold">
                  {monthlyPayment}/mo
                </span>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="p-4 space-y-3">
            <CTAButton onClick={onCtaClick} size="full">
              {ctaText}
            </CTAButton>

            <div className="grid grid-cols-2 gap-3">
              <a
                href={`tel:${cleanPhone}`}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
              >
                <Phone className="h-5 w-5" />
                Call
              </a>
              {showTextOption && (
                <a
                  href={`sms:${cleanPhone}`}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                >
                  <MessageCircle className="h-5 w-5" />
                  Text
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Simple variant (default)
  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 md:hidden",
        "transform transition-transform duration-300",
        isVisible ? "translate-y-0" : "translate-y-full",
        className
      )}
    >
      <div className="bg-white border-t border-gray-200 shadow-2xl p-4 safe-area-pb">
        <div className="flex items-center gap-3">
          {/* Call button */}
          <a
            href={`tel:${cleanPhone}`}
            className="flex items-center justify-center w-12 h-12 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors flex-shrink-0"
          >
            <Phone className="h-5 w-5" />
          </a>

          {/* Main CTA */}
          <CTAButton onClick={onCtaClick} size="full" className="flex-1">
            {ctaText}
          </CTAButton>

          {/* Text button */}
          {showTextOption && (
            <a
              href={`sms:${cleanPhone}`}
              className="flex items-center justify-center w-12 h-12 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors flex-shrink-0"
            >
              <MessageCircle className="h-5 w-5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

// Floating Action Button
interface FloatingActionButtonProps {
  icon?: "phone" | "message" | "calendar";
  onClick?: () => void;
  href?: string;
  label?: string;
  className?: string;
}

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  icon = "phone",
  onClick,
  href,
  label,
  className,
}) => {
  const icons = {
    phone: Phone,
    message: MessageCircle,
  };

  const Icon = icons[icon as keyof typeof icons] || Phone;

  const buttonContent = (
    <>
      <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center shadow-lg shadow-orange-500/30 group-hover:scale-110 transition-transform">
        <Icon className="h-6 w-6 text-white" />
      </div>
      {label && (
        <span className="absolute right-full mr-3 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
          {label}
        </span>
      )}
    </>
  );

  const baseClasses = cn(
    "fixed bottom-6 right-6 z-50 group",
    "hidden md:flex items-center",
    className
  );

  if (href) {
    return (
      <a href={href} className={baseClasses}>
        {buttonContent}
      </a>
    );
  }

  return (
    <button onClick={onClick} className={baseClasses}>
      {buttonContent}
    </button>
  );
};

export { StickyMobileCTA, FloatingActionButton };
