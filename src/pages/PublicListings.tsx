import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bed, Bath, Maximize2, Phone, MapPin, X, Wrench, Heart, ChevronDown, SlidersHorizontal, ChevronUp, List as ListIcon, DollarSign, Home, Moon, Sun, ArrowLeft, Navigation, Loader2, ZoomIn, Eye } from 'lucide-react';
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
import { ProximityBadge } from '@/components/listings/ProximityBadge';
import { PropertyImageGallery } from '@/components/properties/PropertyImageGallery';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSubmitForm } from '@/services/ghlApi';
import { calculatePropertyDistance } from '@/lib/proximityCalculator';
import { useAirtableProperties } from '@/services/matchingApi';

const PROPERTY_TYPES: PropertyType[] = [
  'Single Family', 'Duplex', 'Multi Family', 'Condo', 'Lot', 
  'Mobile Home', 'Town House', 'Commercial', 'Triplex', '4-plex'
];

const CONDITION_OPTIONS: PropertyCondition[] = [
  'Excellent', 'Great', 'Good', 'Fair', 'Poor', 'Terrible', 'Needs some Repair'
];

type SortOption = 'price-high' | 'price-low' | 'newest' | 'beds' | 'sqft';

export default function PublicListings() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Fetch properties from Airtable (same source as Properties page and Property Matching)
  const { data: airtableData, isLoading: isLoadingProperties, isError, error } = useAirtableProperties(200);

  // Transform Airtable properties to Property type for display
  const allProperties: Property[] = useMemo(() => {
    if (!airtableData?.properties) return [];

    const properties = airtableData.properties
      .filter(p => p.heroImage) // Only show properties with images for public listings
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
  const [zipCode, setZipCode] = useState('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
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
  
  // GHL Form submission
  const submitForm = useSubmitForm();

  const filteredProperties = useMemo(() => {
    // Wait for properties to load before filtering
    // Return empty during loading OR if still waiting for properties to populate
    if (isLoadingProperties || (allProperties.length === 0 && !isError)) {
      return [];
    }

    let results = allProperties.filter((property) => {
      if (search) {
        const searchLower = search.toLowerCase();
        if (!property.address.toLowerCase().includes(searchLower) &&
            !property.city.toLowerCase().includes(searchLower)) {
          return false;
        }
      }
      if (zipCode) {
        const zip = property.city.match(/\d{5}/)?.[0] || '';
        if (!zip.includes(zipCode)) return false;
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
  }, [allProperties, search, zipCode, priceRange, downPaymentRange, beds, baths, condition, propertyType, sortBy, isLoadingProperties, isError]);

  const toggleSaved = (propertyId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedProperties(prev => {
      const next = new Set(prev);
      if (next.has(propertyId)) {
        next.delete(propertyId);
        toast.success('Removed from saved');
      } else {
        next.add(propertyId);
        toast.success('Saved to favorites');
      }
      return next;
    });
  };

  const handleOfferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProperty) return;
    
    try {
      // Submit to GHL Form API (Form ID: NrB0CMNYIpR8JpVDqpsE)
      await submitForm.mutateAsync({
        formId: 'NrB0CMNYIpR8JpVDqpsE',
        data: {
          first_name: offerForm.firstName,
          last_name: offerForm.lastName,
          email: offerForm.email,
          phone: offerForm.phone,
          offer_amount: offerForm.offerAmount,
          listing_message: offerForm.message,
          // Include property details for context
          property_address: selectedProperty.address,
          property_city: selectedProperty.city,
          property_price: selectedProperty.price.toString(),
        }
      });
      
      toast.success('Your offer has been submitted! We\'ll contact you within 24 hours.');
      setOfferForm({ firstName: '', lastName: '', email: '', phone: '', offerAmount: '', message: '' });
      setShowOfferForm(false);
    } catch (error) {
      console.error('Form submission error:', error);
      toast.error('Failed to submit offer. Please try again or call us directly.');
    }
  };

  const clearFilters = () => {
    setSearch('');
    setZipCode('');
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
        setZipCode(''); // Clear ZIP when using location
        setIsLocating(false);
        toast.success('Found your location!');
      },
      (error) => {
        setIsLocating(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error('Location access denied. Please enable location permissions.');
            break;
          case error.POSITION_UNAVAILABLE:
            toast.error('Location information unavailable.');
            break;
          case error.TIMEOUT:
            toast.error('Location request timed out.');
            break;
          default:
            toast.error('Failed to get your location.');
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

    return (
      <div
        key={property.id}
        className={cn(
          "group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-300",
          isDarkMode
            ? "bg-card border border-border/50 hover:border-purple-500/50"
            : "bg-white border border-gray-200 hover:border-purple-500/50",
          isHovered && "ring-2 ring-purple-500 shadow-lg shadow-purple-500/20",
          compact && "flex"
        )}
        onClick={() => {
          setSelectedProperty(property);
          if (isMobile) setMobileDrawerOpen(false);
        }}
        onMouseEnter={() => setHoveredPropertyId(property.id)}
        onMouseLeave={() => setHoveredPropertyId(null)}
      >
        <div className={cn(
          "relative overflow-hidden",
          compact ? "w-28 h-28 flex-shrink-0" : "aspect-[4/3]"
        )}>
          <img
            src={property.heroImage}
            alt={property.address}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />

          {!compact && (
            <>
              {distance !== null && distance >= 0 && (
                <div className="absolute top-3 left-3">
                  <ProximityBadge
                    distance={distance}
                    variant="compact"
                    className="bg-white/90 backdrop-blur-sm shadow-md"
                  />
                </div>
              )}
              <button
                onClick={(e) => toggleSaved(property.id, e)}
                className={cn(
                  "absolute top-3 right-3 p-2 rounded-full transition-all duration-200",
                  isSaved
                    ? "bg-purple-500 text-white"
                    : "bg-black/30 backdrop-blur-sm text-white hover:bg-black/50"
                )}
                data-tour="card-save"
              >
                <Heart className={cn("h-4 w-4", isSaved && "fill-current")} />
              </button>
              <div className="absolute bottom-3 left-3 space-y-1" data-tour="card-pricing">
                <span className="block text-2xl font-bold text-white drop-shadow-lg">
                  ${property.price.toLocaleString()}
                </span>
                {property.downPayment !== undefined && (
                  <span className="block text-sm font-medium text-purple-200 drop-shadow-md bg-black/30 backdrop-blur-sm px-2 py-1 rounded">
                    Down: ${property.downPayment.toLocaleString()}
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        <div className={cn("p-4", compact && "py-3 flex-1 min-w-0")}>
          {compact && (
            <p className="text-lg font-bold text-purple-400 mb-0.5">
              ${property.price.toLocaleString()}
            </p>
          )}
          <div className={cn(
            "flex items-center gap-3 text-sm mb-2",
            isDarkMode ? "text-muted-foreground" : "text-gray-600",
            compact && "gap-2 text-xs mb-1"
          )} data-tour="card-specs">
            <span className="flex items-center gap-1 font-medium">
              <Bed className="h-4 w-4" /> {property.beds}
            </span>
            <span className="flex items-center gap-1 font-medium">
              <Bath className="h-4 w-4" /> {property.baths}
            </span>
            {property.sqft && (
              <span className="flex items-center gap-1 font-medium">
                {property.sqft.toLocaleString()} sqft
              </span>
            )}
          </div>

          <div data-tour="card-location">
            <h3 className={cn(
              "font-semibold truncate",
              isDarkMode ? "text-foreground" : "text-gray-900",
              compact && "text-sm"
            )}>{property.address}</h3>
            <p className={cn(
              "text-sm truncate mb-3",
              isDarkMode ? "text-muted-foreground" : "text-gray-600",
              compact && "text-xs mb-2"
            )}>{property.city}</p>
          </div>

          {/* Action Buttons */}
          <div className={cn("flex gap-2", compact && "flex-col gap-1")} data-tour="property-actions">
            {property.lat && property.lng && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => handleZoomToProperty(property, e)}
                className={cn(
                  "flex-1 gap-1 text-xs",
                  compact && "h-7"
                )}
              >
                <ZoomIn className="h-3 w-3" />
                <span>Move</span>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedProperty(property);
              }}
              className={cn(
                "flex-1 gap-1 text-xs",
                compact && "h-7"
              )}
            >
              <Eye className="h-3 w-3" />
              <span>See More</span>
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
          <h2 className="font-semibold text-purple-600">{filteredProperties.length} Properties</h2>
          <p className={cn(
            "text-xs",
            isDarkMode ? "text-muted-foreground" : "text-gray-600"
          )}>Investment opportunities</p>
        </div>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <SelectTrigger className={cn(
            "w-[140px] text-xs h-8",
            isDarkMode ? "bg-background text-foreground border-border" : "bg-white text-gray-900 border-gray-300"
          )} data-tour="sort-select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="price-high">Price: High to Low</SelectItem>
            <SelectItem value="price-low">Price: Low to High</SelectItem>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="beds">Most Bedrooms</SelectItem>
            <SelectItem value="sqft">Largest</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 overflow-y-auto" data-tour="property-list">
        <div className="p-4 space-y-4">
          {filteredProperties.map((property) => renderPropertyCard(property, compact))}

          {filteredProperties.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-600">No properties match your criteria</p>
              <Button variant="link" onClick={clearFilters} className="text-purple-500">
                Clear all filters
              </Button>
            </div>
          )}
        </div>
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

          {/* Logo */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-9 h-9 bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/20">
              <span className="text-white font-bold text-lg">P</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold bg-gradient-to-r from-purple-600 to-purple-400 bg-clip-text text-transparent">
                Purple Homes
              </h1>
            </div>
          </div>

          {/* Primary Filters - Always Visible */}
          <div className="flex-1 flex items-center gap-2 max-w-4xl">
            {/* ZIP Code - Most Important for Proximity */}
            <div className="relative w-28" data-tour="zip-search">
              <MapPin className={cn(
                "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4",
                isDarkMode ? "text-muted-foreground" : "text-gray-400"
              )} />
              <Input
                placeholder="ZIP"
                value={zipCode}
                onChange={(e) => {
                  const newZip = e.target.value.replace(/\D/g, '').slice(0, 5);
                  setZipCode(newZip);
                  setUserLocation(null); // Clear location when typing ZIP
                }}
                className={cn(
                  "pl-9 shadow-sm hover:shadow-md transition-shadow focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:border-transparent",
                  isDarkMode ? "bg-background text-foreground border-border" : "bg-white text-gray-900 placeholder:text-gray-400 border-gray-300"
                )}
                maxLength={5}
              />
            </div>

            {/* Locate Me Button */}
            <Button
              variant="outline"
              size="icon"
              onClick={handleLocateMe}
              disabled={isLocating}
              className={cn(
                "flex-shrink-0",
                userLocation && "bg-purple-100 border-purple-500 text-purple-600"
              )}
              title="Use my location"
              data-tour="locate-button"
            >
              {isLocating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Navigation className={cn("h-4 w-4", userLocation && "fill-purple-500")} />
              )}
            </Button>

            {/* Search */}
            <div className="relative flex-1 min-w-[180px] max-w-xs" data-tour="address-search">
              <Search className={cn(
                "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4",
                isDarkMode ? "text-muted-foreground" : "text-gray-400"
              )} />
              <Input
                placeholder="Search address, city..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={cn(
                  "pl-10 shadow-sm hover:shadow-md transition-shadow focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:border-transparent",
                  isDarkMode ? "bg-background text-foreground border-border" : "bg-white text-gray-900 placeholder:text-gray-400 border-gray-300"
                )}
              />
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
                  <SelectItem value="0-200000">Under $200K</SelectItem>
                  <SelectItem value="200000-400000">$200K - $400K</SelectItem>
                  <SelectItem value="400000-600000">$400K - $600K</SelectItem>
                  <SelectItem value="600000-800000">$600K - $800K</SelectItem>
                  <SelectItem value="800000-1000000">$800K+</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Theme Toggle */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="flex-shrink-0"
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
              <Button variant="outline" className="gap-2 relative" data-tour="filters-button">
                <SlidersHorizontal className="h-4 w-4" />
                <span className="hidden sm:inline">Filters</span>
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
                  <h4 className="font-semibold">All Filters</h4>
                  <Button variant="ghost" size="sm" onClick={clearFilters}>Clear</Button>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-gray-600">Property Type</Label>
                    <Select value={propertyType} onValueChange={setPropertyType}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Any" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any Type</SelectItem>
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
                    <Label className="text-xs text-gray-600">Down Payment Range</Label>
                    <Slider
                      value={downPaymentRange}
                      min={0}
                      max={1000000}
                      step={5000}
                      onValueChange={(value) => setDownPaymentRange(value as [number, number])}
                      className="mt-3"
                    />
                    <div className="flex justify-between text-xs text-gray-600 mt-1">
                      <span>${downPaymentRange[0].toLocaleString()}</span>
                      <span>{downPaymentRange[1] >= 1000000 ? '$1M+' : `$${downPaymentRange[1].toLocaleString()}`}</span>
                    </div>
                  </div>

                  {/* Mobile-only filters */}
                  <div className="lg:hidden space-y-3">
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

          {/* Contact */}
          <div className="hidden md:flex items-center gap-4 text-sm text-muted-foreground">
            <a href="tel:+1234567890" className="hover:text-foreground transition-colors flex items-center gap-1">
              <Phone className="h-4 w-4" />
              <span className="hidden xl:inline">(123) 456-7890</span>
            </a>
          </div>
        </div>
      </header>

      {/* Active Filters Bar */}
      {activeFilterCount > 0 && (
        <div className="flex-shrink-0 bg-purple-50 border-b border-purple-100 px-4 py-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-purple-700 font-medium">Active Filters:</span>

            {zipCode && (
              <Badge variant="secondary" className="gap-1">
                ZIP: {zipCode}
                <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => setZipCode('')} />
              </Badge>
            )}

            {beds !== 'any' && (
              <Badge variant="secondary" className="gap-1">
                Beds: {beds}+
                <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => setBeds('any')} />
              </Badge>
            )}

            {baths !== 'any' && (
              <Badge variant="secondary" className="gap-1">
                Baths: {baths}+
                <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => setBaths('any')} />
              </Badge>
            )}

            {(priceRange[0] > 0 || priceRange[1] < 1000000) && (
              <Badge variant="secondary" className="gap-1">
                ${(priceRange[0]/1000).toFixed(0)}K - {priceRange[1] >= 1000000 ? '$1M+' : `$${(priceRange[1]/1000).toFixed(0)}K`}
                <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => setPriceRange([0, 1000000])} />
              </Badge>
            )}

            {propertyType !== 'any' && (
              <Badge variant="secondary" className="gap-1">
                {propertyType}
                <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => setPropertyType('any')} />
              </Badge>
            )}

            {condition !== 'any' && (
              <Badge variant="secondary" className="gap-1">
                {condition}
                <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => setCondition('any')} />
              </Badge>
            )}

            {(downPaymentRange[0] > 0 || downPaymentRange[1] < 1000000) && (
              <Badge variant="secondary" className="gap-1">
                Down: ${(downPaymentRange[0]/1000).toFixed(0)}K - {downPaymentRange[1] >= 1000000 ? '$1M+' : `$${(downPaymentRange[1]/1000).toFixed(0)}K`}
                <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => setDownPaymentRange([0, 1000000])} />
              </Badge>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-6 text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-50"
            >
              Clear All
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
              <p className="text-sm font-medium">Initializing properties...</p>
            </div>
          </div>
        )}

        {/* Map - Full screen on mobile */}
        <div className="flex-1 relative" data-tour="map-area">
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
          />

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
          "hidden md:flex w-[420px] lg:w-[480px] flex-shrink-0 border-l flex-col",
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
                <DrawerTitle>Property Listings</DrawerTitle>
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
          {selectedProperty && (
            <>
              <div className="relative">
                {/* Image Gallery with Carousel */}
                <div className="relative">
                  <PropertyImageGallery
                    images={selectedProperty.images || [selectedProperty.heroImage]}
                    heroImage={selectedProperty.heroImage}
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
                      <p className="text-sm text-gray-600">Bedrooms</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center">
                      <Bath className="h-6 w-6 text-purple-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{selectedProperty.baths}</p>
                      <p className="text-sm text-gray-600">Bathrooms</p>
                    </div>
                  </div>
                  {selectedProperty.sqft && (
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center">
                        <Maximize2 className="h-6 w-6 text-purple-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{selectedProperty.sqft.toLocaleString()}</p>
                        <p className="text-sm text-gray-600">Sq Ft</p>
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
                        <p className="text-sm text-gray-600">Condition</p>
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
                        <p className="text-sm text-gray-600">Type</p>
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
                        <p className="text-sm text-gray-600">Down Payment</p>
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
                        <p className="text-sm text-gray-600">Monthly Payment</p>
                      </div>
                    </div>
                  )}
                </div>

                {selectedProperty.description && (
                  <div>
                    <h3 className="font-semibold mb-2">About This Property</h3>
                    <p className="text-gray-600">{selectedProperty.description}</p>
                  </div>
                )}

                {!showOfferForm ? (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      size="lg"
                      className="flex-1 btn-purple-gradient pulse-purple"
                      onClick={() => setShowOfferForm(true)}
                    >
                      Make an Offer
                    </Button>
                    <Button variant="outline" size="lg" className="flex-1 scale-hover" asChild>
                      <a href="sms:+1234567890">
                        <Phone className="h-4 w-4 mr-2" />
                        Text Us
                      </a>
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleOfferSubmit} className="space-y-4 animate-fade-in">
                    <h3 className="font-semibold">Submit Your Offer</h3>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <Label>First Name *</Label>
                        <Input
                          value={offerForm.firstName}
                          onChange={(e) => setOfferForm(prev => ({ ...prev, firstName: e.target.value }))}
                          required
                          placeholder="John"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Last Name *</Label>
                        <Input
                          value={offerForm.lastName}
                          onChange={(e) => setOfferForm(prev => ({ ...prev, lastName: e.target.value }))}
                          required
                          placeholder="Doe"
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <Label>Email *</Label>
                        <Input
                          type="email"
                          value={offerForm.email}
                          onChange={(e) => setOfferForm(prev => ({ ...prev, email: e.target.value }))}
                          required
                          placeholder="john@example.com"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Phone *</Label>
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
                      <Label>Your Offer Amount</Label>
                      <Input
                        placeholder="$250,000"
                        value={offerForm.offerAmount}
                        onChange={(e) => setOfferForm(prev => ({ ...prev, offerAmount: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Message (Optional)</Label>
                      <Textarea
                        value={offerForm.message}
                        onChange={(e) => setOfferForm(prev => ({ ...prev, message: e.target.value }))}
                        placeholder="Tell us about your investment goals..."
                        className="mt-1"
                        rows={3}
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button type="submit" className="flex-1 btn-purple-gradient">
                        Submit Offer
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setShowOfferForm(false)} className="scale-hover">
                        Cancel
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}