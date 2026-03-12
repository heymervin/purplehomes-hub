/**
 * Dashboard Data Hook
 * Aggregates data from GHL and Airtable for the Command Center dashboard
 *
 * Real data sources:
 * - GHL: Contacts, Opportunities (Properties), Social Posts
 * - Airtable: Buyers, Properties, Property-Buyer Matches
 */

import { useQuery } from '@tanstack/react-query';
import { useContacts, useOpportunities, useSocialPosts, GHLContact, GHLOpportunity, GHLSocialPost } from '@/services/ghlApi';
import { useBuyersWithMatches, usePropertiesWithMatches } from '@/services/matchingApi';
import { useSyncStore } from '@/store/useSyncStore';

export interface DashboardStats {
  // Properties
  totalProperties: number;
  activeProperties: number;
  pendingProperties: number;
  newPropertiesThisWeek: number;

  // Buyers
  totalBuyers: number;
  activeBuyers: number;
  newBuyersThisWeek: number;

  // Matches
  totalMatches: number;
  pendingMatches: number;
  highScoreMatches: number; // matches with score >= 80

  // Pipeline (from GHL opportunities)
  openOpportunities: number;
  opportunitiesByStage: Record<string, number>;

  // Social (basic counts only - no performance metrics)
  scheduledPosts: number;
  draftPosts: number;

  // System Health
  lastSyncTime: string | null;
  syncSuccessRate: number;
  isConnected: boolean;
}

export interface QuickAction {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: string;
  count?: number;
  variant?: 'default' | 'primary' | 'warning' | 'success';
}

