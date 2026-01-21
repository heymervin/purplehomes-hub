// src/components/properties/LocationFields.tsx

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider
} from '@/components/ui/tooltip';
import { AlertTriangle, CheckCircle, HelpCircle, MapPin } from 'lucide-react';
import { US_STATES, normalizeState, NormalizeResult } from '@/lib/stateUtils';

interface LocationFieldsProps {
  address: string;
  city: string;
  state: string;
  zip: string;
  onAddressChange: (value: string) => void;
  onCityChange: (value: string) => void;
  onStateChange: (value: string) => void;
  onZipChange: (value: string) => void;
}

export function LocationFields({
  address, city, state, zip,
  onAddressChange, onCityChange, onStateChange, onZipChange,
}: LocationFieldsProps) {

  const [normalized, setNormalized] = useState<NormalizeResult | null>(null);

  // Normalize on mount or when state changes externally
  useEffect(() => {
    const result = normalizeState(state);
    setNormalized(result);

    // Auto-correct if high or exact confidence AND different from current
    if (result.abbr && result.abbr !== state) {
      if (result.confidence === 'exact' || result.confidence === 'high') {
        onStateChange(result.abbr);
      }
    }
  }, [state, onStateChange]);

  const renderStateField = () => {
    // No value yet - show empty dropdown
    if (!state) {
      return (
        <Select value="" onValueChange={onStateChange}>
          <SelectTrigger id="state">
            <SelectValue placeholder="Select state" />
          </SelectTrigger>
          <SelectContent>
            {US_STATES.map((s) => (
              <SelectItem key={s.abbr} value={s.abbr}>
                {s.abbr} - {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    // Exact or high confidence - show dropdown with value selected
    if (normalized?.confidence === 'exact' || normalized?.confidence === 'high') {
      return (
        <Select value={normalized.abbr || ''} onValueChange={onStateChange}>
          <SelectTrigger id="state">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {US_STATES.map((s) => (
              <SelectItem key={s.abbr} value={s.abbr}>
                {s.abbr} - {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    // Medium confidence - show suggestion
    if (normalized?.confidence === 'medium' && normalized.abbr) {
      return (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              value={state}
              onChange={(e) => onStateChange(e.target.value)}
              className="bg-amber-50 border-amber-200"
            />
          </div>
          <div className="flex items-center gap-2 text-xs">
            <HelpCircle className="h-3 w-3 text-amber-500" />
            <span className="text-amber-700">
              Did you mean{' '}
              <button
                type="button"
                onClick={() => onStateChange(normalized.abbr!)}
                className="font-medium underline hover:text-amber-900"
              >
                {normalized.matchedName} ({normalized.abbr})
              </button>
              ?
            </span>
          </div>
        </div>
      );
    }

    // No match - show warning with dropdown to fix
    return (
      <div className="space-y-2">
        <div className="flex gap-2">
          <Input
            value={state}
            disabled
            className="bg-red-50 border-red-200 flex-1"
          />
          <Select onValueChange={onStateChange}>
            <SelectTrigger className="w-20">
              <SelectValue placeholder="Fix" />
            </SelectTrigger>
            <SelectContent>
              {US_STATES.map((s) => (
                <SelectItem key={s.abbr} value={s.abbr}>
                  {s.abbr}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-red-600 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Unknown state - please select from dropdown
        </p>
      </div>
    );
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Section Header */}
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          <h4 className="text-sm font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wide">
            Location
          </h4>
        </div>

        {/* Fields Container */}
        <div className="grid grid-cols-1 gap-4 p-4 bg-muted/30 rounded-lg border">
          {/* Address - Full Width */}
          <div className="space-y-2">
            <Label htmlFor="address">
              Street Address
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => onAddressChange(e.target.value)}
              placeholder="123 Main Street"
              aria-required="true"
            />
          </div>

          {/* City, State, ZIP - Responsive Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* City */}
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => onCityChange(e.target.value)}
                placeholder="Phoenix"
              />
            </div>

            {/* State with Normalization */}
            <div className="space-y-2">
              <Label htmlFor="state" className="flex items-center gap-2">
                State
                {/* Show "Fixed" badge when auto-corrected */}
                {normalized?.confidence === 'high' && normalized.originalValue !== normalized.abbr && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="outline"
                        className="text-green-600 border-green-300 bg-green-50 text-[10px] cursor-help"
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Fixed
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Auto-corrected: "{normalized.originalValue}" → {normalized.abbr}</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </Label>
              {renderStateField()}
            </div>

            {/* ZIP */}
            <div className="space-y-2">
              <Label htmlFor="zip">
                ZIP Code
                <span className="text-red-500 ml-1">*</span>
              </Label>
              <Input
                id="zip"
                value={zip}
                onChange={(e) => onZipChange(e.target.value.replace(/\D/g, '').slice(0, 5))}
                placeholder="85001"
                maxLength={5}
                aria-required="true"
              />
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
