/**
 * Step 1: Select Properties
 *
 * Multi-select properties for batch posting.
 * Supports search, filter, and bulk selection.
 */

import { useState, useMemo } from 'react';
import { Search, CheckSquare, Square, Filter, Image, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { Property } from '@/types';
import type { BatchWizardState } from '../types';

interface SelectPropertiesStepProps {
  properties: Property[];
  state: BatchWizardState;
  onToggleProperty: (propertyId: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

type FilterType = 'all' | 'with-image' | 'without-image';

export default function SelectPropertiesStep({
  properties,
  state,
  onToggleProperty,
  onSelectAll,
  onDeselectAll,
}: SelectPropertiesStepProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');

  // Filter and search properties
  const filteredProperties = useMemo(() => {
    let result = properties;

    // Apply filter
    if (filter === 'with-image') {
      result = result.filter((p) => p.heroImage);
    } else if (filter === 'without-image') {
      result = result.filter((p) => !p.heroImage);
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.address?.toLowerCase().includes(query) ||
          p.propertyCode?.toLowerCase().includes(query) ||
          p.city?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [properties, filter, searchQuery]);

  const selectedCount = state.selectedPropertyIds.length;
  const allFilteredSelected =
    filteredProperties.length > 0 &&
    filteredProperties.every((p) => state.selectedPropertyIds.includes(p.id));

  const handleToggleAll = () => {
    if (allFilteredSelected) {
      onDeselectAll();
    } else {
      onSelectAll();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold">Select Properties</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Choose which properties to include in this batch post
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by address or property code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              {filter === 'all' && 'All Properties'}
              {filter === 'with-image' && 'With Image'}
              {filter === 'without-image' && 'Without Image'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuRadioGroup value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
              <DropdownMenuRadioItem value="all">All Properties</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="with-image">With Image</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="without-image">Without Image</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Select All */}
        <Button variant="outline" size="sm" onClick={handleToggleAll} className="gap-2">
          {allFilteredSelected ? (
            <>
              <CheckSquare className="h-4 w-4" />
              Deselect All
            </>
          ) : (
            <>
              <Square className="h-4 w-4" />
              Select All ({filteredProperties.length})
            </>
          )}
        </Button>
      </div>

      {/* Selection Summary */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg">
          <Badge className="bg-primary">{selectedCount} selected</Badge>
          <span className="text-sm text-muted-foreground">
            {selectedCount === 1 ? 'property' : 'properties'} will be included in this batch
          </span>
        </div>
      )}

      {/* Property List */}
      <ScrollArea className="h-[400px] border rounded-lg">
        <div className="p-2 space-y-2">
          {filteredProperties.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No properties found</p>
              {searchQuery && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setSearchQuery('')}
                  className="mt-2"
                >
                  Clear search
                </Button>
              )}
            </div>
          ) : (
            filteredProperties.map((property) => {
              const isSelected = state.selectedPropertyIds.includes(property.id);

              return (
                <div
                  key={property.id}
                  onClick={() => onToggleProperty(property.id)}
                  className={cn(
                    'flex items-center gap-4 p-3 rounded-lg border cursor-pointer transition-all',
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-transparent hover:bg-muted/50'
                  )}
                >
                  {/* Checkbox */}
                  <Checkbox checked={isSelected} className="pointer-events-none" />

                  {/* Image */}
                  <div className="relative w-16 h-12 rounded overflow-hidden bg-muted flex-shrink-0">
                    {property.heroImage ? (
                      <img
                        src={property.heroImage}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Image className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{property.address}</span>
                      {property.propertyCode && (
                        <Badge variant="outline" className="text-xs flex-shrink-0">
                          {property.propertyCode}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                      {property.city && <span>{property.city}</span>}
                      {property.beds && <span>{property.beds} bd</span>}
                      {property.baths && <span>{property.baths} ba</span>}
                      {property.price && (
                        <span className="font-medium text-foreground">
                          ${property.price.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status Badges */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!property.heroImage && (
                      <Badge variant="secondary" className="text-xs">
                        No Image
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Footer Stats */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Showing {filteredProperties.length} of {properties.length} properties
        </span>
        {selectedCount > 0 && (
          <span>
            {state.selectedPropertyIds.filter((id) =>
              properties.find((p) => p.id === id)?.heroImage
            ).length}{' '}
            with images, {' '}
            {state.selectedPropertyIds.filter(
              (id) => !properties.find((p) => p.id === id)?.heroImage
            ).length}{' '}
            without
          </span>
        )}
      </div>
    </div>
  );
}
