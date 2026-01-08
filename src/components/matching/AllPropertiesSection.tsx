/**
 * AllPropertiesSection - Displays all properties with filtering, sorting, and pagination
 *
 * Replaces the property dropdown selector with a visible, filterable list
 */

import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Home,
  MapPin,
  Bed,
  Bath,
  Square,
  DollarSign,
  Users,
  Send,
  ArrowRight,
} from 'lucide-react';
import { usePropertiesWithMatches } from '@/services/matchingApi';
import { SourceBadge } from './SourceBadge';
import { cn } from '@/lib/utils';
import type { PropertyWithMatches } from '@/types/matching';

interface AllPropertiesSectionProps {
  onSelectProperty: (propertyCode: string) => void;
}

type SourceFilter = 'all' | 'Inventory' | 'Partnered' | 'Acquisitions';
type SortOption = 'most-interest' | 'fewest-interest' | 'newest' | 'oldest' | 'price-low' | 'price-high' | 'beds-high' | 'beds-low';

export function AllPropertiesSection({ onSelectProperty }: AllPropertiesSectionProps) {
  // State for filters and pagination
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('most-interest');
  const [displayLimit, setDisplayLimit] = useState(20);

  // Fetch all properties with matches
  const { data: propertiesData, isLoading } = usePropertiesWithMatches({}, 100);
  const propertiesList = propertiesData?.data || [];

  // Calculate counts by source
  const allPropertiesCount = propertiesList.length;
  const inventoryCount = propertiesList.filter(p => p.source === 'Inventory').length;
  const partneredCount = propertiesList.filter(p => p.source === 'Partnered').length;
  const acquisitionsCount = propertiesList.filter(p => p.source === 'Acquisitions').length;

  // Filter and sort properties
  const filteredAndSortedProperties = useMemo(() => {
    let filtered = [...propertiesList];

    // Apply source filter
    if (sourceFilter !== 'all') {
      filtered = filtered.filter(property => property.source === sourceFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'most-interest':
          return (b.totalMatches || 0) - (a.totalMatches || 0);

        case 'fewest-interest':
          return (a.totalMatches || 0) - (b.totalMatches || 0);

        case 'newest':
          if (!a.createdAt || !b.createdAt) return 0;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

        case 'oldest':
          if (!a.createdAt || !b.createdAt) return 0;
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();

        case 'price-low':
          return (a.price || 0) - (b.price || 0);

        case 'price-high':
          return (b.price || 0) - (a.price || 0);

        case 'beds-high':
          return (b.beds || 0) - (a.beds || 0);

        case 'beds-low':
          return (a.beds || 0) - (b.beds || 0);

        default:
          return 0;
      }
    });

    return filtered;
  }, [propertiesList, sourceFilter, sortBy]);

  // Paginated properties
  const displayedProperties = filteredAndSortedProperties.slice(0, displayLimit);
  const hasMore = filteredAndSortedProperties.length > displayLimit;

  // Check if property was added in last 7 days
  const isNewProperty = (createdAt?: string) => {
    if (!createdAt) return false;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return new Date(createdAt) > sevenDaysAgo;
  };

  // Calculate sent count for a property (matches that have been sent)
  const getSentCount = (property: PropertyWithMatches) => {
    return property.matches.filter(m => m.status && m.status !== 'New Match').length;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="border-t pt-6 space-y-4">
        <div>
          <Skeleton className="h-7 w-40 mb-1" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-24 w-full" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="border-t pt-6 space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-xl font-semibold flex items-center gap-2 mb-1">
          <Home className="h-5 w-5 text-purple-500" />
          All Properties
        </h3>
        <p className="text-sm text-muted-foreground">
          Browse and filter complete property inventory
        </p>
      </div>

      {/* Filters & Sort Controls */}
      <div className="bg-card border rounded-lg p-4 space-y-3">
        {/* Source Filter Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-muted-foreground">Source:</span>

          <Button
            variant={sourceFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSourceFilter('all')}
            className={sourceFilter === 'all' ? 'bg-purple-600 hover:bg-purple-700' : ''}
          >
            All ({allPropertiesCount})
          </Button>

          <Button
            variant={sourceFilter === 'Inventory' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSourceFilter('Inventory')}
            className={sourceFilter === 'Inventory' ? 'bg-green-600 hover:bg-green-700' : ''}
          >
            Inventory ({inventoryCount})
          </Button>

          <Button
            variant={sourceFilter === 'Partnered' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSourceFilter('Partnered')}
            className={sourceFilter === 'Partnered' ? 'bg-blue-600 hover:bg-blue-700' : ''}
          >
            Partnered ({partneredCount})
          </Button>

          <Button
            variant={sourceFilter === 'Acquisitions' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSourceFilter('Acquisitions')}
            className={sourceFilter === 'Acquisitions' ? 'bg-orange-600 hover:bg-orange-700' : ''}
          >
            Acquisitions ({acquisitionsCount})
          </Button>
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Sort by:</span>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="most-interest">Most Buyer Interest</SelectItem>
              <SelectItem value="fewest-interest">Fewest Buyer Interest</SelectItem>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="price-low">Price: Low to High</SelectItem>
              <SelectItem value="price-high">Price: High to Low</SelectItem>
              <SelectItem value="beds-high">Most Bedrooms</SelectItem>
              <SelectItem value="beds-low">Fewest Bedrooms</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats Summary Bar */}
        <div className="bg-muted/30 rounded-lg px-4 py-2 text-sm text-muted-foreground">
          Showing {filteredAndSortedProperties.length} properties
          {sourceFilter === 'all' && ` • ${inventoryCount} inventory • ${partneredCount} partnered • ${acquisitionsCount} acquisitions`}
          {sourceFilter !== 'all' && ` • ${sourceFilter} source`}
        </div>
      </div>

      {/* Property Cards List */}
      <div className="space-y-3">
        {displayedProperties.map((property) => {
          const sentCount = getSentCount(property);
          const isNew = isNewProperty(property.createdAt);

          return (
            <Card
              key={property.recordId || property.propertyCode}
              className="p-4 hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => onSelectProperty(property.propertyCode || property.recordId)}
            >
              <div className="flex items-start gap-4">
                {/* Property Image */}
                <div className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden bg-gradient-to-br from-purple-100 to-purple-50 flex items-center justify-center">
                  {property.heroImage ? (
                    <img
                      src={property.heroImage}
                      alt={property.address}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Home className="h-10 w-10 text-purple-300" />
                  )}
                </div>

                {/* Property Info */}
                <div className="flex-1 space-y-2 min-w-0">
                  {/* Address & Badges */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="font-semibold text-base truncate">{property.address}</h4>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate">
                          {property.city}{property.state && `, ${property.state}`}
                          {property.zipCode && ` ${property.zipCode}`}
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Source Badge */}
                      {property.source && (
                        <SourceBadge
                          source={property.source as 'Inventory' | 'Partnered' | 'Acquisitions' | 'Zillow'}
                          size="sm"
                        />
                      )}

                      {/* New Badge */}
                      {isNew && (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                          New
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Property Details Grid */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                    {property.price && (
                      <span className="flex items-center gap-1 font-semibold text-green-600">
                        <DollarSign className="h-3.5 w-3.5" />
                        ${property.price.toLocaleString()}
                      </span>
                    )}
                    {property.beds !== undefined && property.beds !== null && (
                      <span className="flex items-center gap-1">
                        <Bed className="h-3.5 w-3.5" />
                        {property.beds} beds
                      </span>
                    )}
                    {property.baths !== undefined && property.baths !== null && (
                      <span className="flex items-center gap-1">
                        <Bath className="h-3.5 w-3.5" />
                        {property.baths} baths
                      </span>
                    )}
                    {property.sqft && (
                      <span className="flex items-center gap-1">
                        <Square className="h-3.5 w-3.5" />
                        {property.sqft.toLocaleString()} sqft
                      </span>
                    )}
                  </div>

                  {/* Buyer Interest Stats */}
                  <div className="flex items-center gap-3 text-sm">
                    <span className="font-medium text-purple-600 flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {property.totalMatches || 0} buyers matched
                    </span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Send className="h-3 w-3" />
                      {sentCount} sent
                    </span>
                  </div>
                </div>

                {/* Right: Action Button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectProperty(property.propertyCode || property.recordId);
                  }}
                >
                  View Buyers
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={() => setDisplayLimit(prev => prev + 20)}
          >
            Load More ({filteredAndSortedProperties.length - displayLimit} remaining)
          </Button>
        </div>
      )}

      {/* Show count */}
      {filteredAndSortedProperties.length > 0 && (
        <p className="text-sm text-center text-muted-foreground pt-2">
          Showing {displayedProperties.length} of {filteredAndSortedProperties.length} properties
        </p>
      )}

      {/* Empty State */}
      {filteredAndSortedProperties.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Home className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No properties match your filters</p>
          <Button
            variant="link"
            onClick={() => {
              setSourceFilter('all');
              setSortBy('most-interest');
            }}
            className="mt-2"
          >
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  );
}
