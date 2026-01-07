/**
 * Match Type Badge Component
 * Shows Perfect/Near/Stretch/Partial match badge
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Check, AlertTriangle, Circle } from 'lucide-react';

interface MatchTypeBadgeProps {
  matchType: 'perfect' | 'near' | 'stretch' | 'partial';
  size?: 'sm' | 'md' | 'lg';
}

export function MatchTypeBadge({ matchType, size = 'md' }: MatchTypeBadgeProps) {
  const config = {
    perfect: {
      bg: 'bg-green-500',
      text: 'text-white',
      label: 'PERFECT MATCH',
      icon: Check,
    },
    near: {
      bg: 'bg-yellow-500',
      text: 'text-white',
      label: 'NEAR MATCH',
      icon: AlertTriangle,
    },
    stretch: {
      bg: 'bg-orange-500',
      text: 'text-white',
      label: 'STRETCH MATCH',
      icon: Circle,
    },
    partial: {
      bg: 'bg-gray-400',
      text: 'text-white',
      label: 'PARTIAL MATCH',
      icon: Circle,
    },
  };

  const { bg, text, label, icon: Icon } = config[matchType];

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };

  return (
    <div className={cn(
      "inline-flex items-center gap-1 rounded-md font-semibold",
      bg,
      text,
      sizeClasses[size]
    )}>
      <Icon className={cn(size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
      {label}
    </div>
  );
}
