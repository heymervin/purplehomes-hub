/**
 * PropertyMatchingSummary - Property-centric dashboard summary for the Matching page
 *
 * Shows property-focused content for "By Property" tab:
 * - 3 key stats: Ready to Send, Sent Today, In Pipeline (linked)
 * - Top 5 properties by buyer interest (match count)
 * - Top 5 new properties by date added
 */

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Target,
  Send,
  TrendingUp,
  Home,
  ArrowRight,
  MapPin,
  Calendar,
  Plus,
} from 'lucide-react';
import { usePropertiesWithMatches, useNewProperties, useMatchStats, useBudgetMultiplier } from '@/services/matchingApi';
import { SourceBadge } from './SourceBadge';
import type { PropertyWithMatches } from '@/types/matching';

export interface PropertyMatchFilters {
  sameCity: boolean;
  withinBudget: boolean;
}

interface PropertyMatchingSummaryProps {
  onSelectProperty: (propertyCode: string) => void;
  filters?: PropertyMatchFilters;
  onFiltersChange?: (filters: PropertyMatchFilters) => void;
}

export function PropertyMatchingSummary({
  onSelectProperty,
  filters = { sameCity: false, withinBudget: false },
  onFiltersChange,
}: PropertyMatchingSummaryProps) {
  const navigate = useNavigate();
  const budgetMultiplier = useBudgetMultiplier();

  // Get match stats from endpoint
  const { data: matchStats, isLoading: loadingStats } = useMatchStats();

  // Get more properties to filter from (fetch 20 to have enough after filtering)
  const { data: topPropertiesData, isLoading: loadingProperties } = usePropertiesWithMatches({}, 20);

  // Get more new properties to filter from
  const { data: newPropertiesData, isLoading: loadingNewProperties } = useNewProperties(20);

  // Filter function to check if property has qualifying matches
  const filterProperty = (property: PropertyWithMatches): boolean => {
    // If no filters active, include all
    if (!filters.sameCity && !filters.withinBudget) return true;

    // Check if at least one match meets filter criteria
    const qualifyingMatches = property.matches?.filter((match) => {
      const buyer = match.buyer;
      if (!buyer) return false;

      // Same city check
      if (filters.sameCity) {
        const buyerCity = buyer.city?.toLowerCase().trim();
        const propertyCity = property.city?.toLowerCase().trim();
        if (!buyerCity || !propertyCity || buyerCity !== propertyCity) {
          return false;
        }
      }

      // Within budget check (using monthlyIncome * multiplier)
      if (filters.withinBudget) {
        const budget = (buyer.monthlyIncome || 0) * budgetMultiplier;
        if (!property.price || property.price > budget) {
          return false;
        }
      }

      return true;
    });

    return (qualifyingMatches?.length || 0) > 0;
  };

  // Apply filters to properties
  const topProperties = useMemo(() => {
    const all = topPropertiesData?.data || [];
    const filtered = all.filter(filterProperty);
    return filtered.slice(0, 5);
  }, [topPropertiesData?.data, filters, budgetMultiplier]);

  const newProperties = useMemo(() => {
    const all = newPropertiesData?.data || [];
    const filtered = all.filter(filterProperty);
    return filtered.slice(0, 5);
  }, [newPropertiesData?.data, filters, budgetMultiplier]);

  // Use stats from API
  const readyToSend = matchStats?.readyToSend || 0;
  const sentToday = matchStats?.sentToday || 0;
  const inPipeline = matchStats?.inPipeline || 0;

  // Handle filter toggle
  const handleFilterChange = (key: keyof PropertyMatchFilters, value: boolean) => {
    if (onFiltersChange) {
      onFiltersChange({ ...filters, [key]: value });
    }
  };

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'Unknown';
    }
  };

  // Format price for display
  const formatPrice = (price?: number) => {
    if (!price) return 'N/A';
    return `$${price.toLocaleString()}`;
  };

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      {onFiltersChange && (
        <Card className="p-4">
          <div className="flex items-center gap-6 flex-wrap">
            <span className="text-sm font-medium text-muted-foreground">Match Filters:</span>
            <div className="flex items-center gap-2">
              <Checkbox
                id="sameCity"
                checked={filters.sameCity}
                onCheckedChange={(checked) => handleFilterChange('sameCity', checked === true)}
              />
              <Label htmlFor="sameCity" className="text-sm cursor-pointer flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-blue-500" />
                Same City
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="withinBudget"
                checked={filters.withinBudget}
                onCheckedChange={(checked) => handleFilterChange('withinBudget', checked === true)}
              />
              <Label htmlFor="withinBudget" className="text-sm cursor-pointer flex items-center gap-1">
                <span className="text-green-500">$</span>
                Within Budget
              </Label>
            </div>
            {(filters.sameCity || filters.withinBudget) && (
              <span className="text-xs text-muted-foreground ml-auto">
                Showing properties with at least one qualifying match
              </span>
            )}
          </div>
        </Card>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Ready to Send */}
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-purple-600/5" />
          <div className="relative p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-purple-100">
                <Target className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ready to Send</p>
                {loadingStats ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-3xl font-bold text-foreground">{readyToSend}</p>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">
                  matches not yet sent
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Sent Today */}
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-green-600/5" />
          <div className="relative p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-green-100">
                <Send className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Sent Today</p>
                {loadingStats ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-3xl font-bold text-foreground">{sentToday}</p>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">
                  properties emailed
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* In Pipeline - Clickable */}
        <Card
          className="relative overflow-hidden cursor-pointer hover:shadow-md transition-shadow border-2 border-transparent hover:border-indigo-200"
          onClick={() => navigate('/deals')}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-indigo-600/5" />
          <div className="relative p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-indigo-100">
                <TrendingUp className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">In Pipeline</p>
                {loadingStats ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-3xl font-bold text-foreground">{inPipeline}</p>
                )}
                <p className="text-xs text-indigo-600 mt-0.5 flex items-center gap-1">
                  View Deal Pipeline
                  <ArrowRight className="h-3 w-3" />
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Top Lists Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Properties by Interest */}
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Home className="h-5 w-5 text-purple-500" />
                Top Properties by Interest
              </h3>
              <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                Top 5
              </Badge>
            </div>

            {loadingProperties ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : topProperties.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No properties with matches yet
              </div>
            ) : (
              <div className="space-y-2">
                {topProperties.map((property, index) => (
                  <div
                    key={property.recordId || property.propertyCode}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group"
                  >
                    {/* Rank */}
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-sm font-semibold text-purple-700">
                      {index + 1}
                    </div>

                    {/* Property Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">
                          {property.address}
                        </p>
                        {property.source && (
                          <SourceBadge source={property.source as 'Inventory' | 'Partnered' | 'Acquisitions' | 'Zillow'} size="sm" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {property.city}{property.state ? `, ${property.state}` : ''} &bull; {formatPrice(property.price)}
                      </p>
                    </div>

                    {/* Match Count */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant="secondary">
                        {property.totalMatches} {property.totalMatches === 1 ? 'buyer' : 'buyers'}
                      </Badge>
                    </div>

                    {/* View Button */}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="flex-shrink-0"
                      onClick={() => onSelectProperty(property.propertyCode)}
                    >
                      View
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* New Properties */}
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Plus className="h-5 w-5 text-green-500" />
                New Properties
              </h3>
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                Recent 5
              </Badge>
            </div>

            {loadingNewProperties ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : newProperties.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No properties added recently
              </div>
            ) : (
              <div className="space-y-2">
                {newProperties.map((property, index) => (
                  <div
                    key={property.recordId || property.propertyCode}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group"
                  >
                    {/* Rank/Position */}
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-sm font-semibold text-green-700">
                      {index + 1}
                    </div>

                    {/* Property Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">
                          {property.address}
                        </p>
                        {property.source && (
                          <SourceBadge source={property.source as 'Inventory' | 'Partnered' | 'Acquisitions' | 'Zillow'} size="sm" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Added {formatDate(property.createdAt)}
                      </p>
                    </div>

                    {/* Match Count */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant="secondary">
                        {property.totalMatches} {property.totalMatches === 1 ? 'buyer' : 'buyers'}
                      </Badge>
                    </div>

                    {/* View Button */}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="flex-shrink-0"
                      onClick={() => onSelectProperty(property.propertyCode)}
                    >
                      View
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

    </div>
  );
}
