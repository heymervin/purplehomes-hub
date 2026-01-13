/**
 * React Query hooks for Deal Pipeline
 *
 * These hooks provide deal-centric views of the matching data,
 * with computed properties for the pipeline UI.
 *
 * Uses the matching API's aggregated endpoint which already joins
 * property and buyer details, then transforms for pipeline views.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  Deal,
  DealFilters,
  PipelineStats,
  DealsByBuyer,
  DealsByProperty,
  StageChangeRequest,
  NoteEntry,
} from '@/types/deals';
import type { MatchDealStage } from '@/types/associations';
import { MATCH_DEAL_STAGES, STAGE_ASSOCIATION_IDS } from '@/types/associations';
import type { PropertyDetails, BuyerCriteria, MatchActivity, BuyerWithMatches } from '@/types/matching';

const MATCHING_API_BASE = '/api/matching';
const AIRTABLE_API_BASE = '/api/airtable';
const GHL_API_BASE = '/api/ghl';

// Constants
const STALE_THRESHOLD_DAYS = 7;

// GHL Pipeline IDs
const GHL_BUYER_DISPOSITION_PIPELINE_ID = 'cThFQOW6nkVKVxbBrDAV';

// GHL Buyer Home Disposition (CAR) Pipeline Stage IDs
// Pipeline ID: cThFQOW6nkVKVxbBrDAV
// Maps PropertyPro deal stages to GHL pipeline stages
const GHL_BUYER_PIPELINE_STAGE_IDS: Partial<Record<MatchDealStage, string>> = {
  'Sent to Buyer': '7dcbe688-43bb-4e22-baf4-304507a665bc',        // Matching
  'Buyer Responded': '7dcbe688-43bb-4e22-baf4-304507a665bc',      // Matching
  'Showing Scheduled': '7dcbe688-43bb-4e22-baf4-304507a665bc',    // Matching
  'Property Viewed': '7dcbe688-43bb-4e22-baf4-304507a665bc',      // Matching
  'Underwriting': 'e72229e9-024b-4fa8-8f69-f2eec888802a',         // Underwriting
  'Contracts': 'fc212c8e-2160-4883-b415-809cec695447',            // Contract Signed
  'Qualified': '2cf341fc-72e9-4d13-a4cd-8da514b412ad',            // RMLO Qualifying
  'Closed Deal / Won': '3c6945d7-8213-4af9-b58c-01d729e09b21',    // Won
  'Not Interested': 'c024c689-0463-44c5-83b0-76ba871f4d1a',       // Lost
};

/**
 * Compute isStale and daysSinceActivity for a deal
 */
