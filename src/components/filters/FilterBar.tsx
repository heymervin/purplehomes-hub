/**
 * FilterBar - Horizontal container for filters
 *
 * Features:
 * - Flex container with gap-2
 * - Responsive wrapping on mobile
 * - Clear All button (only visible when filters are active)
 */

import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilterBarProps {
  children: React.ReactNode;
  hasActiveFilters?: boolean;
  onClearAll?: () => void;
  className?: string;
}

export function FilterBar({
  children,
  hasActiveFilters = false,
  onClearAll,
  className,
}: FilterBarProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 py-2',
        className
      )}
    >
      {children}
      {hasActiveFilters && onClearAll && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="h-9 text-muted-foreground hover:text-foreground ml-auto"
        >
          <X className="h-4 w-4 mr-1" />
          Clear All
        </Button>
      )}
    </div>
  );
}
