import * as React from "react";
import { cn } from "@/lib/utils";

type BlendTarget = "white" | "cream" | "gray" | "dark" | "purple";

interface FunnelSectionProps {
  /** Section variant/background style */
  variant?:
    | "light"
    | "white"
    | "gray"
    | "dark"
    | "purple"
    | "purple-light"
    | "gradient"
    | "image"
    | "luxury-cream"
    | "luxury-dark"
    | "premium-dark";
  /** Background image URL (for image variant) */
  backgroundImage?: string;
  /** Padding size */
  padding?: "none" | "sm" | "md" | "lg" | "xl";
  /** Container width */
  container?: "none" | "narrow" | "default" | "wide" | "full";
  /** Blend/fade into the next section's color */
  blendTo?: BlendTarget;
  /** Blend/fade from the previous section's color */
  blendFrom?: BlendTarget;
  /** Section ID for anchor links */
  id?: string;
  className?: string;
  children: React.ReactNode;
}

const FunnelSection: React.FC<FunnelSectionProps> = ({
  variant = "white",
  backgroundImage,
  padding = "lg",
  container = "default",
  blendTo,
  blendFrom,
  id,
  className,
  children,
}) => {
  const variants = {
    light: "bg-gray-50 text-gray-900",
    white: "bg-white text-gray-900",
    gray: "bg-gray-100 text-gray-900",
    dark: "bg-gradient-to-br from-gray-900 to-gray-800 text-white",
    purple: "bg-gradient-to-br from-indigo-600 to-indigo-800 text-white",
    "purple-light": "bg-indigo-50 text-gray-900",
    gradient: "bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-800 text-white",
    image: "relative text-white",
    // Premium/Luxury variants
    "luxury-cream": "bg-[#faf8f5] text-gray-900",
    "luxury-dark": "bg-gradient-to-b from-[#0f172a] to-[#1e1b4b] text-white",
    "premium-dark": "bg-gradient-to-b from-gray-900 via-zinc-900 to-gray-900 text-white",
  };

  // Increased padding for more premium spacing
  const paddings = {
    none: "",
    sm: "py-10 md:py-14",
    md: "py-14 md:py-20",
    lg: "py-20 md:py-28",
    xl: "py-28 md:py-40",
  };

  const containers = {
    none: "",
    narrow: "max-w-3xl mx-auto px-4",
    default: "container mx-auto px-4",
    wide: "max-w-7xl mx-auto px-4",
    full: "w-full px-4",
  };

  // Blend transition classes
  const blendToClasses: Record<BlendTarget, string> = {
    white: "section-fade-to-white",
    cream: "section-fade-to-cream",
    gray: "section-fade-to-gray",
    dark: "section-fade-to-dark",
    purple: "section-fade-to-purple",
  };

  const blendFromClasses: Record<BlendTarget, string> = {
    white: "section-fade-from-white",
    cream: "section-fade-from-cream",
    gray: "",
    dark: "section-fade-from-dark",
    purple: "",
  };

  return (
    <section
      id={id}
      className={cn(
        variants[variant],
        paddings[padding],
        "relative",
        blendTo && blendToClasses[blendTo],
        blendFrom && blendFromClasses[blendFrom],
        className
      )}
    >
      {/* Background image for image variant */}
      {variant === "image" && backgroundImage && (
        <>
          <img
            src={backgroundImage}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/60" />
        </>
      )}

      <div className={cn(containers[container], variant === "image" && "relative z-10")}>
        {children}
      </div>
    </section>
  );
};

// Section Header - Consistent heading treatment with luxury typography
interface SectionHeaderProps {
  overline?: string;
  title: string;
  /** Optional highlighted portion of title (renders with gradient) */
  titleHighlight?: string;
  subtitle?: string;
  align?: "left" | "center" | "right";
  /** Color scheme for dark backgrounds */
  dark?: boolean;
  /** Use luxury styling */
  luxury?: boolean;
  className?: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({
  overline,
  title,
  titleHighlight,
  subtitle,
  align = "center",
  dark = false,
  luxury = false,
  className,
}) => {
  const alignments = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
  };

