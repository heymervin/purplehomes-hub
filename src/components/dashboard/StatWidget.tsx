import { LucideIcon, TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

export interface StatWidgetProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: number;
    label?: string;
  };
  href?: string;
  variant?: 'default' | 'primary' | 'warning' | 'success' | 'info' | 'muted' | 'purple';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  className?: string;
}

const variantStyles = {
  default: {
    text: 'text-foreground',
    icon: 'bg-muted text-muted-foreground',
    border: 'hover:border-border',
  },
  primary: {
    text: 'text-primary',
    icon: 'bg-primary/10 text-primary',
    border: 'hover:border-primary/50',
  },
  warning: {
    text: 'text-amber-600 dark:text-amber-400',
    icon: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
    border: 'hover:border-amber-500/50',
  },
  success: {
    text: 'text-emerald-600 dark:text-emerald-400',
    icon: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
    border: 'hover:border-emerald-500/50',
  },
  info: {
    text: 'text-blue-600 dark:text-blue-400',
    icon: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    border: 'hover:border-blue-500/50',
  },
  muted: {
    text: 'text-muted-foreground',
    icon: 'bg-muted text-muted-foreground',
    border: 'hover:border-muted-foreground/30',
  },
  purple: {
    text: 'text-primary',
    icon: 'bg-primary/10 text-primary',
    border: 'hover:border-primary/50',
  },
};

const sizeStyles = {
  sm: {
    padding: 'p-4',
    title: 'text-xs',
    value: 'text-xl',
    icon: 'p-2',
    iconSize: 'h-4 w-4',
  },
  md: {
    padding: 'p-5',
    title: 'text-sm',
    value: 'text-2xl',
    icon: 'p-2.5',
    iconSize: 'h-5 w-5',
  },
  lg: {
    padding: 'p-6',
    title: 'text-sm',
    value: 'text-3xl',
    icon: 'p-3',
    iconSize: 'h-6 w-6',
  },
};

export function StatWidget({
  title,
  value,
  icon: Icon,
  description,
  trend,
  href,
  variant = 'default',
  size = 'md',
  isLoading = false,
  className,
}: StatWidgetProps) {
  const navigate = useNavigate();
  const styles = variantStyles[variant];
  const sizes = sizeStyles[size];

  const handleClick = () => {
    if (href) {
      navigate(href);
    }
  };

  const TrendIcon = trend
    ? trend.value > 0
      ? TrendingUp
      : trend.value < 0
      ? TrendingDown
      : Minus
    : null;

  const trendColor = trend
    ? trend.value > 0
      ? 'text-emerald-600 dark:text-emerald-400'
      : trend.value < 0
      ? 'text-red-600 dark:text-red-400'
      : 'text-muted-foreground'
    : '';

  return (
    <Card
      className={cn(
        'transition-all duration-200 border',
        href && 'cursor-pointer hover:shadow-md',
        styles.border,
        className
      )}
      onClick={href ? handleClick : undefined}
    >
      <CardContent className={sizes.padding}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className={cn('text-muted-foreground font-medium mb-1', sizes.title)}>
              {title}
            </p>
            {isLoading ? (
              <div className="flex items-center gap-2 h-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <p className={cn('font-bold tabular-nums', sizes.value, styles.text)}>
                {typeof value === 'number' ? value.toLocaleString() : value}
              </p>
            )}
            {(description || trend) && (
              <div className="flex items-center gap-2 mt-1.5">
                {trend && TrendIcon && (
                  <span className={cn('flex items-center text-xs font-medium', trendColor)}>
                    <TrendIcon className="h-3 w-3 mr-0.5" />
                    {Math.abs(trend.value)}%
                  </span>
                )}
                {description && (
                  <span className="text-xs text-muted-foreground truncate">
                    {description}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className={cn('rounded-xl flex-shrink-0', sizes.icon, styles.icon)}>
            <Icon className={sizes.iconSize} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Compact stat for inline display in widget grids
 */
export interface CompactStatProps {
  label: string;
  value: number | string;
  icon?: LucideIcon;
  variant?: 'default' | 'success' | 'warning' | 'muted';
}

export function CompactStat({ label, value, icon: Icon, variant = 'default' }: CompactStatProps) {
  const colorClass = {
    default: 'text-foreground',
    success: 'text-emerald-600 dark:text-emerald-400',
    warning: 'text-amber-600 dark:text-amber-400',
    muted: 'text-muted-foreground',
  }[variant];

  return (
    <div className="flex items-center gap-2">
      {Icon && <Icon className={cn('h-4 w-4', colorClass)} />}
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn('text-sm font-semibold tabular-nums', colorClass)}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
      </div>
    </div>
  );
}
