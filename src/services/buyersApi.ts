/**
 * Buyers API Service
 * React Query hooks for buyer management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { BuyerRecord, BuyerFormData } from '@/types/buyer';

const API_BASE = '/api/buyers';

/**
 * Fetch all buyers with match counts
 */
export const useBuyersList = () => {
  return useQuery({
    queryKey: ['buyers-list'],
    queryFn: async (): Promise<{ buyers: BuyerRecord[]; total: number }> => {
      console.log('[Buyers API] Fetching buyers list');

      const response = await fetch(`${API_BASE}?action=list`);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch buyers' }));
        throw new Error(error.error || 'Failed to fetch buyers');
      }

      const result = await response.json();
      console.log('[Buyers API] Buyers fetched:', result.total);

      return result;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnMount: 'always', // Always refetch on navigation to ensure fresh data
  });
};

/**
 * Fetch single buyer by recordId
 */
export const useBuyer = (recordId: string | null) => {
  return useQuery({
    queryKey: ['buyer', recordId],
    queryFn: async (): Promise<{ buyer: BuyerRecord }> => {
      console.log('[Buyers API] Fetching buyer:', recordId);

      const response = await fetch(`${API_BASE}?action=get&recordId=${recordId}`);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch buyer' }));
        throw new Error(error.error || 'Failed to fetch buyer');
      }

      return response.json();
    },
    enabled: !!recordId,
  });
};

/**
 * Update buyer with dual sync to Airtable and GHL
 */
export const useUpdateBuyer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      recordId,
      contactId,
      fields,
      syncToGhl = true,
    }: {
      recordId: string;
      contactId: string;
      fields: Partial<BuyerFormData>;
      syncToGhl?: boolean;
    }) => {
      console.log('[Buyers API] Updating buyer:', recordId);

      const response = await fetch(`${API_BASE}?action=update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordId, contactId, fields, syncToGhl }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update buyer');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['buyers-list'] });
      queryClient.invalidateQueries({ queryKey: ['buyer'] });
      queryClient.invalidateQueries({ queryKey: ['buyers-with-matches'] });
    },
  });
};

/**
 * Trigger re-matching for a buyer after preference changes
 */
export const useRematchBuyer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (buyerRecordId: string) => {
      console.log('[Buyers API] Running re-match for buyer:', buyerRecordId);

      // Call the matching endpoint to run matching for a single buyer
      const response = await fetch(`/api/matching?action=run-buyer&buyerId=${buyerRecordId}`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to run matching' }));
        throw new Error(error.error || 'Failed to run matching');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate all matching-related queries
      queryClient.invalidateQueries({ queryKey: ['buyers-list'] });
      queryClient.invalidateQueries({ queryKey: ['buyers-with-matches'] });
      queryClient.invalidateQueries({ queryKey: ['buyer-properties'] });
      queryClient.invalidateQueries({ queryKey: ['property-buyers'] });
    },
  });
};
