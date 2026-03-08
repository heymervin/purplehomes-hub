/**
 * React Query hooks for AI Property Matching API
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { BuyerWithMatches, PropertyWithMatches, PropertyDetails, RunMatchingResponse, MatchFilters, MatchActivity, PropertyMatch, BuyerPropertiesResponse, PropertyBuyersResponse, MatchingPreferences } from '@/types/matching';
import type { MatchDealStage } from '@/types/associations';

const MATCHING_API_BASE = '/api/matching';
const AIRTABLE_API_BASE = '/api/airtable';

/**
 * Fetch all buyers with their matches using optimized aggregated endpoint
 * This solves the N+1 query problem by doing server-side aggregation
 */
export const useBuyersWithMatches = (filters?: MatchFilters, pageSize: number = 20, offset?: string) => {
  return useQuery({
    queryKey: ['buyers-with-matches', filters, pageSize, offset],
    queryFn: async (): Promise<{ data: BuyerWithMatches[], nextOffset?: string }> => {
      console.log('[Matching API] Fetching buyers with matches (aggregated)', filters, 'pageSize:', pageSize, 'offset:', offset);

      const params = new URLSearchParams({
        action: 'aggregated-buyers',
        limit: pageSize.toString(),
      });

      // Add offset if provided (for pagination)
      if (offset) params.set('offset', offset);

      // Add filter parameters if provided
      if (filters?.matchStatus) params.set('matchStatus', filters.matchStatus);
      if (filters?.minScore !== undefined) params.set('minScore', filters.minScore.toString());
      if (filters?.priorityOnly) params.set('priorityOnly', 'true');
      if (filters?.matchLimit !== undefined) params.set('matchLimit', filters.matchLimit.toString());
      if (filters?.dateRange) params.set('dateRange', filters.dateRange);

      const response = await fetch(`${MATCHING_API_BASE}?${params}`);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch buyers' }));
        throw new Error(error.error || 'Failed to fetch buyers with matches');
      }

      const result = await response.json();

      console.log('[Matching API] Buyers fetched:', {
        count: result.data?.length || 0,
        stats: result.stats,
        nextOffset: result.nextOffset,
      });

      // Sort by match count (highest first)
      const sortedData = (result.data || []).sort((a: BuyerWithMatches, b: BuyerWithMatches) =>
        b.totalMatches - a.totalMatches
      );

      return {
        data: sortedData,
        nextOffset: result.nextOffset,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - fetch fresh data on page load, cache for subsequent navigations
  });
};

/**
 * Fetch new buyers sorted by date added (most recent first)
 */
export const useNewBuyers = (pageSize: number = 5) => {
  return useQuery({
    queryKey: ['new-buyers', pageSize],
    queryFn: async (): Promise<{ data: BuyerWithMatches[] }> => {
      console.log('[Matching API] Fetching new buyers', 'pageSize:', pageSize);

      const params = new URLSearchParams({
        action: 'aggregated-buyers',
        limit: '100', // Fetch more to ensure we have enough with dateAdded
      });

      const response = await fetch(`${MATCHING_API_BASE}?${params}`);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch buyers' }));
        throw new Error(error.error || 'Failed to fetch new buyers');
      }

      const result = await response.json();

      console.log('[Matching API] Buyers fetched for new buyers list:', {
        count: result.data?.length || 0,
      });

      // Filter buyers with dateAdded and sort by most recent
      const buyersWithDate = (result.data || [])
        .filter((buyer: BuyerWithMatches) => buyer.dateAdded)
        .sort((a: BuyerWithMatches, b: BuyerWithMatches) => {
          const dateA = new Date(a.dateAdded!).getTime();
          const dateB = new Date(b.dateAdded!).getTime();
          return dateB - dateA; // Most recent first
        })
        .slice(0, pageSize);

      return {
        data: buyersWithDate,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - fetch fresh data on page load, cache for subsequent navigations
  });
};

/**
 * Fetch new properties sorted by createdAt date (most recent first)
 */
export const useNewProperties = (pageSize: number = 5) => {
  return useQuery({
    queryKey: ['new-properties', pageSize],
    queryFn: async (): Promise<{ data: PropertyWithMatches[] }> => {
      console.log('[Matching API] Fetching new properties', 'pageSize:', pageSize);

      const params = new URLSearchParams({
        action: 'aggregated-properties',
        limit: '100', // Fetch more to ensure we have enough with createdAt
      });

      const response = await fetch(`${MATCHING_API_BASE}?${params}`);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch properties' }));
        throw new Error(error.error || 'Failed to fetch new properties');
      }

      const result = await response.json();

      console.log('[Matching API] Properties fetched for new properties list:', {
        count: result.data?.length || 0,
      });

      // Filter properties with createdAt and sort by most recent
      const propertiesWithDate = (result.data || [])
        .filter((property: PropertyWithMatches) => property.createdAt)
        .sort((a: PropertyWithMatches, b: PropertyWithMatches) => {
          const dateA = new Date(a.createdAt!).getTime();
          const dateB = new Date(b.createdAt!).getTime();
          return dateB - dateA; // Most recent first
        })
        .slice(0, pageSize);

      return {
        data: propertiesWithDate,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Fetch all properties with their matches using optimized aggregated endpoint
 * This solves the N+1 query problem by doing server-side aggregation
 */
export const usePropertiesWithMatches = (filters?: MatchFilters, pageSize: number = 20, offset?: string) => {
  return useQuery({
    queryKey: ['properties-with-matches', filters, pageSize, offset],
    queryFn: async (): Promise<{ data: PropertyWithMatches[], nextOffset?: string }> => {
      console.log('[Matching API] Fetching properties with matches (aggregated)', filters, 'pageSize:', pageSize, 'offset:', offset);

      const params = new URLSearchParams({
        action: 'aggregated-properties',
        limit: pageSize.toString(),
      });

      // Add offset if provided (for pagination)
      if (offset) params.set('offset', offset);

      // Add filter parameters if provided
      if (filters?.matchStatus) params.set('matchStatus', filters.matchStatus);
      if (filters?.minScore !== undefined) params.set('minScore', filters.minScore.toString());
      if (filters?.priorityOnly) params.set('priorityOnly', 'true');
      if (filters?.matchLimit !== undefined) params.set('matchLimit', filters.matchLimit.toString());
      if (filters?.dateRange) params.set('dateRange', filters.dateRange);

      const response = await fetch(`${MATCHING_API_BASE}?${params}`);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch properties' }));
        throw new Error(error.error || 'Failed to fetch properties with matches');
      }

      const result = await response.json();

      console.log('[Matching API] Properties fetched:', {
        count: result.data?.length || 0,
        stats: result.stats,
        nextOffset: result.nextOffset,
      });

      // Sort by match count (highest first)
      const sortedData = (result.data || []).sort((a: PropertyWithMatches, b: PropertyWithMatches) =>
        b.totalMatches - a.totalMatches
      );

      return {
        data: sortedData,
        nextOffset: result.nextOffset,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - fetch fresh data on page load, cache for subsequent navigations
  });
};

/**
 * Run matching for all buyers
 */
export const useRunMatching = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params?: { minScore?: number; refreshAll?: boolean }): Promise<RunMatchingResponse> => {
      console.log('[Matching API] Calling run matching with params:', params);
      const response = await fetch(`${MATCHING_API_BASE}?action=run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params || {}),
      });

      console.log('[Matching API] Response status:', response.status);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Matching failed' }));
        console.error('[Matching API] Error response:', error);
        throw new Error(error.error || 'Failed to run matching');
      }

      const result = await response.json();
      console.log('[Matching API] Success response:', result);
      return result;
    },
    onSuccess: () => {
      // Force immediate refetch of all matching queries
      queryClient.refetchQueries({ queryKey: ['buyers-with-matches'] });
      queryClient.refetchQueries({ queryKey: ['properties-with-matches'] });
    },
  });
};

/**
 * Run matching for a single buyer
 */
export const useRunBuyerMatching = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { contactId: string; minScore?: number }): Promise<RunMatchingResponse> => {
      const { contactId, ...body } = params;
      const response = await fetch(`${MATCHING_API_BASE}?action=run-buyer&contactId=${contactId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Matching failed' }));
        throw new Error(error.error || 'Failed to run buyer matching');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['buyers-with-matches'] });
      queryClient.refetchQueries({ queryKey: ['airtable-buyer-matches'] });
    },
  });
};

/**
 * Run matching for a single property
 */
export const useRunPropertyMatching = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { propertyCode: string; minScore?: number }): Promise<RunMatchingResponse> => {
      const { propertyCode, ...body } = params;
      const response = await fetch(`${MATCHING_API_BASE}?action=run-property&propertyCode=${propertyCode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Matching failed' }));
        throw new Error(error.error || 'Failed to run property matching');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['properties-with-matches'] });
    },
  });
};

/**
 * Clear all matches (deletes all records from Property-Buyer Matches table)
 * Use this to clean up matches with incorrect IDs
 */
export const useClearMatches = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<{ success: boolean; deletedCount: number; message: string }> => {
      console.log('[Matching API] Clearing all matches...');
      const response = await fetch(`${MATCHING_API_BASE}?action=clear`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to clear matches' }));
        throw new Error(error.error || 'Failed to clear matches');
      }

      const result = await response.json();
      console.log('[Matching API] Clear matches result:', result);
      return result;
    },
    onSuccess: () => {
      // Refresh all matching queries after clearing
      queryClient.refetchQueries({ queryKey: ['buyers-with-matches'] });
      queryClient.refetchQueries({ queryKey: ['properties-with-matches'] });
      queryClient.refetchQueries({ queryKey: ['cache-status'] });
      queryClient.refetchQueries({ queryKey: ['cache', 'matches'] });
    },
  });
};

/**
 * Update match stage (deal status)
 * Updates the match status in Airtable and optionally syncs to GHL
 */
export const useUpdateMatchStage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      matchId,
      stage,
      syncToGhl = true,
      // Required params for GHL sync
      contactId,
      propertyAddress,
      opportunityId,
    }: {
      matchId: string;
      stage: MatchDealStage;
      syncToGhl?: boolean;
      /** GHL Contact ID of the buyer - required for GHL sync */
      contactId?: string;
      /** Property address for searching in GHL - required for GHL sync */
      propertyAddress?: string;
      /** GHL Opportunity ID for fallback search */
      opportunityId?: string;
    }): Promise<{ success: boolean; match: PropertyMatch; ghlRelationId?: string }> => {
      console.log('[Matching API] Updating match stage:', matchId, stage, { syncToGhl, contactId, propertyAddress });

      // 1. Update Airtable first (source of truth)
      const response = await fetch(
        `${AIRTABLE_API_BASE}?action=update-record&table=${encodeURIComponent('Property-Buyer Matches')}&recordId=${matchId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: {
              'Match Stage': stage,
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Stage update failed' }));
        throw new Error(error.error || 'Failed to update match stage');
      }

      const result = await response.json();
      console.log('[Matching API] Airtable stage update result:', result);

      let ghlRelationId: string | undefined;

      // 2. Sync to GHL if enabled and we have required data
      if (syncToGhl && contactId && (propertyAddress || opportunityId)) {
        try {
          // Dynamic import to avoid circular dependencies
          const { syncMatchStageToGhl } = await import('./ghlAssociationsApi');
          const { STAGE_ASSOCIATION_IDS } = await import('@/types/associations');

          console.log('[Matching API] Syncing to GHL...');

          const relationId = await syncMatchStageToGhl({
            stage,
            contactId,
            propertyAddress: propertyAddress || '',
            opportunityId,
            stageAssociationIds: STAGE_ASSOCIATION_IDS,
          });

          if (relationId) {
            ghlRelationId = relationId;
            console.log('[Matching API] GHL relation created:', relationId);

            // 3. Store GHL Relation ID back to Airtable for reference
            try {
              await fetch(
                `${AIRTABLE_API_BASE}?action=update-record&table=${encodeURIComponent('Property-Buyer Matches')}&recordId=${matchId}`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    fields: {
                      'GHL Relation ID': relationId,
                    },
                  }),
                }
              );
              console.log('[Matching API] GHL Relation ID saved to Airtable');
            } catch (airtableError) {
              // Log but don't fail - the main sync succeeded
              console.warn('[Matching API] Failed to save GHL Relation ID to Airtable:', airtableError);
            }
          } else {
            console.warn('[Matching API] GHL sync did not return a relation ID');
          }
        } catch (ghlError) {
          // Log but don't fail - Airtable update succeeded
          console.error('[Matching API] GHL sync failed:', ghlError);
        }
      } else if (syncToGhl) {
        console.warn('[Matching API] GHL sync skipped - missing required params:', {
          hasContactId: !!contactId,
          hasPropertyAddress: !!propertyAddress,
          hasOpportunityId: !!opportunityId,
        });
      }

      return { success: true, match: result.record as PropertyMatch, ghlRelationId };
    },
    onSuccess: () => {
      // Refresh all matching queries
      queryClient.refetchQueries({ queryKey: ['buyers-with-matches'] });
      queryClient.refetchQueries({ queryKey: ['properties-with-matches'] });
      // Also invalidate the server-side cache queries so counts/status update
      queryClient.invalidateQueries({ queryKey: ['cache', 'matches'] });
      queryClient.invalidateQueries({ queryKey: ['cache-status'] });
    },
  });
};

