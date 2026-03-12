import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, X, Send, Calendar, SkipForward, Home, RefreshCw,
  Database, AlertCircle, Loader2, Building2, Trash2,
  SlidersHorizontal, BedDouble,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PropertyCard } from '@/components/properties/PropertyCard';
import { PropertyDetailModal } from '@/components/properties/PropertyDetailModal';
import { EmptyState } from '@/components/ui/empty-state';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { FilterBar } from '@/components/filters/FilterBar';
import { FilterSelect, type FilterOption } from '@/components/filters/FilterSelect';
import { toast } from 'sonner';
import type { PropertyStatus, PropertyType, PropertyCondition, Property } from '@/types';
import { PROPERTY_SOURCES } from '@/types';
import { useAirtableProperties, useDeleteProperties } from '@/services/matchingApi';

const PROPERTY_TYPES: PropertyType[] = [
  'Single Family', 'Duplex', 'Multi Family', 'Condo', 'Lot',
  'Mobile Home', 'Town House', 'Commercial', 'Triplex', '4-plex'
];

const STATUS_OPTIONS: FilterOption[] = [
  { value: 'all', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'posted', label: 'Posted' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'deleted', label: 'Deleted' },
];

const BED_OPTIONS: FilterOption[] = [
  { value: 'any', label: 'Any' },
  { value: '1', label: '1+ Beds' },
  { value: '2', label: '2+ Beds' },
  { value: '3', label: '3+ Beds' },
  { value: '4', label: '4+ Beds' },
];

const BATH_OPTIONS: FilterOption[] = [
  { value: 'any', label: 'Any' },
  { value: '1', label: '1+ Baths' },
  { value: '2', label: '2+ Baths' },
  { value: '3', label: '3+ Baths' },
];

const PRICE_OPTIONS: FilterOption[] = [
  { value: 'all', label: 'Any Price' },
  { value: '0-10000', label: 'Under $10k' },
  { value: '10000-25000', label: '$10k – $25k' },
  { value: '25000-50000', label: '$25k – $50k' },
  { value: '50000-100000', label: '$50k – $100k' },
  { value: '100000+', label: '$100k+' },
];

function parsePriceRange(range: string): [number | null, number | null] {
  switch (range) {
    case '0-10000':      return [0, 10000];
    case '10000-25000':  return [10000, 25000];
    case '25000-50000':  return [25000, 50000];
    case '50000-100000': return [50000, 100000];
    case '100000+':      return [100000, null];
    default:             return [null, null];
  }
}

const PROPERTIES_PER_PAGE = 12;

