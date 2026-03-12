/**
 * UnifiedPipelineBoard - Unified Kanban board for all pipelines
 *
 * Based on Deal Pipeline's PipelineBoard design:
 * - Colored top border on columns
 * - Horizontal scroll with snap on mobile
 * - Toggle for hidden/lost columns
 * - Consistent card structure
 * - Drag handle + dropdown menu on hover
 */

import { useState, ReactNode } from 'react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Eye, EyeOff } from 'lucide-react';

// Column color presets
export const COLUMN_COLORS: Record<string, string> = {
  // Blues
  blue: 'border-t-blue-500',
  cyan: 'border-t-cyan-500',
  indigo: 'border-t-indigo-500',
  // Warm colors
  amber: 'border-t-amber-500',
  orange: 'border-t-orange-500',
  // Indigo/Pinks
  purple: 'border-t-indigo-500',
  pink: 'border-t-pink-500',
  rose: 'border-t-rose-500',
  // Greens
  emerald: 'border-t-emerald-500',
  teal: 'border-t-teal-500',
  green: 'border-t-green-500',
  // Neutrals
  slate: 'border-t-slate-500',
  gray: 'border-t-gray-400',
  red: 'border-t-red-400',
};

export interface PipelineColumn<T> {
  id: string;
  label: string;
  shortLabel?: string;
  color: string; // Key from COLUMN_COLORS (e.g., 'blue', 'amber') or direct class
  items: T[];
  isHidden?: boolean; // For "Lost" or "Not Interested" columns
}

interface UnifiedPipelineBoardProps<T extends { id: string }> {
  columns: PipelineColumn<T>[];
  renderCard: (item: T) => ReactNode;
  onDrop?: (item: T, toColumnId: string) => void;
  onDragStart?: (e: React.DragEvent, item: T) => void;
  isLoading?: boolean;
  hiddenColumnLabel?: string; // e.g., "Lost", "Not Interested"
  emptyStateMessage?: string;
  showHiddenToggle?: boolean;
}

export function UnifiedPipelineBoard<T extends { id: string }>({
  columns,
  renderCard,
  onDrop,
  onDragStart,
  isLoading = false,
  hiddenColumnLabel = 'Lost',
  emptyStateMessage = 'No items in this stage',
  showHiddenToggle = true,
}: UnifiedPipelineBoardProps<T>) {
  const [showHidden, setShowHidden] = useState(false);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [draggedItem, setDraggedItem] = useState<T | null>(null);

  // Filter columns based on hidden toggle
  const visibleColumns = columns.filter((col) => {
    if (col.isHidden && !showHidden) return false;
    return true;
  });

  // Count hidden column items
  const hiddenColumn = columns.find((col) => col.isHidden);
  const hiddenCount = hiddenColumn?.items.length || 0;

  // Handle drag events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    setDragOverColumn(null);

    if (draggedItem && onDrop) {
      onDrop(draggedItem, columnId);
    }
    setDraggedItem(null);
  };

  const handleDragStart = (e: React.DragEvent, item: T) => {
    setDraggedItem(item);
    e.dataTransfer.setData('text/plain', item.id);
    e.dataTransfer.effectAllowed = 'move';
    onDragStart?.(e, item);
  };

  // Get column border color class
  const getColumnColor = (colorKey: string) => {
    // Check if it's a preset color key
    if (COLUMN_COLORS[colorKey]) {
      return COLUMN_COLORS[colorKey];
    }
    // Check if it's already a border class
    if (colorKey.startsWith('border-t-')) {
      return colorKey;
    }
    // Check if it's a bg- class and convert to border
    if (colorKey.startsWith('bg-')) {
      return colorKey.replace('bg-', 'border-t-');
    }
    // If it looks like a color value (e.g., 'blue-500'), add border-t- prefix
    if (/^[a-z]+-\d{2,3}$/.test(colorKey)) {
      return `border-t-${colorKey}`;
    }
    // Default
    return 'border-t-gray-400';
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex-shrink-0 w-72">
            <Skeleton className="h-10 w-full mb-2" />
            <div className="space-y-2">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toggle for hidden column */}
      {showHiddenToggle && hiddenColumn && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHidden(!showHidden)}
            className="text-muted-foreground"
          >
            {showHidden ? (
              <>
                <EyeOff className="h-4 w-4 mr-1" />
                Hide {hiddenColumnLabel}
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-1" />
                Show {hiddenColumnLabel} ({hiddenCount})
              </>
            )}
          </Button>
        </div>
      )}

      {/* Kanban board - horizontal scroll with snap on mobile */}
      <div className="w-full overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
        <div className="flex gap-4 pb-4 min-w-max snap-x snap-mandatory md:snap-none scroll-smooth" style={{ minWidth: 'max-content' }}>
          {visibleColumns.map((column) => {
            const isDropTarget = dragOverColumn === column.id;

            return (
              <div
                key={column.id}
                className={cn(
                  'flex-shrink-0 w-[85vw] sm:w-72 bg-muted/30 rounded-lg border-t-4 transition-colors snap-center',
                  getColumnColor(column.color),
                  isDropTarget && 'bg-muted/60 ring-2 ring-primary/20'
                )}
                onDragOver={(e) => {
                  handleDragOver(e);
                  setDragOverColumn(column.id);
                }}
                onDragLeave={() => setDragOverColumn(null)}
                onDrop={(e) => handleDrop(e, column.id)}
              >
                {/* Column header */}
                <div className="p-3 font-semibold flex justify-between items-center sticky top-0 bg-inherit">
                  <span className="truncate">
                    {column.shortLabel || column.label}
                  </span>
                  <span className="text-sm text-muted-foreground font-normal">
                    {column.items.length}
                  </span>
                </div>

                {/* Column content */}
                <div className="p-2 space-y-2 min-h-[200px] max-h-[calc(100vh-280px)] overflow-y-auto">
                  {column.items.length === 0 ? (
                    <EmptyStageState message={emptyStateMessage} />
                  ) : (
                    column.items.map((item) => (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, item)}
                        className="cursor-grab active:cursor-grabbing"
                      >
                        {renderCard(item)}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Empty state component
function EmptyStageState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-24 text-sm text-muted-foreground border-2 border-dashed border-border/50 rounded-lg bg-muted/20">
      {message}
    </div>
  );
}

export default UnifiedPipelineBoard;
