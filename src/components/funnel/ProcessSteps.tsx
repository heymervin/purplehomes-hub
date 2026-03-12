import * as React from "react";
import { cn } from "@/lib/utils";
import {
  ClipboardCheck,
  Home,
  Key,
  FileText,
  Phone,
  Calendar,
  CheckCircle,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";

interface Step {
  icon?: LucideIcon;
  title: string;
  description: string;
  duration?: string;
}

interface ProcessStepsProps {
  title?: string;
  subtitle?: string;
  steps?: Step[];
  className?: string;
  variant?: "horizontal" | "vertical" | "cards" | "timeline" | "luxury";
}

const defaultSteps: Step[] = [
  {
    icon: ClipboardCheck,
    title: "Apply Online",
    description: "Complete our simple 5-minute application. No credit check required to see if you qualify.",
    duration: "5 minutes",
  },
  {
    icon: Home,
    title: "Choose Your Home",
    description: "Browse available properties and schedule tours. We'll help you find the perfect fit for your family.",
    duration: "1-2 weeks",
  },
  {
    icon: Key,
    title: "Move In",
    description: "Sign your agreement and get the keys. Start building equity from day one.",
    duration: "30 days",
  },
];

const ProcessSteps: React.FC<ProcessStepsProps> = ({
  title = "3 Simple Steps to Homeownership",
  subtitle = "Our streamlined process makes becoming a homeowner easy",
  steps = defaultSteps,
  className,
  variant = "horizontal",
}) => {
  if (variant === "vertical") {
    return (
      <div className={className}>
        {title && (
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              {title}
            </h2>
            {subtitle && <p className="text-gray-500">{subtitle}</p>}
          </div>
        )}

        <div className="max-w-2xl mx-auto space-y-8">
          {steps.map((step, index) => {
            const Icon = step.icon || CheckCircle;
            return (
              <div key={index} className="flex gap-6">
                {/* Step number and line */}
                <div className="flex flex-col items-center">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center text-xl font-bold shadow-lg">
                    {index + 1}
                  </div>
                  {index < steps.length - 1 && (
                    <div className="w-0.5 h-full bg-indigo-200 my-2" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 pb-8">
                  <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                        <Icon className="h-6 w-6 text-indigo-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                          {step.title}
                        </h3>
                        <p className="text-gray-600">{step.description}</p>
                        {step.duration && (
                          <span className="inline-block mt-3 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
                            {step.duration}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (variant === "cards") {
    return (
      <div className={className}>
        {title && (
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              {title}
            </h2>
            {subtitle && <p className="text-gray-500">{subtitle}</p>}
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, index) => {
            const Icon = step.icon || CheckCircle;
            return (
              <div
                key={index}
                className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100 text-center hover:shadow-2xl transition-shadow relative"
              >
                {/* Step number badge */}
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold shadow-lg">
                  {index + 1}
                </div>

                {/* Icon */}
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center mx-auto mb-6">
                  <Icon className="h-10 w-10 text-indigo-600" />
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {step.title}
                </h3>
                <p className="text-gray-600 mb-4">{step.description}</p>
                {step.duration && (
                  <span className="inline-block px-4 py-1.5 bg-gray-100 text-gray-600 rounded-full text-sm font-medium">
                    {step.duration}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (variant === "timeline") {
    return (
      <div className={className}>
        {title && (
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              {title}
            </h2>
            {subtitle && <p className="text-gray-500">{subtitle}</p>}
          </div>
        )}

        <div className="relative">
          {/* Timeline line */}
          <div className="hidden md:block absolute top-1/2 left-0 right-0 h-1 bg-indigo-200 -translate-y-1/2" />

          <div className="grid md:grid-cols-3 gap-8 relative">
            {steps.map((step, index) => {
              const Icon = step.icon || CheckCircle;
              return (
                <div key={index} className="text-center relative">
                  {/* Connector dot */}
                  <div className="hidden md:block absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-indigo-600 border-4 border-white shadow z-10" />

                  {/* Content */}
                  <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 md:mt-8">
                    <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-4">
                      <Icon className="h-8 w-8 text-indigo-600" />
                    </div>
                    <div className="text-sm text-indigo-600 font-semibold mb-2">
                      Step {index + 1}
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                      {step.title}
                    </h3>
                    <p className="text-gray-600 text-sm">{step.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Luxury variant - Premium elegant design
  if (variant === "luxury") {
    return (
      <div className={className}>
        {title && (
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-light tracking-tight text-gray-900 mb-4">
              <span className="font-light">3 Simple Steps to </span>
              <span className="font-bold bg-gradient-to-r from-indigo-600 to-indigo-800 bg-clip-text text-transparent">
                Homeownership
              </span>
            </h2>
            {subtitle && (
              <p className="text-gray-500 text-lg max-w-2xl mx-auto">{subtitle}</p>
            )}
          </div>
        )}

        <div className="relative max-w-5xl mx-auto">
          {/* Connecting line */}
          <div className="hidden md:block absolute top-16 left-[10%] right-[10%] h-[2px] bg-gradient-to-r from-indigo-200 via-indigo-300 to-indigo-200" />

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {steps.map((step, index) => {
              return (
                <div key={index} className="relative text-center group">
                  {/* Luxury number circle */}
                  <div className="relative mx-auto mb-8">
                    <div className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-gradient-to-br from-[#f8f5ff] to-white flex items-center justify-center mx-auto shadow-[0_4px_20px_rgba(109,40,217,0.12)] border border-indigo-100/50 transition-all duration-500 group-hover:shadow-[0_8px_40px_rgba(109,40,217,0.2)] group-hover:-translate-y-1">
                      <span className="text-4xl md:text-5xl font-light text-indigo-600">
                        {index + 1}
                      </span>
                    </div>
                    {/* Decorative ring on hover */}
                    <div className="absolute inset-0 rounded-full border-2 border-indigo-200/0 group-hover:border-indigo-200/50 scale-110 transition-all duration-500" />
                  </div>

                  {/* Content */}
                  <h3 className="text-xl md:text-2xl font-semibold text-gray-900 mb-3">
                    {step.title}
                  </h3>
                  <p className="text-gray-500 leading-relaxed max-w-xs mx-auto">
                    {step.description}
                  </p>
                  {step.duration && (
                    <span className="inline-block mt-4 px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-sm font-medium">
                      {step.duration}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Horizontal (default)
  return (
    <div className={className}>
      {title && (
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            {title}
          </h2>
          {subtitle && <p className="text-gray-500">{subtitle}</p>}
        </div>
      )}

      <div className="flex flex-col md:flex-row items-start md:items-center justify-center gap-4 md:gap-0">
        {steps.map((step, index) => {
          const Icon = step.icon || CheckCircle;
          return (
            <React.Fragment key={index}>
              {/* Step */}
              <div className="flex-1 text-center max-w-xs">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Icon className="h-10 w-10" />
                </div>
                <div className="text-sm text-orange-500 font-bold uppercase tracking-wide mb-1">
                  Step {index + 1}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {step.title}
                </h3>
                <p className="text-gray-600 text-sm">{step.description}</p>
                {step.duration && (
                  <span className="inline-block mt-3 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                    {step.duration}
                  </span>
                )}
              </div>

              {/* Arrow between steps */}
              {index < steps.length - 1 && (
                <div className="hidden md:flex items-center px-4">
                  <ArrowRight className="h-8 w-8 text-indigo-300" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

// Mini Process - Compact inline version
interface MiniProcessProps {
  steps: string[];
  className?: string;
}

const MiniProcess: React.FC<MiniProcessProps> = ({ steps, className }) => {
  return (
    <div className={cn("flex items-center justify-center gap-2 flex-wrap", className)}>
      {steps.map((step, index) => (
        <React.Fragment key={index}>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center">
              {index + 1}
            </span>
            {step}
          </span>
          {index < steps.length - 1 && (
            <ArrowRight className="h-4 w-4 text-indigo-300" />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export { ProcessSteps, MiniProcess };