export default function Properties() {
  const navigate = useNavigate();

  const [filters, setFilters] = useState({
    search: '',
    source: 'all',
    propertyType: 'all',
    status: 'all',
    minBeds: 'any',
    minBaths: 'any',
    priceRange: 'all',
  });
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  const setFilter = (key: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  // Fetch properties from Airtable (same source as Property Matching)
  const {
    data: airtableData,
    isLoading,
    isError,
    refetch
  } = useAirtableProperties(200);

  const deleteProperties = useDeleteProperties();

  // Transform Airtable properties to Property type for display
  const airtableProperties: Property[] = useMemo(() => {
    if (!airtableData?.properties) return [];

    return airtableData.properties.map((p) => {
      const transformed = {
        id: p.recordId,
        ghlOpportunityId: p.opportunityId,
        propertyCode: p.propertyCode,
        address: p.address,
        city: `${p.city || ''}${p.state ? `, ${p.state}` : ''}${p.zipCode ? ` ${p.zipCode}` : ''}`,
        price: p.price || 0,
        beds: p.beds || 0,
        baths: p.baths || 0,
        sqft: p.sqft,
        lat: p.propertyLat,
        lng: p.propertyLng,
        propertyType: p.propertyType as PropertyType | undefined,
        condition: p.condition as PropertyCondition | undefined,
        heroImage: p.heroImage || '/placeholder.svg',
        images: p.images && p.images.length > 0 ? p.images : (p.heroImage ? [p.heroImage] : ['/placeholder.svg']),
        status: 'pending' as PropertyStatus, // TODO: map from Airtable Stage field
        description: p.notes,
        monthlyPayment: p.monthlyPayment,
        downPayment: p.downPayment,
        source: p.source,
        zillowUrl: p.zillowUrl,
        daysOnMarket: p.daysOnMarket,
        createdAt: p.createdAt,
        isDemo: false,
        // Calculator scenarios
        calculatorScenario1: p.calculatorScenario1,
        calculatorScenario2: p.calculatorScenario2,
        calculatorScenario3: p.calculatorScenario3,
      };
      // Debug log for first property
      if (p.recordId === 'rec1uiQ50sMDLjFVY') {
        console.log('[Properties.tsx] Transformed property:', {
          propertyCode: transformed.propertyCode,
          propertyType: transformed.propertyType,
          condition: transformed.condition,
          'p.propertyType': p.propertyType,
          'p.condition': p.condition,
        });
      }
      return transformed;
    });
  }, [airtableData]);

  // Use only Airtable properties (no demo data)
  const allProperties = useMemo(() => {
    return airtableProperties;
  }, [airtableProperties]);

  const hasActiveFilters = useMemo(() =>
    filters.search !== '' ||
    filters.source !== 'all' ||
    filters.propertyType !== 'all' ||
    filters.status !== 'all' ||
    filters.minBeds !== 'any' ||
    filters.minBaths !== 'any' ||
    filters.priceRange !== 'all'
  , [filters]);

  const secondaryFilterCount = [
    filters.minBeds !== 'any',
    filters.minBaths !== 'any',
    filters.priceRange !== 'all',
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    setFilters({ search: '', source: 'all', propertyType: 'all', status: 'all', minBeds: 'any', minBaths: 'any', priceRange: 'all' });
    setCurrentPage(1);
  };

  // Filter properties
  const filteredProperties = useMemo(() => {
    return allProperties.filter((p) => {
      // Source
      if (filters.source !== 'all' && p.source !== filters.source) return false;
      // Property type
      if (filters.propertyType !== 'all' && p.propertyType !== filters.propertyType) return false;
      // Status
      if (filters.status !== 'all' && p.status !== filters.status) return false;
      // Min beds
      if (filters.minBeds !== 'any' && p.beds < parseInt(filters.minBeds)) return false;
      // Min baths
      if (filters.minBaths !== 'any' && p.baths < parseInt(filters.minBaths)) return false;
      // Price range (based on downPayment)
      if (filters.priceRange !== 'all') {
        const [min, max] = parsePriceRange(filters.priceRange);
        const price = p.downPayment ?? p.price ?? 0;
        if (min !== null && price < min) return false;
        if (max !== null && price > max) return false;
      }
      // Search — matches address, property code, city (which contains zip)
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const isZip = /^\d{5}$/.test(filters.search);
        if (isZip) {
          const zip = p.city.match(/\d{5}/)?.[0] || '';
          if (zip !== filters.search) return false;
        } else {
          const code = p.propertyCode || '';
          if (
            !code.toLowerCase().includes(q) &&
            !p.address.toLowerCase().includes(q) &&
            !p.city.toLowerCase().includes(q)
          ) return false;
        }
      }
      return true;
    });
  }, [allProperties, filters]);

  // Pagination
  const totalPages = Math.ceil(filteredProperties.length / PROPERTIES_PER_PAGE);
  const paginatedProperties = filteredProperties.slice(
    (currentPage - 1) * PROPERTIES_PER_PAGE,
    currentPage * PROPERTIES_PER_PAGE
  );

  // No demo properties anymore
  const demoCount = 0;

  const handleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const handlePostSelected = async () => {
    const validIds = Array.from(selectedIds);
    console.log('Posting properties:', validIds);
    // TODO: Implement batch posting
    handleClearSelection();
  };

  const handleBulkDelete = async () => {
    const recordIds = Array.from(selectedIds);
    try {
      const result = await deleteProperties.mutateAsync(recordIds);
      toast.success(`Deleted ${result.deletedCount} properties and ${result.matchesDeleted} related matches`);
      setShowBulkDeleteConfirm(false);
      handleClearSelection();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete properties');
    }
  };

  // Check if we have Airtable data
  const hasAirtableData = airtableProperties.length > 0;
  const airtableCount = airtableProperties.length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Error Banner */}
      {isError && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <div className="flex-1">
            <p className="text-sm font-medium">Failed to load properties</p>
            <p className="text-xs text-muted-foreground">
              There was an error fetching properties from Airtable. Using demo data only.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            Properties
            {hasAirtableData ? (
              <Badge className="bg-success flex items-center gap-1">
                <Database className="h-3 w-3" />
                {airtableCount} from Airtable
              </Badge>
            ) : isLoading ? (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading...
              </Badge>
            ) : (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Database className="h-3 w-3" />
                Demo Mode
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isLoading ? 'Loading properties...' : `${filteredProperties.length} properties found`}
            {demoCount > 0 && ` (${demoCount} demo)`}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => refetch()}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters — Primary Row */}
      <FilterBar hasActiveFilters={hasActiveFilters} onClearAll={clearAllFilters}>
        {/* Search — covers address, code, and zip */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search address, code, or zip..."
            value={filters.search}
            onChange={(e) => setFilter('search', e.target.value)}
            className="pl-10 h-9"
          />
        </div>

        {/* Source */}
        <FilterSelect
          value={filters.source}
          options={PROPERTY_SOURCES as unknown as FilterOption[]}
          onChange={(v) => setFilter('source', v)}
          placeholder="All Sources"
        />

        {/* Property Type */}
        <FilterSelect
          value={filters.propertyType}
          options={[{ value: 'all', label: 'All Types' }, ...PROPERTY_TYPES.map(t => ({ value: t, label: t }))]}
          onChange={(v) => setFilter('propertyType', v)}
          placeholder="All Types"
        />

        {/* Status */}
        <FilterSelect
          value={filters.status}
          options={STATUS_OPTIONS}
          onChange={(v) => setFilter('status', v)}
          placeholder="All Status"
        />

        {/* More Filters toggle */}
        <Button
          variant="outline"
          size="sm"
          className="h-9"
          onClick={() => setShowMoreFilters(prev => !prev)}
        >
          <SlidersHorizontal className="h-4 w-4 mr-1.5" />
          More Filters
          {secondaryFilterCount > 0 && (
            <Badge className="ml-1.5 h-5 w-5 rounded-full p-0 text-[10px] flex items-center justify-center">
              {secondaryFilterCount}
            </Badge>
          )}
        </Button>
      </FilterBar>

      {/* Filters — Secondary Row */}
      {showMoreFilters && (
        <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 bg-muted/20 rounded-lg border border-dashed">
          <span className="text-xs text-muted-foreground uppercase tracking-wide mr-1">More:</span>

          {/* Beds/Baths combined popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                <BedDouble className="h-4 w-4 mr-1.5" />
                {filters.minBeds === 'any' && filters.minBaths === 'any'
                  ? 'Beds / Baths'
                  : [
                      filters.minBeds !== 'any' ? `${filters.minBeds}+ Beds` : '',
                      filters.minBaths !== 'any' ? `${filters.minBaths}+ Baths` : '',
                    ].filter(Boolean).join(' / ')
                }
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-44 p-3 space-y-3">
              <FilterSelect
                label="Min Beds"
                value={filters.minBeds}
                options={BED_OPTIONS}
                onChange={(v) => setFilter('minBeds', v)}
              />
              <FilterSelect
                label="Min Baths"
                value={filters.minBaths}
                options={BATH_OPTIONS}
                onChange={(v) => setFilter('minBaths', v)}
              />
            </PopoverContent>
          </Popover>

          {/* Price Range */}
          <FilterSelect
            value={filters.priceRange}
            options={PRICE_OPTIONS}
            onChange={(v) => setFilter('priceRange', v)}
            placeholder="Any Price"
          />
        </div>
      )}

      {/* Bulk Selection Toolbar */}
      {selectedIds.size > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 bg-primary/10 rounded-lg animate-slide-in">
          <span className="font-medium">
            {selectedIds.size} properties selected
          </span>
          <div className="flex-1" />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={handlePostSelected}>
              <Send className="h-4 w-4 mr-2" />
              Post
            </Button>
            <Button size="sm" variant="outline">
              <Calendar className="h-4 w-4 mr-2" />
              Schedule
            </Button>
            <Button size="sm" variant="outline">
              <SkipForward className="h-4 w-4 mr-2" />
              Skip
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={() => setShowBulkDeleteConfirm(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete ({selectedIds.size})
            </Button>
            <Button size="sm" variant="ghost" onClick={handleClearSelection}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Property Grid */}
      {paginatedProperties.length > 0 ? (
        <>
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {paginatedProperties.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                selected={selectedIds.has(property.id)}
                onSelect={handleSelect}
                onViewDetail={(p) => {
                  setSelectedProperty(p);
                  setIsDetailModalOpen(true);
                }}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground px-4">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      ) : (
        <EmptyState
          icon={Building2}
          title="No properties found"
          description="Try adjusting your filters or add a new property in GHL."
        />
      )}

      {/* Property Detail Modal */}
      <PropertyDetailModal
        property={selectedProperty}
        open={isDetailModalOpen}
        onOpenChange={setIsDetailModalOpen}
        onSaved={() => refetch()}
      />

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} Properties</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure? This will also remove related match records. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteProperties.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={deleteProperties.isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteProperties.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                `Delete ${selectedIds.size} Properties`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
