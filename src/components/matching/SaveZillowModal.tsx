import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Building2, Loader2, MapPin, Bed, Bath, Square, DollarSign } from 'lucide-react';
import { useSaveZillowProperty } from '@/services/zillowApi';
import type { ZillowListing, ZillowSearchType } from '@/types/zillow';
import { toast } from 'sonner';

interface SaveZillowModalProps {
  listing: ZillowListing | null;
  buyerId: string;
  zillowType: ZillowSearchType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * SaveZillowModal - Modal for saving Zillow properties to the system
 *
 * Allows the user to:
 * - Preview the property details
 * - Save to Airtable
 */
export function SaveZillowModal({
  listing,
  buyerId,
  zillowType,
  open,
  onOpenChange,
}: SaveZillowModalProps) {
  const { mutate: saveProperty, isPending } = useSaveZillowProperty();

  const handleSave = () => {
    if (!listing) return;

    saveProperty(
      {
        listing,
        buyerId,
        zillowType,
      },
      {
        onSuccess: () => {
          toast.success('Property saved to Property Pro!');
          onOpenChange(false);
        },
        onError: (error) => {
          toast.error(error.message || 'Failed to save property');
        },
      }
    );
  };

  if (!listing) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Save to Property Pro
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Property Preview Card */}
          <div className="p-4 bg-muted rounded-lg border">
            <div className="flex gap-4">
              {/* Property Image */}
              {listing.images[0] && (
                <div className="flex-shrink-0">
                  <img
                    src={listing.images[0]}
                    alt={listing.address}
                    className="w-24 h-24 rounded-lg object-cover"
                  />
                </div>
              )}

              {/* Property Details */}
              <div className="flex-1">
                <h4 className="font-medium text-lg">{listing.address}</h4>
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin className="h-3 w-3" />
                  {listing.city}, {listing.state} {listing.zipCode}
                </p>

                {/* Property Stats */}
                <div className="flex items-center gap-4 mt-3 text-sm">
                  <span className="flex items-center gap-1 font-semibold text-foreground">
                    <DollarSign className="h-4 w-4" />
                    {listing.price.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Bed className="h-4 w-4" />
                    {listing.beds} bed
                  </span>
                  <span className="flex items-center gap-1">
                    <Bath className="h-4 w-4" />
                    {listing.baths} bath
                  </span>
                  {listing.sqft && (
                    <span className="flex items-center gap-1">
                      <Square className="h-4 w-4" />
                      {listing.sqft.toLocaleString()} sqft
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* What This Does */}
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <h5 className="font-medium text-sm text-purple-900 mb-2">This will:</h5>
            <ul className="text-sm text-purple-800 space-y-1">
              <li>• Save property to Property Pro (Source: Zillow)</li>
              <li>• Store Zillow link for reference</li>
              <li>• Enable match stage tracking</li>
              <li>• Make property available for matching with buyers</li>
            </ul>
          </div>

          {/* Metadata Display */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Property Code: ZIL-{listing.zpid}</p>
            <p>Zillow Type: {zillowType}</p>
            {listing.daysOnMarket && <p>Days on Market: {listing.daysOnMarket}</p>}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending} className="bg-purple-600 hover:bg-purple-700">
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Building2 className="h-4 w-4 mr-2" />
            Save to Property Pro
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
