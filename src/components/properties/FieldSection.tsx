// src/components/properties/FieldSection.tsx

import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface FieldSectionProps {
  title: string;
  icon: LucideIcon;
  iconColor?: string;
  children: React.ReactNode;
  className?: string;
}

export function FieldSection({
  title,
  icon: Icon,
  iconColor = 'text-purple-600',
  children,
  className
}: FieldSectionProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <Icon className={cn('h-4 w-4', iconColor)} aria-hidden="true" />
        <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          {title}
        </h4>
      </div>

      {/* Section Content */}
      <div className="p-4 bg-muted/30 rounded-lg border">
        {children}
      </div>
    </div>
  );
}
