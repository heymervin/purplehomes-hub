/**
 * MetricCard - Big number stat card for pipeline metrics
 *
 * Displays a key metric with icon, optional trend indicator,
 * and subtle gradient background.
 */

import { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  trend?: string;
  trendUp?: boolean;
  subtext?: string;
  className?: string;
  iconColor?: string;
  iconBg?: string;
}

export function MetricCard({
  icon: Icon,
  label,
  value,
  trend,
  trendUp,
  subtext,
  className,
  iconColor = 'text-primary',
  iconBg = 'bg-primary/10',
}: MetricCardProps) {
  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <div className="relative p-6">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-muted-foreground truncate">
              {label}
            </p>
            <p className="text-[22px] font-semibold tracking-tight mt-1 truncate">{value}</p>
            {trend && (
              <p
                className={cn(
                  'text-xs mt-1 font-medium',
                  trendUp ? 'text-green-600' : 'text-muted-foreground'
                )}
              >
                {trend}
              </p>
            )}
            {subtext && (
              <p className="text-xs text-muted-foreground mt-1">{subtext}</p>
            )}
          </div>
          <div className={cn('p-3 rounded-lg flex-shrink-0', iconBg)}>
            <Icon className={cn('h-6 w-6', iconColor)} />
          </div>
        </div>
      </div>
    </Card>
  );
}

/**
 * Format currency for display (e.g., $1.2M)
 */
export function formatPipelineValue(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`;
  }
  return `$${value.toLocaleString()}`;
}
