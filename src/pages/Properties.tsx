import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Send, Calendar, SkipForward, MapPin, Home, RefreshCw, Database, AlertCircle, Loader2, Building2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PropertyCard } from '@/components/properties/PropertyCard';
import { PropertyDetailModal } from '@/components/properties/PropertyDetailModal';
import { EmptyState } from '@/components/ui/empty-state';
// Removed demo data import - using only Airtable data
import type { PropertyStatus, PropertyType, PropertyCondition, Property } from '@/types';
import { useAirtableProperties } from '@/services/matchingApi';

// Property source types for filtering
const sourceOptions: { value: string; label: string }[] = [
  { value: 'all', label: 'All Sources' },
  { value: 'Inventory', label: 'Inventory' },
  { value: 'Zillow', label: 'Zillow' },
  { value: 'Acquisitions', label: 'Acquisitions' },
];

const PROPERTY_TYPES: PropertyType[] = [
  'Single Family', 'Duplex', 'Multi Family', 'Condo', 'Lot',
  'Mobile Home', 'Town House', 'Commercial', 'Triplex', '4-plex'
];

const PROPERTIES_PER_PAGE = 12;

export default function Properties() {
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [propertyType, setPropertyType] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Fetch properties from Airtable (same source as Property Matching)
  const {
    data: airtableData,
    isLoading,
    isError,
    refetch
  } = useAirtableProperties(200);

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
        status: 'pending' as PropertyStatus, // Map from Airtable stage
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

  // Filter properties
  const filteredProperties = useMemo(() => {
    return allProperties.filter((property) => {
      // Source filter (Inventory, Lead, Zillow)
      if (sourceFilter !== 'all') {
        if (property.source !== sourceFilter) return false;
      }

      // Property type filter
      if (propertyType !== 'all' && property.propertyType !== propertyType) {
        return false;
      }

      // Zip code filter
      if (zipCode) {
        const zip = property.city.match(/\d{5}/)?.[0] || '';
        if (!zip.includes(zipCode)) {
          return false;
        }
      }

      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        const propertyCode = property.propertyCode || '';
        return (
          propertyCode.toLowerCase().includes(searchLower) ||
          property.address.toLowerCase().includes(searchLower) ||
          property.city.toLowerCase().includes(searchLower)
        );
      }

      return true;
    });
  }, [allProperties, sourceFilter, propertyType, search, zipCode]);

  // Pagination
  const totalPages = Math.ceil(filteredProperties.length / PROPERTIES_PER_PAGE);
  const paginatedProperties = filteredProperties.slice(
    (currentPage - 1) * PROPERTIES_PER_PAGE,
    currentPage * PROPERTIES_PER_PAGE
  );

  // No demo properties anymore
  const demoCount = 0;

  const handleSourceChange = (value: string) => {
    setSourceFilter(value);
    setCurrentPage(1);
  };

  const handlePropertyTypeChange = (value: string) => {
    setPropertyType(value);
    setCurrentPage(1);
  };

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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by property code or address..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-10"
          />
        </div>
        <div className="relative w-full sm:w-[140px]">
          <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Zip code"
            value={zipCode}
            onChange={(e) => {
              setZipCode(e.target.value.replace(/\D/g, '').slice(0, 5));
              setCurrentPage(1);
            }}
            className="pl-10"
            maxLength={5}
          />
        </div>
        <Select value={sourceFilter} onValueChange={handleSourceChange}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Database className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by source" />
          </SelectTrigger>
          <SelectContent>
            {sourceOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={propertyType} onValueChange={handlePropertyTypeChange}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Home className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Property type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {PROPERTY_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
    </div>
  );
}
