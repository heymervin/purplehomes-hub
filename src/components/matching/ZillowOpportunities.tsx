/**
 * ZillowOpportunities - Agent tool for finding external opportunities
 *
 * Provides three search types:
 * 1. Creative Financing - Properties with seller/owner finance keywords
 * 2. 90+ Days - Properties on market 90+ days (sorted by DOM)
 * 3. Affordability - Properties within calculated max price
 */

import { useState, useMemo, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Lock,
  ChevronDown,
  Loader2,
  MapPin,
  Bed,
  DollarSign,
  Tag,
  Calendar,
  Wallet,
  Phone,
  ExternalLink,
  Bath,
  Square,
  Home,
  RefreshCw,
  Building2,
  Warehouse,
  Castle,
  Caravan,
  LandPlot,
  Send,
  Info,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import { useZillowSearchByType } from '@/services/zillowApi';
import { useZillowSettings } from '@/services/matchingApi';
import { calculateMaxAffordablePrice } from '@/lib/affordability';
import type { BuyerCriteria } from '@/types/matching';
import type { ZillowSearchType, ZillowListing } from '@/types/zillow';
import { SendFlyerModal } from './SendFlyerModal';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Property type configuration for icons, colors, and labels
interface PropertyTypeConfig {
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
}

const PROPERTY_TYPE_CONFIG: Record<string, PropertyTypeConfig> = {
  SINGLE_FAMILY: {
    label: 'Single Family',
    shortLabel: 'SFH',
    icon: Home,
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
  },
  MULTI_FAMILY: {
    label: 'Multi-Family',
    shortLabel: 'MF',
    icon: Warehouse,
    color: 'text-amber-700',
    bgColor: 'bg-amber-100',
  },
  CONDO: {
    label: 'Condo',
    shortLabel: 'Condo',
    icon: Building2,
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
  },
  TOWNHOUSE: {
    label: 'Townhouse',
    shortLabel: 'TH',
    icon: Castle,
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-100',
  },
  MOBILE: {
    label: 'Mobile Home',
    shortLabel: 'Mobile',
    icon: Caravan,
    color: 'text-teal-700',
    bgColor: 'bg-teal-100',
  },
  LAND: {
    label: 'Land/Lot',
    shortLabel: 'Land',
    icon: LandPlot,
    color: 'text-green-700',
    bgColor: 'bg-green-100',
  },
  LOT: {
    label: 'Land/Lot',
    shortLabel: 'Lot',
    icon: LandPlot,
    color: 'text-green-700',
    bgColor: 'bg-green-100',
  },
  APARTMENT: {
    label: 'Apartment',
    shortLabel: 'Apt',
    icon: Building2,
    color: 'text-rose-700',
    bgColor: 'bg-rose-100',
  },
};

const DEFAULT_PROPERTY_TYPE_CONFIG: PropertyTypeConfig = {
  label: 'Other',
  shortLabel: 'Other',
  icon: Home,
  color: 'text-gray-700',
  bgColor: 'bg-gray-100',
};

function getPropertyTypeConfig(type: string | undefined): PropertyTypeConfig {
  if (!type) return DEFAULT_PROPERTY_TYPE_CONFIG;
  return PROPERTY_TYPE_CONFIG[type] || DEFAULT_PROPERTY_TYPE_CONFIG;
}

// Property type badge component
interface PropertyTypeBadgeProps {
  propertyType: string | undefined;
  size?: 'sm' | 'md';
  showIcon?: boolean;
}

function PropertyTypeBadge({ propertyType, size = 'sm', showIcon = true }: PropertyTypeBadgeProps) {
  const config = getPropertyTypeConfig(propertyType);
  const Icon = config.icon;

  return (
    <Badge
      variant="secondary"
      className={`
        ${config.bgColor} ${config.color}
        ${size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1'}
        font-medium border-0
      `}
    >
      {showIcon && <Icon className={`${size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} mr-1`} />}
      {size === 'sm' ? config.shortLabel : config.label}
    </Badge>
  );
}

interface ZillowOpportunitiesProps {
  buyer: BuyerCriteria;
}

export function ZillowOpportunities({ buyer }: ZillowOpportunitiesProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSearchType, setSelectedSearchType] = useState<ZillowSearchType | null>(null);
  const [selectedPropertyType, setSelectedPropertyType] = useState<string | null>(null);

  // Send Flyer modal state
  const [sendFlyerModalOpen, setSendFlyerModalOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState<ZillowListing | null>(null);

  // Get Zillow settings from preferences
  const zillowSettings = useZillowSettings();

  const handleSendFlyer = (listing: ZillowListing) => {
    setSelectedListing(listing);
    setSendFlyerModalOpen(true);
  };

  // Query for selected search type
  const { data, isLoading, error, refetch, isFetching } = useZillowSearchByType(
    buyer.recordId || null,
    selectedSearchType
  );

  // Reset property type filter when search type changes
  useEffect(() => {
    setSelectedPropertyType(null);
  }, [selectedSearchType]);

  // Filter results by property type
  const filteredResults = useMemo(() => {
    if (!data?.results) return [];
    if (!selectedPropertyType) return data.results;
    return data.results.filter(r => r.propertyType === selectedPropertyType);
  }, [data?.results, selectedPropertyType]);

  // Get unique property types with counts for filter dropdown
  const propertyTypeCounts = useMemo(() => {
    if (!data?.results) return {};
    return data.results.reduce((acc, r) => {
      const type = r.propertyType || 'OTHER';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [data?.results]);

  // Calculate max price for display
  const maxPrice = buyer.downPayment && buyer.downPayment > 10300
    ? calculateMaxAffordablePrice(buyer.downPayment)
    : null;

  // Check if buyer has required data for each search type
  const canSearchCreative = !!(buyer.preferredLocation || buyer.city);
  const canSearch90Days = !!(buyer.preferredLocation || buyer.city);
  const canSearchAffordability = !!(buyer.preferredLocation || buyer.city) && !!maxPrice;

  const handleSearchTypeClick = (type: ZillowSearchType) => {
    // If clicking same type, toggle off; otherwise switch to new type
    setSelectedSearchType(prev => prev === type ? null : type);
  };

  const getSearchAge = () => {
    if (!data?.searchAge) return '';
    const hours = data.searchAge;
    if (hours < 1) return 'just now';
    if (hours === 1) return '1 hour ago';
    if (hours < 24) return `${hours} hours ago`;
    const days = Math.floor(hours / 24);
    return days === 1 ? '1 day ago' : `${days} days ago`;
  };

  return (
    <>
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-2 border-purple-200 bg-purple-50/30">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full flex items-center justify-between p-4 hover:bg-purple-100/50"
          >
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-purple-600" />
              <h3 className="font-semibold text-purple-900">
                Agent Tools: Zillow Opportunities
              </h3>
            </div>
            <ChevronDown
              className={`h-5 w-5 text-purple-600 transition-transform ${
                isOpen ? 'transform rotate-180' : ''
              }`}
            />
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="p-4 pt-0 space-y-4">
            {/* Buyer Criteria Summary */}
            <div className="bg-white rounded-lg p-3 border border-purple-100">
              <h4 className="text-xs font-semibold text-purple-900 mb-2">Buyer Criteria:</h4>
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                {buyer.buyerType && (
                  <span className="flex items-center gap-1 font-medium text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                    {buyer.buyerType}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {buyer.preferredLocation || buyer.city || 'No location'}
                </span>
                {buyer.desiredBeds && (
                  <span className="flex items-center gap-1">
                    <Bed className="h-3 w-3" />
                    {buyer.desiredBeds}+ beds
                  </span>
                )}
                {maxPrice && (
                  <span className="flex items-center gap-1 font-medium text-foreground">
                    <DollarSign className="h-3 w-3" />
                    Max: ${maxPrice.toLocaleString()}
                  </span>
                )}
              </div>
            </div>

            {/* Search Type Buttons */}
            <div className="grid grid-cols-3 gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={selectedSearchType === 'Creative Financing' ? 'default' : 'outline'}
                      className={`h-auto py-3 px-2 flex flex-col items-center gap-1 ${
                        selectedSearchType === 'Creative Financing'
                          ? 'bg-purple-600 hover:bg-purple-700'
                          : 'hover:bg-purple-50 hover:border-purple-300'
                      }`}
                      onClick={() => handleSearchTypeClick('Creative Financing')}
                      disabled={!canSearchCreative || isLoading}
                    >
                      <Tag className="h-4 w-4" />
                      <span className="text-xs font-medium">Creative Financing</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[280px]">
                    <p className="text-xs">
                      <span className="font-semibold">Keywords:</span>{' '}
                      {zillowSettings.keywords.length > 60
                        ? zillowSettings.keywords.substring(0, 60) + '...'
                        : zillowSettings.keywords}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={selectedSearchType === '90+ Days' ? 'default' : 'outline'}
                      className={`h-auto py-3 px-2 flex flex-col items-center gap-1 ${
                        selectedSearchType === '90+ Days'
                          ? 'bg-purple-600 hover:bg-purple-700'
                          : 'hover:bg-purple-50 hover:border-purple-300'
                      }`}
                      onClick={() => handleSearchTypeClick('90+ Days')}
                      disabled={!canSearch90Days || isLoading}
                    >
                      <Calendar className="h-4 w-4" />
                      <span className="text-xs font-medium">{zillowSettings.minDays}+ Days</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="text-xs">
                      <span className="font-semibold">Max Price:</span> ${zillowSettings.maxPrice.toLocaleString()}
                      <br />
                      <span className="font-semibold">Min Days:</span> {zillowSettings.minDays} days on market
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={selectedSearchType === 'Affordability' ? 'default' : 'outline'}
                      className={`h-auto py-3 px-2 flex flex-col items-center gap-1 ${
                        selectedSearchType === 'Affordability'
                          ? 'bg-purple-600 hover:bg-purple-700'
                          : 'hover:bg-purple-50 hover:border-purple-300'
                      }`}
                      onClick={() => handleSearchTypeClick('Affordability')}
                      disabled={!canSearchAffordability || isLoading}
                    >
                      <Wallet className="h-4 w-4" />
                      <span className="text-xs font-medium">Affordable Range</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="text-xs">
                      <span className="font-semibold">Max Price:</span> ${maxPrice?.toLocaleString() || 'N/A'}
                      <br />
                      <span className="text-muted-foreground">Based on buyer's down payment</span>
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Active Search Criteria Banner */}
            {selectedSearchType && !isLoading && (
              <div className="flex items-center gap-2 px-3 py-2 bg-purple-100 border border-purple-200 rounded-lg text-xs">
                <Info className="h-3.5 w-3.5 text-purple-600 flex-shrink-0" />
                <div className="flex-1 text-purple-800">
                  {selectedSearchType === 'Creative Financing' && (
                    <span>
                      <span className="font-medium">Searching for:</span>{' '}
                      <span className="italic">"{zillowSettings.keywords}"</span>
                    </span>
                  )}
                  {selectedSearchType === '90+ Days' && (
                    <span>
                      <span className="font-medium">Criteria:</span>{' '}
                      Max ${zillowSettings.maxPrice.toLocaleString()} | {zillowSettings.minDays}+ days on market
                    </span>
                  )}
                  {selectedSearchType === 'Affordability' && maxPrice && (
                    <span>
                      <span className="font-medium">Max affordable price:</span>{' '}
                      ${maxPrice.toLocaleString()} (from ${buyer.downPayment?.toLocaleString()} down)
                    </span>
                  )}
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 text-purple-600 hover:text-purple-800 hover:bg-purple-200"
                        onClick={() => window.open('/settings?tab=preferences', '_blank')}
                      >
                        <Settings className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p className="text-xs">Edit search settings</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center py-12 bg-white rounded-lg border">
                <Loader2 className="h-6 w-6 animate-spin text-purple-500 mr-2" />
                <span className="text-sm text-muted-foreground">
                  Searching Zillow (30-60 seconds)...
                </span>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">
                  {error instanceof Error ? error.message : 'Failed to search Zillow'}
                </p>
              </div>
            )}

            {/* Results */}
            {data && !isLoading && (
              <div className="space-y-3">
                {/* Results Header */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold">
                        {selectedSearchType} Results
                      </h4>
                      <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                        {selectedPropertyType
                          ? `${filteredResults.length} of ${data.results.length}`
                          : data.results.length}
                      </Badge>
                      {data.cached && (
                        <Badge variant="outline" className="text-xs">
                          Cached
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {data.searchAge !== undefined && (
                        <span className="text-xs text-muted-foreground">
                          Last searched: {getSearchAge()}
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => refetch()}
                        disabled={isLoading || isFetching}
                        title="Refresh search results"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                  </div>

                  {/* Property Type Filter */}
                  {Object.keys(propertyTypeCounts).length > 1 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Filter:</span>
                      <Select
                        value={selectedPropertyType || 'all'}
                        onValueChange={(value) => setSelectedPropertyType(value === 'all' ? null : value)}
                      >
                        <SelectTrigger className="h-8 w-[160px] text-xs">
                          <SelectValue placeholder="All Types" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all" className="text-xs">
                            All Types ({data.results.length})
                          </SelectItem>
                          {Object.entries(propertyTypeCounts).map(([type, count]) => {
                            const config = getPropertyTypeConfig(type);
                            const Icon = config.icon;
                            return (
                              <SelectItem key={type} value={type} className="text-xs">
                                <span className="flex items-center gap-1.5">
                                  <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                                  {config.label} ({count})
                                </span>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* Results List */}
                {filteredResults.length > 0 ? (
                  <div className="space-y-2">
                    {filteredResults.map((listing) => (
                      <ZillowOpportunityCard
                        key={listing.zpid}
                        listing={listing}
                        onSendFlyer={handleSendFlyer}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-white rounded-lg border">
                    <p className="text-sm text-muted-foreground">
                      {selectedPropertyType
                        ? 'No properties match the selected filter'
                        : 'No properties found for this search'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Help Text */}
            {!selectedSearchType && !isLoading && (
              <div className="text-center py-6 text-sm text-muted-foreground">
                Select a search type above to find opportunities on Zillow
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>

      {/* Send Flyer Modal */}
      {selectedListing && (
        <SendFlyerModal
          open={sendFlyerModalOpen}
          onOpenChange={setSendFlyerModalOpen}
          listing={selectedListing}
          buyer={buyer}
        />
      )}
    </>
  );
}

/**
 * Individual opportunity card component
 */
interface ZillowOpportunityCardProps {
  listing: ZillowListing;
  onSendFlyer: (listing: ZillowListing) => void;
}

function ZillowOpportunityCard({ listing, onSendFlyer }: ZillowOpportunityCardProps) {
  const [imageError, setImageError] = useState(false);
  const imageUrl = listing.images?.[0];
  const typeConfig = getPropertyTypeConfig(listing.propertyType);
  const TypeIcon = typeConfig.icon;

  return (
    <Card className="p-3 hover:bg-purple-50/30 transition-colors">
      <div className="flex gap-3">
        {/* Property Image with property-type-specific fallback */}
        <div className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden ${
          imageUrl && !imageError
            ? 'bg-gray-100'
            : `bg-gradient-to-br ${typeConfig.bgColor} to-white`
        }`}>
          {imageUrl && !imageError ? (
            <img
              src={imageUrl}
              alt={listing.address}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <TypeIcon className={`h-8 w-8 ${typeConfig.color} opacity-60`} />
            </div>
          )}
        </div>

        {/* Property Details */}
        <div className="flex-1 min-w-0">
          {/* Header with address and property type badge */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h5 className="font-medium text-sm truncate">{listing.address}</h5>
              <p className="text-xs text-muted-foreground truncate">
                {listing.city}, {listing.state} {listing.zipCode}
              </p>
            </div>
            <PropertyTypeBadge propertyType={listing.propertyType} size="sm" />
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 mt-1 text-xs">
            <span className="flex items-center gap-1 font-semibold text-foreground">
              <DollarSign className="h-3 w-3" />
              {listing.price.toLocaleString()}
            </span>
            <span className="flex items-center gap-1">
              <Bed className="h-3 w-3" />
              {listing.beds}
            </span>
            <span className="flex items-center gap-1">
              <Bath className="h-3 w-3" />
              {listing.baths}
            </span>
            {listing.sqft && (
              <span className="flex items-center gap-1">
                <Square className="h-3 w-3" />
                {listing.sqft.toLocaleString()}
              </span>
            )}
          </div>

          {/* Days on Market Badge */}
          {listing.daysOnMarket && listing.daysOnMarket > 0 && (
            <div className="mt-2">
              <Badge
                variant={listing.daysOnMarket >= 90 ? 'default' : 'secondary'}
                className={`text-xs ${
                  listing.daysOnMarket >= 90
                    ? 'bg-orange-500 hover:bg-orange-600'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {listing.daysOnMarket} days on market
              </Badge>
            </div>
          )}

          {/* Listing Agent */}
          {listing.listingAgent && (
            <div className="mt-2 pt-2 border-t border-gray-100">
              <p className="text-xs font-medium text-foreground">
                {listing.listingAgent.name}
              </p>
              {listing.listingAgent.phone && (
                <p className="text-xs text-muted-foreground">
                  {listing.listingAgent.phone}
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 mt-2">
            {listing.listingAgent?.phone && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => window.open(`tel:${listing.listingAgent!.phone}`, '_self')}
              >
                <Phone className="h-3 w-3 mr-1" />
                Call
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => window.open(listing.zillowUrl, '_blank')}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              View on Zillow
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs bg-purple-600 hover:bg-purple-700 text-white"
              onClick={() => onSendFlyer(listing)}
            >
              <Send className="h-3 w-3 mr-1" />
              Send Flyer
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
