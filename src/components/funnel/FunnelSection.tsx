import * as React from "react";
import { cn } from "@/lib/utils";

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
    | "image";
  /** Background image URL (for image variant) */
  backgroundImage?: string;
  /** Padding size */
  padding?: "none" | "sm" | "md" | "lg" | "xl";
  /** Container width */
  container?: "none" | "narrow" | "default" | "wide" | "full";
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
  id,
  className,
  children,
}) => {
  const variants = {
    light: "bg-gray-50 text-gray-900",
    white: "bg-white text-gray-900",
    gray: "bg-gray-100 text-gray-900",
    dark: "bg-gradient-to-br from-gray-900 to-gray-800 text-white",
    purple: "bg-gradient-to-br from-purple-600 to-purple-800 text-white",
    "purple-light": "bg-purple-50 text-gray-900",
    gradient: "bg-gradient-to-r from-purple-600 via-purple-700 to-purple-800 text-white",
    image: "relative text-white",
  };

  const paddings = {
    none: "",
    sm: "py-8 md:py-12",
    md: "py-12 md:py-16",
    lg: "py-16 md:py-24",
    xl: "py-24 md:py-32",
  };

  const containers = {
    none: "",
    narrow: "max-w-3xl mx-auto px-4",
    default: "container mx-auto px-4",
    wide: "max-w-7xl mx-auto px-4",
    full: "w-full px-4",
  };

  return (
    <section
      id={id}
      className={cn(variants[variant], paddings[padding], className)}
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

// Section Header - Consistent heading treatment
interface SectionHeaderProps {
  overline?: string;
  title: string;
  subtitle?: string;
  align?: "left" | "center" | "right";
  /** Color scheme for dark backgrounds */
  dark?: boolean;
  className?: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({
  overline,
  title,
  subtitle,
  align = "center",
  dark = false,
  className,
}) => {
  const alignments = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
  };

  return (
    <div className={cn(alignments[align], "mb-10 md:mb-12", className)}>
      {overline && (
        <span
          className={cn(
            "inline-block text-sm font-bold uppercase tracking-wider mb-3",
            dark ? "text-purple-300" : "text-purple-600"
          )}
        >
          {overline}
        </span>
      )}
      <h2
        className={cn(
          "text-3xl md:text-4xl lg:text-5xl font-bold leading-tight",
          dark ? "text-white" : "text-gray-900"
        )}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          className={cn(
            "mt-4 text-lg md:text-xl max-w-3xl",
            align === "center" && "mx-auto",
            dark ? "text-gray-300" : "text-gray-600"
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
        <div className="h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent" />
      </div>
    );
  }

  if (variant === "dots") {
    return (
      <div className={cn("flex items-center justify-center gap-2 py-8", className)}>
        <span className="w-2 h-2 bg-purple-400 rounded-full" />
        <span className="w-2 h-2 bg-purple-500 rounded-full" />
        <span className="w-2 h-2 bg-purple-400 rounded-full" />
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

// Content Card - For feature highlights
interface ContentCardProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  variant?: "default" | "bordered" | "elevated" | "minimal";
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
    default: "bg-white rounded-xl p-6 shadow-sm border border-gray-100",
    bordered: "bg-white rounded-xl p-6 border-2 border-purple-200",
    elevated: "bg-white rounded-xl p-6 shadow-xl",
    minimal: "p-4",
  };

  return (
    <div className={cn(variants[variant], className)}>
      {icon && (
        <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center mb-4 text-purple-600">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
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
      <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0 text-purple-600">
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
