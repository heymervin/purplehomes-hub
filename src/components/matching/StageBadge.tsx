/**
 * StageBadge - Compact stage indicator for property cards
 *
 * Shows current deal stage with appropriate color and icon.
 * Designed to be small and non-intrusive on property cards.
 */

import {
  Send,
  MessageSquare,
  Calendar,
  Eye,
  FileText,
  FileCheck,
  BadgeCheck,
  Trophy,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { MatchDealStage } from '@/types/associations';

interface StageConfig {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  shortLabel: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
}

const STAGE_CONFIGS: Record<MatchDealStage, StageConfig> = {
  'Sent to Buyer': {
    icon: Send,
    label: 'Sent to Buyer',
    shortLabel: 'Sent',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
  },
  'Buyer Responded': {
    icon: MessageSquare,
    label: 'Interested',
    shortLabel: 'Interested',
    bgColor: 'bg-cyan-50',
    textColor: 'text-cyan-700',
    borderColor: 'border-cyan-200',
  },
  'Showing Scheduled': {
    icon: Calendar,
    label: 'Showing Scheduled',
    shortLabel: 'Scheduled',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-200',
  },
  'Property Viewed': {
    icon: Eye,
    label: 'Property Viewed',
    shortLabel: 'Viewed',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-700',
    borderColor: 'border-purple-200',
  },
  'Underwriting': {
    icon: FileText,
    label: 'Underwriting',
    shortLabel: 'Underwriting',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-200',
  },
  'Contracts': {
    icon: FileCheck,
    label: 'Contracts',
    shortLabel: 'Contracts',
    bgColor: 'bg-indigo-50',
    textColor: 'text-indigo-700',
    borderColor: 'border-indigo-200',
  },
  'Qualified': {
    icon: BadgeCheck,
    label: 'Qualified',
    shortLabel: 'Qualified',
    bgColor: 'bg-teal-50',
    textColor: 'text-teal-700',
    borderColor: 'border-teal-200',
  },
  'Closed Deal / Won': {
    icon: Trophy,
    label: 'Closed Deal / Won',
    shortLabel: 'Closed',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    borderColor: 'border-emerald-200',
  },
  'Not Interested': {
    icon: XCircle,
    label: 'Not Interested',
    shortLabel: 'Not Interested',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
  },
};

interface StageBadgeProps {
  stage: MatchDealStage;
  size?: 'sm' | 'md';
  showIcon?: boolean;
  className?: string;
}

export function StageBadge({
  stage,
  size = 'sm',
  showIcon = true,
  className,
}: StageBadgeProps) {
  const config = STAGE_CONFIGS[stage] || STAGE_CONFIGS['Sent to Buyer'];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        'font-medium border',
        config.bgColor,
        config.textColor,
        config.borderColor,
        size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1',
        className
      )}
    >
      {showIcon && (
        <Icon className={cn('mr-1', size === 'sm' ? 'h-3 w-3' : 'h-4 w-4')} />
      )}
      {size === 'sm' ? config.shortLabel : config.label}
    </Badge>
  );
}

export default StageBadge;