export interface DashboardData {
  stats: DashboardStats;
  quickActions: QuickAction[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

// Helper to check if date is within last 7 days
const isWithinLastWeek = (dateString: string): boolean => {
  const date = new Date(dateString);
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  return date >= weekAgo;
};

// Helper to count contacts by type
const countContactsByType = (contacts: GHLContact[], type: string): number => {
  return contacts.filter(contact =>
    contact.tags?.some(tag => tag.toLowerCase().includes(type.toLowerCase()))
  ).length;
};

// Helper to get stage distribution from opportunities
const getStageDistribution = (opportunities: GHLOpportunity[]): Record<string, number> => {
  return opportunities.reduce((acc, opp) => {
    const stage = opp.pipelineStageId || 'unknown';
    acc[stage] = (acc[stage] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
};

export function useDashboardData(): DashboardData {
  // Fetch GHL data
  const contactsQuery = useContacts({ limit: 10000 });
  const opportunitiesQuery = useOpportunities('seller-acquisition');
  const buyerOpportunitiesQuery = useOpportunities('buyer-acquisition');
  const socialPostsQuery = useSocialPosts();

  // Fetch matching data from Airtable
  const buyersWithMatchesQuery = useBuyersWithMatches(undefined, 100);
  const propertiesWithMatchesQuery = usePropertiesWithMatches(undefined, 100);

  // Get sync store data
  const { getRecentSyncLog, getSuccessRate, connectionFailedSince } = useSyncStore();
  const recentSyncs = getRecentSyncLog(1);
  const lastSync = recentSyncs[0];

  // Combine loading states
  const isLoading =
    contactsQuery.isLoading ||
    opportunitiesQuery.isLoading ||
    buyerOpportunitiesQuery.isLoading ||
    socialPostsQuery.isLoading ||
    buyersWithMatchesQuery.isLoading ||
    propertiesWithMatchesQuery.isLoading;

  // Check for errors
  const isError =
    contactsQuery.isError ||
    opportunitiesQuery.isError ||
    buyerOpportunitiesQuery.isError;

  const error =
    contactsQuery.error ||
    opportunitiesQuery.error ||
    buyerOpportunitiesQuery.error ||
    null;

  // Extract data with defaults
  const contacts = contactsQuery.data?.contacts || [];
  const sellerOpportunities = opportunitiesQuery.data || [];
  const buyerOpportunities = buyerOpportunitiesQuery.data || [];
  const socialPosts = socialPostsQuery.data?.posts || [];
  const buyersWithMatches = buyersWithMatchesQuery.data?.data || [];
  const propertiesWithMatches = propertiesWithMatchesQuery.data?.data || [];

  // Calculate stats
  const stats: DashboardStats = {
    // Properties (from GHL opportunities)
    totalProperties: sellerOpportunities.length,
    activeProperties: sellerOpportunities.filter(o => o.status === 'open').length,
    pendingProperties: sellerOpportunities.filter(o =>
      o.status === 'open' && o.pipelineStageId?.includes('pending')
    ).length,
    newPropertiesThisWeek: sellerOpportunities.filter(o =>
      isWithinLastWeek(o.createdAt)
    ).length,

    // Buyers (from contacts with buyer tag or buyer opportunities)
    totalBuyers: buyersWithMatches.length || countContactsByType(contacts, 'buyer'),
    activeBuyers: buyerOpportunities.filter(o => o.status === 'open').length,
    newBuyersThisWeek: buyerOpportunities.filter(o =>
      isWithinLastWeek(o.createdAt)
    ).length,

    // Matches (from Airtable via matching API)
    totalMatches: buyersWithMatches.reduce((sum, b) => sum + (b.totalMatches || 0), 0),
    pendingMatches: buyersWithMatches.reduce((sum, b) =>
      sum + (b.matches?.filter(m => m.status === 'pending')?.length || 0), 0
    ),
    highScoreMatches: buyersWithMatches.reduce((sum, b) =>
      sum + (b.matches?.filter(m => (m.matchScore || 0) >= 80)?.length || 0), 0
    ),

    // Pipeline
    openOpportunities: [...sellerOpportunities, ...buyerOpportunities]
      .filter(o => o.status === 'open').length,
    opportunitiesByStage: getStageDistribution([...sellerOpportunities, ...buyerOpportunities]),

    // Social (counts only - no performance)
    scheduledPosts: socialPosts.filter((p: GHLSocialPost) => p.status === 'scheduled').length,
    draftPosts: socialPosts.filter((p: GHLSocialPost) => p.status === 'draft').length,

    // System Health
    lastSyncTime: lastSync?.timestamp || null,
    syncSuccessRate: getSuccessRate(),
    isConnected: !connectionFailedSince,
  };

  // Generate quick actions based on current data state
  const quickActions: QuickAction[] = [
    {
      id: 'pending-properties',
      label: 'Pending Properties',
      description: 'Properties waiting for review',
      href: '/properties?status=pending',
      icon: 'Building2',
      count: stats.pendingProperties,
      variant: stats.pendingProperties > 0 ? 'warning' : 'default',
    },
    {
      id: 'new-buyers',
      label: 'New Buyers',
      description: 'Buyers added this week',
      href: '/buyer-management?filter=new',
      icon: 'UserPlus',
      count: stats.newBuyersThisWeek,
      variant: stats.newBuyersThisWeek > 0 ? 'success' : 'default',
    },
    {
      id: 'high-matches',
      label: 'Hot Matches',
      description: 'Matches with 80%+ score',
      href: '/matching?minScore=80',
      icon: 'Target',
      count: stats.highScoreMatches,
      variant: stats.highScoreMatches > 0 ? 'primary' : 'default',
    },
    {
      id: 'scheduled-posts',
      label: 'Scheduled Posts',
      description: 'Posts ready to publish',
      href: '/social?tab=schedule',
      icon: 'Calendar',
      count: stats.scheduledPosts,
      variant: 'default',
    },
  ];

  // Combined refetch function
  const refetch = () => {
    contactsQuery.refetch();
    opportunitiesQuery.refetch();
    buyerOpportunitiesQuery.refetch();
    socialPostsQuery.refetch();
    buyersWithMatchesQuery.refetch();
    propertiesWithMatchesQuery.refetch();
  };

  return {
    stats,
    quickActions,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  };
}

/**
 * Hook for fetching dashboard activity feed
 * Uses sync log and recent GHL data for activity stream
 */
export function useDashboardActivity(limit: number = 10) {
  const { getRecentSyncLog } = useSyncStore();

  return useQuery({
    queryKey: ['dashboard-activity', limit],
    queryFn: () => {
      const syncLogs = getRecentSyncLog(limit);

      // Transform sync logs to activity format
      return syncLogs.map(log => ({
        id: log.id,
        type: log.type as string,
        status: log.status,
        details: `${log.type} sync: ${log.recordsProcessed} records processed`,
        timestamp: log.timestamp,
        recordsProcessed: log.recordsProcessed,
        duration: log.duration,
        error: log.error,
      }));
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}
