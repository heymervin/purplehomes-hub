import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Shield,
  Award,
  Clock,
  Users,
  CheckCircle,
  Star,
  BadgeCheck,
  Heart,
  Home,
  Banknote,
  Crown,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

// Trust Badge Component - Premium Edition
interface TrustBadgeProps {
  icon?: LucideIcon | "bbb" | "equal-housing";
  label: string;
  className?: string;
  variant?: "light" | "dark" | "outline" | "premium" | "gold";
}

const TrustBadge: React.FC<TrustBadgeProps> = ({
  icon: Icon = Shield,
  label,
  className,
  variant = "light",
}) => {
  const variants = {
    light: "bg-white text-gray-700 shadow-md border border-gray-100 hover:shadow-lg",
    dark: "bg-gray-900 text-white shadow-lg",
    outline: "bg-transparent text-gray-700 border-2 border-gray-200 hover:border-gray-300",
    premium: "bg-gradient-to-br from-gray-900 to-gray-800 text-white border border-purple-500/30 shadow-lg",
    gold: "bg-gradient-to-r from-purple-50 to-purple-50 text-purple-900 border border-purple-200 shadow-md",
  };

  const iconColors = {
    light: "text-emerald-500",
    dark: "text-purple-400",
    outline: "text-emerald-500",
    premium: "text-purple-400",
    gold: "text-purple-600",
  };

  const renderIcon = () => {
    if (Icon === "bbb") {
      return (
        <div className={cn(
          "w-7 h-7 rounded-lg text-xs font-black flex items-center justify-center",
          variant === "premium" || variant === "gold"
            ? "bg-gradient-to-br from-purple-400 to-purple-600 text-white"
            : "bg-blue-600 text-white"
        )}>
          BBB
        </div>
      );
    }
    if (Icon === "equal-housing") {
      return <Home className={cn("h-5 w-5", iconColors[variant])} />;
    }
    if (typeof Icon === "function") {
      return <Icon className={cn("h-5 w-5", iconColors[variant])} />;
    }
    return <Shield className={cn("h-5 w-5", iconColors[variant])} />;
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2.5 px-5 py-3 rounded-full text-sm font-semibold transition-all duration-300",
        variants[variant],
        className
      )}
    >
      {renderIcon()}
      <span className="tracking-wide">{label}</span>
    </div>
  );
};

// Trust Bar - Premium horizontal row
interface TrustBarProps {
  badges?: Array<{
    icon?: LucideIcon | "bbb" | "equal-housing";
    label: string;
  }>;
  className?: string;
  variant?: "light" | "dark" | "outline" | "premium" | "gold";
}

const defaultBadges = [
  { icon: "bbb" as const, label: "A+ Rated" },
  { icon: Clock, label: "15+ Years" },
  { icon: Users, label: "500+ Families" },
  { icon: Shield, label: "Guaranteed" },
];

const TrustBar: React.FC<TrustBarProps> = ({
  badges = defaultBadges,
  className,
  variant = "light",
}) => {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-center gap-3 md:gap-4",
        className
      )}
    >
      {badges.map((badge, index) => (
        <TrustBadge
          key={index}
          icon={badge.icon}
          label={badge.label}
          variant={variant}
        />
      ))}
    </div>
  );
};

// Premium Trust Strip - Elegant horizontal banner
interface PremiumTrustStripProps {
  className?: string;
}

const PremiumTrustStrip: React.FC<PremiumTrustStripProps> = ({ className }) => {
  return (
    <div className={cn(
      "relative -mt-6 md:-mt-8 z-20 py-4 px-6",
      className
    )}>
      <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
        {[
          { icon: BadgeCheck, label: "Licensed Title Company Closing" },
          { icon: Shield, label: "Secure, Transparent Process" },
          { icon: Home, label: "Local Team, Local Homes" },
          { icon: Star, label: "5-Star Reviews from Local Buyers" },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-white">
            <item.icon className="h-4 w-4 text-purple-400" />
            <span className="text-sm font-semibold tracking-wide">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Trust Indicators - Refined compact version
interface TrustIndicatorProps {
  items?: string[];
  className?: string;
  variant?: "default" | "premium";
}

const defaultIndicators = [
  "Your info is secure",
  "No spam, ever",
  "Free consultation",
];

const TrustIndicators: React.FC<TrustIndicatorProps> = ({
  items = defaultIndicators,
  className,
  variant = "default",
}) => {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-4 text-sm",
        variant === "premium" ? "text-gray-400" : "text-gray-500",
        className
      )}
    >
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-1.5">
          <CheckCircle className={cn(
            "h-4 w-4",
            variant === "premium" ? "text-purple-500" : "text-emerald-500"
          )} />
          <span>{item}</span>
        </div>
      ))}
    </div>
  );
};

