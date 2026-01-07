/**
 * Zillow Listing Card Component
 * Displays a Zillow listing with match status indicators
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, Save, Bed, Bath, Square, Clock, Phone, Home } from 'lucide-react';
import { MatchTypeBadge } from './MatchTypeBadge';
import { MatchStatusPills } from './MatchStatusPills';
import type { ZillowListing } from '@/types/zillow';
import type { ZillowMatchStatus } from '@/types/matching';

interface ZillowListingCardProps {
  listing: ZillowListing;
  matchStatus: ZillowMatchStatus;
  onSave?: (listing: ZillowListing) => void;
  onCall?: (phone: string) => void;
  isSaving?: boolean;
  isSaved?: boolean;
}

export function ZillowListingCard({
  listing,
  matchStatus,
  onSave,
  onCall,
  isSaving,
  isSaved
}: ZillowListingCardProps) {
  return (
    <Card className={cn(
      "overflow-hidden transition-shadow hover:shadow-md",
      matchStatus.matchType === 'perfect' && "ring-2 ring-green-500",
      matchStatus.matchType === 'near' && "ring-2 ring-yellow-500",
      matchStatus.matchType === 'stretch' && "ring-1 ring-orange-300"
    )}>
      <div className="flex flex-col sm:flex-row">
        {/* Image */}
        <div className="relative w-full sm:w-48 h-40 sm:h-auto flex-shrink-0">
          {listing.images?.[0] ? (
            <img
              src={listing.images[0]}
              alt={listing.address}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
              <Home className="h-8 w-8 text-gray-400" />
            </div>
          )}

          {/* Match Badge - Overlay on image */}
          <div className="absolute top-2 right-2">
            <MatchTypeBadge matchType={matchStatus.matchType} size="sm" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-gray-900 line-clamp-1">
                {listing.address}
              </h3>
              <p className="text-sm text-gray-500">
                {listing.city}, {listing.state} {listing.zipCode}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-lg font-bold text-purple-600">
                ${listing.price.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Property Details */}
          <div className="flex flex-wrap gap-3 text-sm text-gray-600">
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
            {listing.daysOnMarket && (
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {listing.daysOnMarket} days
              </span>
            )}
          </div>

          {/* Match Status Pills */}
          <MatchStatusPills matchStatus={matchStatus} />

          {/* Mismatch Summary */}
          {matchStatus.summary && (
            <p className="text-sm text-amber-700 bg-amber-50 px-2 py-1 rounded">
              {matchStatus.summary}
            </p>
          )}

          {/* Listing Agent */}
          {listing.listingAgent && (
            <div className="text-xs text-gray-500">
              Agent: {listing.listingAgent.name}
              {listing.listingAgent.brokerName && ` - ${listing.listingAgent.brokerName}`}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 flex-wrap">
            {listing.listingAgent?.phone && onCall && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCall(listing.listingAgent!.phone)}
              >
                <Phone className="h-4 w-4 mr-1" />
                Call
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(listing.zillowUrl, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              View on Zillow
            </Button>

            {onSave && !isSaved && (
              <Button
                variant="default"
                size="sm"
                onClick={() => onSave(listing)}
                disabled={isSaving}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Save className="h-4 w-4 mr-1" />
                {isSaving ? 'Saving...' : 'Save to Inventory'}
              </Button>
            )}

            {isSaved && (
              <span className="text-sm text-green-600 font-medium">
                Saved
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