  return (
    <div className={cn(alignments[align], "mb-12 md:mb-16", className)}>
      {overline && (
        <span
          className={cn(
            "inline-block text-xs font-semibold uppercase tracking-[0.15em] mb-4",
            dark ? "text-indigo-400/90" : "text-indigo-600",
            luxury && !dark && "text-[#c9a962]"
          )}
        >
          {overline}
        </span>
      )}
      <h2
        className={cn(
          "leading-tight",
          luxury
            ? "text-3xl md:text-4xl lg:text-5xl font-light tracking-tight"
            : "text-3xl md:text-4xl lg:text-5xl font-bold",
          dark ? "text-white" : "text-gray-900"
        )}
      >
        {titleHighlight ? (
          <>
            <span className={luxury ? "font-light" : ""}>{title} </span>
            <span className={cn(
              "font-bold",
              dark
                ? "text-indigo-400"
                : "bg-gradient-to-r from-indigo-600 to-indigo-800 bg-clip-text text-transparent"
            )}>
              {titleHighlight}
            </span>
          </>
        ) : (
          title
        )}
      </h2>
      {subtitle && (
        <p
          className={cn(
            "mt-5 text-lg md:text-xl max-w-3xl leading-relaxed",
            align === "center" && "mx-auto",
            dark ? "text-gray-400" : "text-gray-600"
          )}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
};

// Divider with optional text
interface SectionDividerProps {
  text?: string;
  variant?: "line" | "gradient" | "dots" | "wave";
  className?: string;
}

const SectionDivider: React.FC<SectionDividerProps> = ({
  text,
  variant = "line",
  className,
}) => {
  if (variant === "gradient") {
    return (
      <div className={cn("py-8", className)}>
        <div className="h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
      </div>
    );
  }

  if (variant === "dots") {
    return (
      <div className={cn("flex items-center justify-center gap-2 py-8", className)}>
        <span className="w-2 h-2 bg-indigo-400 rounded-full" />
        <span className="w-2 h-2 bg-indigo-500 rounded-full" />
        <span className="w-2 h-2 bg-indigo-400 rounded-full" />
      </div>
    );
  }

  if (variant === "wave") {
    return (
      <div className={cn("overflow-hidden", className)}>
        <svg
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
          className="w-full h-16 fill-current text-gray-100"
        >
          <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" />
        </svg>
      </div>
    );
  }

  // Line variant (default)
  if (text) {
    return (
      <div className={cn("flex items-center gap-4 py-8", className)}>
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-gray-400 text-sm font-medium">{text}</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>
    );
  }

  return (
    <div className={cn("py-8", className)}>
      <div className="h-px bg-gray-200" />
    </div>
  );
};

// Content Card - For feature highlights with luxury option
interface ContentCardProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  variant?: "default" | "bordered" | "elevated" | "minimal" | "luxury" | "luxury-dark";
  className?: string;
}

const ContentCard: React.FC<ContentCardProps> = ({
  icon,
  title,
  description,
  variant = "default",
  className,
}) => {
  const variants = {
    default: "bg-white rounded-2xl p-8 shadow-sm border border-gray-100 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg",
    bordered: "bg-white rounded-2xl p-8 border-2 border-indigo-200 transition-all duration-300 hover:border-indigo-400",
    elevated: "bg-white rounded-2xl p-8 shadow-xl transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl",
    minimal: "p-6",
    luxury: "bg-white rounded-2xl p-8 shadow-[0_4px_20px_rgba(30,27,75,0.12)] border border-gray-100/50 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_16px_60px_rgba(30,27,75,0.20)]",
    "luxury-dark": "bg-white/5 backdrop-blur border border-indigo-500/20 rounded-2xl p-8 transition-all duration-500 hover:-translate-y-2 hover:border-indigo-500/40",
  };

  const isLuxuryDark = variant === "luxury-dark";

  return (
    <div className={cn(variants[variant], className)}>
      {icon && (
        <div className={cn(
          "w-14 h-14 rounded-xl flex items-center justify-center mb-5",
          isLuxuryDark
            ? "bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-lg shadow-indigo-500/30"
            : "bg-gradient-to-br from-indigo-50 to-indigo-100 text-indigo-600"
        )}>
          {icon}
        </div>
      )}
      <h3 className={cn(
        "text-xl font-semibold mb-3",
        isLuxuryDark ? "text-white" : "text-gray-900"
      )}>{title}</h3>
      <p className={cn(
        "leading-relaxed",
        isLuxuryDark ? "text-gray-400" : "text-gray-600"
      )}>{description}</p>
    </div>
  );
};

// Icon Feature - Simple icon + text combo
interface IconFeatureProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  className?: string;
}

const IconFeature: React.FC<IconFeatureProps> = ({
  icon,
  title,
  description,
  className,
}) => {
  return (
    <div className={cn("flex items-start gap-4", className)}>
      <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0 text-indigo-600">
        {icon}
      </div>
      <div>
        <h4 className="font-semibold text-gray-900">{title}</h4>
        {description && (
          <p className="text-sm text-gray-600 mt-1">{description}</p>
        )}
      </div>
    </div>
  );
};

// Two Column Layout
interface TwoColumnLayoutProps {
  left: React.ReactNode;
  right: React.ReactNode;
  /** Which side is larger */
  emphasis?: "left" | "right" | "equal";
  /** Reverse on mobile */
  reverseOnMobile?: boolean;
  className?: string;
}

const TwoColumnLayout: React.FC<TwoColumnLayoutProps> = ({
  left,
  right,
  emphasis = "equal",
  reverseOnMobile = false,
  className,
}) => {
  const gridCols = {
    left: "lg:grid-cols-[1.5fr,1fr]",
    right: "lg:grid-cols-[1fr,1.5fr]",
    equal: "lg:grid-cols-2",
  };

  return (
    <div
      className={cn(
        "grid gap-8 lg:gap-12 items-center",
        gridCols[emphasis],
        reverseOnMobile && "flex-col-reverse",
        className
      )}
    >
      <div className={reverseOnMobile ? "order-2 lg:order-1" : ""}>{left}</div>
      <div className={reverseOnMobile ? "order-1 lg:order-2" : ""}>{right}</div>
    </div>
  );
};

export {
  FunnelSection,
  SectionHeader,
  SectionDivider,
  ContentCard,
  IconFeature,
  TwoColumnLayout,
};