// Premium Guarantee Box
interface GuaranteeBoxProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  className?: string;
  variant?: "success" | "premium" | "gold";
}

const GuaranteeBox: React.FC<GuaranteeBoxProps> = ({
  title = "100% Satisfaction Guarantee",
  description = "If you're not completely satisfied with our service, we'll make it right or refund your money.",
  icon: Icon = Shield,
  className,
  variant = "success",
}) => {
  const variants = {
    success: {
      container: "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white",
      iconBg: "bg-white/20",
      iconColor: "text-white",
      subtitle: "text-emerald-100",
    },
    premium: {
      container: "bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white border border-purple-500/30",
      iconBg: "bg-gradient-to-br from-purple-400 to-purple-600",
      iconColor: "text-white",
      subtitle: "text-gray-400",
    },
    gold: {
      container: "bg-gradient-to-br from-purple-50 via-purple-50 to-purple-100 text-gray-900 border border-purple-200",
      iconBg: "bg-gradient-to-br from-purple-400 to-purple-600",
      iconColor: "text-white",
      subtitle: "text-purple-700",
    },
  };

  const style = variants[variant];

  return (
    <div
      className={cn(
        "rounded-2xl p-8 text-center shadow-xl",
        style.container,
        className
      )}
    >
      <div className={cn(
        "inline-flex items-center justify-center w-16 h-16 rounded-full mb-4",
        style.iconBg
      )}>
        <Icon className={cn("h-8 w-8", style.iconColor)} />
      </div>
      <h3 className="text-2xl font-bold mb-2">{title}</h3>
      <p className={cn("max-w-md mx-auto", style.subtitle)}>{description}</p>
    </div>
  );
};

// Premium Social Proof Number with animation
interface SocialProofNumberProps {
  number: string;
  label: string;
  className?: string;
  variant?: "default" | "premium" | "gold";
}

const SocialProofNumber: React.FC<SocialProofNumberProps> = ({
  number,
  label,
  className,
  variant = "default",
}) => {
  const numberColors = {
    default: "text-purple-500",
    premium: "bg-gradient-to-r from-purple-400 to-purple-500 bg-clip-text text-transparent",
    gold: "bg-gradient-to-r from-purple-500 via-purple-500 to-purple-600 bg-clip-text text-transparent",
  };

  return (
    <div className={cn("text-center", className)}>
      <div className={cn(
        "text-4xl md:text-5xl font-extrabold",
        numberColors[variant]
      )}>
        {number}
      </div>
      <div className="text-sm text-gray-500 mt-1 font-medium tracking-wide">{label}</div>
    </div>
  );
};

// Luxury Credentials Bar
interface CredentialsBarProps {
  className?: string;
}

const CredentialsBar: React.FC<CredentialsBarProps> = ({ className }) => {
  return (
    <div className={cn(
      "bg-white border-y border-gray-100 py-6",
      className
    )}>
      <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
        <div className="text-center">
          <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">500+</div>
          <div className="text-xs uppercase tracking-wider text-gray-500 mt-1">Families Served</div>
        </div>
        <div className="h-10 w-px bg-gray-200" />
        <div className="text-center">
          <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">15+</div>
          <div className="text-xs uppercase tracking-wider text-gray-500 mt-1">Years Experience</div>
        </div>
        <div className="h-10 w-px bg-gray-200" />
        <div className="text-center">
          <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">A+</div>
          <div className="text-xs uppercase tracking-wider text-gray-500 mt-1">BBB Rating</div>
        </div>
        <div className="h-10 w-px bg-gray-200" />
        <div className="text-center">
          <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">4.9</div>
          <div className="text-xs uppercase tracking-wider text-gray-500 mt-1">Star Rating</div>
        </div>
      </div>
    </div>
  );
};

export {
  TrustBadge,
  TrustBar,
  TrustIndicators,
  GuaranteeBox,
  SocialProofNumber,
  PremiumTrustStrip,
  CredentialsBar,
};
