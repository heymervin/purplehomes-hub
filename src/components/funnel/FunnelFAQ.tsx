import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, HelpCircle, MessageCircle } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

interface FunnelFAQProps {
  title?: string;
  subtitle?: string;
  items: FAQItem[];
  className?: string;
  variant?: "default" | "cards" | "minimal" | "boxed" | "premium";
  defaultOpenIndex?: number;
}

const defaultFAQs: FAQItem[] = [
  {
    question: "What credit score do I need?",
    answer: "Unlike traditional lenders, we work with all credit situations. While a higher score may get better terms, we've helped families with scores as low as 500 achieve homeownership.",
  },
  {
    question: "How is rent-to-own different from renting?",
    answer: "With rent-to-own, a portion of your monthly payment goes toward your future down payment. You're building equity from day one, and you have the option to purchase the home at a locked-in price.",
  },
  {
    question: "What if I decide not to buy the home?",
    answer: "Our program is designed to help you succeed, but we understand circumstances change. If you decide not to purchase, you can walk away at the end of your lease term with no obligation.",
  },
  {
    question: "How much do I need upfront?",
    answer: "Our move-in costs are typically 3-5% of the home price, much less than a traditional 20% down payment. This includes your option fee which goes toward your purchase.",
  },
];

const FunnelFAQ: React.FC<FunnelFAQProps> = ({
  title = "Frequently Asked Questions",
  subtitle = "Get answers to common questions about our rent-to-own program",
  items = defaultFAQs,
  className,
  variant = "default",
  defaultOpenIndex,
}) => {
  const [openIndex, setOpenIndex] = React.useState<number | null>(
    defaultOpenIndex ?? null
  );

  const toggleItem = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  if (variant === "cards") {
    return (
      <div className={className}>
        {title && (
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              {title}
            </h2>
            {subtitle && <p className="text-gray-500">{subtitle}</p>}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          {items.map((item, index) => (
            <div
              key={index}
              className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden"
            >
              <button
                onClick={() => toggleItem(index)}
                className="w-full p-6 text-left flex items-start gap-4 hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <HelpCircle className="h-5 w-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 pr-8">{item.question}</h3>
                </div>
                <ChevronDown
                  className={cn(
                    "h-5 w-5 text-gray-400 transition-transform flex-shrink-0",
                    openIndex === index && "rotate-180"
                  )}
                />
              </button>
              <div
                className={cn(
                  "overflow-hidden transition-all duration-300",
                  openIndex === index ? "max-h-96" : "max-h-0"
                )}
              >
                <div className="px-6 pb-6 pl-20">
                  <p className="text-gray-600 leading-relaxed">{item.answer}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === "minimal") {
    return (
      <div className={className}>
        {title && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          </div>
        )}

        <div className="divide-y divide-gray-200">
          {items.map((item, index) => (
            <div key={index} className="py-4">
              <button
                onClick={() => toggleItem(index)}
                className="w-full text-left flex items-center justify-between gap-4"
              >
                <span className="font-medium text-gray-900">{item.question}</span>
                <ChevronDown
                  className={cn(
                    "h-5 w-5 text-gray-400 transition-transform flex-shrink-0",
                    openIndex === index && "rotate-180"
                  )}
                />
              </button>
              <div
                className={cn(
                  "overflow-hidden transition-all duration-300",
                  openIndex === index ? "max-h-96 mt-3" : "max-h-0"
                )}
              >
                <p className="text-gray-600 text-sm leading-relaxed">
                  {item.answer}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === "boxed") {
    return (
      <div
        className={cn(
          "bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 md:p-12",
          className
        )}
      >
        {title && (
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
              {title}
            </h2>
            {subtitle && <p className="text-gray-400">{subtitle}</p>}
          </div>
        )}

        <div className="max-w-3xl mx-auto space-y-3">
          {items.map((item, index) => (
            <div
              key={index}
              className="bg-white/10 backdrop-blur rounded-xl overflow-hidden"
            >
              <button
                onClick={() => toggleItem(index)}
                className="w-full p-5 text-left flex items-center justify-between gap-4 hover:bg-white/5 transition-colors"
              >
                <span className="font-semibold text-white">{item.question}</span>
                <ChevronDown
                  className={cn(
                    "h-5 w-5 text-purple-400 transition-transform flex-shrink-0",
                    openIndex === index && "rotate-180"
                  )}
                />
              </button>
              <div
                className={cn(
                  "overflow-hidden transition-all duration-300",
                  openIndex === index ? "max-h-96" : "max-h-0"
                )}
              >
                <div className="px-5 pb-5">
                  <p className="text-gray-300 leading-relaxed">{item.answer}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Premium dark variant - matches Purple Homes funnel theme
  if (variant === "premium") {
    return (
      <div className={cn("relative", className)}>
        {/* Ambient glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-purple-600/10 rounded-full blur-[150px] pointer-events-none" />

        {/* Staggered animation styles */}
        <style>{`
          @keyframes faq-fade-up {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .faq-item-animate {
            opacity: 0;
            animation: faq-fade-up 0.5s ease-out forwards;
          }
        `}</style>

        <div className="relative z-10">
          {title && (
            <div className="text-center mb-8 md:mb-10">
              <span className="inline-block px-4 md:px-5 py-2 bg-purple-500/20 border border-purple-500/30 rounded-full text-purple-300 text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] mb-5 md:mb-6">
                FAQ
              </span>
              <h2 className="text-2xl md:text-4xl text-white mb-3">
                <span className="font-light">Got</span>{' '}
                <span className="font-bold bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent pr-1">Questions?</span>
              </h2>
              {subtitle && <p className="text-gray-400 text-sm md:text-base max-w-xl mx-auto px-4">{subtitle}</p>}
            </div>
          )}

          <div className="max-w-3xl mx-auto space-y-2 md:space-y-3">
            {items.map((item, index) => (
              <div
                key={index}
                className={cn(
                  "faq-item-animate rounded-xl overflow-hidden transition-all duration-300 border",
                  openIndex === index
                    ? "bg-gradient-to-br from-purple-500/20 to-violet-500/10 border-purple-500/40 shadow-[0_0_30px_rgba(139,92,246,0.15)]"
                    : "bg-white/5 border-white/10 hover:border-purple-500/30 hover:bg-white/[0.07]"
                )}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <button
                  onClick={() => toggleItem(index)}
                  className="w-full p-4 md:p-5 text-left flex items-center justify-between gap-3 md:gap-4 transition-colors"
                >
                  <span
                    className={cn(
                      "font-semibold text-sm md:text-base transition-colors",
                      openIndex === index ? "text-purple-300" : "text-white"
                    )}
                  >
                    {item.question}
                  </span>
                  <div className={cn(
                    "w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300",
                    openIndex === index
                      ? "bg-purple-500/30 rotate-180"
                      : "bg-white/10"
                  )}>
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 md:h-4 md:w-4 transition-colors",
                        openIndex === index ? "text-purple-300" : "text-gray-400"
                      )}
                    />
                  </div>
                </button>
                <div
                  className={cn(
                    "grid transition-all duration-300 ease-out",
                    openIndex === index ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  )}
                >
                  <div className="overflow-hidden">
                    <div className="px-4 md:px-5 pb-4 md:pb-5">
                      <p className="text-gray-300 text-sm md:text-base leading-relaxed">{item.answer}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <div className={className}>
      {title && (
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            {title}
          </h2>
          {subtitle && <p className="text-gray-500">{subtitle}</p>}
        </div>
      )}

      <div className="max-w-3xl mx-auto space-y-3">
        {items.map((item, index) => (
          <div
            key={index}
            className={cn(
              "border rounded-xl overflow-hidden transition-all",
              openIndex === index
                ? "border-purple-300 bg-purple-50/50 shadow-md"
                : "border-gray-200 bg-white"
            )}
          >
            <button
              onClick={() => toggleItem(index)}
              className="w-full p-5 text-left flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors"
            >
              <span
                className={cn(
                  "font-semibold",
                  openIndex === index ? "text-purple-700" : "text-gray-900"
                )}
              >
                {item.question}
              </span>
              <ChevronDown
                className={cn(
                  "h-5 w-5 transition-transform flex-shrink-0",
                  openIndex === index
                    ? "rotate-180 text-purple-500"
                    : "text-gray-400"
                )}
              />
            </button>
            <div
              className={cn(
                "overflow-hidden transition-all duration-300",
                openIndex === index ? "max-h-96" : "max-h-0"
              )}
            >
              <div className="px-5 pb-5">
                <p className="text-gray-600 leading-relaxed">{item.answer}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// FAQ CTA - "Still have questions?" section
interface FAQCTAProps {
  title?: string;
  description?: string;
  phoneNumber?: string;
  className?: string;
  variant?: "default" | "premium";
}

const FAQCTA: React.FC<FAQCTAProps> = ({
  title = "Still have questions?",
  description = "Our team is here to help you every step of the way.",
  phoneNumber = "(555) 123-4567",
  className,
  variant = "default",
}) => {
  if (variant === "premium") {
    return (
      <div
        className={cn(
          "relative bg-gradient-to-br from-purple-500/20 to-violet-500/10 border border-purple-500/30 rounded-xl p-5 md:p-6 flex flex-col md:flex-row items-center justify-between gap-4 overflow-hidden",
          className
        )}
      >
        {/* Subtle glow */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl" />

        <div className="relative flex flex-col md:flex-row items-center gap-3 md:gap-4 text-center md:text-left">
          <div className="w-11 h-11 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-500/30">
            <MessageCircle className="h-5 w-5 md:h-6 md:w-6 text-white" />
          </div>
          <div>
            <h4 className="font-bold text-white text-sm md:text-base">{title}</h4>
            <p className="text-gray-400 text-xs md:text-sm">{description}</p>
          </div>
        </div>
        <a
          href={`tel:${phoneNumber.replace(/\D/g, "")}`}
          className="relative w-full md:w-auto text-center px-6 py-3 bg-white hover:bg-purple-50 text-purple-900 rounded-xl font-bold text-sm md:text-base hover:shadow-[0_0_30px_rgba(168,85,247,0.3)] transition-all whitespace-nowrap"
        >
          Call {phoneNumber}
        </a>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "bg-purple-100 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-4",
        className
      )}
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
          <MessageCircle className="h-6 w-6 text-white" />
        </div>
        <div>
          <h4 className="font-bold text-gray-900">{title}</h4>
          <p className="text-gray-600 text-sm">{description}</p>
        </div>
      </div>
      <a
        href={`tel:${phoneNumber.replace(/\D/g, "")}`}
        className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors whitespace-nowrap"
      >
        Call {phoneNumber}
      </a>
    </div>
  );
};

export { FunnelFAQ, FAQCTA };
