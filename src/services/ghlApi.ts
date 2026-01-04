import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Contact, Property, PropertyStatus, PropertyCondition, PropertyType, SyncType } from '@/types';
import { useSyncStore } from '@/store/useSyncStore';

// API Base URL - uses Vercel API routes in production
const API_BASE = '/api/ghl';

// Pipeline IDs
export const SELLER_ACQUISITION_PIPELINE_ID = 'zL3H2M1BdEKlVDa2YWao';
export const BUYER_ACQUISITION_PIPELINE_ID = 'FRw9XPyTSnPv8ct0cWcm';
export const DEAL_ACQUISITION_PIPELINE_ID = '2NeLTlKaeMyWOnLXdTCS';

// For backwards compatibility
export const ACQUISITION_PIPELINE_ID = SELLER_ACQUISITION_PIPELINE_ID;

// Types for GHL API responses
export interface GHLContact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  tags: string[];
  customFields: Array<{ id: string; value: string | number | boolean }>;
  dateAdded: string;
  lastActivity: string;
}

export interface GHLCustomField {
  id: string;
  fieldValue: string | string[] | Record<string, unknown>;
  value?: string | number | boolean;
}

export interface GHLOpportunity {
  id: string;
  name: string;
  status: 'open' | 'won' | 'lost' | 'abandoned';
  pipelineId: string;
  pipelineStageId: string;
  monetaryValue: number;
  contactId: string;
  locationId: string;
  assignedTo?: string;
  source?: string;
  lastStatusChangeAt?: string;
  lastStageChangeAt?: string;
  createdAt: string;
  updatedAt: string;
  customFields: GHLCustomField[];
  contact?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    tags?: string[];
    customFields?: GHLCustomField[];
  };
}

export interface GHLMedia {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  createdAt: string;
}

export interface GHLSocialAccount {
  id: string;
  profileId: string;
  platform: 'facebook' | 'instagram' | 'linkedin' | 'twitter' | 'tiktok' | 'gmb';
  accountName: string;
  name?: string;
  avatar?: string;
  isActive: boolean;
}

export interface GHLSocialPost {
  id: string;
  status: 'draft' | 'scheduled' | 'published' | 'failed' | 'in_progress';
  summary: string;
  media: { url: string; type: string; caption?: string }[];
  accountIds: string[];
  scheduleDate?: string;
  createdAt: string;
}

export interface GHLDocument {
  id: string;
  name: string;
  type: string;
  status: string;
  createdAt: string;
}

export interface GHLMessage {
  id: string;
  type: 'email' | 'sms';
  contactId: string;
  body: string;
  subject?: string;
  status: string;
}

// API Configuration stored in localStorage for now (will use env vars in Vercel)
export const getApiConfig = () => {
  const stored = localStorage.getItem('ghl_config');
  return stored ? JSON.parse(stored) : { apiKey: '', locationId: '' };
};

export const setApiConfig = (config: { apiKey: string; locationId: string }) => {
  localStorage.setItem('ghl_config', JSON.stringify(config));
};

