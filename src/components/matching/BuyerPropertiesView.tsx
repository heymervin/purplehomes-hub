/**
 * BuyerPropertiesView - Two-section property view for a selected buyer
 *
 * Shows ALL properties scored for a buyer, split into:
 * - Top Matches (within 50mi or ZIP match)
 * - More Properties to Explore (beyond 50mi)
 */

import { useState, useMemo } from 'react';
import type { MatchingFilters } from '@/pages/Matching';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
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
  Target,
  Loader2,
  DollarSign,
  Users,
  Search,
  Eye,
  Check,
  TrendingUp,
  CheckCircle,
  XCircle,
  Calendar,
} from 'lucide-react';
import { useBuyerProperties, useBuyersList } from '@/services/matchingApi';
import { useNavigate } from 'react-router-dom';
import { MatchSectionDivider } from './MatchSectionDivider';
import { MatchScoreBadge } from './MatchScoreBadge';
import { SourceBadge } from './SourceBadge';
import { ZillowTypeBadge } from './ZillowTypeBadge';
import { ZillowOpportunities } from './ZillowOpportunities';
import { PropertySelectionBar } from './PropertySelectionBar';
import { SendPropertiesModal } from './SendPropertiesModal';
import { MatchDetailModal } from './MatchDetailModal';
import { StageBadge } from './StageBadge';
import type { ScoredProperty, BuyerCriteria } from '@/types/matching';
import { ArrowRight } from 'lucide-react';

interface PropertyCardProps {
  scoredProperty: ScoredProperty;
  isExplore?: boolean;
  buyer?: BuyerCriteria;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  onViewDetails?: () => void;
}

