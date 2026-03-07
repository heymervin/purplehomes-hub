import { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, Bed, Bath, Maximize2, Phone, MapPin, X, Wrench, Heart, ChevronDown, SlidersHorizontal, ChevronUp, List as ListIcon, DollarSign, Home, Moon, Sun, ArrowLeft, Navigation, Loader2, ZoomIn, Eye, ExternalLink } from 'lucide-react';
import type { PropertyCondition, PropertyType, Property } from '@/types';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
// import { demoProperties, mockProperties } from '@/data/mockData'; // Moved to mockData.backup.ts
import { toast } from 'sonner';
import { PropertyMap } from '@/components/listings/PropertyMap';
import { MapCoachMarks } from '@/components/listings/MapCoachMarks';
import { ExitIntentModal } from '@/components/listings/ExitIntentModal';
import { ProximityBadge } from '@/components/listings/ProximityBadge';
import { PropertyImageGallery } from '@/components/properties/PropertyImageGallery';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useExitIntent } from '@/hooks/useExitIntent';
import { useCreateContact } from '@/services/ghlApi';
import { calculatePropertyDistance } from '@/lib/proximityCalculator';
import { useAirtableProperties } from '@/services/matchingApi';
import { generatePropertySlug } from '@/lib/utils/slug';
import { useLanguage } from '@/contexts/LanguageContext';

const PROPERTY_TYPES: PropertyType[] = [
  'Single Family', 'Duplex', 'Multi Family', 'Condo', 'Lot', 
  'Mobile Home', 'Town House', 'Commercial', 'Triplex', '4-plex'
];

const CONDITION_OPTIONS: PropertyCondition[] = [
  'Excellent', 'Great', 'Good', 'Fair', 'Poor', 'Terrible', 'Needs some Repair'
];

type SortOption = 'price-high' | 'price-low' | 'newest' | 'beds' | 'sqft';

const ITEMS_PER_PAGE = 40;

