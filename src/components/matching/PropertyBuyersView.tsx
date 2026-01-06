/**
 * PropertyBuyersView - Two-section buyer view for a selected property
 *
 * Shows ALL buyers scored for a property, split into:
 * - Top Engaged Buyers (high scores >= 60)
 * - Other Potential Buyers (scores 30-59)
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
  User,
  Mail,
  Eye,
  TrendingUp,
} from 'lucide-react';
import { usePropertyBuyers, usePropertiesWithMatches } from '@/services/matchingApi';
import { useNavigate } from 'react-router-dom';
import { MatchSectionDivider } from './MatchSectionDivider';
import { MatchScoreBadge } from './MatchScoreBadge';
import { StageBadge } from './StageBadge';
import { MatchDetailModal } from './MatchDetailModal';
import { BuyerSelectionBar } from './BuyerSelectionBar';
import { SendPropertyToBuyersModal } from './SendPropertyToBuyersModal';
import type { ScoredBuyer, PropertyDetails } from '@/types/matching';
import type { MatchDealStage } from '@/types/associations';

interface BuyerCardProps {
  scoredBuyer: ScoredBuyer;
  property?: PropertyDetails;
  onViewDetails?: () => void;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}

function BuyerCard({ scoredBuyer, property, onViewDetails, isSelected, onToggleSelect }: BuyerCardProps) {
  const { buyer, score, currentStage } = scoredBuyer;
  const isInPipeline = !!currentStage;
  const canSelect = onToggleSelect && !isInPipeline;

  // Calculate budget ratio if available
  const getBudgetInfo = () => {
    if (!buyer.downPayment || !property?.price) return null;

    const ratio = (buyer.downPayment / property.price) * 100;
    if (ratio >= 20) {
      return { label: 'Strong budget', variant: 'success' as const };
    } else if (ratio >= 10) {
      return { label: 'Good budget', variant: 'default' as const };
    } else {
      return { label: 'Limited budget', variant: 'warning' as const };
    }
  };

  const budgetInfo = getBudgetInfo();

  return (
    <Card
      className={cn(
        "p-4 transition-colors relative group",
        isInPipeline ? "border-l-4 border-l-green-500 bg-green-50/30" : "hover:bg-muted/30",
        canSelect && "cursor-pointer hover:border-purple-300",
        isSelected && "ring-2 ring-purple-500 bg-purple-50/50"
      )}
      onClick={canSelect ? onToggleSelect : undefined}
    >
      {/* Selection Checkbox - Only show for non-pipeline buyers */}
      {canSelect && (
        <div className="absolute top-3 left-3 z-10 pointer-events-none">
          <Checkbox
            checked={isSelected}
            className={cn(
              "h-5 w-5 border-2",
              isSelected
                ? "bg-purple-600 border-purple-600 text-white"
                : "bg-white border-gray-300 hover:border-purple-400"
            )}
          />
        </div>
      )}

      <div className={cn("flex gap-4", canSelect && "ml-6")}>
        {/* Buyer Avatar */}
        <div className="flex-shrink-0 w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-purple-100 to-purple-50 flex items-center justify-center">
          <User className="h-8 w-8 text-purple-400" />
        </div>

        {/* Buyer Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="font-medium text-sm">
                {buyer.firstName} {buyer.lastName}
              </h4>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <Mail className="h-3 w-3" />
                {buyer.email}
              </p>
            </div>

            {/* Score Badge */}
            <MatchScoreBadge score={score.score} size="sm" showLabel={false} />
          </div>

          {/* Buyer Preferences */}
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            {buyer.desiredBeds && (
              <span className="flex items-center gap-1">
                <Bed className="h-3 w-3" />
                {buyer.desiredBeds} beds
              </span>
            )}
            {buyer.desiredBaths && (
              <span className="flex items-center gap-1">
                <Bath className="h-3 w-3" />
                {buyer.desiredBaths} baths
              </span>
            )}
            {buyer.downPayment && (
              <span className="flex items-center gap-1 font-medium text-foreground">
                <DollarSign className="h-3 w-3" />
                {buyer.downPayment.toLocaleString()} down
              </span>
            )}
            {buyer.monthlyIncome && (
              <span className="flex items-center gap-1 text-green-700">
                <TrendingUp className="h-3 w-3" />
                ${buyer.monthlyIncome.toLocaleString()}/mo
              </span>
            )}
            {buyer.monthlyLiabilities && (
              <span className="flex items-center gap-1 text-orange-600">
                <DollarSign className="h-3 w-3" />
                ${buyer.monthlyLiabilities.toLocaleString()}/mo debt
              </span>
            )}
          </div>

          {/* Distance and Location Info */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
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
                  ? '< 1 mi away'
                  : score.distanceMiles < 10
                  ? `${score.distanceMiles.toFixed(1)} mi away`
                  : `${Math.round(score.distanceMiles)} mi away`}
              </Badge>
            )}

            {/* Priority match indicator */}
            {score.isPriority && !score.distanceMiles && (
              <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">
                <Target className="h-3 w-3 mr-1" />
                In Preferred ZIP
              </Badge>
            )}

            {/* Budget info */}
            {budgetInfo && (
              <Badge
                variant="outline"
                className={`text-xs ${
                  budgetInfo.variant === 'success' ? 'border-green-200 text-green-700 bg-green-50' :
                  budgetInfo.variant === 'warning' ? 'border-amber-200 text-amber-700 bg-amber-50' :
                  ''
                }`}
              >
                {budgetInfo.label}
              </Badge>
            )}

            {/* Stage Badge */}
            {isInPipeline && currentStage && (
              <StageBadge stage={currentStage as MatchDealStage} size="sm" showIcon />
            )}
          </div>

          {/* Location info from buyer */}
          {buyer.preferredLocation && (
            <p className="text-xs text-muted-foreground mt-1.5">
              Looking in: {buyer.preferredLocation}
            </p>
          )}

          {/* Location Reason */}
          {score.locationReason && (
            <p className="text-xs text-muted-foreground mt-1">
              {score.locationReason}
            </p>
          )}
        </div>
      </div>

      {/* View Details Button */}
      {onViewDetails && (
        <div className="absolute bottom-3 right-3">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs bg-white hover:bg-purple-600 hover:text-white hover:border-purple-600 border-gray-200 text-gray-600 transition-all shadow-sm"
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

interface PropertyBuyersViewProps {
  selectedPropertyCode?: string | null;
  onPropertySelect?: (propertyCode: string | null) => void;
  filters?: MatchingFilters;
}

export function PropertyBuyersView({
  selectedPropertyCode: externalPropertyCode,
  onPropertySelect,
  filters,
}: PropertyBuyersViewProps = {}) {
  // Use internal state as fallback when no external state is provided
  const [internalPropertyCode, setInternalPropertyCode] = useState<string | null>(null);

  // State for match detail modal
  const [selectedBuyer, setSelectedBuyer] = useState<ScoredBuyer | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // State for buyer selection
  const [selectedBuyerIds, setSelectedBuyerIds] = useState<Set<string>>(new Set());
  const [sendModalOpen, setSendModalOpen] = useState(false);

  // Use external state if provided, otherwise use internal state
  const propertyCode = externalPropertyCode !== undefined ? externalPropertyCode : internalPropertyCode;

  // Use external handler if provided, otherwise use internal setter
  const handlePropertySelect = (newPropertyCode: string | null) => {
    if (onPropertySelect) {
      onPropertySelect(newPropertyCode);
    } else {
      setInternalPropertyCode(newPropertyCode);
    }
  };

  const navigate = useNavigate();

  // Fetch properties list for dropdown (just get first 100)
  const { data: propertiesData, isLoading: loadingProperties } = usePropertiesWithMatches({}, 100);
  const propertiesList = propertiesData?.data || [];

  // Fetch buyers for selected property
  const { data: propertyBuyersData, isLoading: loadingBuyers, error } = usePropertyBuyers(propertyCode);

  // Filter properties list based on search
  const filteredPropertiesList = useMemo(() => {
    if (!propertiesList || !filters?.search) return propertiesList;
    const searchLower = filters.search.toLowerCase();
    return propertiesList.filter((property) => {
      const address = property.address?.toLowerCase() || '';
      const city = property.city?.toLowerCase() || '';
      const propertyCode = property.propertyCode?.toLowerCase() || '';
      return (
        address.includes(searchLower) ||
        city.includes(searchLower) ||
        propertyCode.includes(searchLower)
      );
    });
  }, [propertiesList, filters?.search]);

  // Filter buyers based on filters
  const filteredBuyers = useMemo(() => {
    if (!propertyBuyersData) return { interested: [], potential: [], total: 0 };

    let allBuyers = [...propertyBuyersData.buyers];

    // Filter by search (first name, last name, email, city)
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      allBuyers = allBuyers.filter((sb) => {
        const firstName = sb.buyer.firstName?.toLowerCase() || '';
        const lastName = sb.buyer.lastName?.toLowerCase() || '';
        const email = sb.buyer.email?.toLowerCase() || '';
        const city = sb.buyer.city?.toLowerCase() || '';
        return (
          firstName.includes(searchLower) ||
          lastName.includes(searchLower) ||
          email.includes(searchLower) ||
          city.includes(searchLower)
        );
      });
    }

    // Filter by min score
    if (filters?.minScore && filters.minScore !== 'all') {
      const minScore = parseInt(filters.minScore, 10);
      allBuyers = allBuyers.filter((sb) => sb.score.score >= minScore);
    }

    // Filter by priority only
    if (filters?.priorityOnly) {
      allBuyers = allBuyers.filter((sb) => sb.score.isPriority);
    }

    // Split into interested (score >= 60) and potential (30-59)
    const interested = allBuyers.filter((sb) => sb.score.score >= 60);
    const potential = allBuyers.filter((sb) => sb.score.score < 60);

    return { interested, potential, total: allBuyers.length };
  }, [propertyBuyersData, filters]);

  // For backward compatibility
  const interestedBuyers = filteredBuyers.interested;
  const potentialBuyers = filteredBuyers.potential;

  // Get all selectable buyers (not in pipeline)
  const selectableBuyers = useMemo(() => {
    return [...interestedBuyers, ...potentialBuyers].filter(sb => !sb.currentStage);
  }, [interestedBuyers, potentialBuyers]);

  // Get selected buyers as ScoredBuyer objects
  const selectedBuyers = useMemo(() => {
    return [...interestedBuyers, ...potentialBuyers].filter(sb => {
      const buyerId = sb.buyer.recordId || sb.buyer.contactId;
      return selectedBuyerIds.has(buyerId);
    });
  }, [interestedBuyers, potentialBuyers, selectedBuyerIds]);

  // Selection helpers
  const toggleBuyerSelection = (buyerId: string) => {
    setSelectedBuyerIds(prev => {
      const next = new Set(prev);
      if (next.has(buyerId)) {
        next.delete(buyerId);
      } else {
        next.add(buyerId);
      }
      return next;
    });
  };

  const selectAllBuyers = () => {
    if (selectedBuyerIds.size === selectableBuyers.length) {
      // All are selected, so clear selection
      setSelectedBuyerIds(new Set());
    } else {
      // Select all selectable buyers
      setSelectedBuyerIds(new Set(selectableBuyers.map(sb => sb.buyer.recordId || sb.buyer.contactId)));
    }
  };

  const clearSelection = () => {
    setSelectedBuyerIds(new Set());
  };

  // Clear selection when property changes
  const handlePropertySelectInternal = (newPropertyCode: string | null) => {
    clearSelection();
    if (onPropertySelect) {
      onPropertySelect(newPropertyCode);
    } else {
      setInternalPropertyCode(newPropertyCode);
    }
  };

  return (
    <div className="space-y-6">
      {/* Property Selector */}
      <div className="bg-card border rounded-lg p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Home className="h-4 w-4 text-purple-500" />
            <span>Select Property:</span>
          </div>
          <Select
            value={propertyCode || ''}
            onValueChange={(value) => handlePropertySelectInternal(value || null)}
          >
            <SelectTrigger className="w-[400px]">
              <SelectValue placeholder="Choose a property to see interested buyers..." />
            </SelectTrigger>
            <SelectContent>
              {loadingProperties ? (
                <div className="p-2 text-sm text-muted-foreground">Loading properties...</div>
              ) : filteredPropertiesList.length === 0 ? (
                <div className="p-2 text-sm text-muted-foreground">No properties match your search</div>
              ) : (
                filteredPropertiesList.map((property) => (
                  <SelectItem key={property.recordId} value={property.recordId}>
                    {property.address}
                    <span className="text-muted-foreground ml-2 text-xs">
                      {property.city}{property.state && `, ${property.state}`}
                    </span>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Property Summary (when selected) */}
        {propertyBuyersData && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-start gap-4">
              {/* Property Image */}
              <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-gradient-to-br from-purple-100 to-purple-50 flex items-center justify-center">
                {propertyBuyersData.property.heroImage ? (
                  <img
                    src={propertyBuyersData.property.heroImage}
                    alt={propertyBuyersData.property.address}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Home className="h-8 w-8 text-purple-300" />
                )}
              </div>

              <div className="flex-1">
                <h3 className="font-semibold text-base">{propertyBuyersData.property.address}</h3>
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3 w-3" />
                  {propertyBuyersData.property.city}
                  {propertyBuyersData.property.state && `, ${propertyBuyersData.property.state}`}
                  {propertyBuyersData.property.zipCode && ` ${propertyBuyersData.property.zipCode}`}
                </p>

                {/* Property Stats */}
                <div className="flex items-center gap-4 mt-2 text-sm">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Bed className="h-4 w-4" />
                    {propertyBuyersData.property.beds}
                  </span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Bath className="h-4 w-4" />
                    {propertyBuyersData.property.baths}
                  </span>
                  {propertyBuyersData.property.sqft && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Square className="h-4 w-4" />
                      {propertyBuyersData.property.sqft.toLocaleString()}
                    </span>
                  )}
                  {propertyBuyersData.property.price && (
                    <span className="flex items-center gap-1 font-semibold text-foreground">
                      <DollarSign className="h-4 w-4" />
                      {propertyBuyersData.property.price.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Loading State */}
      {loadingBuyers && propertyCode && (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
            <p className="text-sm text-muted-foreground">Scoring buyers for this property...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-12">
          <div className="text-red-500 mb-4">
            <p className="font-medium">Error loading buyers: {error.message}</p>
          </div>
          {error.message?.includes('not found') && (
            <div className="text-muted-foreground space-y-2">
              <p>The cache has been refreshed automatically.</p>
              <p>If the property was just added, please try running matching to generate buyer matches.</p>
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

      {/* Empty State */}
      {!propertyCode && !loadingBuyers && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-purple-100 p-4 mb-4">
            <Home className="h-8 w-8 text-purple-500" />
          </div>
          <h3 className="font-semibold text-lg mb-1">Select a Property</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Choose a property from the dropdown above to see all buyers who match its criteria.
          </p>
        </div>
      )}

      {/* Buyers List */}
      {propertyBuyersData && !loadingBuyers && (
        <div className="space-y-6">
          {/* Top Interested Buyers */}
          {interestedBuyers.length > 0 && (
            <>
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Target className="h-5 w-5 text-purple-500" />
                    Top Engaged Buyers
                  </h3>
                  <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                    {interestedBuyers.length} {interestedBuyers.length === 1 ? 'buyer' : 'buyers'}
                  </Badge>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {interestedBuyers.map((scoredBuyer) => {
                    const buyerId = scoredBuyer.buyer.recordId || scoredBuyer.buyer.contactId;
                    return (
                      <BuyerCard
                        key={buyerId}
                        scoredBuyer={scoredBuyer}
                        property={propertyBuyersData.property}
                        onViewDetails={() => {
                          setSelectedBuyer(scoredBuyer);
                          setDetailModalOpen(true);
                        }}
                        isSelected={selectedBuyerIds.has(buyerId)}
                        onToggleSelect={() => toggleBuyerSelection(buyerId)}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Divider */}
              {potentialBuyers.length > 0 && (
                <MatchSectionDivider
                  title="Other Potential Buyers"
                  subtitle="Lower scores but still a potential match"
                  count={potentialBuyers.length}
                />
              )}
            </>
          )}

          {/* Other Potential Buyers */}
          {potentialBuyers.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {potentialBuyers.map((scoredBuyer) => {
                const buyerId = scoredBuyer.buyer.recordId || scoredBuyer.buyer.contactId;
                return (
                  <BuyerCard
                    key={buyerId}
                    scoredBuyer={scoredBuyer}
                    property={propertyBuyersData.property}
                    onViewDetails={() => {
                      setSelectedBuyer(scoredBuyer);
                      setDetailModalOpen(true);
                    }}
                    isSelected={selectedBuyerIds.has(buyerId)}
                    onToggleSelect={() => toggleBuyerSelection(buyerId)}
                  />
                );
              })}
            </div>
          )}

          {/* No Buyers State */}
          {interestedBuyers.length === 0 && potentialBuyers.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-gray-100 p-4 mb-4">
                <User className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="font-semibold text-lg mb-1">
                {propertyBuyersData.totalCount > 0 ? 'No Buyers Match Filters' : 'No Matching Buyers'}
              </h3>
              <p className="text-sm text-muted-foreground max-w-md">
                {propertyBuyersData.totalCount > 0
                  ? 'Try adjusting your filters to see more buyers.'
                  : 'No buyers currently match this property\'s criteria. Try running the matching algorithm to find potential buyers.'}
              </p>
            </div>
          )}

          {/* Stats Footer */}
          <div className="border-t pt-4">
            <p className="text-xs text-muted-foreground text-center">
              Showing {filteredBuyers.total} of {propertyBuyersData.totalCount} {propertyBuyersData.totalCount === 1 ? 'buyer' : 'buyers'} •
              Scored in {propertyBuyersData.stats.timeMs}ms
            </p>
          </div>

          {/* Match Detail Modal (Read-only view) */}
          <MatchDetailModal
            match={selectedBuyer ? {
              id: selectedBuyer.matchId || `${propertyBuyersData.property.recordId}-${selectedBuyer.buyer.recordId || selectedBuyer.buyer.contactId}`,
              propertyId: propertyBuyersData.property.recordId || '',
              buyerId: selectedBuyer.buyer.recordId || selectedBuyer.buyer.contactId,
              score: selectedBuyer.score.score,
              reasoning: selectedBuyer.score.reasoning,
              distance: selectedBuyer.score.distanceMiles,
              isPriority: selectedBuyer.score.isPriority,
              property: propertyBuyersData.property,
              buyer: selectedBuyer.buyer,
            } : null}
            open={detailModalOpen}
            onOpenChange={setDetailModalOpen}
            viewMode="property-centric"
          />

          {/* Send Property to Buyers Modal */}
          <SendPropertyToBuyersModal
            property={propertyBuyersData.property}
            buyers={selectedBuyers}
            open={sendModalOpen}
            onOpenChange={setSendModalOpen}
            onSendSuccess={() => {
              clearSelection();
            }}
          />
        </div>
      )}

      {/* Buyer Selection Bar - Floating at bottom */}
      {propertyBuyersData && selectableBuyers.length > 0 && (
        <BuyerSelectionBar
          selectedCount={selectedBuyerIds.size}
          totalCount={selectableBuyers.length}
          allSelected={selectedBuyerIds.size === selectableBuyers.length && selectableBuyers.length > 0}
          onSelectAll={selectAllBuyers}
          onClearSelection={clearSelection}
          onSendSelected={() => setSendModalOpen(true)}
        />
      )}
    </div>
  );
}