// Generic fetch wrapper with error handling
// Uses consolidated /api/ghl endpoint with resource query param
const fetchGHL = async <T>(
  resource: string,
  options?: RequestInit & { params?: Record<string, string> }
): Promise<T> => {
  const config = getApiConfig();

  // Build query string from resource path and additional params
  const [resourcePath, queryString] = resource.split('?');
  const params = new URLSearchParams(queryString || '');

  // Parse resource path:
  // - 'opportunities/123' -> resource=opportunities, id=123
  // - 'social/accounts' -> resource=social, action=accounts
  // - 'social/posts/123' -> resource=social, action=posts, id=123
  const pathParts = resourcePath.split('/');
  const resourceName = pathParts[0];

  params.set('resource', resourceName);

  // For resources with sub-actions (social/accounts, social/posts, etc.)
  if (pathParts.length >= 2) {
    // Check if second part is a UUID/ID or an action name
    const secondPart = pathParts[1];
    const isId = /^[a-zA-Z0-9]{10,}$/.test(secondPart) || /^[0-9a-f-]{36}$/.test(secondPart);

    if (isId) {
      // Simple resource/id pattern (e.g., opportunities/abc123)
      params.set('id', secondPart);
    } else {
      // Resource/action pattern (e.g., social/accounts, social/posts)
      params.set('action', secondPart);
      // If there's a third part, it's the ID (e.g., social/posts/123)
      if (pathParts[2]) {
        params.set('id', pathParts[2]);
      }
    }
  }

  // Add any additional params
  if (options?.params) {
    Object.entries(options.params).forEach(([key, value]) => {
      params.set(key, value);
    });
  }

  const response = await fetch(`${API_BASE}?${params.toString()}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-GHL-API-Key': config.apiKey,
      'X-GHL-Location-ID': config.locationId,
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'API Error' }));
    throw new Error(error.message || `API Error: ${response.status}`);
  }

  return response.json();
};

// ============ CONTACTS ============

export const useContacts = (params?: {
  query?: string;
  type?: string;
  tags?: string[];
  limit?: number;
  startAfterId?: string;
  startAfter?: string;
}) => {
  return useQuery({
    queryKey: ['ghl-contacts', params],
    queryFn: () => {
      const searchParams = new URLSearchParams();
      
      // Backend will fetch ALL contacts and paginate automatically
      // Just pass the limit (default 10000 to get all contacts)
      searchParams.set('limit', (params?.limit || 10000).toString());
      
      return fetchGHL<{ contacts: GHLContact[]; meta?: { total: number; pages: number } }>(
        `contacts?${searchParams.toString()}`
      );
    },
    staleTime: 0, // Always refetch
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchOnMount: true, // Always refetch on mount
    refetchOnWindowFocus: false, // Don't refetch on window focus to avoid too many requests
    retry: 1, // Only retry once on failure
    retryDelay: 1000, // Wait 1 second before retry
  });
};

export const useContact = (contactId: string) => {
  return useQuery({
    queryKey: ['ghl-contact', contactId],
    queryFn: () => fetchGHL<GHLContact>(`contacts/${contactId}`),
    enabled: !!contactId && !!getApiConfig().apiKey,
  });
};

export const useCreateContact = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (contact: Partial<GHLContact>) =>
      fetchGHL<GHLContact>('contacts', {
        method: 'POST',
        body: JSON.stringify(contact),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ghl-contacts'] });
    },
  });
};

export const useUpdateContact = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, ...contact }: Partial<GHLContact> & { id: string }) =>
      fetchGHL<GHLContact>(`contacts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(contact),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ghl-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['ghl-contact', variables.id] });
    },
  });
};

