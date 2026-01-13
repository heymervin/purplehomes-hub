/**
 * Zillow API Service
 * React Query hooks for Zillow integration
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  ZillowSearchResponse,
  ZillowListing,
  ZillowSearchType,
  SaveZillowPropertyRequest,
  SaveZillowPropertyResponse,
} from '@/types/zillow';

/**
 * Search Zillow for properties with a specific search type
 *
 * @param buyerId - Buyer record ID
 * @param searchType - Type of search: 'Creative Financing', '90+ Days', or 'Affordability'
 * @returns Query result with Zillow listings
 */
export const useZillowSearchByType = (
  buyerId: string | null,
  searchType: ZillowSearchType | null
) => {
  return useQuery({
    queryKey: ['zillow-search', buyerId, searchType],
    queryFn: async (): Promise<ZillowSearchResponse> => {
      if (!buyerId || !searchType) throw new Error('Buyer ID and search type required');

      const response = await fetch(
        `/api/zillow/search?buyerId=${buyerId}&searchType=${encodeURIComponent(searchType)}`
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to search Zillow');
      }

      return response.json();
    },
    enabled: !!buyerId && !!searchType,
    staleTime: 60 * 60 * 1000, // 1 hour - longer since we have server-side cache
    gcTime: 60 * 60 * 1000, // 1 hour cache in React Query (formerly cacheTime)
    retry: 1, // Only retry once on failure
  });
};

/**
 * Save a Zillow property to the system (Airtable + GHL)
 */
export const useSaveZillowProperty = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      listing: ZillowListing;
      buyerId: string;
      stage: string;
      notes?: string;
      zillowType: ZillowSearchType;
    }): Promise<SaveZillowPropertyResponse> => {
      const response = await fetch('/api/properties/save-from-zillow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save property');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      // Invalidate buyer properties to show new property
      queryClient.invalidateQueries({ queryKey: ['buyer-properties', variables.buyerId] });

      // Invalidate Zillow search to update "already saved" status
      queryClient.invalidateQueries({ queryKey: ['zillow-search', variables.buyerId] });

      // Invalidate aggregated queries
      queryClient.invalidateQueries({ queryKey: ['buyers-with-matches'] });
      queryClient.invalidateQueries({ queryKey: ['properties-with-matches'] });
    },
  });
};

/**
 * Check if a Zillow property (by ZPID) is already saved in the system
 */
export const useIsZillowPropertySaved = (zpid: string | null) => {
  return useQuery({
    queryKey: ['zillow-property-exists', zpid],
    queryFn: async (): Promise<boolean> => {
      if (!zpid) return false;

      const response = await fetch(`/api/properties/check-zillow?zpid=${zpid}`);

      if (!response.ok) {
        return false; // If check fails, assume not saved
      }

      const data = await response.json();
      return data.exists;
    },
    enabled: !!zpid,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Batch check response type
 */
export interface CheckBatchResponse {
  saved: Record<string, { propertyId: string; propertyCode: string }>;
  totalChecked: number;
  totalSaved: number;
}

/**
 * Check multiple Zillow properties (by ZPIDs) for saved status
 * Efficient batch check to show saved badges on search results
 */
export const useCheckZillowSavedBatch = (zpids: string[]) => {
  return useQuery({
    queryKey: ['zillow-saved-batch', zpids.sort().join(',')],
    queryFn: async (): Promise<CheckBatchResponse> => {
      if (zpids.length === 0) {
        return { saved: {}, totalChecked: 0, totalSaved: 0 };
      }

      const response = await fetch('/api/zillow?action=check-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zpids }),
      });

      if (!response.ok) {
        console.error('[Zillow API] Batch check failed');
        return { saved: {}, totalChecked: zpids.length, totalSaved: 0 };
      }

      return response.json();
    },
    enabled: zpids.length > 0,
    staleTime: 2 * 60 * 1000, // 2 minute cache
  });
};
