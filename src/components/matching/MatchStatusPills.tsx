/**
 * Match Status Pills Component
 * Displays colored pills showing match status for each criterion
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Check, AlertTriangle, X } from 'lucide-react';
import type { ZillowMatchStatus } from '@/types/matching';

interface MatchStatusPillsProps {
  matchStatus: ZillowMatchStatus;
  compact?: boolean;
}

export function MatchStatusPills({ matchStatus, compact = false }: MatchStatusPillsProps) {
  const { budget, bedrooms, bathrooms, location } = matchStatus;

  return (
    <div className={cn(
      "grid gap-1",
      compact ? "grid-cols-4" : "grid-cols-2 sm:grid-cols-4"
    )}>
      <StatusPill
        label="Budget"
        status={budget.status}
        detail={budget.label}
        compact={compact}
      />
      <StatusPill
        label="Beds"
        status={bedrooms.status}
        detail={bedrooms.label}
        compact={compact}
      />
      <StatusPill
        label="Baths"
        status={bathrooms.status}
        detail={bathrooms.label}
        compact={compact}
      />
      <StatusPill
        label="Location"
        status={location.status}
        detail={location.label}
        compact={compact}
      />
    </div>
  );
}

interface StatusPillProps {
  label: string;
  status: 'met' | 'close' | 'miss' | 'over';
  detail: string;
  compact?: boolean;
}

function StatusPill({ label, status, detail, compact }: StatusPillProps) {
  const statusConfig = {
    met: {
      bg: 'bg-green-100',
      text: 'text-green-800',
      icon: Check,
      iconColor: 'text-green-600',
    },
    close: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-800',
      icon: AlertTriangle,
      iconColor: 'text-yellow-600',
    },
    miss: {
      bg: 'bg-red-100',
      text: 'text-red-800',
      icon: X,
      iconColor: 'text-red-600',
    },
    over: {
      bg: 'bg-red-100',
      text: 'text-red-800',
      icon: X,
      iconColor: 'text-red-600',
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className={cn(
      "rounded-lg px-2 py-1.5",
      config.bg,
      config.text,
      compact ? "text-xs" : "text-xs sm:text-sm"
    )}>
      <div className="flex items-center gap-1">
        <Icon className={cn("flex-shrink-0", config.iconColor, compact ? "h-3 w-3" : "h-3.5 w-3.5")} />
        <span className="font-medium">{label}</span>
      </div>
      <div className={cn("truncate", compact ? "text-[10px]" : "text-xs")}>
        {detail}
      </div>
    </div>
  );
}
