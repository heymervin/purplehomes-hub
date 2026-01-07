/**
 * Zillow Filters Component
 * Filter bar for Zillow search results
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import type { ZillowFilterState } from '@/types/matching';

interface ZillowFiltersProps {
  filters: ZillowFilterState;
  onFiltersChange: (filters: ZillowFilterState) => void;
  counts: {
    perfect: number;
    near: number;
    stretch: number;
    partial: number;
  };
  totalResults: number;
}

export function ZillowFilters({
  filters,
  onFiltersChange,
  counts,
  totalResults
}: ZillowFiltersProps) {

  const toggleFilter = (key: keyof ZillowFilterState) => {
    onFiltersChange({ ...filters, [key]: !filters[key] });
  };

  const resetFilters = () => {
    onFiltersChange({
      showPerfect: true,
      showNear: true,
      showStretch: false,
      withinBudget: false,
      meetsBeds: false,
      meetsBaths: false,
    });
  };

  return (
    <div className="bg-gray-50 border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm text-gray-700">
          Filter Results ({totalResults} found)
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={resetFilters}
          className="text-xs h-7"
        >
          <RotateCcw className="h-3 w-3 mr-1" />
          Reset
        </Button>
      </div>

      {/* Match Type Toggles */}
      <div className="space-y-2">
        <span className="text-xs font-medium text-gray-500">Match Type:</span>
        <div className="flex flex-wrap gap-2">
          <FilterToggle
            active={filters.showPerfect}
            onClick={() => toggleFilter('showPerfect')}
            color="green"
          >
            Perfect ({counts.perfect})
          </FilterToggle>
          <FilterToggle
            active={filters.showNear}
            onClick={() => toggleFilter('showNear')}
            color="yellow"
          >
            Near ({counts.near})
          </FilterToggle>
          <FilterToggle
            active={filters.showStretch}
            onClick={() => toggleFilter('showStretch')}
            color="orange"
          >
            Stretch ({counts.stretch + counts.partial})
          </FilterToggle>
        </div>
      </div>

      {/* Quick Filters */}
      <div className="space-y-2">
        <span className="text-xs font-medium text-gray-500">Quick Filters:</span>
        <div className="flex flex-wrap gap-2">
          <FilterToggle
            active={filters.withinBudget}
            onClick={() => toggleFilter('withinBudget')}
            color="purple"
          >
            Within Budget
          </FilterToggle>
          <FilterToggle
            active={filters.meetsBeds}
            onClick={() => toggleFilter('meetsBeds')}
            color="purple"
          >
            Meets Bed Count
          </FilterToggle>
          <FilterToggle
            active={filters.meetsBaths}
            onClick={() => toggleFilter('meetsBaths')}
            color="purple"
          >
            Meets Bath Count
          </FilterToggle>
        </div>
      </div>
    </div>
  );
}

interface FilterToggleProps {
  active: boolean;
  onClick: () => void;
  color: 'green' | 'yellow' | 'orange' | 'purple';
  children: React.ReactNode;
}

function FilterToggle({ active, onClick, color, children }: FilterToggleProps) {
  const colorClasses = {
    green: active
      ? 'bg-green-500 text-white border-green-500'
      : 'bg-white text-gray-700 border-gray-200 hover:border-green-300 hover:bg-green-50',
    yellow: active
      ? 'bg-yellow-500 text-white border-yellow-500'
      : 'bg-white text-gray-700 border-gray-200 hover:border-yellow-300 hover:bg-yellow-50',
    orange: active
      ? 'bg-orange-500 text-white border-orange-500'
      : 'bg-white text-gray-700 border-gray-200 hover:border-orange-300 hover:bg-orange-50',
    purple: active
      ? 'bg-purple-500 text-white border-purple-500'
      : 'bg-white text-gray-700 border-gray-200 hover:border-purple-300 hover:bg-purple-50',
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors",
        colorClasses[color]
      )}
    >
      {children}
    </button>
  );
}
