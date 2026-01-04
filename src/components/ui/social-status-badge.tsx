// src/components/ui/social-status-badge.tsx

import { cn } from '@/lib/utils';
import { Clock, CheckCircle, Calendar, XCircle, Loader2, Trash2 } from 'lucide-react';

const STATUS_CONFIG = {
  'SM-Pending': {
    icon: Clock,
    bg: 'bg-yellow-100',
    text: 'text-yellow-700',
    border: 'border-yellow-200',
    label: 'Pending'
  },
  'SM-Posted': {
    icon: CheckCircle,
    bg: 'bg-green-100',
    text: 'text-green-700',
    border: 'border-green-200',
    label: 'Posted'
  },
  'SM-Scheduled': {
    icon: Calendar,
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    border: 'border-blue-200',
    label: 'Scheduled'
  },
  'SM-Skipped': {
    icon: XCircle,
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    border: 'border-gray-200',
    label: 'Skipped'
  },
  'SM-Processing': {
    icon: Loader2,
    bg: 'bg-purple-100',
    text: 'text-purple-700',
    border: 'border-purple-200',
    label: 'Processing'
  },
  'SM-Deleted': {
    icon: Trash2,
    bg: 'bg-red-100',
    text: 'text-red-700',
    border: 'border-red-200',
    label: 'Deleted'
  },
  // Support for lowercase status values
  'pending': {
    icon: Clock,
    bg: 'bg-yellow-100',
    text: 'text-yellow-700',
    border: 'border-yellow-200',
    label: 'Pending'
  },
  'posted': {
    icon: CheckCircle,
    bg: 'bg-green-100',
    text: 'text-green-700',
    border: 'border-green-200',
    label: 'Posted'
  },
  'scheduled': {
    icon: Calendar,
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    border: 'border-blue-200',
    label: 'Scheduled'
  },
  'skipped': {
    icon: XCircle,
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    border: 'border-gray-200',
    label: 'Skipped'
  },
  'processing': {
    icon: Loader2,
    bg: 'bg-purple-100',
    text: 'text-purple-700',
    border: 'border-purple-200',
    label: 'Processing'
  },
  'deleted': {
    icon: Trash2,
    bg: 'bg-red-100',
    text: 'text-red-700',
    border: 'border-red-200',
    label: 'Deleted'
  },
};

type SocialStatus = keyof typeof STATUS_CONFIG;

interface SocialStatusBadgeProps {
  status: SocialStatus | string;
  className?: string;
}

export function SocialStatusBadge({ status, className }: SocialStatusBadgeProps) {
  const config = STATUS_CONFIG[status as SocialStatus] || STATUS_CONFIG['SM-Pending'];
  const Icon = config.icon;

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
      config.bg,
      config.text,
      config.border,
      (status === 'SM-Processing' || status === 'processing') && '[&>svg]:animate-spin',
      className
    )}>
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </span>
  );
}