/**
 * Note entry stored in the Notes JSON field
 */
interface NoteEntry {
  id: string;
  text: string;
  timestamp: string;
  user?: string;
}

/**
 * Add activity to a match
 * Stores activity in the match's activities JSON field in Airtable
 * For note-added activities, also stores in the Notes JSON field
 */
export const useAddMatchActivity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      matchId,
      activity,
    }: {
      matchId: string;
      activity: Omit<MatchActivity, 'id' | 'timestamp'>;
    }): Promise<{ success: boolean; activity: MatchActivity }> => {
      console.log('[Matching API] Adding activity to match:', matchId, activity);

      // First, fetch the current activities and notes
      const getResponse = await fetch(
        `${AIRTABLE_API_BASE}?action=get-record&table=${encodeURIComponent('Property-Buyer Matches')}&recordId=${matchId}`
      );
      if (!getResponse.ok) {
        throw new Error('Failed to fetch current match data');
      }

      const currentMatch = await getResponse.json();
      const currentActivities: MatchActivity[] = currentMatch.record?.fields?.Activities
        ? JSON.parse(currentMatch.record.fields.Activities)
        : [];

      // Create new activity with ID and timestamp
      const newActivity: MatchActivity = {
        ...activity,
        id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
      };

      // Append new activity
      const updatedActivities = [...currentActivities, newActivity];

      // Build the fields to update
      const fieldsToUpdate: Record<string, string> = {
        Activities: JSON.stringify(updatedActivities),
      };

      // If this is a note-added activity, also update the Notes JSON field
      if (activity.type === 'note-added' && activity.details) {
        const currentNotes: NoteEntry[] = currentMatch.record?.fields?.Notes
          ? JSON.parse(currentMatch.record.fields.Notes)
          : [];

        const newNote: NoteEntry = {
          id: newActivity.id,
          text: activity.details,
          timestamp: newActivity.timestamp,
          user: activity.user,
        };

        const updatedNotes = [...currentNotes, newNote];
        fieldsToUpdate.Notes = JSON.stringify(updatedNotes);
        console.log('[Matching API] Also updating Notes field with new note');
      }

      // Update Airtable using update-record action
      const response = await fetch(
        `${AIRTABLE_API_BASE}?action=update-record&table=${encodeURIComponent('Property-Buyer Matches')}&recordId=${matchId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: fieldsToUpdate,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Activity add failed' }));
        throw new Error(error.error || 'Failed to add activity');
      }

      console.log('[Matching API] Activity added successfully');

      return { success: true, activity: newActivity };
    },
    onSuccess: () => {
      // Refresh matching queries to get updated activities
      queryClient.refetchQueries({ queryKey: ['buyers-with-matches'] });
      queryClient.refetchQueries({ queryKey: ['properties-with-matches'] });
      // Also refresh deals queries so the modal updates immediately
      queryClient.refetchQueries({ queryKey: ['deals'] });
      queryClient.refetchQueries({ queryKey: ['deals-by-stage'] });
    },
  });
};

/**
 * Edit a note on a match
 * Updates the note in both the Notes JSON field and Activities field
 */
export const useEditMatchNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      matchId,
      noteId,
      newText,
    }: {
      matchId: string;
      noteId: string;
      newText: string;
    }): Promise<{ success: boolean }> => {
      console.log('[Matching API] Editing note:', matchId, noteId);

      // Fetch current notes and activities
      const getResponse = await fetch(
        `${AIRTABLE_API_BASE}?action=get-record&table=${encodeURIComponent('Property-Buyer Matches')}&recordId=${matchId}`
      );
      if (!getResponse.ok) {
        throw new Error('Failed to fetch current match data');
      }

      const currentMatch = await getResponse.json();
      const currentNotes: NoteEntry[] = currentMatch.record?.fields?.Notes
        ? JSON.parse(currentMatch.record.fields.Notes)
        : [];
      const currentActivities: MatchActivity[] = currentMatch.record?.fields?.Activities
        ? JSON.parse(currentMatch.record.fields.Activities)
        : [];

      // Update the note in Notes array
      const updatedNotes = currentNotes.map((note) =>
        note.id === noteId ? { ...note, text: newText } : note
      );

      // Update the corresponding activity (note-added type with matching ID)
      const updatedActivities = currentActivities.map((activity) =>
        activity.id === noteId && activity.type === 'note-added'
          ? { ...activity, details: newText, metadata: { ...activity.metadata, note: newText } }
          : activity
      );

      // Update Airtable
      const response = await fetch(
        `${AIRTABLE_API_BASE}?action=update-record&table=${encodeURIComponent('Property-Buyer Matches')}&recordId=${matchId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: {
              Notes: JSON.stringify(updatedNotes),
              Activities: JSON.stringify(updatedActivities),
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Note edit failed' }));
        throw new Error(error.error || 'Failed to edit note');
      }

      console.log('[Matching API] Note edited successfully');
      return { success: true };
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['buyers-with-matches'] });
      queryClient.refetchQueries({ queryKey: ['properties-with-matches'] });
      // Also refresh deals queries so the modal updates
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['deals-by-stage'] });
    },
  });
};

