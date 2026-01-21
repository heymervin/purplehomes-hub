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
  variant?: "default" | "cards" | "minimal" | "boxed";
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
}

const FAQCTA: React.FC<FAQCTAProps> = ({
  title = "Still have questions?",
  description = "Our team is here to help you every step of the way.",
  phoneNumber = "(555) 123-4567",
  className,
}) => {
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
