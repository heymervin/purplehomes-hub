/**
 * Buyer Criteria Banner Component
 * Shows buyer's preferences at a glance above Zillow results
 */

import React from 'react';
import { DollarSign, Bed, Bath, MapPin } from 'lucide-react';
import type { BuyerCriteria } from '@/types/matching';

interface BuyerCriteriaBannerProps {
  buyer: BuyerCriteria;
  maxAffordable: number;
  maxWithFlex?: number;
}

export function BuyerCriteriaBanner({
  buyer,
  maxAffordable,
  maxWithFlex
}: BuyerCriteriaBannerProps) {
  return (
    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-purple-900">
          {buyer.firstName} {buyer.lastName}
        </h3>
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-1.5 text-purple-700">
          <DollarSign className="h-4 w-4" />
          <span>${buyer.downPayment?.toLocaleString() || 'N/A'} down</span>
        </div>

        {buyer.desiredBeds && (
          <div className="flex items-center gap-1.5 text-purple-700">
            <Bed className="h-4 w-4" />
            <span>{buyer.desiredBeds} beds</span>
          </div>
        )}

        {buyer.desiredBaths && (
          <div className="flex items-center gap-1.5 text-purple-700">
            <Bath className="h-4 w-4" />
            <span>{buyer.desiredBaths} baths</span>
          </div>
        )}

        {(buyer.city || buyer.preferredLocation) && (
          <div className="flex items-center gap-1.5 text-purple-700">
            <MapPin className="h-4 w-4" />
            <span>{buyer.city || buyer.preferredLocation}</span>
          </div>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-purple-200">
        <p className="text-sm text-purple-800">
          <span className="font-medium">Max Affordable:</span>{' '}
          ${maxAffordable.toLocaleString()}
          {maxWithFlex && maxWithFlex !== maxAffordable && (
            <span className="text-purple-600">
              {' '}(with flex: ${maxWithFlex.toLocaleString()})
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