/**
 * Delete a note from a match
 * Removes the note from both the Notes JSON field and Activities field
 */
export const useDeleteMatchNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      matchId,
      noteId,
    }: {
      matchId: string;
      noteId: string;
    }): Promise<{ success: boolean }> => {
      console.log('[Matching API] Deleting note:', matchId, noteId);

      // Fetch current notes and activities
      const getResponse = await fetch(
        `${AIRTABLE_API_BASE}?action=get-record&table=${encodeURIComponent('Property-Buyer Matches')}&recordId=${matchId}`
      );
      if (!getResponse.ok) {
        throw new Error('Failed to fetch current match data');
      }

      const currentMatch = await getResponse.json();
      const currentNotes: NoteEntry[] = currentMatch.record?.fields?.Notes
        ? JSON.parse(currentMatch.record.fields.Notes)
        : [];
      const currentActivities: MatchActivity[] = currentMatch.record?.fields?.Activities
        ? JSON.parse(currentMatch.record.fields.Activities)
        : [];

      // Remove the note from Notes array
      const updatedNotes = currentNotes.filter((note) => note.id !== noteId);

      // Remove the corresponding activity
      const updatedActivities = currentActivities.filter((activity) => activity.id !== noteId);

      // Update Airtable
      const response = await fetch(
        `${AIRTABLE_API_BASE}?action=update-record&table=${encodeURIComponent('Property-Buyer Matches')}&recordId=${matchId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: {
              Notes: JSON.stringify(updatedNotes),
              Activities: JSON.stringify(updatedActivities),
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Note delete failed' }));
        throw new Error(error.error || 'Failed to delete note');
      }

      console.log('[Matching API] Note deleted successfully');
      return { success: true };
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['buyers-with-matches'] });
      queryClient.refetchQueries({ queryKey: ['properties-with-matches'] });
      // Also refresh deals queries so the modal updates
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['deals-by-stage'] });
    },
  });
};

/**
 * Combined hook to update stage and add activity in one operation
 * This is the primary hook for stage changes as it logs the change
 */
export const useUpdateMatchStageWithActivity = () => {
  const updateStage = useUpdateMatchStage();
  const addActivity = useAddMatchActivity();

  return useMutation({
    mutationFn: async ({
      matchId,
      fromStage,
      toStage,
      // GHL sync params - passed through to useUpdateMatchStage
      syncToGhl = true,
      contactId,
      propertyAddress,
      opportunityId,
    }: {
      matchId: string;
      fromStage: MatchDealStage;
      toStage: MatchDealStage;
      /** Whether to sync to GHL (default: true) */
      syncToGhl?: boolean;
      /** GHL Contact ID of the buyer - required for GHL sync */
      contactId?: string;
      /** Property address for searching in GHL - required for GHL sync */
      propertyAddress?: string;
      /** GHL Opportunity ID for fallback search */
      opportunityId?: string;
    }): Promise<{ success: boolean; ghlRelationId?: string }> => {
      // Update the stage first (includes GHL sync)
      const stageResult = await updateStage.mutateAsync({
        matchId,
        stage: toStage,
        syncToGhl,
        contactId,
        propertyAddress,
        opportunityId,
      });

      // Then log the activity
      await addActivity.mutateAsync({
        matchId,
        activity: {
          type: 'stage-change',
          details: `Stage changed from "${fromStage}" to "${toStage}"`,
          metadata: {
            fromStage,
            toStage,
          },
        },
      });

      return { success: true, ghlRelationId: stageResult.ghlRelationId };
    },
  });
};

/**
 * Fetch all properties for a specific buyer (Zillow-style)
 * Returns ALL properties scored and sorted by relevance,
 * split into priority (within 50mi/ZIP) and explore (beyond 50mi) sections.
 */
export const useBuyerProperties = (buyerId: string | null) => {
  return useQuery({
    queryKey: ['buyer-properties', buyerId],
    queryFn: async (): Promise<BuyerPropertiesResponse> => {
      if (!buyerId) {
        throw new Error('Buyer ID is required');
      }

      console.log('[Matching API] Fetching all properties for buyer:', buyerId);

      const response = await fetch(`${MATCHING_API_BASE}?action=buyer-properties&buyerId=${buyerId}`);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch properties' }));
        throw new Error(error.error || 'Failed to fetch buyer properties');
      }

      const result = await response.json();

      console.log('[Matching API] Buyer properties fetched:', {
        buyer: `${result.buyer?.firstName} ${result.buyer?.lastName}`,
        priorityCount: result.priorityMatches?.length || 0,
        exploreCount: result.exploreMatches?.length || 0,
        totalCount: result.totalCount,
        timeMs: result.stats?.timeMs,
      });

      return result;
    },
    enabled: !!buyerId, // Only run when buyerId is provided
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Fetch all buyers scored for a specific property
 * Returns buyers sorted by match score (property-centric view)
 */
export const usePropertyBuyers = (propertyCode: string | null) => {
  return useQuery({
    queryKey: ['property-buyers', propertyCode],
    queryFn: async (): Promise<PropertyBuyersResponse> => {
      if (!propertyCode) {
        throw new Error('Property code is required');
      }

      console.log('[Matching API] Fetching all buyers for property:', propertyCode);

      const response = await fetch(`${MATCHING_API_BASE}?action=property-buyers&propertyCode=${propertyCode}`);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch property buyers' }));
        throw new Error(error.error || 'Failed to fetch property buyers');
      }

      const result = await response.json();

      console.log('[Matching API] Property buyers fetched:', {
        property: result.property?.address,
        buyersCount: result.buyers?.length || 0,
        totalCount: result.totalCount,
        timeMs: result.stats?.timeMs,
      });

      return result;
    },
    enabled: !!propertyCode, // Only run when propertyCode is provided
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Fetch list of all buyers for buyer selector dropdown
 */
export const useBuyersList = () => {
  return useQuery({
    queryKey: ['matching-buyers-list'],
    queryFn: async (): Promise<Array<{ recordId: string; contactId: string; firstName: string; lastName: string; email: string; qualified?: boolean; dateAdded?: string; totalMatches: number }>> => {
      console.log('[Matching API] Fetching buyers list');

      const response = await fetch(`${MATCHING_API_BASE}?action=aggregated-buyers&limit=100`);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch buyers' }));
        throw new Error(error.error || 'Failed to fetch buyers list');
      }

      const result = await response.json();

      // Extract the fields we need for the dropdown, including qualified status and match count
      const buyers = (result.data || []).map((buyer: BuyerWithMatches) => ({
        recordId: buyer.recordId || '',
        contactId: buyer.contactId,
        firstName: buyer.firstName,
        lastName: buyer.lastName,
        email: buyer.email,
        qualified: buyer.qualified,
        dateAdded: buyer.dateAdded,
        totalMatches: buyer.totalMatches,
      }));

      console.log('[Matching API] Buyers list fetched:', buyers.length);

      return buyers;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Fetch all properties from Airtable (same source as Property Matching)
 * Returns properties with basic details suitable for the Properties page
 */
export const useAirtableProperties = (pageSize: number = 100) => {
  return useQuery({
    queryKey: ['airtable-properties', pageSize],
    queryFn: async (): Promise<{ properties: PropertyDetails[], total: number }> => {
      console.log('[Matching API] Fetching properties from Airtable...');

      const params = new URLSearchParams({
        action: 'aggregated-properties',
        limit: pageSize.toString(),
        noCache: 'true',
      });

      const response = await fetch(`${MATCHING_API_BASE}?${params}`);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch properties' }));
        throw new Error(error.error || 'Failed to fetch properties from Airtable');
      }

      const result = await response.json();

      // Extract properties from the result
      const properties = (result.data || []).map((item: PropertyWithMatches) => ({
        recordId: item.recordId,
        propertyCode: item.propertyCode,
        opportunityId: item.opportunityId,
        address: item.address,
        city: item.city,
        state: item.state,
        zipCode: item.zipCode,
        price: item.price,
        beds: item.beds,
        baths: item.baths,
        sqft: item.sqft,
        stage: item.stage,
        heroImage: item.heroImage,
        notes: item.notes,
        propertyLat: item.propertyLat,
        propertyLng: item.propertyLng,
        monthlyPayment: item.monthlyPayment,
        downPayment: item.downPayment,
        images: item.images,
        propertyType: item.propertyType,
        condition: item.condition,
        source: item.source,
        zillowType: item.zillowType,
        zillowZpid: item.zillowZpid,
        zillowUrl: item.zillowUrl,
        daysOnMarket: item.daysOnMarket,
        createdAt: item.createdAt,
        // Calculator scenarios
        calculatorScenario1: item.calculatorScenario1,
        calculatorScenario2: item.calculatorScenario2,
        calculatorScenario3: item.calculatorScenario3,
      }));

      console.log('[Matching API] Airtable properties fetched:', properties.length);

      return {
        properties,
        total: properties.length,
      };
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: true,
  });
};

/**
 * Delete a single property with cascade match deletion
 */
export const useDeleteProperty = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (recordId: string): Promise<{ success: boolean; matchesDeleted: number }> => {
      console.log('[Matching API] Deleting property:', recordId);
      const response = await fetch(`${AIRTABLE_API_BASE}?action=delete-property`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordId }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to delete property' }));
        throw new Error(error.error || 'Failed to delete property');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['airtable-properties'] });
      queryClient.invalidateQueries({ queryKey: ['properties-with-matches'] });
      queryClient.invalidateQueries({ queryKey: ['match-stats'] });
    },
  });
};

/**
 * Bulk delete properties with cascade match deletion
 */
export const useDeleteProperties = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (recordIds: string[]): Promise<{ success: boolean; deletedCount: number; matchesDeleted: number }> => {
      console.log('[Matching API] Bulk deleting properties:', recordIds.length);
      const response = await fetch(`${AIRTABLE_API_BASE}?action=delete-properties`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordIds }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to delete properties' }));
        throw new Error(error.error || 'Failed to delete properties');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['airtable-properties'] });
      queryClient.invalidateQueries({ queryKey: ['properties-with-matches'] });
      queryClient.invalidateQueries({ queryKey: ['match-stats'] });
    },
  });
};

/**
 * Update a property in Airtable (Properties table)
 * Used when saving property changes directly to Airtable
 */
export const useUpdateAirtableProperty = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (update: {
      recordId: string;
      fields: {
        address?: string;
        city?: string;
        state?: string;
        price?: number;
        beds?: number;
        baths?: number;
        sqft?: number;
        condition?: string;
        propertyType?: string;
        description?: string;
        monthlyPayment?: number;
        downPayment?: number;
        heroImage?: string;
        images?: string[];
      };
    }): Promise<{ success: boolean; record: any }> => {
      console.log('[Matching API] Updating Airtable property:', update.recordId, update.fields);

      // Map the update fields to Airtable field names
      const airtableFields: Record<string, any> = {};

      if (update.fields.address !== undefined) airtableFields['Address'] = update.fields.address;
      if (update.fields.city !== undefined) airtableFields['City'] = update.fields.city;
      if (update.fields.state !== undefined) airtableFields['State'] = update.fields.state;
      if (update.fields.price !== undefined) airtableFields['Property Total Price'] = update.fields.price;
      if (update.fields.beds !== undefined) airtableFields['Beds'] = update.fields.beds;
      if (update.fields.baths !== undefined) airtableFields['Baths'] = update.fields.baths;
      if (update.fields.sqft !== undefined) airtableFields['Sqft'] = update.fields.sqft;
      if (update.fields.condition !== undefined) airtableFields['Property Current Condition'] = update.fields.condition;
      if (update.fields.propertyType !== undefined) airtableFields['Property Type'] = update.fields.propertyType;
      if (update.fields.description !== undefined) airtableFields['Notes'] = update.fields.description;
      if (update.fields.monthlyPayment !== undefined) airtableFields['Monthly Payment'] = update.fields.monthlyPayment;
      if (update.fields.downPayment !== undefined) airtableFields['Down Payment'] = update.fields.downPayment;
      if (update.fields.heroImage !== undefined) airtableFields['Hero Image'] = update.fields.heroImage;
      if (update.fields.images !== undefined) {
        // Supporting images are stored in individual fields: Supporting Image 1 through Supporting Image 25
        for (let i = 1; i <= 25; i++) {
          airtableFields[`Supporting Image ${i}`] = update.fields.images[i - 1] || '';
        }
      }

      const response = await fetch(
        `${AIRTABLE_API_BASE}?action=update-record&table=${encodeURIComponent('Properties')}&recordId=${update.recordId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: airtableFields }),
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to update property' }));
        throw new Error(error.error || 'Failed to update property in Airtable');
      }

      const result = await response.json();
      console.log('[Matching API] Airtable property update result:', result);

      return { success: true, record: result.record };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['airtable-properties'] });
    },
  });
};