export const useDeleteContact = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (contactId: string) =>
      fetchGHL<void>(`contacts/${contactId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ghl-contacts'] });
    },
  });
};

// ============ OPPORTUNITIES (Properties) ============

// Custom field mapping for properties
export const PROPERTY_CUSTOM_FIELDS = {
  address: 'property_address',
  city: 'property_city',
  beds: 'property_beds',
  baths: 'property_baths',
  sqft: 'property_sqft',
  condition: 'property_condition',
  propertyType: 'property_type',
  heroImage: 'property_hero_image',
  images: 'property_images',
  description: 'property_description',
  status: 'social_status', // SM-Pending, SM-Posted, etc.
  caption: 'social_caption',
  brandedImage: 'branded_image',
  postedDate: 'posted_date',
  scheduledDate: 'scheduled_date',
  downPayment: '0Wq2qVjwE3Qc5kCvtcAj', // Proposed Down Payment custom field ID
  monthlyPayment: 'U3Ago0WNHeF0jv1lGmi4', // Property Total Price (Monthly Payment) custom field ID
};

// Transform GHL Opportunity to Property
export const transformOpportunityToProperty = (opp: GHLOpportunity): Property => {
  const getCustomField = (fieldKey: string): string => {
    const field = opp.customFields?.find(
      (cf) => cf.id === fieldKey || cf.id.includes(fieldKey)
    );
    return typeof field?.fieldValue === 'string' ? field.fieldValue : '';
  };

  const heroImage = getCustomField(PROPERTY_CUSTOM_FIELDS.heroImage);
  const imagesField = getCustomField(PROPERTY_CUSTOM_FIELDS.images);
  const images = imagesField ? imagesField.split(',').map(url => url.trim()).filter(Boolean) : [];
  
  // Parse status from custom field (SM-Pending, SM-Posted, etc.)
  const socialStatus = getCustomField(PROPERTY_CUSTOM_FIELDS.status);
  let status: PropertyStatus = 'pending';
  if (socialStatus.includes('Posted')) status = 'posted';
  else if (socialStatus.includes('Scheduled')) status = 'scheduled';
  else if (socialStatus.includes('Skipped')) status = 'skipped';
  else if (socialStatus.includes('Deleted')) status = 'deleted';
  else if (socialStatus.includes('Processing')) status = 'processing';

  // Parse down payment and monthly payment as numbers
  const downPaymentStr = getCustomField(PROPERTY_CUSTOM_FIELDS.downPayment);
  const monthlyPaymentStr = getCustomField(PROPERTY_CUSTOM_FIELDS.monthlyPayment);
  const downPayment = downPaymentStr ? parseFloat(downPaymentStr.replace(/[^0-9.]/g, '')) : undefined;
  const monthlyPayment = monthlyPaymentStr ? parseFloat(monthlyPaymentStr.replace(/[^0-9.]/g, '')) : undefined;

  return {
    id: opp.id,
    ghlOpportunityId: opp.id,
    propertyCode: opp.name.split(' ')[0] || opp.id.slice(0, 8),
    address: getCustomField(PROPERTY_CUSTOM_FIELDS.address) || opp.name,
    city: getCustomField(PROPERTY_CUSTOM_FIELDS.city) || '',
    price: opp.monetaryValue || 0,
    beds: parseInt(getCustomField(PROPERTY_CUSTOM_FIELDS.beds)) || 0,
    baths: parseFloat(getCustomField(PROPERTY_CUSTOM_FIELDS.baths)) || 0,
    sqft: parseInt(getCustomField(PROPERTY_CUSTOM_FIELDS.sqft)) || undefined,
    condition: (getCustomField(PROPERTY_CUSTOM_FIELDS.condition) as PropertyCondition) || undefined,
    propertyType: (getCustomField(PROPERTY_CUSTOM_FIELDS.propertyType) as PropertyType) || undefined,
    description: getCustomField(PROPERTY_CUSTOM_FIELDS.description),
    heroImage: heroImage || '/placeholder.svg',
    images: images.length > 0 ? images : [heroImage || '/placeholder.svg'],
    status,
    caption: getCustomField(PROPERTY_CUSTOM_FIELDS.caption),
    brandedImage: getCustomField(PROPERTY_CUSTOM_FIELDS.brandedImage),
    postedDate: getCustomField(PROPERTY_CUSTOM_FIELDS.postedDate),
    scheduledDate: getCustomField(PROPERTY_CUSTOM_FIELDS.scheduledDate),
    downPayment: !isNaN(downPayment as number) ? downPayment : undefined,
    monthlyPayment: !isNaN(monthlyPayment as number) ? monthlyPayment : undefined,
    createdAt: opp.createdAt,
    isDemo: false,
  };
};

export type PipelineType = 'seller-acquisition' | 'buyer-acquisition' | 'deal-acquisition';

export const useOpportunities = (pipelineType: PipelineType = 'seller-acquisition') => {
  return useQuery({
    queryKey: ['ghl-opportunities', pipelineType],
    queryFn: async () => {
      const data = await fetchGHL<{ opportunities: GHLOpportunity[] }>(
        `opportunities?pipelineType=${pipelineType}`
      );
      return data.opportunities;
    },
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchInterval: 2 * 60 * 1000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

export const useUpdateOpportunityStage = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      opportunityId, 
      stageId, 
      pipelineType 
    }: { 
      opportunityId: string; 
      stageId: string; 
      pipelineType: PipelineType;
    }) => {
      return fetchGHL<GHLOpportunity>(`opportunities/${opportunityId}`, {
        method: 'PUT',
        body: JSON.stringify({ pipelineStageId: stageId }),
        params: { action: 'update-stage' }
      });
    },
    // Optimistic update for instant UI feedback
    onMutate: async ({ opportunityId, stageId, pipelineType }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['ghl-opportunities', pipelineType] });
      
      // Snapshot the previous value
      const previousOpportunities = queryClient.getQueryData<GHLOpportunity[]>(['ghl-opportunities', pipelineType]);
      
      // Optimistically update the cache
      if (previousOpportunities) {
        queryClient.setQueryData<GHLOpportunity[]>(
          ['ghl-opportunities', pipelineType],
          previousOpportunities.map(opp => 
            opp.id === opportunityId 
              ? { ...opp, pipelineStageId: stageId, updatedAt: new Date().toISOString() }
              : opp
          )
        );
      }
      
      // Return context for rollback on error
      return { previousOpportunities, pipelineType };
    },
    // Rollback on error
    onError: (err, variables, context) => {
      if (context?.previousOpportunities) {
        queryClient.setQueryData(
          ['ghl-opportunities', context.pipelineType],
          context.previousOpportunities
        );
      }
    },
    // Always refetch after success or error
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ghl-opportunities', variables.pipelineType] });
    },
  });
};

export const useUpdateOpportunityCustomFields = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      opportunityId, 
      customFields,
      pipelineType
    }: { 
      opportunityId: string; 
      customFields: Record<string, any>;
      pipelineType: PipelineType;
    }) => {
      return fetchGHL<GHLOpportunity>(`opportunities/${opportunityId}`, {
        method: 'PUT',
        body: JSON.stringify({ customFields }),
        params: { action: 'update-custom-fields' }
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ghl-opportunities', variables.pipelineType] });
    },
  });
};

export const useProperties = (pipelineId: string = SELLER_ACQUISITION_PIPELINE_ID) => {
  return useQuery({
    queryKey: ['ghl-properties', pipelineId],
    queryFn: async () => {
      const data = await fetchGHL<{ opportunities: GHLOpportunity[] }>(
        `opportunities?pipeline=${pipelineId}`
      );
      return {
        opportunities: data.opportunities,
        properties: data.opportunities.map(transformOpportunityToProperty),
      };
    },
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchInterval: 2 * 60 * 1000,
  });
};

export const useProperty = (opportunityId: string) => {
  return useQuery({
    queryKey: ['ghl-property', opportunityId],
    queryFn: async () => {
      const opp = await fetchGHL<{ opportunity: GHLOpportunity }>(
        `opportunities/${opportunityId}`
      );
      return {
        opportunity: opp.opportunity,
        property: transformOpportunityToProperty(opp.opportunity),
      };
    },
    enabled: !!opportunityId && !!getApiConfig().apiKey,
  });
};

export const useUpdateProperty = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (update: { id: string; customFields?: Record<string, string>; status?: string; monetaryValue?: number }) =>
      fetchGHL<GHLOpportunity>(`opportunities?id=${update.id}`, {
        method: 'PUT',
        body: JSON.stringify(update),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ghl-properties'] });
      queryClient.invalidateQueries({ queryKey: ['ghl-property', variables.id] });
    },
  });
};

export const useSyncProperties = () => {
  const queryClient = useQueryClient();
  const addSyncEntry = useSyncStore((state) => state.addSyncEntry);
  
  return useMutation({
    mutationFn: async () => {
      const startTime = Date.now();
      try {
        const result = await fetchGHL<{ opportunities: GHLOpportunity[]; synced: number }>(
          `opportunities/sync?pipeline=${SELLER_ACQUISITION_PIPELINE_ID}`,
          { method: 'POST' }
        );
        
        // Log successful sync
        addSyncEntry({
          type: 'properties',
          status: 'success',
          recordsProcessed: result.synced || result.opportunities?.length || 0,
          recordsCreated: 0,
          recordsUpdated: result.synced || result.opportunities?.length || 0,
          recordsFailed: 0,
          duration: Date.now() - startTime,
        });
        
        return result;
      } catch (error) {
        // Log failed sync
        addSyncEntry({
          type: 'properties',
          status: 'failed',
          recordsProcessed: 0,
          recordsCreated: 0,
          recordsUpdated: 0,
          recordsFailed: 0,
          duration: Date.now() - startTime,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ghl-properties'] });
    },
  });
};

// ============ MEDIA ============

export const useMedia = (folderId?: string) => {
  return useQuery({
    queryKey: ['ghl-media', folderId],
    queryFn: () => fetchGHL<{ files: GHLMedia[] }>(
      `media${folderId ? `?folderId=${folderId}` : ''}`
    ),
    enabled: !!getApiConfig().apiKey,
    staleTime: 5 * 60 * 1000,
  });
};

export const useUploadMedia = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (upload: { file?: File; fileUrl?: string; name: string }) =>
      fetchGHL<GHLMedia>('media/upload', {
        method: 'POST',
        body: JSON.stringify(upload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ghl-media'] });
    },
  });
};

// ============ SOCIAL PLANNER ============
// Note: Social planner hooks are always enabled since API key is on server side (Vercel env vars)

export const useSocialAccounts = () => {
  return useQuery({
    queryKey: ['ghl-social-accounts'],
    queryFn: () => fetchGHL<{ accounts: GHLSocialAccount[] }>('social/accounts'),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useSocialPosts = (status?: string) => {
  return useQuery({
    queryKey: ['ghl-social-posts', status],
    queryFn: () => fetchGHL<{ posts: GHLSocialPost[] }>(
      `social/posts${status ? `?status=${status}` : ''}`
    ),
    staleTime: 2 * 60 * 1000,
  });
};

export const useCreateSocialPost = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (post: {
      accountIds: string[];
      summary: string;
      media?: { url: string; type?: string; caption?: string }[];
      scheduleDate?: string;
      status?: 'draft' | 'scheduled' | 'published';
      type?: 'post' | 'story' | 'reel';
      followUpComment?: string;
    }) =>
      fetchGHL<GHLSocialPost>('social/posts', {
        method: 'POST',
        body: JSON.stringify(post),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ghl-social-posts'] });
    },
  });
};

export const useUpdateSocialPost = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, ...post }: Partial<GHLSocialPost> & { id: string }) =>
      fetchGHL<GHLSocialPost>(`social/posts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(post),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ghl-social-posts'] });
    },
  });
};