export default function PublicListings() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { t } = useLanguage();

  // Fetch properties from Airtable (same source as Properties page and Property Matching)
  const { data: airtableData, isLoading: isLoadingProperties, isError, error } = useAirtableProperties(200);

  // Transform Airtable properties to Property type for display
  const allProperties: Property[] = useMemo(() => {
    if (!airtableData?.properties) return [];

    const properties = airtableData.properties
      .map((p): Property => ({
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
        status: 'pending',
        description: p.notes,
        monthlyPayment: p.monthlyPayment,
        downPayment: p.downPayment,
        createdAt: p.createdAt || new Date().toISOString(),
      }));

    return properties;
  }, [airtableData]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [search, setSearch] = useState('');
  // zipCode is auto-derived from search when user types a 5-digit number
  const [zipCode, setZipCode] = useState('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [fitBoundsKey, setFitBoundsKey] = useState(0);
  const [zoomTarget, setZoomTarget] = useState<{ lat: number; lng: number } | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [currentMapZoom, setCurrentMapZoom] = useState(10);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000000]);
  const [downPaymentRange, setDownPaymentRange] = useState<[number, number]>([0, 1000000]);
  const [beds, setBeds] = useState('any');
  const [baths, setBaths] = useState('any');
  const [condition, setCondition] = useState('any');
  const [propertyType, setPropertyType] = useState('any');
  const [sortBy, setSortBy] = useState<SortOption>('price-high');
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [hoveredPropertyId, setHoveredPropertyId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [savedProperties, setSavedProperties] = useState<Set<string>>(new Set());
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Forms
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [offerForm, setOfferForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    offerAmount: '',
    message: ''
  });
  
  const [hasSubmittedOffer, setHasSubmittedOffer] = useState(false);

  // GHL Contact creation (more reliable than Form API)
  const createContact = useCreateContact();

  // Exit intent popup
  const { showExitIntent, dismiss: dismissExitIntent, markConverted: markExitConverted } = useExitIntent({
    delayMs: 5000,
    sessionKey: 'ph-listings-exit-intent',
    disabled: hasSubmittedOffer || !!selectedProperty,
  });

  const filteredProperties = useMemo(() => {
    // Wait for properties to load before filtering
    // Return empty during loading OR if still waiting for properties to populate
    if (isLoadingProperties || (allProperties.length === 0 && !isError)) {
      return [];
    }

    let results = allProperties.filter((property) => {
      if (search) {
        const searchLower = search.toLowerCase().trim();
        const isZipSearch = /^\d{3,5}$/.test(searchLower);
        if (isZipSearch) {
          const propertyZip = property.city.match(/\d{5}/)?.[0] || '';
          if (!propertyZip.startsWith(searchLower)) return false;
        } else {
          if (!property.address.toLowerCase().includes(searchLower) &&
              !property.city.toLowerCase().includes(searchLower)) {
            return false;
          }
        }
      }
      if (property.price < priceRange[0] || property.price > priceRange[1]) return false;
      if (property.downPayment !== undefined &&
          (property.downPayment < downPaymentRange[0] || property.downPayment > downPaymentRange[1])) return false;
      if (beds !== 'any' && property.beds < parseInt(beds)) return false;
      if (baths !== 'any' && property.baths < parseInt(baths)) return false;
      if (condition !== 'any' && property.condition !== condition) return false;
      if (propertyType !== 'any' && property.propertyType !== propertyType) return false;
      return true;
    });

    switch (sortBy) {
      case 'price-high':
        results.sort((a, b) => b.price - a.price);
        break;
      case 'price-low':
        results.sort((a, b) => a.price - b.price);
        break;
      case 'beds':
        results.sort((a, b) => b.beds - a.beds);
        break;
      case 'sqft':
        results.sort((a, b) => (b.sqft || 0) - (a.sqft || 0));
        break;
      case 'newest':
        results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
    }

    return results;
  }, [allProperties, search, priceRange, downPaymentRange, beds, baths, condition, propertyType, sortBy, isLoadingProperties, isError]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, priceRange, downPaymentRange, beds, baths, condition, propertyType, sortBy]);

  // Auto-derive ZIP from unified search field for map panning + distance calc
  useEffect(() => {
    const trimmed = search.trim();
    const isZip = /^\d{5}$/.test(trimmed);
    setZipCode(isZip ? trimmed : '');
  }, [search]);

  // Auto-fit map to search results when search text changes
  useEffect(() => {
    if (search && filteredProperties.length > 0) {
      setFitBoundsKey(k => k + 1);
    }
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  // Paginated properties
  const totalPages = Math.max(1, Math.ceil(filteredProperties.length / ITEMS_PER_PAGE));
  const paginatedProperties = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProperties.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredProperties, currentPage]);

  const toggleSaved = (propertyId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedProperties(prev => {
      const next = new Set(prev);
      if (next.has(propertyId)) {
        next.delete(propertyId);
        toast.success(t('listings.removedFromSaved'));
      } else {
        next.add(propertyId);
        // On first save, prompt lead capture if not yet submitted
        if (prev.size === 0 && !hasSubmittedOffer) {
          setTimeout(() => {
            toast.success(t('listings.savedToFavorites'), {
              description: 'Enter your info to get notified about this property!',
              action: {
                label: 'Save My Info',
                onClick: () => setShowOfferForm(true),
              },
            });
          }, 300);
        } else {
          toast.success(t('listings.savedToFavorites'));
        }
      }
      return next;
    });
  };

  const handleOfferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProperty) return;

    try {
      // Create contact directly via Contact API (more reliable than Form API)
      await createContact.mutateAsync({
        firstName: offerForm.firstName,
        lastName: offerForm.lastName,
        email: offerForm.email,
        phone: offerForm.phone,
        tags: ['Listing Lead', 'Interested Buyer', `Property: ${selectedProperty.address}`],
        customFields: [
          // Budget/Offer Amount
          { id: 'RsonBtVCorhBi4ehUeAY', value: offerForm.offerAmount || '' },
          // Property Address interested in
          { id: 'UcJ0Qoz3kh0OjC9oLVsK', value: selectedProperty.address },
          // Property City
          { id: 'JiQiZk4AwSIuggxs8ryC', value: selectedProperty.city },
          // Notes/Message
          { id: '5EfOYalxVtyl95FKnEXz', value: offerForm.message || `Interested in ${selectedProperty.address} - $${selectedProperty.price.toLocaleString()}` },
        ],
      });

      toast.success(t('listings.offerSubmitted'));
      setOfferForm({ firstName: '', lastName: '', email: '', phone: '', offerAmount: '', message: '' });
      setShowOfferForm(false);
      setHasSubmittedOffer(true);
    } catch (error) {
      console.error('Contact creation error:', error);
      toast.error(t('listings.offerFailed'));
    }
  };

  const clearFilters = () => {
    setSearch('');
    setBeds('any');
    setBaths('any');
    setCondition('any');
    setPropertyType('any');
    setPriceRange([0, 1000000]);
    setDownPaymentRange([0, 1000000]);
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setSearch(''); // Clear search when using location
        setIsLocating(false);
        toast.success('Showing properties near you!');
      },
      (error) => {
        setIsLocating(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error('To find properties near you, allow location access in your browser settings.');
            break;
          case error.POSITION_UNAVAILABLE:
            toast.error('Your location could not be determined right now.');
            break;
          case error.TIMEOUT:
            toast.error('Location request timed out — try searching by city instead.');
            break;
          default:
            toast.error('Could not get your location. Try searching by city or ZIP.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleZoomToProperty = (property: Property, e: React.MouseEvent) => {
    e.stopPropagation(); // Don't open modal
    if (property.lat && property.lng) {
      setZoomTarget({ lat: property.lat, lng: property.lng });
    }
  };

  const activeFilterCount = [
    !!search,
    beds !== 'any',
    baths !== 'any',
    condition !== 'any',
    propertyType !== 'any',
    priceRange[0] > 0 || priceRange[1] < 1000000,
    downPaymentRange[0] > 0 || downPaymentRange[1] < 1000000,
  ].filter(Boolean).length;

  const formatPrice = (value: number | '') => {
    if (value === '') return '';
    return value.toLocaleString();
  };

  const parsePrice = (value: string): number | '' => {
    const num = parseInt(value.replace(/\D/g, ''));
    return isNaN(num) ? '' : num;
  };

  // Calculate distance from user's ZIP code to property
  // Works with both geocoded properties (lat/lng) and ZIP-based properties
  const getPropertyDistance = (property: Property): number | null => {
    if (!zipCode) return null;
    return calculatePropertyDistance(property, zipCode);
  };

  // Render a property card - inline function to avoid component recreation
  const renderPropertyCard = (property: Property, compact: boolean = false) => {
    const isHovered = hoveredPropertyId === property.id;
    const isSaved = savedProperties.has(property.id);
    const distance = getPropertyDistance(property);

    // Compact layout for mobile drawer
    if (compact) {
      return (
        <div
          key={property.id}
          className={cn(
            "group relative flex rounded-xl overflow-hidden cursor-pointer transition-all duration-300",
            isDarkMode
              ? "bg-card border border-border/50 hover:border-purple-500/50"
              : "bg-white border border-gray-200 hover:border-purple-500/50",
            isHovered && "ring-2 ring-purple-500 shadow-lg shadow-purple-500/20"
          )}
          onClick={() => setSelectedProperty(property)}
          onMouseEnter={() => setHoveredPropertyId(property.id)}
          onMouseLeave={() => setHoveredPropertyId(null)}
        >
          <div className="w-28 h-28 flex-shrink-0 relative overflow-hidden">
            <img src={property.heroImage} alt={property.address} className="w-full h-full object-cover" />
          </div>
          <div className="py-3 px-3 flex-1 min-w-0">
            <h3 className={cn("text-sm font-semibold truncate", isDarkMode ? "text-foreground" : "text-gray-900")}>{property.address}</h3>
            <p className={cn("text-xs truncate", isDarkMode ? "text-muted-foreground" : "text-gray-500")}>{property.city}</p>
            <div className="flex items-center justify-between mt-1.5">
              <p className="text-base font-bold text-purple-600">${property.price.toLocaleString()}</p>
              <span className={cn("text-xs", isDarkMode ? "text-muted-foreground" : "text-gray-500")}>
                {property.beds} bd &bull; {property.baths} ba
              </span>
            </div>
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                const slug = generatePropertySlug(property.address, property.city);
                window.open(`/listing/${slug}`, '_blank');
              }}
              className="w-full mt-2 h-7 gap-1 text-xs bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Eye className="h-3 w-3" /> {t('common.seeMore')}
            </Button>
          </div>
        </div>
      );
    }

    // Grid card for desktop panel (2-col layout inspired by reference)
    return (
      <div
        key={property.id}
        className={cn(
          "group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-200",
          isDarkMode
            ? "bg-card border border-border/50 hover:border-purple-500/50"
            : "bg-white border border-gray-200 hover:border-purple-400/60 hover:shadow-md",
          isHovered && "ring-2 ring-purple-500 shadow-lg shadow-purple-500/20"
        )}
        onClick={() => setSelectedProperty(property)}
        onMouseEnter={() => setHoveredPropertyId(property.id)}
        onMouseLeave={() => setHoveredPropertyId(null)}
      >
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden">
          <img
            src={property.heroImage}
            alt={property.address}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {/* Save heart */}
          <button
            onClick={(e) => toggleSaved(property.id, e)}
            className={cn(
              "absolute top-2 right-2 p-1.5 rounded-full transition-all duration-200",
              isSaved
                ? "bg-purple-500 text-white"
                : "bg-black/30 backdrop-blur-sm text-white hover:bg-black/50"
            )}
            data-tour="card-save"
          >
            <Heart className={cn("h-3.5 w-3.5", isSaved && "fill-current")} />
          </button>
          {/* Distance badge */}
          {distance !== null && distance >= 0 && (
            <div className="absolute top-2 left-2">
              <ProximityBadge
                distance={distance}
                variant="compact"
                className="bg-white/90 backdrop-blur-sm shadow-md text-xs"
              />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-3" data-tour="card-location">
          <h3 className={cn(
            "text-sm font-semibold truncate leading-tight",
            isDarkMode ? "text-foreground" : "text-gray-900"
          )}>{property.address}</h3>
          <p className={cn(
            "text-xs truncate mt-0.5",
            isDarkMode ? "text-muted-foreground" : "text-gray-500"
          )}>{property.city}</p>

          {/* Price + specs line */}
          <div className="flex items-center justify-between mt-2" data-tour="card-pricing">
            <span className="text-base font-bold text-purple-600">
              ${property.price.toLocaleString()}
            </span>
            <span className={cn(
              "text-xs",
              isDarkMode ? "text-muted-foreground" : "text-gray-500"
            )} data-tour="card-specs">
              {property.beds} bd &bull; {property.baths} ba
            </span>
          </div>

          {/* Down payment if available */}
          {property.downPayment !== undefined && (
            <p className="text-xs text-purple-500 mt-1">
              Down: ${property.downPayment.toLocaleString()}
            </p>
          )}

          {/* Action row */}
          <div className="flex gap-1.5 mt-2" data-tour="property-actions">
            {property.lat && property.lng && (
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => handleZoomToProperty(property, e)}
                className={cn(
                  "flex-1 h-7 gap-1 text-xs",
                  isDarkMode ? "border-border hover:bg-purple-500/10" : "border-gray-300 hover:border-purple-400"
                )}
              >
                <ZoomIn className="h-3 w-3" /> {t('common.map')}
              </Button>
            )}
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                const slug = generatePropertySlug(property.address, property.city);
                window.open(`/listing/${slug}`, '_blank');
              }}
              className="flex-1 h-7 gap-1 text-xs bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Eye className="h-3 w-3" /> {t('common.details')}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // Render the property list content - inline to preserve scroll position
  const renderPropertyListContent = (compact: boolean = false) => (
    <>
      <div className={cn(
        "flex items-center justify-between p-4 border-b",
        isDarkMode ? "border-border/50 bg-card/50" : "border-gray-200 bg-white"
      )}>
        <div>
          <h2 className={cn(
            "text-lg font-bold",
            isDarkMode ? "text-foreground" : "text-gray-900"
          )}>{filteredProperties.length.toLocaleString()} {t('listings.propertiesFound')}</h2>
          <p className={cn(
            "text-xs",
            isDarkMode ? "text-muted-foreground" : "text-gray-500"
          )}>
            {t('listings.showing')} {paginatedProperties.length} {t('listings.of')} {filteredProperties.length.toLocaleString()} {t('listings.properties')} ({t('listings.page')} {currentPage} {t('listings.of')} {totalPages})
          </p>
        </div>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <SelectTrigger className={cn(
            "w-[140px] text-xs h-8",
            isDarkMode ? "bg-background text-foreground border-border" : "bg-white text-gray-900 border-gray-300"
          )} data-tour="sort-select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="price-high">{t('listings.sortPriceHigh')}</SelectItem>
            <SelectItem value="price-low">{t('listings.sortPriceLow')}</SelectItem>
            <SelectItem value="newest">{t('listings.sortNewest')}</SelectItem>
            <SelectItem value="beds">{t('listings.sortBeds')}</SelectItem>
            <SelectItem value="sqft">{t('listings.sortLargest')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 overflow-y-auto" data-tour="property-list">
        <div className={cn(
          "p-4",
          compact ? "space-y-4" : "grid grid-cols-2 gap-3"
        )}>
          {paginatedProperties.map((property) => renderPropertyCard(property, compact))}

          {filteredProperties.length === 0 && (
            <div className={cn("text-center py-12", !compact && "col-span-2")}>
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="h-8 w-8 text-gray-400" />
              </div>
              <p className={cn(isDarkMode ? "text-muted-foreground" : "text-gray-600")}>{t('listings.noMatch')}</p>
              <Button variant="link" onClick={clearFilters} className="text-purple-500">
                {t('listings.clearAllFilters')}
              </Button>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className={cn(
            "flex items-center justify-between px-4 py-3 border-t",
            isDarkMode ? "border-border/50" : "border-gray-200"
          )}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={cn(
                "text-sm",
                isDarkMode ? "border-border" : "border-gray-300"
              )}
            >
              {t('common.previous')}
            </Button>
            <span className={cn(
              "text-sm font-medium",
              isDarkMode ? "text-muted-foreground" : "text-gray-600"
            )}>
              {t('listings.page')} {currentPage} {t('listings.of')} {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="text-sm bg-purple-600 hover:bg-purple-700 text-white border-purple-600"
            >
              {t('common.next')}
            </Button>
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className={cn(
      "h-screen flex flex-col overflow-hidden",
      isDarkMode ? "bg-background" : "bg-gray-50"
    )}>
      {/* Header */}
      <header className={cn(
        "flex-shrink-0 backdrop-blur-md border-b shadow-sm z-50",
        isDarkMode ? "bg-card/95 border-border/50" : "bg-white/95 border-gray-200"
      )}>
        <div className="flex items-center gap-3 px-4 py-3">
          {/* Back Button */}
          <Button
            onClick={() => navigate(-1)}
            className="flex-shrink-0 bg-purple-600 hover:bg-purple-700 text-white gap-2"
            title="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back</span>
          </Button>


          {/* Brand Name */}
          <span className="hidden sm:block flex-shrink-0 font-bold text-purple-600 text-lg">Purple Homes</span>

          {/* Primary Filters - Always Visible */}
          <div className="flex-1 flex items-center gap-2 max-w-4xl">
            {/* Unified Search Field */}
            <div className="relative flex-1 min-w-[180px]" data-tour="address-search">
              <Search className={cn(
                "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none",
                isDarkMode ? "text-muted-foreground" : "text-gray-400"
              )} />
              <Input
                placeholder="City, state, ZIP, or address..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setUserLocation(null);
                }}
                className={cn(
                  "pl-10 pr-10 shadow-sm hover:shadow-md transition-shadow focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:border-transparent",
                  isDarkMode ? "bg-background text-foreground border-border" : "bg-white text-gray-900 placeholder:text-gray-400 border-gray-300"
                )}
              />
              {/* Locate Me - inline right icon */}
              <button
                onClick={handleLocateMe}
                disabled={isLocating}
                title="Use my location"
                data-tour="locate-button"
                className={cn(
                  "absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded transition-colors",
                  userLocation ? "text-purple-600" : isDarkMode ? "text-muted-foreground hover:text-foreground" : "text-gray-400 hover:text-purple-600"
                )}
              >
                {isLocating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Navigation className={cn("h-4 w-4", userLocation && "fill-purple-200")} />
                )}
              </button>
            </div>

            {/* Quick Filters - Desktop Only */}
            <div className="hidden lg:flex items-center gap-2" data-tour="quick-filters">
              <Select value={beds} onValueChange={setBeds}>
                <SelectTrigger className={cn(
                  "w-28 shadow-sm hover:shadow-md transition-shadow",
                  isDarkMode ? "bg-background text-foreground border-border" : "bg-white text-gray-900 border-gray-300"
                )}>
                  <SelectValue placeholder="Beds" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any Beds</SelectItem>
                  <SelectItem value="1">1+ Bed</SelectItem>
                  <SelectItem value="2">2+ Beds</SelectItem>
                  <SelectItem value="3">3+ Beds</SelectItem>
                  <SelectItem value="4">4+ Beds</SelectItem>
                  <SelectItem value="5">5+ Beds</SelectItem>
                </SelectContent>
              </Select>

              <Select value={baths} onValueChange={setBaths}>
                <SelectTrigger className={cn(
                  "w-28 shadow-sm hover:shadow-md transition-shadow",
                  isDarkMode ? "bg-background text-foreground border-border" : "bg-white text-gray-900 border-gray-300"
                )}>
                  <SelectValue placeholder="Baths" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any Baths</SelectItem>
                  <SelectItem value="1">1+ Bath</SelectItem>
                  <SelectItem value="2">2+ Baths</SelectItem>
                  <SelectItem value="3">3+ Baths</SelectItem>
                  <SelectItem value="4">4+ Baths</SelectItem>
                </SelectContent>
              </Select>

              <Select value={`${priceRange[0]}-${priceRange[1]}`} onValueChange={(value) => {
                const [min, max] = value.split('-').map(Number);
                setPriceRange([min, max]);
              }}>
                <SelectTrigger className={cn(
                  "w-36 shadow-sm hover:shadow-md transition-shadow",
                  isDarkMode ? "bg-background text-foreground border-border" : "bg-white text-gray-900 border-gray-300"
                )}>
                  <DollarSign className="h-4 w-4" />
                  <SelectValue placeholder="Price" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0-1000000">Any Price</SelectItem>
                  <SelectItem value="0-100000">Under $100K</SelectItem>
                  <SelectItem value="0-200000">Under $200K</SelectItem>
                  <SelectItem value="200000-400000">$200K - $400K</SelectItem>
                  <SelectItem value="400000-600000">$400K - $600K</SelectItem>
                  <SelectItem value="600000-1000000">$600K+</SelectItem>
                </SelectContent>
              </Select>

              {/* Down Payment - key differentiator */}
              <Select value={`${downPaymentRange[0]}-${downPaymentRange[1]}`} onValueChange={(value) => {
                const [min, max] = value.split('-').map(Number);
                setDownPaymentRange([min, max]);
              }}>
                <SelectTrigger className={cn(
                  "w-36 shadow-sm hover:shadow-md transition-shadow",
                  isDarkMode ? "bg-background text-foreground border-border" : "bg-white text-gray-900 border-gray-300"
                )}>
                  <DollarSign className="h-4 w-4" />
                  <SelectValue placeholder="Down Pmt" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0-1000000">Any Down</SelectItem>
                  <SelectItem value="0-10000">Under $10K</SelectItem>
                  <SelectItem value="0-25000">Under $25K</SelectItem>
                  <SelectItem value="0-50000">Under $50K</SelectItem>
                  <SelectItem value="0-100000">Under $100K</SelectItem>
                  <SelectItem value="100000-1000000">$100K+</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Theme Toggle */}
          <Button
            size="icon"
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="flex-shrink-0 bg-purple-600 hover:bg-purple-700 text-white"
            data-tour="theme-toggle"
          >
            {isDarkMode ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>

          {/* More Filters */}
          <Popover open={showFilters} onOpenChange={setShowFilters}>
            <PopoverTrigger asChild>
              <Button className="gap-2 relative bg-purple-600 hover:bg-purple-700 text-white" data-tour="filters-button">
                <SlidersHorizontal className="h-4 w-4" />
                <span className="hidden sm:inline">{t('listings.filters')}</span>
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-purple-500 text-white text-xs flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end" data-tour="filters-panel">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">{t('listings.allFilters')}</h4>
                  <Button variant="ghost" size="sm" onClick={clearFilters}>{t('common.clear')}</Button>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-gray-600">{t('listings.propertyType')}</Label>
                    <Select value={propertyType} onValueChange={setPropertyType}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Any" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">{t('listings.anyType')}</SelectItem>
                        {PROPERTY_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs text-gray-600">Condition</Label>
                    <Select value={condition} onValueChange={setCondition}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Any" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any Condition</SelectItem>
                        {CONDITION_OPTIONS.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs text-gray-600">Price Range</Label>
                    <Slider
                      value={priceRange}
                      min={0}
                      max={1000000}
                      step={25000}
                      onValueChange={(value) => setPriceRange(value as [number, number])}
                      className="mt-3"
                    />
                    <div className="flex justify-between text-xs text-gray-600 mt-1">
                      <span>${priceRange[0].toLocaleString()}</span>
                      <span>{priceRange[1] >= 1000000 ? '$1M+' : `$${priceRange[1].toLocaleString()}`}</span>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-gray-600">Max Down Payment</Label>
                    <Slider
                      value={[downPaymentRange[1]]}
                      min={0}
                      max={1000000}
                      step={5000}
                      onValueChange={(value) => setDownPaymentRange([0, value[0]])}
                      className="mt-3"
                    />
                    <div className="flex justify-between text-xs text-gray-600 mt-1">
                      <span>$0</span>
                      <span className="font-medium text-purple-600">
                        {downPaymentRange[1] >= 1000000 ? 'Any' : `Up to $${downPaymentRange[1].toLocaleString()}`}
                      </span>
                    </div>
                  </div>

                  {/* Mobile-only filters (already in header on desktop) */}
                  <div className="lg:hidden space-y-3">
                    <div>
                      <Label className="text-xs text-gray-600">Bedrooms</Label>
                      <Select value={beds} onValueChange={setBeds}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Any Beds" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">Any Beds</SelectItem>
                          <SelectItem value="1">1+ Bed</SelectItem>
                          <SelectItem value="2">2+ Beds</SelectItem>
                          <SelectItem value="3">3+ Beds</SelectItem>
                          <SelectItem value="4">4+ Beds</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs text-gray-600">Bathrooms</Label>
                      <Select value={baths} onValueChange={setBaths}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Any Baths" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">Any Baths</SelectItem>
                          <SelectItem value="1">1+ Bath</SelectItem>
                          <SelectItem value="2">2+ Baths</SelectItem>
                          <SelectItem value="3">3+ Baths</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Contact - always visible */}
          <a
            href="tel:+15044750672"
            className="flex-shrink-0 flex items-center gap-1.5 text-purple-600 font-medium hover:text-purple-700 transition-colors text-sm"
          >
            <Phone className="h-4 w-4" />
            <span className="hidden sm:inline">(504) 475-0672</span>
          </a>
        </div>
      </header>

      {/* Active Filters Bar */}
      {activeFilterCount > 0 && (
        <div className="flex-shrink-0 bg-purple-50 border-b border-purple-100 px-4 py-2.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-sm text-purple-700 font-semibold">{t('listings.activeFilters')}</span>

            {search && (
              <Badge variant="secondary" className="gap-1.5 text-sm px-3 py-1">
                "{search}"
                <X className="h-3.5 w-3.5 cursor-pointer hover:text-destructive" onClick={() => setSearch('')} />
              </Badge>
            )}

            {beds !== 'any' && (
              <Badge variant="secondary" className="gap-1.5 text-sm px-3 py-1">
                Beds: {beds}+
                <X className="h-3.5 w-3.5 cursor-pointer hover:text-destructive" onClick={() => setBeds('any')} />
              </Badge>
            )}

            {baths !== 'any' && (
              <Badge variant="secondary" className="gap-1.5 text-sm px-3 py-1">
                Baths: {baths}+
                <X className="h-3.5 w-3.5 cursor-pointer hover:text-destructive" onClick={() => setBaths('any')} />
              </Badge>
            )}

            {(priceRange[0] > 0 || priceRange[1] < 1000000) && (
              <Badge variant="secondary" className="gap-1.5 text-sm px-3 py-1">
                ${(priceRange[0]/1000).toFixed(0)}K - {priceRange[1] >= 1000000 ? '$1M+' : `$${(priceRange[1]/1000).toFixed(0)}K`}
                <X className="h-3.5 w-3.5 cursor-pointer hover:text-destructive" onClick={() => setPriceRange([0, 1000000])} />
              </Badge>
            )}

            {propertyType !== 'any' && (
              <Badge variant="secondary" className="gap-1.5 text-sm px-3 py-1">
                {propertyType}
                <X className="h-3.5 w-3.5 cursor-pointer hover:text-destructive" onClick={() => setPropertyType('any')} />
              </Badge>
            )}

            {condition !== 'any' && (
              <Badge variant="secondary" className="gap-1.5 text-sm px-3 py-1">
                {condition}
                <X className="h-3.5 w-3.5 cursor-pointer hover:text-destructive" onClick={() => setCondition('any')} />
              </Badge>
            )}

            {(downPaymentRange[0] > 0 || downPaymentRange[1] < 1000000) && (
              <Badge variant="secondary" className="gap-1.5 text-sm px-3 py-1">
                Down: up to ${(downPaymentRange[1]/1000).toFixed(0)}K
                <X className="h-3.5 w-3.5 cursor-pointer hover:text-destructive" onClick={() => setDownPaymentRange([0, 1000000])} />
              </Badge>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-7 text-sm text-purple-600 hover:text-purple-700 hover:bg-purple-100 font-medium"
            >
              {t('common.clearAll')}
            </Button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Loading State */}
        {isLoadingProperties && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="text-center space-y-3">
              <Loader2 className="h-10 w-10 animate-spin text-purple-500 mx-auto" />
              <p className="text-sm font-medium">{t('listings.initializingProperties')}</p>
            </div>
          </div>
        )}

        {/* Map - Full screen on mobile */}
        <div className="flex-1 md:flex-none md:w-3/5 relative" data-tour="map-area">
          <PropertyMap
            properties={filteredProperties}
            onPropertySelect={setSelectedProperty}
            hoveredPropertyId={hoveredPropertyId}
            zipCode={zipCode}
            isDarkMode={isDarkMode}
            userLocation={userLocation}
            zoomTarget={zoomTarget}
            onZoomComplete={() => setZoomTarget(null)}
            onMapLoad={() => setMapLoaded(true)}
            onZoomChange={setCurrentMapZoom}
            fitBoundsKey={fitBoundsKey}
          />

          {/* Property count overlay on map */}
          {mapLoaded && (
            <div className="absolute bottom-4 left-4 z-10 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-full shadow-md px-3 py-1.5 border border-gray-200/60 dark:border-gray-700">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                {filteredProperties.length.toLocaleString()} properties
              </span>
            </div>
          )}

          {/* Map Coach Marks - Guided Tutorial */}
          <MapCoachMarks
            mapLoaded={mapLoaded}
            className="top-4 left-4"
            onOpenFilters={() => setShowFilters(true)}
            onCloseFilters={() => setShowFilters(false)}
          />
        </div>

        {/* Desktop Side Panel */}
        <div className={cn(
          "hidden md:flex md:w-2/5 border-l flex-col",
          isDarkMode ? "border-border bg-card" : "border-gray-200 bg-white"
        )}>
          {renderPropertyListContent(false)}
        </div>

        {/* Mobile Drawer */}
        {isMobile && (
          <Drawer open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
            <DrawerTrigger asChild>
              <Button 
                className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 shadow-xl bg-purple-600 hover:bg-purple-700 text-white gap-2 px-6"
                size="lg"
              >
                <ListIcon className="h-5 w-5" />
                {filteredProperties.length} Properties
                <ChevronUp className="h-4 w-4" />
              </Button>
            </DrawerTrigger>
            <DrawerContent className="h-[85vh]">
              <DrawerHeader className="sr-only">
                <DrawerTitle>{t('listings.propertyListings')}</DrawerTitle>
              </DrawerHeader>
              <div className="flex flex-col h-full">
                {renderPropertyListContent(true)}
              </div>
            </DrawerContent>
          </Drawer>
        )}
      </div>

      {/* Property Detail Modal */}
      <Dialog open={!!selectedProperty} onOpenChange={() => setSelectedProperty(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
          <DialogTitle className="sr-only">
            {selectedProperty?.address || 'Property Details'}
          </DialogTitle>
          {selectedProperty && (
            <>
              <div className="relative">
                {/* Image Gallery with Carousel */}
                <div className="relative">
                  <PropertyImageGallery
                    images={selectedProperty.images || [selectedProperty.heroImage]}
                    heroImage={selectedProperty.heroImage}
                    onHeroChange={() => {}} // No-op for public view
                    onImagesChange={() => {}} // Read-only for public view
                    editable={false}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

                  {/* Overlays on top of gallery */}
                  {getPropertyDistance(selectedProperty) !== null && getPropertyDistance(selectedProperty)! >= 0 && (
                    <div className="absolute top-4 left-4 z-20">
                      <ProximityBadge
                        distance={getPropertyDistance(selectedProperty)!}
                        variant="detailed"
                        showCommute
                        className="bg-white/95 backdrop-blur-sm shadow-lg fade-in-purple"
                      />
                    </div>
                  )}
                  <button
                    onClick={() => setSelectedProperty(null)}
                    className="absolute top-4 right-4 p-2 rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50 transition-colors scale-hover z-20"
                  >
                    <X className="h-5 w-5" />
                  </button>
                  <button
                    onClick={(e) => toggleSaved(selectedProperty.id, e)}
                    className={cn(
                      "absolute top-4 right-14 p-2 rounded-full transition-all scale-hover z-20",
                      savedProperties.has(selectedProperty.id)
                        ? "bg-purple-500 text-white shadow-purple-md"
                        : "bg-black/30 backdrop-blur-sm text-white hover:bg-black/50"
                    )}
                  >
                    <Heart className={cn("h-5 w-5", savedProperties.has(selectedProperty.id) && "fill-current")} />
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 p-6 slide-up-purple z-20 pointer-events-none">
                    <div className="flex items-baseline gap-3 mb-2">
                      <p className="text-3xl sm:text-4xl font-bold text-white drop-shadow-lg">
                        ${selectedProperty.price.toLocaleString()}
                      </p>
                      {selectedProperty.monthlyPayment !== undefined && (
                        <p className="text-lg sm:text-xl font-semibold text-purple-200">
                          ${selectedProperty.monthlyPayment.toLocaleString()}/mo
                        </p>
                      )}
                    </div>
                    <h2 className="text-xl sm:text-2xl font-semibold text-white purple-underline inline-block">{selectedProperty.address}</h2>
                    <p className="text-purple-200 flex items-center gap-1 mt-2">
                      <MapPin className="h-4 w-4" />
                      {selectedProperty.city}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="flex flex-wrap gap-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center">
                      <Bed className="h-6 w-6 text-purple-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{selectedProperty.beds}</p>
                      <p className="text-sm text-gray-600">{t('property.bedrooms')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center">
                      <Bath className="h-6 w-6 text-purple-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{selectedProperty.baths}</p>
                      <p className="text-sm text-gray-600">{t('property.bathrooms')}</p>
                    </div>
                  </div>
                  {selectedProperty.sqft && (
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center">
                        <Maximize2 className="h-6 w-6 text-purple-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{selectedProperty.sqft.toLocaleString()}</p>
                        <p className="text-sm text-gray-600">{t('property.sqft')}</p>
                      </div>
                    </div>
                  )}
                  {selectedProperty.condition && (
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center">
                        <Wrench className="h-6 w-6 text-purple-500" />
                      </div>
                      <div>
                        <p className="text-lg font-bold">{selectedProperty.condition}</p>
                        <p className="text-sm text-gray-600">{t('property.condition')}</p>
                      </div>
                    </div>
                  )}
                  {selectedProperty.propertyType && (
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center">
                        <Home className="h-6 w-6 text-purple-500" />
                      </div>
                      <div>
                        <p className="text-lg font-bold">{selectedProperty.propertyType}</p>
                        <p className="text-sm text-gray-600">{t('property.type')}</p>
                      </div>
                    </div>
                  )}
                  {selectedProperty.downPayment !== undefined && (
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center">
                        <DollarSign className="h-6 w-6 text-purple-500" />
                      </div>
                      <div>
                        <p className="text-lg font-bold">${selectedProperty.downPayment.toLocaleString()}</p>
                        <p className="text-sm text-gray-600">{t('property.downPayment')}</p>
                      </div>
                    </div>
                  )}
                  {selectedProperty.monthlyPayment !== undefined && (
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center">
                        <DollarSign className="h-6 w-6 text-purple-500" />
                      </div>
                      <div>
                        <p className="text-lg font-bold">${selectedProperty.monthlyPayment.toLocaleString()}/mo</p>
                        <p className="text-sm text-gray-600">{t('property.monthlyPayment')}</p>
                      </div>
                    </div>
                  )}
                </div>

                {selectedProperty.description && (
                  <div>
                    <h3 className="font-semibold mb-2">{t('property.aboutThisProperty')}</h3>
                    <p className="text-gray-600">{selectedProperty.description}</p>
                  </div>
                )}

                {!showOfferForm ? (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button size="lg" className="flex-1 btn-purple-gradient pulse-purple" asChild>
                      <a href="tel:+15044750672">
                        <Phone className="h-4 w-4 mr-2" />
                        {t('cta.textUsPhone')}
                      </a>
                    </Button>
                    <Button variant="outline" size="lg" className="flex-1 scale-hover" asChild>
                      <Link to={`/listing/${generatePropertySlug(selectedProperty.address, selectedProperty.city)}`}>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        {t('common.details')}
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleOfferSubmit} className="space-y-4 animate-fade-in">
                    <h3 className="font-semibold">{t('listings.submitYourOffer')}</h3>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <Label>{t('form.firstName')} *</Label>
                        <Input
                          value={offerForm.firstName}
                          onChange={(e) => setOfferForm(prev => ({ ...prev, firstName: e.target.value }))}
                          required
                          placeholder={t('form.placeholderFirstName')}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>{t('form.lastName')} *</Label>
                        <Input
                          value={offerForm.lastName}
                          onChange={(e) => setOfferForm(prev => ({ ...prev, lastName: e.target.value }))}
                          required
                          placeholder={t('form.placeholderLastName')}
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <Label>{t('form.email')} *</Label>
                        <Input
                          type="email"
                          value={offerForm.email}
                          onChange={(e) => setOfferForm(prev => ({ ...prev, email: e.target.value }))}
                          required
                          placeholder={t('form.placeholderEmail')}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>{t('form.phone')} *</Label>
                        <PhoneInput
                          value={offerForm.phone}
                          onChange={(value) => setOfferForm(prev => ({ ...prev, phone: value || '' }))}
                          required
                          placeholder="Enter phone number"
                          defaultCountry="US"
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>{t('listings.yourOfferAmount')}</Label>
                      <Input
                        placeholder="$250,000"
                        value={offerForm.offerAmount}
                        onChange={(e) => setOfferForm(prev => ({ ...prev, offerAmount: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>{t('form.messageOptional')}</Label>
                      <Textarea
                        value={offerForm.message}
                        onChange={(e) => setOfferForm(prev => ({ ...prev, message: e.target.value }))}
                        placeholder={t('listings.tellUsAboutInvestment')}
                        className="mt-1"
                        rows={3}
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button type="submit" className="flex-1 btn-purple-gradient">
                        {t('cta.submitOffer')}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setShowOfferForm(false)} className="scale-hover">
                        {t('common.cancel')}
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Exit Intent Lead Capture */}
      <ExitIntentModal
        open={showExitIntent}
        onClose={dismissExitIntent}
        onSubmitted={markExitConverted}
        isDarkMode={isDarkMode}
        propertyCount={filteredProperties.length}
      />
    </div>
  );
}