/**
 * Fetch match statistics for dashboard summary
 */
export const useMatchStats = () => {
  return useQuery({
    queryKey: ['match-stats'],
    queryFn: async (): Promise<{
      readyToSend: number;
      sentToday: number;
      inPipeline: number;
      totalMatches: number;
    }> => {
      console.log('[Matching API] Fetching match stats');

      const response = await fetch(`${MATCHING_API_BASE}?action=match-stats`);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch match stats' }));
        throw new Error(error.error || 'Failed to fetch match stats');
      }

      const result = await response.json();
      console.log('[Matching API] Match stats fetched:', result);

      return result;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
};

// ============ MATCHING PREFERENCES ============

import { DEFAULT_MATCHING_PREFERENCES } from '@/types/matching';

const DEFAULT_PREFERENCES: MatchingPreferences = DEFAULT_MATCHING_PREFERENCES;

/**
 * Fetch matching preferences
 */
export const useMatchingPreferences = () => {
  return useQuery({
    queryKey: ['matching-preferences'],
    queryFn: async (): Promise<MatchingPreferences> => {
      console.log('[Matching API] Fetching matching preferences');

      const response = await fetch(`${MATCHING_API_BASE}?action=get-preferences`);

      if (!response.ok) {
        console.warn('[Matching API] Failed to fetch preferences, using defaults');
        return DEFAULT_PREFERENCES;
      }

      const result = await response.json();
      console.log('[Matching API] Matching preferences fetched:', result.preferences);

      return result.preferences || DEFAULT_PREFERENCES;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - preferences rarely change
  });
};

/**
 * Update matching preferences
 */
export const useUpdateMatchingPreferences = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      preferences: Partial<MatchingPreferences>
    ): Promise<{ success: boolean; preferences: MatchingPreferences }> => {
      console.log('[Matching API] Updating matching preferences:', preferences);

      const response = await fetch(`${MATCHING_API_BASE}?action=update-preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to save preferences' }));
        throw new Error(error.error || 'Failed to save matching preferences');
      }

      const result = await response.json();
      console.log('[Matching API] Matching preferences updated:', result);

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matching-preferences'] });
    },
  });
};

// ============ ZILLOW SETTINGS CONVENIENCE HOOKS ============

/**
 * Get Zillow search settings from matching preferences
 * Convenience hook for Zillow search components
 */
export const useZillowSettings = () => {
  const { data } = useMatchingPreferences();
  return {
    maxPrice: data?.zillowMaxPrice ?? DEFAULT_PREFERENCES.zillowMaxPrice,
    minDays: data?.zillowMinDays ?? DEFAULT_PREFERENCES.zillowMinDays,
    keywords: data?.zillowKeywords ?? DEFAULT_PREFERENCES.zillowKeywords,
  };
};

/**
 * Get budget multiplier from matching preferences
 * Convenience hook for budget calculation
 */
export const useBudgetMultiplier = () => {
  const { data } = useMatchingPreferences();
  return data?.budgetMultiplier ?? DEFAULT_PREFERENCES.budgetMultiplier;
};
