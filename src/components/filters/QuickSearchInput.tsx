/**
 * QuickSearchInput - Search with quick access suggestions
 *
 * Features:
 * - Magnifying glass icon
 * - Debounced input (300ms)
 * - Clear button when text is entered
 * - Dropdown with buyer and property suggestions
 * - Click to drill down to buyer or property
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Search, X, User, Home, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBuyersList } from '@/services/matchingApi';
import { usePropertiesWithMatches } from '@/services/matchingApi';

interface QuickSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  debounceMs?: number;
  onSelectBuyer?: (buyerId: string) => void;
  onSelectProperty?: (propertyCode: string) => void;
}

export function QuickSearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  className,
  debounceMs = 300,
  onSelectBuyer,
  onSelectProperty,
}: QuickSearchInputProps) {
  const [localValue, setLocalValue] = useState(value);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Fetch buyers and properties for suggestions
  const { data: buyersList } = useBuyersList();
  const { data: propertiesData } = usePropertiesWithMatches({}, 100);
  const propertiesList = propertiesData?.data || [];

  // Sync local value when external value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Debounced onChange
  const debouncedOnChange = useCallback(
    (newValue: string) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        onChange(newValue);
      }, debounceMs);
    },
    [onChange, debounceMs]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    debouncedOnChange(newValue);
    setShowSuggestions(newValue.trim().length > 0);
  };

  const handleClear = () => {
    setLocalValue('');
    onChange('');
    setShowSuggestions(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  const handleSelectBuyer = (buyerId: string, buyerName: string) => {
    setShowSuggestions(false);
    setLocalValue('');
    onChange('');
    if (onSelectBuyer) {
      onSelectBuyer(buyerId);
    }
  };

  const handleSelectProperty = (propertyCode: string, propertyAddress: string) => {
    setShowSuggestions(false);
    setLocalValue('');
    onChange('');
    if (onSelectProperty) {
      onSelectProperty(propertyCode);
    }
  };

  // Filter suggestions based on search value
  const searchLower = localValue.toLowerCase().trim();
  const matchingBuyers = buyersList?.filter((buyer) => {
    const firstName = buyer.firstName?.toLowerCase() || '';
    const lastName = buyer.lastName?.toLowerCase() || '';
    const email = buyer.email?.toLowerCase() || '';
    return (
      firstName.includes(searchLower) ||
      lastName.includes(searchLower) ||
      email.includes(searchLower)
    );
  }).slice(0, 5) || [];

  const matchingProperties = propertiesList?.filter((property) => {
    const address = property.address?.toLowerCase() || '';
    const city = property.city?.toLowerCase() || '';
    const propertyCode = property.propertyCode?.toLowerCase() || '';
    return (
      address.includes(searchLower) ||
      city.includes(searchLower) ||
      propertyCode.includes(searchLower)
    );
  }).slice(0, 5) || [];

  const hasSuggestions = matchingBuyers.length > 0 || matchingProperties.length > 0;

  return (
    <div className={cn('relative', className)} ref={wrapperRef}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
      <Input
        type="text"
        value={localValue}
        onChange={handleChange}
        onFocus={() => localValue.trim().length > 0 && setShowSuggestions(true)}
        placeholder={placeholder}
        className={cn('pl-9', localValue && 'pr-9')}
      />
      {localValue && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground transition-colors z-10"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {/* Quick Search Suggestions Dropdown */}
      {showSuggestions && hasSuggestions && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          {/* Buyers Section */}
          {matchingBuyers.length > 0 && (
            <div className="p-2">
              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Buyers
              </div>
              {matchingBuyers.map((buyer) => (
                <button
                  key={buyer.recordId || buyer.contactId}
                  onClick={() => handleSelectBuyer(buyer.recordId || buyer.contactId, `${buyer.firstName} ${buyer.lastName}`)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-purple-50 transition-colors text-left group"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                    <User className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {buyer.firstName} {buyer.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{buyer.email}</p>
                  </div>
                  {buyer.totalMatches > 0 && (
                    <div className="flex-shrink-0">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                        {buyer.totalMatches} {buyer.totalMatches === 1 ? 'match' : 'matches'}
                      </span>
                    </div>
                  )}
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                </button>
              ))}
            </div>
          )}

          {/* Properties Section */}
          {matchingProperties.length > 0 && (
            <div className={cn('p-2', matchingBuyers.length > 0 && 'border-t')}>
              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Properties
              </div>
              {matchingProperties.map((property) => (
                <button
                  key={property.recordId}
                  onClick={() => handleSelectProperty(property.recordId, property.address)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-purple-50 transition-colors text-left group"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Home className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{property.address}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {property.city}{property.state && `, ${property.state}`}
                    </p>
                  </div>
                  {property.totalMatches > 0 && (
                    <div className="flex-shrink-0">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                        {property.totalMatches} {property.totalMatches === 1 ? 'match' : 'matches'}
                      </span>
                    </div>
                  )}
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