export const useDeleteSocialPost = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (postId: string) =>
      fetchGHL<void>(`social/posts/${postId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ghl-social-posts'] });
    },
  });
};

// ============ SOCIAL MEDIA STATISTICS ============
// Based on GHL API: POST /social-media-posting/{locationId}/statistics
// Docs: https://marketplace.gohighlevel.com/docs/ghl/social-planner/get-social-media-statistics

// Platform-specific metrics from GHL
export interface GHLPlatformMetrics {
  posts: number;
  postsChange: number; // % change vs previous period
  likes: number;
  likesChange: number;
  comments: number;
  commentsChange: number;
  followers: number;
  followersChange: number;
  impressions: number;
  impressionsChange: number;
  reach: number;
  reachChange: number;
  engagement: number;
  engagementChange: number;
}

// Top performing post
export interface GHLTopPost {
  id: string;
  accountId: string;
  platform: string;
  summary: string;
  media?: { url: string; type: string }[];
  publishedAt: string;
  likes: number;
  comments: number;
  shares: number;
  impressions: number;
  reach: number;
}

// Full statistics response from GHL
export interface GHLStatisticsResponse {
  // Aggregated KPIs
  kpis: {
    posts: { value: number; change: number };
    likes: { value: number; change: number };
    comments: { value: number; change: number };
    followers: { value: number; change: number };
    impressions: { value: number; change: number };
    reach: { value: number; change: number };
    engagement: { value: number; change: number };
  };
  // Per-platform breakdown
  platformBreakdown: {
    facebook?: GHLPlatformMetrics;
    instagram?: GHLPlatformMetrics;
    linkedin?: GHLPlatformMetrics;
    twitter?: GHLPlatformMetrics;
    tiktok?: GHLPlatformMetrics;
    gmb?: GHLPlatformMetrics;
    youtube?: GHLPlatformMetrics;
    pinterest?: GHLPlatformMetrics;
    threads?: GHLPlatformMetrics;
  };
  // Weekly performance data for charts
  weeklyData?: {
    date: string;
    posts: number;
    engagement: number;
    impressions: number;
  }[];
  // Top performing posts sorted by likes
  topPosts: GHLTopPost[];
  // Demographics (Instagram only, 100+ followers required)
  demographics?: {
    gender?: { male: number; female: number; other: number };
    ageGroups?: { range: string; percentage: number }[];
  };
}

// Request parameters for statistics
export interface GHLStatisticsRequest {
  accountIds: string[];
  fromDate?: string; // ISO date string
  toDate?: string;   // ISO date string
}

// Legacy interface for backwards compatibility
export interface GHLSocialStats {
  totalPosts: number;
  totalEngagement: number;
  totalImpressions: number;
  totalReach: number;
  totalClicks: number;
  platformBreakdown: {
    facebook?: { posts: number; engagement: number; impressions: number; reach: number };
    instagram?: { posts: number; engagement: number; impressions: number; reach: number };
    linkedin?: { posts: number; engagement: number; impressions: number; reach: number };
    twitter?: { posts: number; engagement: number; impressions: number; reach: number };
    tiktok?: { posts: number; engagement: number; impressions: number; reach: number };
    gmb?: { posts: number; engagement: number; impressions: number; reach: number };
  };
}

export interface GHLPostStats {
  id: string;
  summary: string;
  media?: { url: string; type: string }[];
  platforms: string[];
  status: string;
  publishedAt?: string;
  stats: {
    impressions: number;
    reach: number;
    engagement: number;
    likes: number;
    comments: number;
    shares: number;
    clicks: number;
  };
}

/**
 * Fetch social media statistics for selected accounts
 * Uses POST /social-media-posting/{locationId}/statistics
 * @param accountIds - Array of account IDs to get stats for (max 100)
 * @param fromDate - Start date (ISO string)
 * @param toDate - End date (ISO string)
 */
export const useSocialStatistics = (
  accountIds: string[],
  fromDate?: string,
  toDate?: string
) => {
  return useQuery({
    queryKey: ['ghl-social-statistics', accountIds, fromDate, toDate],
    queryFn: async () => {
      const response = await fetch('/api/ghl?resource=social&action=statistics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountIds,
          fromDate,
          toDate,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch statistics');
      }

      return response.json() as Promise<GHLStatisticsResponse>;
    },
    enabled: accountIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Legacy hook - kept for backwards compatibility
 * @deprecated Use useSocialStatistics instead
 */
export const useSocialStats = (
  dateRange: 'last7' | 'last30' | 'last90' | 'custom' = 'last30',
  startDate?: string,
  endDate?: string
) => {
  return useQuery({
    queryKey: ['ghl-social-stats', dateRange, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('dateRange', dateRange);
      if (dateRange === 'custom' && startDate && endDate) {
        params.set('startDate', startDate);
        params.set('endDate', endDate);
      }
      return fetchGHL<{ stats: GHLSocialStats }>(`social/stats?${params.toString()}`);
    },
    enabled: false, // Disabled - use useSocialStatistics instead
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Get statistics for individual posts
 * @param status - Filter by post status
 * @param limit - Number of posts to fetch
 */
export const useSocialPostStats = (status?: 'published' | 'scheduled', limit: number = 20) => {
  return useQuery({
    queryKey: ['ghl-social-post-stats', status, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      params.set('limit', limit.toString());
      return fetchGHL<{ posts: GHLPostStats[] }>(`social/posts/stats?${params.toString()}`);
    },
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Get scheduled posts from GHL Social Planner
 * Fetches posts with status 'scheduled' sorted by schedule date
 */
export const useScheduledPosts = () => {
  return useQuery({
    queryKey: ['ghl-scheduled-posts'],
    queryFn: () => fetchGHL<{ posts: GHLSocialPost[] }>('social/posts?status=scheduled'),
    staleTime: 2 * 60 * 1000,
  });
};

// ============ CUSTOM FIELDS ============

export const useCustomFields = (model: 'contact' | 'opportunity' | 'all' = 'opportunity') => {
  return useQuery({
    queryKey: ['ghl-custom-fields', model],
    queryFn: () => fetchGHL<{ customFields: { id: string; name: string; fieldKey: string; dataType: string }[] }>(
      `custom-fields?model=${model}`
    ),
    staleTime: 30 * 60 * 1000, // 30 minutes - these rarely change
    retry: 2,
  });
};

// ============ TAGS ============

export interface GHLTag {
  id: string;
  name: string;
  locationId: string;
}

export const useTags = () => {
  return useQuery({
    queryKey: ['ghl-tags'],
    queryFn: () => fetchGHL<{ tags: GHLTag[] }>('tags'),
    staleTime: 10 * 60 * 1000, // Tags don't change often
  });
};

export const useUpdateContactTags = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ contactId, tags }: { contactId: string; tags: string[] }) =>
      fetchGHL<{ contact: GHLContact }>(`contacts/${contactId}`, {
        method: 'PUT',
        body: JSON.stringify({ tags }),
      }),
    // Optimistic update for faster UI
    onMutate: async ({ contactId, tags }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['ghl-contacts'] });
      await queryClient.cancelQueries({ queryKey: ['ghl-opportunities'] });
      
      // Snapshot for rollback
      const previousContacts = queryClient.getQueryData(['ghl-contacts']);
      const previousOpportunities = queryClient.getQueryData(['ghl-opportunities', 'buyer-acquisition']);
      
      // Optimistically update contacts cache
      queryClient.setQueryData<{ contacts: GHLContact[] } | undefined>(
        ['ghl-contacts'],
        (old) => {
          if (!old?.contacts) return old;
          return {
            ...old,
            contacts: old.contacts.map(contact =>
              contact.id === contactId ? { ...contact, tags } : contact
            )
          };
        }
      );
      
      return { previousContacts, previousOpportunities, contactId, tags };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousContacts) {
        queryClient.setQueryData(['ghl-contacts'], context.previousContacts);
      }
      if (context?.previousOpportunities) {
        queryClient.setQueryData(['ghl-opportunities', 'buyer-acquisition'], context.previousOpportunities);
      }
    },
    onSettled: () => {
      // Refetch to ensure consistency (but UI already updated)
      queryClient.invalidateQueries({ queryKey: ['ghl-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['ghl-opportunities'] });
    },
  });
};

// ============ DOCUMENTS ============

export interface GHLDocumentTemplate {
  id: string;
  name: string;
  type: string;
  description?: string;
  createdAt: string;
}

export interface GHLDocumentContract {
  id: string;
  name: string;
  templateId?: string;
  contactId: string;
  status: 'draft' | 'sent' | 'viewed' | 'signed' | 'expired' | 'declined';
  createdAt: string;
  sentAt?: string;
  viewedAt?: string;
  signedAt?: string;
  declinedAt?: string;
  customValues?: Record<string, string>;
}

export const useDocumentTemplates = () => {
  return useQuery({
    queryKey: ['ghl-document-templates'],
    queryFn: () => fetchGHL<{ templates: GHLDocumentTemplate[]; total: number }>('documents?action=templates'),
    staleTime: 10 * 60 * 1000, // Templates don't change often
    retry: 2,
  });
};

export const useDocuments = (contactId?: string) => {
  return useQuery({
    queryKey: ['ghl-documents', contactId],
    queryFn: () => {
      const params = new URLSearchParams({ action: 'contracts' });
      if (contactId) params.set('contactId', contactId);
      return fetchGHL<{ documents: GHLDocumentContract[]; total: number }>(`documents?${params.toString()}`);
    },
    staleTime: 2 * 60 * 1000,
    retry: 2,
  });
};

export const useSendTemplate = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ templateId, contactIds, customValues }: {
      templateId: string;
      contactIds: string[];
      customValues?: Record<string, string>;
    }) =>
      fetchGHL<{ success: boolean; documentIds: string[] }>(`documents?action=templates&id=${templateId}`, {
        method: 'POST',
        body: JSON.stringify({ contactIds, customValues }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ghl-documents'] });
    },
  });
};

export const useCreateDocument = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (document: {
      name: string;
      templateId?: string;
      contactId: string;
      customValues?: Record<string, string>;
    }) =>
      fetchGHL<GHLDocumentContract>('documents', {
        method: 'POST',
        body: JSON.stringify(document),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ghl-documents'] });
    },
  });
};

export const useSendDocument = () => {
  return useMutation({
    mutationFn: ({ documentId, contactId }: { documentId: string; contactId: string }) =>
      fetchGHL<{ success: boolean }>(`documents/${documentId}/send`, {
        method: 'POST',
        body: JSON.stringify({ contactId }),
      }),
  });
};

// ============ MESSAGES ============

export const useSendEmail = () => {
  return useMutation({
    mutationFn: (email: {
      contactIds: string[];
      subject: string;
      body: string;
      customFields?: Record<string, string>;
    }) =>
      fetchGHL<{ success: boolean; messageIds: string[] }>('messages/email', {
        method: 'POST',
        body: JSON.stringify(email),
      }),
  });
};

export const useSendSMS = () => {
  return useMutation({
    mutationFn: (sms: {
      contactIds: string[];
      body: string;
      customFields?: Record<string, string>;
    }) =>
      fetchGHL<{ success: boolean; messageIds: string[] }>('messages/sms', {
        method: 'POST',
        body: JSON.stringify(sms),
      }),
  });
};

// ============ CONNECTION TEST ============

export const useTestConnection = () => {
  return useMutation({
    mutationFn: async () => {
      // Test connection by fetching a single contact from backend
      // Backend has credentials in Vercel env vars
      const response = await fetch(`${API_BASE}?resource=contacts&limit=1`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Connection failed' }));
        throw new Error(error.message || 'Connection failed - check your API credentials in Vercel');
      }

      return { success: true };
    },
  });
};

// ============ SYNC UTILITIES ============

export const useSyncContacts = () => {
  const queryClient = useQueryClient();
  const addSyncEntry = useSyncStore((state) => state.addSyncEntry);
  
  return useMutation({
    mutationFn: async () => {
      const startTime = Date.now();
      try {
        const result = await fetchGHL<{ contacts: GHLContact[]; synced: number }>('contacts/sync', {
          method: 'POST',
        });
        
        // Log successful sync
        addSyncEntry({
          type: 'contacts',
          status: 'success',
          recordsProcessed: result.synced || result.contacts?.length || 0,
          recordsCreated: 0,
          recordsUpdated: result.synced || result.contacts?.length || 0,
          recordsFailed: 0,
          duration: Date.now() - startTime,
        });
        
        return result;
      } catch (error) {
        // Log failed sync
        addSyncEntry({
          type: 'contacts',
          status: 'failed',
          recordsProcessed: 0,
          recordsCreated: 0,
          recordsUpdated: 0,
          recordsFailed: 0,
          duration: Date.now() - startTime,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ghl-contacts'] });
    },
  });
};

// ==================== FORMS ====================
export const useSubmitForm = () => {
  return useMutation({
    mutationFn: async ({ formId, data }: { formId: string; data: Record<string, any> }) => {
      const response = await fetch(`${API_BASE}?resource=forms&action=submit&id=${formId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to submit form");
      }
      
      return response.json();
    },
  });
};