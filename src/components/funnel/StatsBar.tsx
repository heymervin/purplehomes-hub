import * as React from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, Sparkles, type LucideIcon } from "lucide-react";

interface Stat {
  value: string;
  label: string;
  icon?: LucideIcon;
  prefix?: string;
  suffix?: string;
}

interface StatsBarProps {
  stats: Stat[];
  className?: string;
  variant?: "dark" | "light" | "gradient" | "cards" | "premium" | "luxury";
}

const defaultStats: Stat[] = [
  { value: "500", label: "Families Helped", suffix: "+" },
  { value: "15", label: "Years Experience", suffix: "+" },
  { value: "98", label: "Satisfaction Rate", suffix: "%" },
  { value: "24", label: "Hour Response", prefix: "<" },
];

const StatsBar: React.FC<StatsBarProps> = ({
  stats = defaultStats,
  className,
  variant = "dark",
}) => {
  const variants = {
    dark: {
      container: "bg-gradient-to-br from-gray-900 to-gray-800 text-white",
      value: "text-indigo-500",
      label: "text-gray-400",
    },
    light: {
      container: "bg-white border border-gray-200 shadow-lg text-gray-900",
      value: "text-indigo-600",
      label: "text-gray-500",
    },
    gradient: {
      container: "bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-800 text-white",
      value: "text-white",
      label: "text-indigo-200",
    },
    cards: {
      container: "bg-transparent",
      value: "text-indigo-600",
      label: "text-gray-500",
    },
    premium: {
      container: "bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white border-y border-indigo-500/20",
      value: "bg-gradient-to-r from-indigo-400 via-indigo-400 to-indigo-500 bg-clip-text text-transparent",
      label: "text-gray-500",
    },
    luxury: {
      container: "bg-gradient-to-r from-indigo-50 via-white to-indigo-50 border-y border-indigo-200",
      value: "bg-gradient-to-r from-indigo-600 via-indigo-600 to-indigo-700 bg-clip-text text-transparent",
      label: "text-indigo-800/70",
    },
  };

  const style = variants[variant];

  // Premium cards variant
  if (variant === "cards") {
    return (
      <div
        className={cn(
          "grid grid-cols-2 md:grid-cols-4 gap-4",
          className
        )}
      >
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 text-center hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
          >
            {stat.icon && (
              <stat.icon className="h-8 w-8 text-indigo-500 mx-auto mb-3 group-hover:scale-110 transition-transform" />
            )}
            <div className={cn("text-4xl font-extrabold", style.value)}>
              {stat.prefix}
              {stat.value}
              {stat.suffix}
            </div>
            <div className={cn("text-sm mt-1 font-medium tracking-wide", style.label)}>{stat.label}</div>
          </div>
        ))}
      </div>
    );
  }

  // Premium/Luxury variant with dividers - Enhanced
  if (variant === "premium" || variant === "luxury") {
    return (
      <div
        className={cn(
          "py-20 md:py-24 px-6",
          variant === "premium"
            ? "bg-gradient-to-b from-[#0f172a] via-[#1e1b4b] to-[#0f172a]"
            : style.container,
          className
        )}
      >
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4">
            {stats.map((stat, index) => (
              <div
                key={index}
                className={cn(
                  "text-center relative",
                  "before:hidden before:md:block before:absolute before:right-0 before:top-1/2 before:-translate-y-1/2 before:h-16 before:w-px",
                  variant === "premium"
                    ? "before:bg-gradient-to-b before:from-transparent before:via-indigo-500/30 before:to-transparent"
                    : "before:bg-indigo-300",
                  index === stats.length - 1 && "before:hidden"
                )}
              >
                {stat.icon && (
                  <stat.icon className={cn(
                    "h-6 w-6 mx-auto mb-3",
                    variant === "premium" ? "text-indigo-400" : "text-indigo-600"
                  )} />
                )}
                <div className={cn(
                  "text-4xl md:text-5xl lg:text-6xl font-extralight tracking-tight",
                  variant === "premium"
                    ? "text-white/95"
                    : style.value
                )}>
                  {stat.prefix}
                  {stat.value}
                  {stat.suffix}
                </div>
                <div className={cn(
                  "text-xs mt-3 uppercase tracking-[0.15em] font-medium",
                  variant === "premium"
                    ? "text-indigo-400/80"
                    : style.label
                )}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl py-12 px-6",
        style.container,
        className
      )}
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
        {stats.map((stat, index) => (
          <div key={index} className="group">
            {stat.icon && (
              <stat.icon className="h-8 w-8 mx-auto mb-3 opacity-80 group-hover:scale-110 transition-transform" />
            )}
            <div className={cn("text-4xl md:text-5xl font-extrabold", style.value)}>
              {stat.prefix}
              {stat.value}
              {stat.suffix}
            </div>
            <div className={cn("text-sm mt-2 tracking-wide", style.label)}>{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Animated Counter with premium styling
interface AnimatedStatProps {
  value: number;
  label: string;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
  variant?: "default" | "gold";
}

const AnimatedStat: React.FC<AnimatedStatProps> = ({
  value,
  label,
  prefix = "",
  suffix = "",
  duration = 2000,
  className,
  variant = "default",
}) => {
  const [displayValue, setDisplayValue] = React.useState(0);
  const [hasAnimated, setHasAnimated] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          const startTime = Date.now();
          const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplayValue(Math.floor(eased * value));
            if (progress < 1) {
              requestAnimationFrame(animate);
            }
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [value, duration, hasAnimated]);

  return (
    <div ref={ref} className={cn("text-center", className)}>
      <div className={cn(
        "text-4xl md:text-5xl font-extrabold",
        variant === "gold"
          ? "bg-gradient-to-r from-indigo-400 via-indigo-400 to-indigo-500 bg-clip-text text-transparent"
          : "text-indigo-500"
      )}>
        {prefix}
        {displayValue}
        {suffix}
      </div>
      <div className="text-sm text-gray-500 mt-2 font-medium tracking-wide">{label}</div>
    </div>
  );
};

// Inline stat for embedding in text - premium version
interface InlineStatProps {
  value: string;
  label?: string;
  className?: string;
  variant?: "default" | "gold";
}

const InlineStat: React.FC<InlineStatProps> = ({ value, label, className, variant = "default" }) => {
  const styles = {
    default: "bg-indigo-100 text-indigo-700",
    gold: "bg-gradient-to-r from-indigo-100 to-indigo-100 text-indigo-800 border border-indigo-200",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-semibold text-sm",
        styles[variant],
        className
      )}
    >
      {variant === "gold" ? (
        <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
      ) : (
        <TrendingUp className="h-3.5 w-3.5" />
      )}
      {value}
      {label && <span className="opacity-70 font-normal">{label}</span>}
    </span>
  );
};

// Premium Hero Stats - Floating cards
interface HeroStatsProps {
  className?: string;
}

const HeroStats: React.FC<HeroStatsProps> = ({ className }) => {
  return (
    <div className={cn("flex flex-wrap justify-center gap-4", className)}>
      {[
        { value: "500+", label: "Families" },
        { value: "15+", label: "Years" },
        { value: "A+", label: "BBB" },
      ].map((stat, i) => (
        <div
          key={i}
          className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-5 py-3 text-center"
        >
          <div className="text-2xl font-bold text-white">{stat.value}</div>
          <div className="text-xs text-white/70 uppercase tracking-wider">{stat.label}</div>
        </div>
      ))}
    </div>
  );
};

export { StatsBar, AnimatedStat, InlineStat, HeroStats };
