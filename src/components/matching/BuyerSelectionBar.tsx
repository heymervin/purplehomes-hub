import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Send, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BuyerSelectionBarProps {
  selectedCount: number;
  totalCount: number;
  allSelected: boolean;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onSendSelected: () => void;
}

export function BuyerSelectionBar({
  selectedCount,
  totalCount,
  allSelected,
  onSelectAll,
  onClearSelection,
  onSendSelected,
}: BuyerSelectionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      className={cn(
        "fixed bottom-6 left-1/2 -translate-x-1/2 z-50",
        "animate-in slide-in-from-bottom-5 duration-300"
      )}
    >
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border-2 border-purple-200 px-6 py-4 max-w-2xl">
        <div className="flex items-center gap-6">
          {/* Select All Checkbox */}
          <div className="flex items-center gap-2">
            <Checkbox
              checked={allSelected}
              onCheckedChange={onSelectAll}
              className="h-5 w-5"
              aria-label="Select all buyers"
            />
            <span className="text-sm font-medium text-gray-700">
              Select All
            </span>
          </div>

          {/* Divider */}
          <div className="h-8 w-px bg-gray-300" />

          {/* Count Display */}
          <div className="flex-1">
            <p className="text-sm font-semibold text-purple-700">
              {selectedCount} of {totalCount} buyers selected
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onClearSelection}
              className="h-9"
            >
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
            <Button
              size="sm"
              onClick={onSendSelected}
              className="h-9 bg-purple-600 hover:bg-purple-700"
            >
              <Send className="h-4 w-4 mr-1" />
              Send Property
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
