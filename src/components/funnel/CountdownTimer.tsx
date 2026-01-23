import * as React from "react";
import { cn } from "@/lib/utils";
import { Clock, AlertTriangle, Flame, Eye, Sparkles } from "lucide-react";

interface TimeUnit {
  value: number;
  label: string;
}

interface CountdownTimerProps {
  /** Target date/time to count down to */
  targetDate?: Date;
  /** Or specify duration in hours from now */
  hoursFromNow?: number;
  /** Title above timer */
  title?: string;
  /** Subtitle/description */
  subtitle?: string;
  /** Visual variant */
  variant?: "default" | "urgent" | "banner" | "compact" | "premium" | "luxury";
  /** Called when timer reaches zero */
  onComplete?: () => void;
  className?: string;
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({
  targetDate,
  hoursFromNow = 48,
  title = "Limited Time Offer",
  subtitle = "This special pricing expires soon",
  variant = "default",
  onComplete,
  className,
}) => {
  const [timeLeft, setTimeLeft] = React.useState<TimeUnit[]>([]);
  const [isExpired, setIsExpired] = React.useState(false);

  const target = React.useMemo(() => {
    if (targetDate) return targetDate;
    const date = new Date();
    date.setHours(date.getHours() + hoursFromNow);
    return date;
  }, [targetDate, hoursFromNow]);

  React.useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const distance = target.getTime() - now;

      if (distance <= 0) {
        setIsExpired(true);
        onComplete?.();
        return [
          { value: 0, label: "Days" },
          { value: 0, label: "Hours" },
          { value: 0, label: "Min" },
          { value: 0, label: "Sec" },
        ];
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      return [
        { value: days, label: "Days" },
        { value: hours, label: "Hours" },
        { value: minutes, label: "Min" },
        { value: seconds, label: "Sec" },
      ];
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [target, onComplete]);

  // Variant styles
  const variants = {
    default: {
      container: "bg-white rounded-2xl p-6 shadow-lg border border-gray-100",
      title: "text-gray-900",
      subtitle: "text-gray-500",
      unitBg: "bg-red-500",
      unitText: "text-white",
      labelColor: "text-gray-500",
    },
    urgent: {
      container: "bg-gradient-to-r from-red-500 to-red-600 rounded-2xl p-6 shadow-xl",
      title: "text-white",
      subtitle: "text-red-100",
      unitBg: "bg-white/20 backdrop-blur-sm",
      unitText: "text-white",
      labelColor: "text-red-100",
    },
    banner: {
      container: "bg-gradient-to-r from-red-500 to-orange-500 py-3 px-4 shadow-md",
      title: "text-white",
      subtitle: "text-white/80",
      unitBg: "bg-white/20",
      unitText: "text-white",
      labelColor: "text-white/80",
    },
    compact: {
      container: "bg-red-50 rounded-lg p-4 border border-red-200",
      title: "text-red-800",
      subtitle: "text-red-600",
      unitBg: "bg-red-500",
      unitText: "text-white",
      labelColor: "text-red-600",
    },
    premium: {
      container: "bg-gradient-to-br from-gray-900 via-gray-800 to-black rounded-2xl p-8 shadow-2xl border border-purple-500/20 relative overflow-hidden",
      title: "text-white",
      subtitle: "text-gray-400",
      unitBg: "bg-gradient-to-br from-purple-500 to-purple-700",
      unitText: "text-white",
      labelColor: "text-gray-500",
    },
    luxury: {
      container: "bg-gradient-to-br from-purple-50 via-white to-purple-50 rounded-2xl p-8 shadow-xl border border-purple-200 relative overflow-hidden",
      title: "text-gray-900",
      subtitle: "text-purple-700",
      unitBg: "bg-gradient-to-br from-gray-900 to-black",
      unitText: "text-purple-400",
      labelColor: "text-purple-800",
    },
  };

  const style = variants[variant];

  if (variant === "banner") {
    return (
      <div className={cn(style.container, className)}>
        <div className="container mx-auto flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-white" />
            <span className={cn("font-bold", style.title)}>{title}</span>
          </div>
          <div className="flex items-center gap-2">
            {timeLeft.map((unit, index) => (
              <React.Fragment key={unit.label}>
                <div
                  className={cn(
                    "px-2 py-1 rounded text-center min-w-[40px]",
                    style.unitBg
                  )}
                >
                  <span
                    className={cn("text-lg font-bold tabular-nums", style.unitText)}
                  >
                    {String(unit.value).padStart(2, "0")}
                  </span>
                  <span className={cn("text-xs ml-1", style.unitText)}>
                    {unit.label}
                  </span>
                </div>
                {index < timeLeft.length - 1 && (
                  <span className="text-white/60">:</span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className={cn(style.container, "flex items-center gap-4", className)}>
        <Clock className="h-5 w-5 text-red-500 flex-shrink-0" />
        <div className="flex-1">
          <span className={cn("font-semibold", style.title)}>{title}: </span>
          <span className={cn("font-bold tabular-nums", style.subtitle)}>
            {timeLeft.map((u) => String(u.value).padStart(2, "0")).join(":")}
          </span>
        </div>
      </div>
    );
  }

  // Premium and Luxury variants
  if (variant === "premium" || variant === "luxury") {
    return (
      <div className={cn(style.container, "text-center", className)}>
        {/* Decorative elements */}
        {variant === "premium" && (
          <div className="absolute top-0 right-0 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl" />
        )}

        {/* Icon */}
        <div className={cn(
          "inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-5",
          variant === "premium"
            ? "bg-gradient-to-br from-purple-500 to-purple-700 shadow-lg shadow-purple-500/30"
            : "bg-gray-900 shadow-lg"
        )}>
          {variant === "premium" ? (
            <Sparkles className="h-7 w-7 text-white" />
          ) : (
            <Clock className="h-7 w-7 text-purple-400" />
          )}
        </div>

        <h3 className={cn("text-2xl font-bold mb-2", style.title)}>{title}</h3>
        <p className={cn("text-sm mb-8", style.subtitle)}>{subtitle}</p>

        <div className="flex justify-center gap-4">
          {timeLeft.map((unit, index) => (
            <React.Fragment key={unit.label}>
              <div className="text-center">
                <div
                  className={cn(
                    "rounded-xl px-5 py-4 min-w-[80px] shadow-lg",
                    style.unitBg
                  )}
                >
                  <div className={cn("text-4xl font-extrabold tabular-nums", style.unitText)}>
                    {String(unit.value).padStart(2, "0")}
                  </div>
                </div>
                <div
                  className={cn(
                    "text-xs font-semibold uppercase mt-3 tracking-wider",
                    style.labelColor
                  )}
                >
                  {unit.label}
                </div>
              </div>
              {index < timeLeft.length - 1 && (
                <div className={cn(
                  "self-center text-2xl font-bold",
                  variant === "premium" ? "text-purple-400/50" : "text-purple-600/50"
                )}>
                  :
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        {isExpired && (
          <p className={cn("mt-6 font-semibold", style.title)}>
            Offer has expired!
          </p>
        )}
      </div>
    );
  }

  // Default and urgent variants
  return (
    <div className={cn(style.container, "text-center", className)}>
      {variant === "urgent" && (
        <AlertTriangle className="h-8 w-8 mx-auto mb-3 text-white" />
      )}
      <h3 className={cn("text-xl font-bold mb-1", style.title)}>{title}</h3>
      <p className={cn("text-sm mb-6", style.subtitle)}>{subtitle}</p>

      <div className="flex justify-center gap-3">
        {timeLeft.map((unit) => (
          <div key={unit.label} className="text-center">
            <div
              className={cn(
                "rounded-lg px-4 py-3 min-w-[70px]",
                style.unitBg
              )}
            >
              <div className={cn("text-3xl font-extrabold tabular-nums", style.unitText)}>
                {String(unit.value).padStart(2, "0")}
              </div>
            </div>
            <div
              className={cn(
                "text-xs font-semibold uppercase mt-2 tracking-wide",
                style.labelColor
              )}
            >
              {unit.label}
            </div>
          </div>
        ))}
      </div>

      {isExpired && (
        <p className={cn("mt-4 font-semibold", style.title)}>
          Offer has expired!
        </p>
      )}
    </div>
  );
};

// Scarcity Badge - Premium edition
interface ScarcityBadgeProps {
  count?: number;
  label?: string;
  className?: string;
  variant?: "default" | "premium";
}

const ScarcityBadge: React.FC<ScarcityBadgeProps> = ({
  count = 3,
  label = "spots left at this price",
  className,
  variant = "default",
}) => {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300",
        variant === "premium"
          ? "bg-gradient-to-r from-purple-100 to-purple-50 text-purple-900 border border-purple-300 shadow-md hover:shadow-lg"
          : "bg-purple-50 text-purple-800 border border-purple-200",
        className
      )}
    >
      <Flame className={cn(
        "h-4 w-4",
        variant === "premium" ? "text-purple-600" : "text-purple-600"
      )} />
      <span>
        Only <strong className={variant === "premium" ? "text-purple-700" : ""}>{count}</strong> {label}
      </span>
    </div>
  );
};

// Live Viewers Indicator - Premium edition
interface LiveViewersProps {
  count?: number;
  className?: string;
  variant?: "default" | "premium";
}

const LiveViewers: React.FC<LiveViewersProps> = ({ count = 5, className, variant = "default" }) => {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300",
        variant === "premium"
          ? "bg-gradient-to-r from-emerald-500/10 to-green-500/10 text-emerald-700 border border-emerald-200 backdrop-blur-sm"
          : "bg-green-50 text-green-700",
        className
      )}
    >
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        <span className={cn(
          "relative inline-flex rounded-full h-2.5 w-2.5",
          variant === "premium" ? "bg-emerald-500" : "bg-green-500"
        )}></span>
      </span>
      <Eye className="h-4 w-4 opacity-70" />
      <span>
        <strong>{count}</strong> {count === 1 ? "person" : "people"} viewing
      </span>
    </div>
  );
};

// Urgency Banner - Full width
interface UrgencyBannerProps {
  message: string;
  className?: string;
  variant?: "default" | "premium";
}

const UrgencyBanner: React.FC<UrgencyBannerProps> = ({
  message,
  className,
  variant = "default",
}) => {
  return (
    <div
      className={cn(
        "py-3 px-4 text-center font-semibold",
        variant === "premium"
          ? "bg-gradient-to-r from-purple-600 via-purple-700 to-purple-600 text-white"
          : "bg-gradient-to-r from-purple-500 to-purple-600 text-white",
        className
      )}
    >
      <div className="flex items-center justify-center gap-2">
        <Flame className="h-4 w-4" />
        <span>{message}</span>
        <Flame className="h-4 w-4" />
      </div>
    </div>
  );
};

export { CountdownTimer, ScarcityBadge, LiveViewers, UrgencyBanner };
