import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, HelpCircle, MessageCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface FAQItem {
  question: string;
  answer: string;
}

// Splits answer text into bite-sized 1-2 sentence chunks for easy reading
function splitAnswerIntoBites(text: string): string[] {
  const naturalParagraphs = text.split(/\n\n+/).filter(s => s.trim());
  const result: string[] = [];
  for (const para of naturalParagraphs) {
    const trimmed = para.trim().replace(/\n/g, ' ');
    const sentences = trimmed.match(/[^.!?]+(?:[.!?]+|$)/g)?.map(s => s.trim()).filter(Boolean) || [trimmed];
    for (let i = 0; i < sentences.length; i += 2) {
      const chunk = sentences.slice(i, i + 2).join(' ').trim();
      if (chunk) result.push(chunk);
    }
  }
  return result.length > 0 ? result : [text];
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
    question: "Do I need credit to buy this home?",
    answer: "No. You do not need credit to qualify for this home. We do not approve or deny buyers based on credit scores.\n\nWhat matters is:\nThat you have the down payment, and\nThat your income comfortably supports the monthly payment.\n\nOur goal is to make sure the home and payment are a safe, realistic fit for you. We'll walk through the numbers together so you feel confident before moving forward.",
  },
  {
    question: "What do you look at to see if this works for me?",
    answer: "We start with a simple conversation about:\n\nYour down payment range\nYour income and timeline\nAnd whether this home actually fits what you're looking for\n\nThis helps us make sure both the home and the monthly payment are a comfortable, realistic fit for you — not just today, but long-term.",
  },
  {
    question: "Am I committing to buy the home just by starting the process?",
    answer: "No. Starting the process is simply a conversation. There's no commitment until you choose to move forward and sign an agreement.\n\nBefore that, it's just about making sure the home and payment make sense for you.",
  },
  {
    question: "Is my down payment safe?",
    answer: "Yes. All funds are handled through the title company as part of the closing process, just like in other home sales.",
  },
  {
    question: "Is this rent-to-own?",
    answer: "No — and that's an important distinction.\n\nSome rent-to-own arrangements are essentially rentals, where monthly payments don't reduce what you owe and buyers don't build real ownership over time.\n\nWith this home, you're on a true path to ownership from the beginning.\n\nYour purchase price is locked in, your interest in the home is documented and protected through a licensed title company, and your monthly payment is structured so you're paying down the home over time, not just paying rent.\n\nWe've designed this to give buyers the flexibility banks don't offer, without sacrificing the protections and long-term benefits of owning a home.",
  },
  {
    question: "How is this different from going through a bank?",
    answer: "Banks rely heavily on credit scores and rigid rules to decide who qualifies.\n\nWe take a more human approach.\n\nInstead of focusing on credit, we focus on whether the home and monthly payment are realistic and sustainable for you. At the same time, the payment structure is designed for long-term ownership — similar to a traditional home loan — so you're building equity and stability over time.",
  },
  {
    question: "Is this a real closing through a title company?",
    answer: "Yes. The purchase is completed through a licensed title company, just like other traditional home sales. All documents are properly handled so your interest in the home is protected.",
  },
  {
    question: "Can I see the home before committing to anything?",
    answer: "Yes. Once we confirm the home and payment make sense for you, we'll schedule a showing so you can see the home in person before moving forward.",
  },
  {
    question: "What if my situation isn't traditional?",
    answer: "That's okay. Many buyers we work with are self-employed, contractors, or earn income in non-traditional ways. Some don't fit a bank's checklist — and that doesn't mean homeownership isn't right for them. We focus on whether the home and payment make sense for your real life, not whether you check every box a bank requires.",
  },
  {
    question: "What happens if I decide it's not the right fit?",
    answer: "There's no obligation to move forward. If the home or payment doesn't feel right after reviewing the details, you're free to walk away.",
  },
  {
    question: "How do I get started?",
    answer: "Just click the button on this page to start a conversation. It takes a couple of minutes and helps us answer your questions clearly.",
  },
];

const FunnelFAQ: React.FC<FunnelFAQProps> = ({
  title,
  subtitle,
  items = defaultFAQs,
  className,
  variant = "default",
  defaultOpenIndex,
}) => {
  const { t } = useLanguage();
  const [openIndex, setOpenIndex] = React.useState<number | null>(
    defaultOpenIndex ?? null
  );

  const resolvedTitle = title ?? t('faq.frequentlyAsked');
  const resolvedSubtitle = subtitle ?? t('faq.defaultSubtitle');

  const toggleItem = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  if (variant === "cards") {
    return (
      <div className={className}>
        {resolvedTitle && (
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              {resolvedTitle}
            </h2>
            {resolvedSubtitle && <p className="text-gray-500">{resolvedSubtitle}</p>}
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
        {resolvedTitle && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">{resolvedTitle}</h2>
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
        {resolvedTitle && (
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
              {resolvedTitle}
            </h2>
            {resolvedSubtitle && <p className="text-gray-400">{resolvedSubtitle}</p>}
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
          {resolvedTitle && (
            <div className="text-center mb-8 md:mb-10">
              <span className="inline-block px-4 md:px-5 py-2 bg-purple-500/20 border border-purple-500/30 rounded-full text-purple-300 text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] mb-5 md:mb-6">
                {t('faq.eyebrow')}
              </span>
              <h2 className="text-2xl md:text-4xl font-bold mb-3">
                <span className="bg-gradient-to-r from-purple-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">{resolvedTitle}</span>
              </h2>
              {resolvedSubtitle && <p className="text-gray-400 text-sm md:text-base max-w-xl mx-auto px-4">{resolvedSubtitle}</p>}
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
                    <div className="px-4 md:px-5 pb-4 md:pb-5 space-y-2">
                      {splitAnswerIntoBites(item.answer).map((chunk, i) => (
                        <p key={i} className="text-gray-300 text-sm md:text-base leading-relaxed">{chunk}</p>
                      ))}
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
      {resolvedTitle && (
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            {resolvedTitle}
          </h2>
          {resolvedSubtitle && <p className="text-gray-500">{resolvedSubtitle}</p>}
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
  title,
  description,
  phoneNumber = "(555) 123-4567",
  className,
  variant = "default",
}) => {
  const { t } = useLanguage();
  const resolvedTitle = title ?? t('faq.stillHaveQuestions');
  const resolvedDescription = description ?? t('faq.teamHereToHelp');

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
            <h4 className="font-bold text-white text-sm md:text-base">{resolvedTitle}</h4>
            <p className="text-gray-400 text-xs md:text-sm">{resolvedDescription}</p>
          </div>
        </div>
        <a
          href={`sms:${phoneNumber.replace(/\D/g, "")}`}
          className="relative w-full md:w-auto text-center px-6 py-3 bg-white hover:bg-purple-50 text-purple-900 rounded-xl font-bold text-sm md:text-base hover:shadow-[0_0_30px_rgba(168,85,247,0.3)] transition-all whitespace-nowrap"
        >
          {t('cta.textUs')} {phoneNumber}
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
          <h4 className="font-bold text-gray-900">{resolvedTitle}</h4>
          <p className="text-gray-600 text-sm">{resolvedDescription}</p>
        </div>
      </div>
      <a
        href={`sms:${phoneNumber.replace(/\D/g, "")}`}
        className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors whitespace-nowrap"
      >
        {t('cta.textUs')} {phoneNumber}
      </a>
    </div>
  );
};

export { FunnelFAQ, FAQCTA };