function PropertyCard({
  scoredProperty,
  isExplore = false,
  buyer,
  isSelected = false,
  onToggleSelect,
  onViewDetails,
}: PropertyCardProps) {
  const { property, score, currentStage, dateSent } = scoredProperty;
  const isInPipeline = !!currentStage;

  // Format date sent for display
  const formatDateSent = (dateStr?: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Generate highlight tags for explore section
  const getExploreHighlights = () => {
    const highlights: string[] = [];

    // Budget advantage
    if (buyer?.downPayment && property.price) {
      const ratio = (buyer.downPayment / property.price) * 100;
      if (ratio >= 25) {
        highlights.push('Strong budget fit');
      }
    }

    // Extra bedroom
    if (buyer?.desiredBeds && property.beds > (buyer.desiredBeds || 0)) {
      highlights.push(`+${property.beds - buyer.desiredBeds} bedroom${property.beds - buyer.desiredBeds > 1 ? 's' : ''}`);
    }

    return highlights;
  };

  const exploreHighlights = isExplore ? getExploreHighlights() : [];

  // Can only select if not already in pipeline
  const canSelect = onToggleSelect && !isInPipeline;

  return (
    <Card
      className={cn(
        "p-4 transition-all relative group",
        canSelect && "cursor-pointer",
        isInPipeline && "border-l-4 border-l-green-500 bg-green-50/30",
        isSelected
          ? "border-2 border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/20"
          : !isInPipeline && "border hover:bg-muted/30 hover:border-purple-300"
      )}
      onClick={(e) => {
        // Only toggle if not clicking on View button, toggle is enabled, and not in pipeline
        if (canSelect && !(e.target as HTMLElement).closest('[data-view-button]')) {
          onToggleSelect();
        }
      }}
    >
      {/* Selection Checkbox - Top Left (only for properties not in pipeline) */}
      {canSelect && (
        <div
          className="absolute top-3 left-3 z-10"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect();
          }}
        >
          <Checkbox
            checked={isSelected}
            className={cn(
              "h-5 w-5 border-2 transition-all",
              isSelected
                ? "border-purple-500 bg-purple-500"
                : "border-gray-400 bg-white hover:border-purple-400"
            )}
            aria-label={`Select ${property.address}`}
          />
        </div>
      )}

      {/* Selected Indicator - Top Right */}
      {isSelected && !isInPipeline && (
        <div className="absolute top-3 right-3 z-10 bg-purple-500 rounded-full p-1">
          <Check className="h-4 w-4 text-white" />
        </div>
      )}

      {/* Stage Badge and Date Sent - Top Right */}
      {isInPipeline && (currentStage || dateSent) && (
        <div className="absolute top-3 right-3 z-10 flex flex-col gap-1 items-end">
          {currentStage && (
            <StageBadge stage={currentStage} size="sm" showIcon className="shadow-sm" />
          )}
          {dateSent && (
            <Badge variant="outline" className="text-xs border-blue-200 text-blue-700 bg-blue-50 shadow-sm">
              <Calendar className="h-3 w-3 mr-1" />
              Sent {formatDateSent(dateSent)}
            </Badge>
          )}
        </div>
      )}

      <div className="flex gap-4">
        {/* Property Image */}
        <div className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden bg-gradient-to-br from-purple-100 to-purple-50 flex items-center justify-center">
          {property.heroImage ? (
            <img
              src={property.heroImage}
              alt={property.address}
              className="w-full h-full object-cover"
            />
          ) : (
            <Home className="h-8 w-8 text-purple-300" />
          )}
        </div>

        {/* Property Details */}
        <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
            <div className={cn("min-w-0", isInPipeline && "pr-16")}>
              <h4 className="font-medium text-sm truncate">{property.address}</h4>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <MapPin className="h-3 w-3" />
                {property.city}
                {property.state && `, ${property.state}`}
                {property.zipCode && ` ${property.zipCode}`}
              </p>
            </div>

            {/* Score Badge - hide when in pipeline to avoid overlap with StageBadge */}
            {!isInPipeline && (
              <MatchScoreBadge score={score.score} size="sm" showLabel={false} />
            )}
          </div>

          {/* Property Stats */}
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Bed className="h-3 w-3" />
              {property.beds}
            </span>
            <span className="flex items-center gap-1">
              <Bath className="h-3 w-3" />
              {property.baths}
            </span>
            {property.sqft && (
              <span className="flex items-center gap-1">
                <Square className="h-3 w-3" />
                {property.sqft.toLocaleString()}
              </span>
            )}
            {property.price && (
              <span className="flex items-center gap-1 font-medium text-foreground">
                <DollarSign className="h-3 w-3" />
                {property.price.toLocaleString()}
              </span>
            )}
          </div>

          {/* Badges Row */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {/* Distance Badge */}
            {score.distanceMiles !== null && (
              <Badge
                variant={score.isPriority ? 'default' : 'secondary'}
                className={`text-xs ${
                  score.isPriority
                    ? 'bg-purple-500 hover:bg-purple-600'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                <MapPin className="h-3 w-3 mr-1" />
                {score.distanceMiles <= 1
                  ? '< 1 mi'
                  : score.distanceMiles < 10
                  ? `${score.distanceMiles.toFixed(1)} mi`
                  : `${Math.round(score.distanceMiles)} mi`}
              </Badge>
            )}

            {/* Priority match indicator */}
            {score.isPriority && !score.distanceMiles && (
              <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">
                <Target className="h-3 w-3 mr-1" />
                In Preferred ZIP
              </Badge>
            )}

            {/* Source Badge */}
            {property.source && (
              <SourceBadge source={property.source} size="sm" />
            )}

            {/* Zillow Type Badge (only for Zillow properties) */}
            {property.source === 'Zillow' && property.zillowType && (
              <ZillowTypeBadge type={property.zillowType} size="sm" />
            )}

            {/* Explore highlights */}
            {isExplore && exploreHighlights.map((highlight, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                {highlight}
              </Badge>
            ))}
          </div>

          {/* Location Reason */}
          {score.locationReason && (
            <p className="text-xs text-muted-foreground mt-1.5">
              {score.locationReason}
            </p>
          )}
        </div>
      </div>

      {/* View Details Button */}
      {onViewDetails && (
        <div
          className="absolute bottom-3 right-3"
          data-view-button
        >
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs bg-white hover:bg-purple-50 hover:border-purple-500"
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails();
            }}
          >
            <Eye className="h-3 w-3 mr-1" />
            View
          </Button>
        </div>
      )}
    </Card>
  );
}

interface BuyerPropertiesViewProps {
  selectedBuyerId?: string | null;
  onBuyerSelect?: (buyerId: string | null) => void;
  filters?: MatchingFilters;
}

export function BuyerPropertiesView({
  selectedBuyerId: externalBuyerId,
  onBuyerSelect,
  filters,
}: BuyerPropertiesViewProps = {}) {
  // Use internal state as fallback when no external state is provided
  const [internalBuyerId, setInternalBuyerId] = useState<string | null>(null);

  // Use external state if provided, otherwise use internal state
  const buyerId = externalBuyerId !== undefined ? externalBuyerId : internalBuyerId;

  // Use external handler if provided, otherwise use internal setter
  const handleBuyerSelect = (newBuyerId: string | null) => {
    if (onBuyerSelect) {
      onBuyerSelect(newBuyerId);
    } else {
      setInternalBuyerId(newBuyerId);
    }
  };

  const navigate = useNavigate();
  const { data: buyersList, isLoading: loadingBuyers } = useBuyersList();
  const { data: buyerProperties, isLoading: loadingProperties, error } = useBuyerProperties(buyerId);

  // Filter and sort buyers list
  const filteredBuyersList = useMemo(() => {
    if (!buyersList) return buyersList;

    let filtered = buyersList;

    // Apply search filter if provided
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = buyersList.filter((buyer) => {
        const firstName = buyer.firstName?.toLowerCase() || '';
        const lastName = buyer.lastName?.toLowerCase() || '';
        const email = buyer.email?.toLowerCase() || '';
        return (
          firstName.includes(searchLower) ||
          lastName.includes(searchLower) ||
          email.includes(searchLower)
        );
      });
    }

    // Sort buyers: Top 5 with matches first, then new buyers by date
    const sorted = [...filtered].sort((a, b) => {
      // First, sort by match count (descending)
      if (a.totalMatches !== b.totalMatches) {
        return b.totalMatches - a.totalMatches;
      }

      // Then, sort by date added (newest first)
      if (a.dateAdded && b.dateAdded) {
        return new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime();
      }

      // If one has dateAdded and the other doesn't, prioritize the one with dateAdded
      if (a.dateAdded && !b.dateAdded) return -1;
      if (!a.dateAdded && b.dateAdded) return 1;

      return 0;
    });

    return sorted;
  }, [buyersList, filters?.search]);

  // Filter properties based on filters
  const filteredProperties = useMemo(() => {
    if (!buyerProperties) return null;

    const allProperties = [...buyerProperties.priorityMatches, ...buyerProperties.exploreMatches];

    let filtered = allProperties;

    // Filter by search (address, city, property code)
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter((sp) => {
        const address = sp.property.address?.toLowerCase() || '';
        const city = sp.property.city?.toLowerCase() || '';
        const propertyCode = sp.property.propertyCode?.toLowerCase() || '';
        return (
          address.includes(searchLower) ||
          city.includes(searchLower) ||
          propertyCode.includes(searchLower)
        );
      });
    }

    // Filter by min score
    if (filters?.minScore && filters.minScore !== 'all') {
      const minScore = parseInt(filters.minScore, 10);
      filtered = filtered.filter((sp) => sp.score.score >= minScore);
    }

    // Filter by beds
    if (filters?.beds && filters.beds !== 'all') {
      const minBeds = parseInt(filters.beds, 10);
      filtered = filtered.filter((sp) => sp.property.beds >= minBeds);
    }

    // Filter by priority only
    if (filters?.priorityOnly) {
      filtered = filtered.filter((sp) => sp.score.isPriority);
    }

    // Filter by match status
    if (filters?.matchStatus && filters.matchStatus !== 'all') {
      if (filters.matchStatus === 'ready') {
        filtered = filtered.filter((sp) => !sp.currentStage);
      } else if (filters.matchStatus === 'sent') {
        filtered = filtered.filter((sp) => !!sp.currentStage);
      }
    }

    // Sort by score descending
    filtered.sort((a, b) => b.score.score - a.score.score);

    return filtered;
  }, [buyerProperties, filters]);

  // State for property selection
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<Set<string>>(new Set());
  const [sendModalOpen, setSendModalOpen] = useState(false);

  // State for match detail modal (read-only view)
  const [selectedProperty, setSelectedProperty] = useState<ScoredProperty | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Selection handlers
  const togglePropertySelection = (recordId: string) => {
    setSelectedPropertyIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(recordId)) {
        newSet.delete(recordId);
      } else {
        newSet.add(recordId);
      }
      return newSet;
    });
  };

  const clearSelection = () => {
    setSelectedPropertyIds(new Set());
  };

  const selectAll = () => {
    if (!buyerProperties) return;
    const allIds = [...buyerProperties.priorityMatches, ...buyerProperties.exploreMatches]
      .map(sp => sp.property.recordId);
    setSelectedPropertyIds(new Set(allIds));
  };

  return (
    <div className="space-y-6">
      {/* Buyer Selector */}
      <div className="bg-card border rounded-lg p-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Users className="h-4 w-4 text-purple-500" />
            <span>Select a buyer to view their property matches:</span>
          </div>
          <Select
            value={buyerId || ''}
            onValueChange={(value) => handleBuyerSelect(value || null)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a buyer..." />
            </SelectTrigger>
            <SelectContent>
              {loadingBuyers ? (
                <div className="p-2 text-sm text-muted-foreground">Loading buyers...</div>
              ) : filteredBuyersList?.length === 0 ? (
                <div className="p-2 text-sm text-muted-foreground">No buyers match your search</div>
              ) : (
                filteredBuyersList?.map((buyer) => (
                  <SelectItem key={buyer.recordId || buyer.contactId} value={buyer.recordId || buyer.contactId}>
                    <div className="flex items-center justify-between w-full gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="truncate">
                          {buyer.firstName} {buyer.lastName}
                        </span>
                        {buyer.qualified !== undefined && (
                          buyer.qualified ? (
                            <CheckCircle className="h-3.5 w-3.5 text-green-600 flex-shrink-0" title="Qualified" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" title="Not Qualified" />
                          )
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {buyer.totalMatches > 0 && (
                          <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">
                            {buyer.totalMatches}
                          </Badge>
                        )}
                        <span className="text-muted-foreground text-xs truncate max-w-[150px]">{buyer.email}</span>
                      </div>
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Selected buyer summary */}
        {buyerProperties?.buyer && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">
                    {buyerProperties.buyer.firstName} {buyerProperties.buyer.lastName}
                  </h3>
                  {buyerProperties.buyer.qualified !== undefined && (
                    <Badge
                      variant={buyerProperties.buyer.qualified ? "default" : "secondary"}
                      className={buyerProperties.buyer.qualified
                        ? "bg-green-600 hover:bg-green-700"
                        : "bg-gray-200 text-gray-600"
                      }
                    >
                      {buyerProperties.buyer.qualified ? (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Qualified
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3 w-3 mr-1" />
                          Not Qualified
                        </>
                      )}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{buyerProperties.buyer.email}</p>
              </div>
              <div className="flex gap-4 text-sm">
                {(buyerProperties.buyer.desiredBeds || buyerProperties.buyer.desiredBaths) && (
                  <div className="flex items-center gap-1">
                    <Bed className="h-4 w-4 text-muted-foreground" />
                    <span>{buyerProperties.buyer.desiredBeds || '?'} bed</span>
                    {buyerProperties.buyer.desiredBaths && (
                      <>
                        <span className="text-muted-foreground">•</span>
                        <Bath className="h-4 w-4 text-muted-foreground" />
                        <span>{buyerProperties.buyer.desiredBaths} bath</span>
                      </>
                    )}
                  </div>
                )}
                {buyerProperties.buyer.downPayment && (
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span>${buyerProperties.buyer.downPayment.toLocaleString()} down</span>
                  </div>
                )}
                {buyerProperties.buyer.monthlyIncome && (
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="text-green-700">${buyerProperties.buyer.monthlyIncome.toLocaleString()}/mo income</span>
                  </div>
                )}
                {buyerProperties.buyer.monthlyLiabilities && (
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4 text-orange-500" />
                    <span className="text-orange-600">${buyerProperties.buyer.monthlyLiabilities.toLocaleString()}/mo liabilities</span>
                  </div>
                )}
                {(buyerProperties.buyer.city || buyerProperties.buyer.preferredLocation) && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{buyerProperties.buyer.city || buyerProperties.buyer.preferredLocation}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Loading State */}
      {loadingProperties && buyerId && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          <span className="ml-2 text-muted-foreground">Loading properties...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-12">
          <div className="text-red-500 mb-4">
            <p className="font-medium">Error loading properties: {error.message}</p>
          </div>
          {error.message?.includes('not found') && (
            <div className="text-muted-foreground space-y-2">
              <p>The cache has been refreshed automatically.</p>
              <p>If the buyer was just added, please try running matching to generate property matches.</p>
              <Button
                variant="outline"
                onClick={() => navigate('/matching')}
                className="mt-4"
              >
                <Target className="h-4 w-4 mr-2" />
                Go to Matching
              </Button>
            </div>
          )}
        </div>
      )}

      {/* No Buyer Selected */}
      {!buyerId && !loadingBuyers && (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p>Select a buyer above to see all properties scored for them</p>
        </div>
      )}

      {/* Results */}
      {buyerProperties && !loadingProperties && (
        <>
          {/* Unified "In Your System" Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Target className="h-5 w-5 text-purple-500" />
              <h2 className="text-lg font-semibold">
                In Your System
              </h2>
              <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                {filteredProperties?.length ?? 0}
                {filteredProperties && filteredProperties.length !== buyerProperties.totalCount && (
                  <span className="ml-1 text-muted-foreground">/ {buyerProperties.totalCount}</span>
                )}
              </Badge>
            </div>

            {filteredProperties && filteredProperties.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredProperties.map((sp) => (
                  <PropertyCard
                    key={sp.property.recordId}
                    scoredProperty={sp}
                    buyer={buyerProperties.buyer}
                    isSelected={selectedPropertyIds.has(sp.property.recordId)}
                    onToggleSelect={() => togglePropertySelection(sp.property.recordId)}
                    onViewDetails={() => {
                      setSelectedProperty(sp);
                      setDetailModalOpen(true);
                    }}
                  />
                ))}
              </div>
            ) : buyerProperties.totalCount > 0 ? (
              <div className="text-center py-8 text-muted-foreground bg-muted/30 rounded-lg">
                <Home className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p>No properties match the current filters</p>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground bg-muted/30 rounded-lg">
                <Home className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p>No properties in system yet</p>
              </div>
            )}
          </div>

          {/* Zillow Opportunities - Agent Tool */}
          {buyerProperties?.buyer && (
            <ZillowOpportunities buyer={buyerProperties.buyer} />
          )}

          {/* Stats Footer */}
          <div className="text-center text-sm text-muted-foreground pt-4 border-t">
            Showing {filteredProperties?.length ?? 0} of {buyerProperties.totalCount} properties
            {buyerProperties.stats.timeMs && ` • Scored in ${buyerProperties.stats.timeMs}ms`}
          </div>
        </>
      )}

      {/* Match Detail Modal (Read-only - stage management moved to Deal Pipeline) */}
      <MatchDetailModal
        match={selectedProperty ? {
          id: selectedProperty.matchId || selectedProperty.property.recordId,
          propertyId: selectedProperty.property.recordId,
          buyerId: buyerProperties?.buyer.recordId || buyerProperties?.buyer.contactId || '',
          score: selectedProperty.score.score,
          reasoning: selectedProperty.score.reasoning,
          distance: selectedProperty.score.distanceMiles,
          isPriority: selectedProperty.score.isPriority,
          property: selectedProperty.property,
          buyer: buyerProperties?.buyer,
        } : null}
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
      />

      {/* Link to Deal Pipeline */}
      {buyerProperties && buyerProperties.totalCount > 0 && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={() => navigate('/deals')}
            className="gap-2"
          >
            Manage Deal Stages in Pipeline
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Send Properties Modal */}
      {buyerProperties && (
        <SendPropertiesModal
          buyer={buyerProperties.buyer}
          properties={[...buyerProperties.priorityMatches, ...buyerProperties.exploreMatches]
            .filter(sp => selectedPropertyIds.has(sp.property.recordId))}
          open={sendModalOpen}
          onOpenChange={setSendModalOpen}
          onSendSuccess={() => {
            clearSelection();
          }}
        />
      )}

      {/* Floating Selection Bar */}
      {buyerProperties && (
        <PropertySelectionBar
          selectedCount={selectedPropertyIds.size}
          totalCount={buyerProperties.totalCount}
          allSelected={selectedPropertyIds.size === buyerProperties.totalCount && buyerProperties.totalCount > 0}
          onSelectAll={selectAll}
          onClearSelection={clearSelection}
          onSendSelected={() => setSendModalOpen(true)}
        />
      )}
    </div>
  );
}