function computeDealMetadata(
  activities: MatchActivity[],
  createdAt?: string
): { isStale: boolean; daysSinceActivity: number; lastActivityAt?: string } {
  const sortedActivities = [...(activities || [])].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  const lastActivity = sortedActivities[0];
  const lastActivityAt = lastActivity?.timestamp;

  const lastDate = lastActivityAt
    ? new Date(lastActivityAt)
    : createdAt
    ? new Date(createdAt)
    : new Date();

  const daysSinceActivity = Math.floor(
    (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    isStale: daysSinceActivity >= STALE_THRESHOLD_DAYS,
    daysSinceActivity,
    lastActivityAt,
  };
}

/**
 * Transform a match from the aggregated API into a Deal object
 */
function transformMatchToDeal(
  match: any,
  buyer: BuyerCriteria
): Deal | null {
  if (!match || !match.property) {
    return null;
  }

  // Only include matches that have an explicit Match Stage set
  // Matches without a stage are just "Active" matches, not deals in the pipeline
  if (!match.stage) {
    return null;
  }

  // Parse activities if stored as JSON string
  let activities: MatchActivity[] = [];
  if (match.activities) {
    if (typeof match.activities === 'string') {
      try {
        activities = JSON.parse(match.activities);
      } catch {
        activities = [];
      }
    } else if (Array.isArray(match.activities)) {
      activities = match.activities;
    }
  }

  // Parse notes if stored as JSON string
  let notes: NoteEntry[] = [];
  if (match.notes) {
    if (typeof match.notes === 'string') {
      try {
        notes = JSON.parse(match.notes);
      } catch {
        notes = [];
      }
    } else if (Array.isArray(match.notes)) {
      notes = match.notes;
    }
  }

  const metadata = computeDealMetadata(activities, match.createdAt);

  // Map stage from the match - use 'Match Stage' field (not 'Match Status')
  // The aggregated API returns this as 'stage' after transformation
  const rawStage = match.stage || 'Sent to Buyer';
  // 'Active' is from 'Match Status' field (not a deal stage), default to 'Sent to Buyer'
  const status: MatchDealStage = rawStage === 'Active' ? 'Sent to Buyer' : rawStage as MatchDealStage;

  const deal: Deal = {
    id: match.id,
    buyerRecordId: match.buyerRecordId || buyer.recordId || '',
    propertyRecordId: match.propertyRecordId || match.property?.recordId || '',
    contactId: match.contactId || buyer.contactId || '',
    propertyCode: match.propertyCode || match.property?.propertyCode || '',
    score: match.score || 0,
    distance: match.distance,
    reasoning: match.reasoning || '',
    highlights: match.highlights || [],
    concerns: match.concerns || [],
    isPriority: match.isPriority || false,
    isFinalProperty: match.isFinalProperty || false,
    status,
    activities,
    notes,
    ghlRelationId: match.ghlRelationId,
    createdAt: match.createdAt,
    updatedAt: match.updatedAt || match.createdAt,
    dateSent: match.dateSent,
    property: match.property as PropertyDetails,
    buyer: buyer,
    isStale: metadata.isStale,
    daysSinceActivity: metadata.daysSinceActivity,
    lastActivityAt: metadata.lastActivityAt,
  };

  return deal;
}

/**
 * Fetch all deals by getting all buyers with matches from the aggregated endpoint
 * and flattening into a single list of deals
 */
export const useDeals = (filters?: DealFilters) => {
  return useQuery({
    queryKey: ['deals', filters],
    queryFn: async (): Promise<Deal[]> => {
      console.log('[Deals API] Fetching deals with filters:', filters);

      // Fetch all buyers with their matches from the aggregated endpoint
      const response = await fetch(`${MATCHING_API_BASE}?action=aggregated-buyers&limit=100`);

      if (!response.ok) {
        throw new Error('Failed to fetch deals');
      }

      const data = await response.json();
      const buyersWithMatches: BuyerWithMatches[] = data.data || [];

      // Flatten all matches into deals
      const deals: Deal[] = [];

      for (const buyerData of buyersWithMatches) {
        const buyer: BuyerCriteria = {
          contactId: buyerData.contactId || '',
          recordId: buyerData.recordId || '',
          firstName: buyerData.firstName || '',
          lastName: buyerData.lastName || '',
          email: buyerData.email || '',
          qualified: buyerData.qualified || false,
          downPayment: buyerData.downPayment,
          monthlyIncome: buyerData.monthlyIncome,
        };

        for (const match of buyerData.matches || []) {
          const deal = transformMatchToDeal(match, buyer);
          if (deal) {
            deals.push(deal);
          }
        }
      }

      console.log('[Deals API] Total deals fetched:', deals.length);

      // Apply client-side filters
      let filtered = deals;

      if (filters?.stage && filters.stage !== 'all') {
        filtered = filtered.filter((d) => d.status === filters.stage);
      } else if (filters?.stages && filters.stages.length > 0) {
        filtered = filtered.filter((d) => filters.stages!.includes(d.status));
      }

      if (filters?.search) {
        const search = filters.search.toLowerCase();
        filtered = filtered.filter(
          (d) =>
            d.property.address.toLowerCase().includes(search) ||
            d.buyer.firstName.toLowerCase().includes(search) ||
            d.buyer.lastName.toLowerCase().includes(search)
        );
      }

      if (filters?.minScore) {
        filtered = filtered.filter((d) => d.score >= (filters.minScore || 0));
      }

      if (filters?.onlyStale) {
        filtered = filtered.filter((d) => d.isStale);
      }

      if (filters?.onlyUpcoming) {
        filtered = filtered.filter((d) => d.status === 'Showing Scheduled');
      }

      console.log('[Deals API] Filtered deals:', filtered.length);

      return filtered;
    },
    staleTime: 2 * 60 * 1000,
    refetchInterval: 60 * 1000, // Poll every 60 seconds
    refetchIntervalInBackground: false, // Don't poll when tab is inactive
  });
};

/**
 * Fetch pipeline statistics for the Overview tab
 */
export const usePipelineStats = () => {
  return useQuery({
    queryKey: ['pipeline-stats'],
    queryFn: async (): Promise<PipelineStats> => {
      console.log('[Deals API] Computing pipeline stats');

      // Fetch all buyers with matches
      const response = await fetch(`${MATCHING_API_BASE}?action=aggregated-buyers&limit=100`);

      if (!response.ok) {
        throw new Error('Failed to fetch deals for stats');
      }

      const data = await response.json();
      const buyersWithMatches: BuyerWithMatches[] = data.data || [];

      // Flatten all matches into deals
      const deals: Deal[] = [];

      for (const buyerData of buyersWithMatches) {
        const buyer: BuyerCriteria = {
          contactId: buyerData.contactId || '',
          recordId: buyerData.recordId || '',
          firstName: buyerData.firstName || '',
          lastName: buyerData.lastName || '',
          email: buyerData.email || '',
          qualified: buyerData.qualified || false,
          downPayment: buyerData.downPayment,
          monthlyIncome: buyerData.monthlyIncome,
        };

        for (const match of buyerData.matches || []) {
          const deal = transformMatchToDeal(match, buyer);
          if (deal) {
            deals.push(deal);
          }
        }
      }

      // Initialize stage counts
      const byStage: Record<string, number> = {};
      MATCH_DEAL_STAGES.forEach((stage) => {
        byStage[stage] = 0;
      });
      byStage['Not Interested'] = 0;

      let needsAttention = 0;
      let pipelineValue = 0;
      let newThisWeek = 0;

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      deals.forEach((deal) => {
        // Count by stage
        if (byStage[deal.status] !== undefined) {
          byStage[deal.status]++;
        } else {
          // Handle unknown statuses as 'Sent to Buyer'
          byStage['Sent to Buyer']++;
        }

        // Needs attention (stale deals, excluding closed/lost)
        if (
          deal.isStale &&
          deal.status !== 'Closed Deal / Won' &&
          deal.status !== 'Not Interested'
        ) {
          needsAttention++;
        }

        // Pipeline value (sum of property prices for active deals)
        if (deal.status !== 'Closed Deal / Won' && deal.status !== 'Not Interested') {
          pipelineValue += deal.property.price || 0;
        }

        // New this week
        if (deal.createdAt && new Date(deal.createdAt) >= weekAgo) {
          newThisWeek++;
        }
      });

      const stats: PipelineStats = {
        totalDeals: deals.length,
        pipelineValue,
        closingSoon: byStage['Contracts'] || 0,
        needsAttention,
        newThisWeek,
        byStage: byStage as Record<MatchDealStage, number>,
      };

      console.log('[Deals API] Pipeline stats computed:', stats);

      return stats;
    },
    staleTime: 2 * 60 * 1000,
    refetchInterval: 60 * 1000, // Poll every 60 seconds
    refetchIntervalInBackground: false,
  });
};

/**
 * Fetch deals grouped by stage for Kanban view
 */
export const useDealsByStage = () => {
  return useQuery({
    queryKey: ['deals-by-stage'],
    queryFn: async (): Promise<Record<MatchDealStage, Deal[]>> => {
      console.log('[Deals API] Fetching deals by stage');

      // Fetch all buyers with matches
      const response = await fetch(`${MATCHING_API_BASE}?action=aggregated-buyers&limit=100`);

      if (!response.ok) {
        throw new Error('Failed to fetch deals');
      }

      const data = await response.json();
      const buyersWithMatches: BuyerWithMatches[] = data.data || [];

      // Flatten all matches into deals
      const deals: Deal[] = [];

      for (const buyerData of buyersWithMatches) {
        const buyer: BuyerCriteria = {
          contactId: buyerData.contactId || '',
          recordId: buyerData.recordId || '',
          firstName: buyerData.firstName || '',
          lastName: buyerData.lastName || '',
          email: buyerData.email || '',
          qualified: buyerData.qualified || false,
          downPayment: buyerData.downPayment,
          monthlyIncome: buyerData.monthlyIncome,
        };

        for (const match of buyerData.matches || []) {
          const deal = transformMatchToDeal(match, buyer);
          if (deal) {
            deals.push(deal);
          }
        }
      }

      // Initialize all stages
      const byStage: Record<string, Deal[]> = {};
      MATCH_DEAL_STAGES.forEach((stage) => {
        byStage[stage] = [];
      });
      byStage['Not Interested'] = [];

      // Group deals by stage
      deals.forEach((deal) => {
        const stage = deal.status;
        if (byStage[stage]) {
          byStage[stage].push(deal);
        } else {
          // Default unknown statuses to 'Sent to Buyer'
          byStage['Sent to Buyer'].push(deal);
        }
      });

      // Sort each stage by score descending
      Object.keys(byStage).forEach((stage) => {
        byStage[stage].sort((a, b) => b.score - a.score);
      });

      console.log('[Deals API] Deals by stage:', Object.keys(byStage).map(s => `${s}: ${byStage[s].length}`).join(', '));

      return byStage as Record<MatchDealStage, Deal[]>;
    },
    staleTime: 2 * 60 * 1000,
    refetchInterval: 60 * 1000, // Poll every 60 seconds
    refetchIntervalInBackground: false,
  });
};

/**
 * Fetch deals grouped by buyer
 */
export const useDealsByBuyer = () => {
  return useQuery({
    queryKey: ['deals-by-buyer'],
    queryFn: async (): Promise<DealsByBuyer[]> => {
      console.log('[Deals API] Fetching deals by buyer');

      // Fetch all buyers with matches
      const response = await fetch(`${MATCHING_API_BASE}?action=aggregated-buyers&limit=100`);

      if (!response.ok) {
        throw new Error('Failed to fetch deals');
      }

      const data = await response.json();
      const buyersWithMatches: BuyerWithMatches[] = data.data || [];

      // Transform into DealsByBuyer format
      const result: DealsByBuyer[] = [];

      for (const buyerData of buyersWithMatches) {
        const buyer: BuyerCriteria = {
          contactId: buyerData.contactId || '',
          recordId: buyerData.recordId || '',
          firstName: buyerData.firstName || '',
          lastName: buyerData.lastName || '',
          email: buyerData.email || '',
          qualified: buyerData.qualified || false,
          downPayment: buyerData.downPayment,
          monthlyIncome: buyerData.monthlyIncome,
        };

        const deals: Deal[] = [];
        const activeStages: MatchDealStage[] = [];
        let totalValue = 0;

        for (const match of buyerData.matches || []) {
          const deal = transformMatchToDeal(match, buyer);
          if (deal) {
            deals.push(deal);
            totalValue += deal.property.price || 0;
            if (!activeStages.includes(deal.status)) {
              activeStages.push(deal.status);
            }
          }
        }

        if (deals.length > 0) {
          result.push({
            buyer,
            deals,
            totalDeals: deals.length,
            totalValue,
            activeStages,
          });
        }
      }

      // Sort by total deals descending
      result.sort((a, b) => b.totalDeals - a.totalDeals);

      console.log('[Deals API] Deals by buyer:', result.length, 'buyers');

      return result;
    },
    staleTime: 2 * 60 * 1000,
    refetchInterval: 60 * 1000,
    refetchIntervalInBackground: false,
  });
};

/**
 * Fetch deals grouped by property
 */
export const useDealsByProperty = () => {
  return useQuery({
    queryKey: ['deals-by-property'],
    queryFn: async (): Promise<DealsByProperty[]> => {
      console.log('[Deals API] Fetching deals by property');

      // Fetch all buyers with matches
      const response = await fetch(`${MATCHING_API_BASE}?action=aggregated-buyers&limit=100`);

      if (!response.ok) {
        throw new Error('Failed to fetch deals');
      }

      const data = await response.json();
      const buyersWithMatches: BuyerWithMatches[] = data.data || [];

      // Group by property
      const propertyMap = new Map<string, DealsByProperty>();

      // Define stage order for determining "furthest" stage
      const stageOrder: Record<string, number> = {
        'Sent to Buyer': 1,
        'Buyer Responded': 2,
        'Showing Scheduled': 3,
        'Property Viewed': 4,
        'Underwriting': 5,
        'Contracts': 6,
        'Qualified': 7,
        'Closed Deal / Won': 8,
        'Not Interested': 0,
      };

      for (const buyerData of buyersWithMatches) {
        const buyer: BuyerCriteria = {
          contactId: buyerData.contactId || '',
          recordId: buyerData.recordId || '',
          firstName: buyerData.firstName || '',
          lastName: buyerData.lastName || '',
          email: buyerData.email || '',
          qualified: buyerData.qualified || false,
          downPayment: buyerData.downPayment,
          monthlyIncome: buyerData.monthlyIncome,
        };

        for (const match of buyerData.matches || []) {
          const deal = transformMatchToDeal(match, buyer);
          if (!deal) continue;

          const propertyId = deal.property.recordId || deal.property.propertyCode || 'unknown';

          if (!propertyMap.has(propertyId)) {
            propertyMap.set(propertyId, {
              property: deal.property,
              deals: [],
              totalBuyers: 0,
              highestScore: 0,
              furthestStage: 'Sent to Buyer',
            });
          }

          const group = propertyMap.get(propertyId)!;
          group.deals.push(deal);
          group.totalBuyers++;

          if (deal.score > group.highestScore) {
            group.highestScore = deal.score;
          }

          if (stageOrder[deal.status] > stageOrder[group.furthestStage]) {
            group.furthestStage = deal.status;
          }
        }
      }

      // Sort by total buyers descending
      const result = Array.from(propertyMap.values()).sort(
        (a, b) => b.totalBuyers - a.totalBuyers
      );

      console.log('[Deals API] Deals by property:', result.length, 'properties');

      return result;
    },
    staleTime: 2 * 60 * 1000,
    refetchInterval: 60 * 1000,
    refetchIntervalInBackground: false,
  });
};

/**
 * Fetch stale deals (no activity in 7+ days)
 */
export const useStaleDeals = (limit: number = 5) => {
  return useQuery({
    queryKey: ['stale-deals', limit],
    queryFn: async (): Promise<Deal[]> => {
      console.log('[Deals API] Fetching stale deals, limit:', limit);

      // Fetch all buyers with matches
      const response = await fetch(`${MATCHING_API_BASE}?action=aggregated-buyers&limit=100`);

      if (!response.ok) {
        throw new Error('Failed to fetch deals');
      }

      const data = await response.json();
      const buyersWithMatches: BuyerWithMatches[] = data.data || [];

      // Flatten all matches into deals
      const deals: Deal[] = [];

      for (const buyerData of buyersWithMatches) {
        const buyer: BuyerCriteria = {
          contactId: buyerData.contactId || '',
          recordId: buyerData.recordId || '',
          firstName: buyerData.firstName || '',
          lastName: buyerData.lastName || '',
          email: buyerData.email || '',
          qualified: buyerData.qualified || false,
          downPayment: buyerData.downPayment,
          monthlyIncome: buyerData.monthlyIncome,
        };

        for (const match of buyerData.matches || []) {
          const deal = transformMatchToDeal(match, buyer);
          if (deal) {
            deals.push(deal);
          }
        }
      }

      // Filter to stale deals (excluding closed/lost), sort by stalest first
      const staleDeals = deals
        .filter(
          (d) =>
            d.isStale &&
            d.status !== 'Closed Deal / Won' &&
            d.status !== 'Not Interested'
        )
        .sort((a, b) => (b.daysSinceActivity || 0) - (a.daysSinceActivity || 0))
        .slice(0, limit);

      console.log('[Deals API] Stale deals found:', staleDeals.length);

      return staleDeals;
    },
    staleTime: 2 * 60 * 1000,
    refetchInterval: 60 * 1000,
    refetchIntervalInBackground: false,
  });
};

/**
 * Fetch upcoming showings (deals in "Showing Scheduled" stage)
 */
export const useUpcomingShowings = (limit: number = 5) => {
  return useQuery({
    queryKey: ['upcoming-showings', limit],
    queryFn: async (): Promise<Deal[]> => {
      console.log('[Deals API] Fetching upcoming showings, limit:', limit);

      // Fetch all buyers with matches
      const response = await fetch(`${MATCHING_API_BASE}?action=aggregated-buyers&limit=100`);

      if (!response.ok) {
        throw new Error('Failed to fetch deals');
      }

      const data = await response.json();
      const buyersWithMatches: BuyerWithMatches[] = data.data || [];

      // Flatten all matches into deals
      const deals: Deal[] = [];

      for (const buyerData of buyersWithMatches) {
        const buyer: BuyerCriteria = {
          contactId: buyerData.contactId || '',
          recordId: buyerData.recordId || '',
          firstName: buyerData.firstName || '',
          lastName: buyerData.lastName || '',
          email: buyerData.email || '',
          qualified: buyerData.qualified || false,
          downPayment: buyerData.downPayment,
          monthlyIncome: buyerData.monthlyIncome,
        };

        for (const match of buyerData.matches || []) {
          const deal = transformMatchToDeal(match, buyer);
          if (deal) {
            deals.push(deal);
          }
        }
      }

      // Filter to "Showing Scheduled" deals
      const showingDeals = deals
        .filter((d) => d.status === 'Showing Scheduled')
        .slice(0, limit);

      console.log('[Deals API] Upcoming showings found:', showingDeals.length);

      return showingDeals;
    },
    staleTime: 2 * 60 * 1000,
    refetchInterval: 60 * 1000,
    refetchIntervalInBackground: false,
  });
};

/**
 * Update deal stage with activity logging and GHL sync
 */
export const useUpdateDealStage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      dealId,
      fromStage,
      toStage,
      contactId,
      propertyAddress,
      opportunityId,
      syncToGhl = true,
      ghlRelationId,
    }: StageChangeRequest): Promise<{ success: boolean; ghlRelationId?: string }> => {
      console.log('[Deals API] Updating deal stage:', { dealId, fromStage, toStage, previousRelationId: ghlRelationId });

      // 1. Update Airtable - use 'Match Stage' field (the deal pipeline stage)
      const updateResponse = await fetch(
        `${AIRTABLE_API_BASE}?action=update-record&table=${encodeURIComponent('Property-Buyer Matches')}&recordId=${dealId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: {
              'Match Stage': toStage,
            },
          }),
        }
      );

      if (!updateResponse.ok) {
        const error = await updateResponse.json().catch(() => ({ error: 'Stage update failed' }));
        throw new Error(error.error || 'Failed to update deal stage');
      }

      // 2. Add activity to track the change
      const getResponse = await fetch(
        `${AIRTABLE_API_BASE}?action=get-record&table=${encodeURIComponent('Property-Buyer Matches')}&recordId=${dealId}`
      );
      if (getResponse.ok) {
        const currentMatch = await getResponse.json();
        let currentActivities: MatchActivity[] = [];
        try {
          currentActivities = currentMatch.record?.fields?.Activities
            ? JSON.parse(currentMatch.record.fields.Activities)
            : [];
        } catch {
          currentActivities = [];
        }

        const newActivity: MatchActivity = {
          id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'stage-change',
          timestamp: new Date().toISOString(),
          details: `Stage changed from "${fromStage}" to "${toStage}"`,
          metadata: { fromStage, toStage },
        };

        await fetch(
          `${AIRTABLE_API_BASE}?action=update-record&table=${encodeURIComponent('Property-Buyer Matches')}&recordId=${dealId}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fields: {
                Activities: JSON.stringify([...currentActivities, newActivity]),
              },
            }),
          }
        );
      }

      // 3. Sync to GHL if enabled
      let newGhlRelationId: string | undefined;

      if (syncToGhl && contactId && propertyAddress) {
        try {
          const { syncMatchStageToGhl } = await import('./ghlAssociationsApi');

          const relationId = await syncMatchStageToGhl({
            stage: toStage,
            contactId,
            propertyAddress,
            opportunityId,
            stageAssociationIds: STAGE_ASSOCIATION_IDS,
            previousRelationId: ghlRelationId, // Now correctly uses the parameter (previous relation ID)
          });

          if (relationId) {
            newGhlRelationId = relationId;
            console.log('[Deals API] GHL relation created:', relationId);

            // Save GHL Relation ID back to Airtable
            console.log('[Deals API] Saving GHL Relation ID to Airtable:', { dealId, relationId });
            const saveResponse = await fetch(
              `${AIRTABLE_API_BASE}?action=update-record&table=${encodeURIComponent('Property-Buyer Matches')}&recordId=${dealId}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  fields: { 'GHL Relation ID': relationId },
                }),
              }
            );
            if (saveResponse.ok) {
              console.log('[Deals API] GHL Relation ID saved to Airtable successfully');
            } else {
              const saveError = await saveResponse.json().catch(() => ({}));
              console.error('[Deals API] Failed to save GHL Relation ID to Airtable:', saveError);
            }
          } else {
            console.warn('[Deals API] No relation ID returned from GHL sync');
          }
        } catch (ghlError) {
          console.error('[Deals API] GHL sync failed:', ghlError);
          // Don't throw - Airtable update succeeded
        }
      }

      // 4. Update GHL Buyer Home Disposition pipeline stage if we have a mapping for this stage
      const ghlPipelineStageId = GHL_BUYER_PIPELINE_STAGE_IDS[toStage];
      if (ghlPipelineStageId && contactId) {
        try {
          console.log('[Deals API] Updating GHL Buyer pipeline stage:', { toStage, ghlPipelineStageId, contactId });

          // Find the buyer's opportunity in the Buyer Home Disposition pipeline
          const searchResponse = await fetch(
            `${GHL_API_BASE}?resource=opportunities&pipeline=${GHL_BUYER_DISPOSITION_PIPELINE_ID}&contactId=${encodeURIComponent(contactId)}`
          );

          if (searchResponse.ok) {
            const data = await searchResponse.json();
            const opportunities = data.opportunities || [];

            if (opportunities.length > 0) {
              const opportunity = opportunities[0];
              console.log('[Deals API] Found buyer opportunity:', opportunity.id);

              // Update the opportunity's pipeline stage
              const updateResponse = await fetch(
                `${GHL_API_BASE}?resource=opportunities&id=${opportunity.id}`,
                {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    pipelineId: 'cThFQOW6nkVKVxbBrDAV',
                    pipelineStageId: ghlPipelineStageId,
                  }),
                }
              );

              if (updateResponse.ok) {
                console.log('[Deals API] GHL Buyer pipeline stage updated successfully');
              } else {
                const error = await updateResponse.json().catch(() => ({}));
                console.error('[Deals API] Failed to update GHL pipeline stage:', error);
              }
            } else {
              console.warn('[Deals API] No buyer opportunity found for contact:', contactId);
            }
          } else {
            console.error('[Deals API] Failed to search for buyer opportunity');
          }
        } catch (pipelineError) {
          console.error('[Deals API] GHL pipeline stage update failed:', pipelineError);
          // Don't throw - Airtable update succeeded
        }
      }

      return { success: true, ghlRelationId: newGhlRelationId };
    },
    onSuccess: (data, variables) => {
      // Update the deal in the cache with the new ghlRelationId AND new stage
      // IMPORTANT: Do NOT invalidate 'deals' query - that would trigger a refetch
      // which returns stale server data and overwrites the ghlRelationId we just set
      queryClient.setQueryData(['deals'], (oldData: Deal[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map(deal =>
          deal.id === variables.dealId
            ? {
                ...deal,
                ghlRelationId: data.ghlRelationId,
                status: variables.toStage, // Also update the stage
              }
            : deal
        );
      });

      // Also update deals-by-stage cache immediately so the modal shows the correct stage
      // when clicking on a card right after dragging it
      queryClient.setQueryData(
        ['deals-by-stage'],
        (oldData: Record<MatchDealStage, Deal[]> | undefined) => {
          if (!oldData) return oldData;

          const { dealId, fromStage, toStage } = variables;
          const newData = { ...oldData };

          // Find and remove the deal from the old stage
          const fromStageDeals = newData[fromStage] || [];
          const dealIndex = fromStageDeals.findIndex(d => d.id === dealId);

          if (dealIndex === -1) return oldData; // Deal not found, don't modify

          // Get the deal and update it
          const deal = fromStageDeals[dealIndex];
          const updatedDeal: Deal = {
            ...deal,
            status: toStage,
            ghlRelationId: data.ghlRelationId,
          };

          // Remove from old stage
          newData[fromStage] = fromStageDeals.filter(d => d.id !== dealId);

          // Add to new stage (maintaining score-based sort order)
          const toStageDeals = [...(newData[toStage] || []), updatedDeal];
          toStageDeals.sort((a, b) => b.score - a.score);
          newData[toStage] = toStageDeals;

          return newData;
        }
      );

      if (data.ghlRelationId) {
        console.log('[Deals API] Updated deal cache with new ghlRelationId:', data.ghlRelationId);
      }

      // Invalidate other queries (but NOT 'deals' or 'deals-by-stage' - we updated them manually above)
      queryClient.invalidateQueries({ queryKey: ['pipeline-stats'] });
      queryClient.invalidateQueries({ queryKey: ['deals-by-buyer'] });
      queryClient.invalidateQueries({ queryKey: ['deals-by-property'] });
      queryClient.invalidateQueries({ queryKey: ['stale-deals'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-showings'] });
      // Also invalidate matching queries
      queryClient.invalidateQueries({ queryKey: ['buyers-with-matches'] });
      queryClient.invalidateQueries({ queryKey: ['properties-with-matches'] });
    },
  });
};
