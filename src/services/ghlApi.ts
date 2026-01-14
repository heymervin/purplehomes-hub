import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Contact, Property, PropertyStatus, PropertyCondition, PropertyType, SyncType } from '@/types';
import { useSyncStore } from '@/store/useSyncStore';

// API Base URL - uses Vercel API routes in production
const API_BASE = '/api/ghl';

// Pipeline IDs
export const SELLER_ACQUISITION_PIPELINE_ID = 'zL3H2M1BdEKlVDa2YWao';
export const BUYER_DISPOSITION_PIPELINE_ID = 'cThFQOW6nkVKVxbBrDAV';
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
  type?: 'string' | 'number' | 'array';
  // Different value properties based on type
  fieldValue?: string | string[] | Record<string, unknown>; // Legacy format
  fieldValueString?: string;
  fieldValueNumber?: number;
  fieldValueArray?: string[];
  fieldValueFiles?: Array<{ url: string; meta?: { name: string } }>;
  value?: string | number | boolean;
}

// Custom field DEFINITION (from /locations/{locationId}/customFields endpoint)
export interface GHLCustomFieldDefinition {
  id: string;
  name: string;
  fieldKey: string;
  dataType: string;
  placeholder?: string;
  position?: number;
  parentId?: string | null;
  isFolder?: boolean;
  model?: 'contact' | 'opportunity' | 'all';
  picklistOptions?: string[];  // GHL returns options as picklistOptions
  acceptedFormat?: string[];   // For file fields
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

// Custom field mapping for properties - using actual GHL field IDs
// Verified against GHL API: GET /locations/{locationId}/customFields?model=opportunity
export const PROPERTY_CUSTOM_FIELDS = {
  // Basic Property Info
  address: 'UcJ0Qoz3kh0OjC9oLVsK', // Property Address (Opportunity) - key: opportunity.property_address
  city: 'JiQiZk4AwSIuggxs8ryC', // Property City - key: opportunity.property_city
  state: '5v7Lz6YVwPXfKKRrEhcq', // Property State - key: opportunity.property_state
  zip: '6dHv2RhysNKnjerkXOpi', // Property Postal Code - key: opportunity.property_postal_code

  // Property Details
  beds: 'gwSOmjOAkDtWKEML03jO', // Bedroom Count - key: opportunity.bedroom_count
  baths: 'EeLEubHNtP21UHJz84qu', // Bathroom Count - key: opportunity.bathroom_count
  sqft: '4LcuNhgER6BrC3q9GYAx', // Square Feet - key: opportunity.square_feet
  yearBuilt: 'WHDOMRbZsWosOFk6fG2O', // Year Built - key: opportunity.year_built
  propertyType: 'Wd8WqrU2seSslsJUgYk3', // Property Type - key: opportunity.property_type
  // Options: Single Family, Duplex, Multi Family, Condo, Lot, Mobile Home, Town House, Commercial, Triplex, 4-plex

  // Condition
  condition: 'RnUjzlqP8BGnxQod0IBm', // Current Condition - key: opportunity.current_condition
  // Options: Excellent, Great, Good, Fair, Poor, Terrible, Needs some Repair
  flooring: 'BA5GG9PSzxxNFLTrTtCj', // Flooring - key: opportunity.flooring
  // Options: Needs Replaced, Good Condition

  // Pricing
  downPayment: '0Wq2qVjwE3Qc5kCvtcAj', // Proposed Down Payment - key: opportunity.proposed_down_payment
  monthlyPayment: 'AyQTFKzBOB3TAyg4KRyz', // Proposed Monthly Payment - key: opportunity.proposed_monthly_payment

  // Images & Media
  heroImage: 'iONNOHIkBVMVtVhMXxuX', // Hero Image Upload - key: opportunity.hero_image_upload
  brandedImage: 'geQG41J7EvnOipSVEVtU', // Imejis Branded Image - key: opportunity.imejis_branded_image

  // Social Media
  caption: 'L0rI3GED8RVqEVFebMIr', // AI Generated Caption - key: opportunity.ai_generated_caption
  socialPostUrls: '9AnMRf8e0O1rqpzZQW7L', // Social Post URLs - key: opportunity.social_post_urls
  postedDate: 'p6a36PhyDK1b3ywpg233', // Posted Date - key: opportunity.posted_date
  scheduledDate: 'fZqdPu5zMXMA2vhVvCsX', // Scheduled Date - key: opportunity.scheduled_date
  socialMediaDescription: 'ECPANbtNrVtw1pR1kgMy', // Marketing Description - used for AI Context in Social Hub

  // Other
  description: 'RW7UIpGEN8hwYbhGs9je', // Property Details - key: opportunity.details
  motivation: 'mSoNEbNp3kct8FfL318J', // Motivation - key: opportunity.motivation
  source: 'kPUeWhwTKlhqnME9Wsuu', // Property Sources - key: opportunity.property_sources
  // Options: Zillow, Inventory, Acquisitions

  // NOTE: 'social_status' with SM-Pending/SM-Posted options was NOT found in GHL custom fields
  // This may need to be created or handled differently
  status: 'social_status', // PLACEHOLDER - field not found in GHL
};

// ============ ALL GHL OPPORTUNITY CUSTOM FIELDS ============
// Complete reference of all opportunity custom fields from GHL API
// GET /locations/{locationId}/customFields?model=opportunity
// Use these IDs when you need to access fields not in PROPERTY_CUSTOM_FIELDS
export const GHL_OPPORTUNITY_FIELDS = {
  // Basic Property Info
  property_address: 'UcJ0Qoz3kh0OjC9oLVsK', // Property Address (Opportunity) | TEXT
  property_address_2: 'JjMu3PW2nJ1aBQ8mUx1m', // Property Address 2 (Opportunity) | TEXT
  property_address_3: 'okmAohDcfmLBWFWUTdUd', // Property Address 3 (Opportunity) | TEXT
  property_city: 'JiQiZk4AwSIuggxs8ryC', // Property City | TEXT
  property_state: '5v7Lz6YVwPXfKKRrEhcq', // Property State | TEXT
  property_postal_code: '6dHv2RhysNKnjerkXOpi', // Property Postal Code | TEXT
  city: 'QuJcUOgmiTF4nWmE2eEW', // City | TEXT
  address: 'j1vPw8ceSCPmPmwpPTEJ', // Address Op | TEXT

  // Property Details
  bedroom_count: 'gwSOmjOAkDtWKEML03jO', // Bedroom Count | NUMERICAL
  bathroom_count: 'EeLEubHNtP21UHJz84qu', // Bathroom Count | NUMERICAL
  square_feet: '4LcuNhgER6BrC3q9GYAx', // Square Feet | NUMERICAL
  year_built: 'WHDOMRbZsWosOFk6fG2O', // Year Built | NUMERICAL
  years_owned: 'NVeu63h30yP8pf9theUD', // Years Owned | NUMERICAL
  property_type: 'Wd8WqrU2seSslsJUgYk3', // Property Type | SINGLE_OPTIONS
  // Options: Single Family, Duplex, Multi Family, Condo, Lot, Mobile Home, Town House, Commercial, Triplex, 4-plex
  number_of_beds: 'd3oMyS5Ut30FicEXpEOQ', // No. of Beds | SINGLE_OPTIONS
  number_of_baths: 'JBH68E5QnKXPRpgWvYDD', // No. of Baths | SINGLE_OPTIONS
  parking: 'RjrLjdCJfA2OrpBwbFsN', // Parking | TEXT

  // Condition
  current_condition: 'RnUjzlqP8BGnxQod0IBm', // Current Condition | SINGLE_OPTIONS
  // Options: Excellent, Great, Good, Fair, Poor, Terrible, Needs some Repair
  flooring: 'BA5GG9PSzxxNFLTrTtCj', // Flooring | SINGLE_OPTIONS
  // Options: Needs Replaced, Good Condition
  electrical: 'HD7YsjhxAGJKjTStJnGp', // Electrical | SINGLE_OPTIONS
  // Options: Needs to be Replaced, Needs New Box Only, Good Condition
  plumbing: 'vrpWW15UkgfJWfvOEXEs', // Plumbing | MULTIPLE_OPTIONS
  foundation_type: 'sOy73xCl04SabLiNITGI', // Foundation Type | SINGLE_OPTIONS
  siding: '62lxMeUIOITXM0trySQG', // Siding | MULTIPLE_OPTIONS
  // Options: Vinyl, Brick, Stucco, Aluminum, Hardie Board, Good Condition, Needs to be Replaced
  siding_notes: 'j7Hya5XEgkJlxYLdRnTA', // Siding Notes | LARGE_TEXT
  windows: 'NjPsvKevyrn7bIWVBkWJ', // Windows | SINGLE_OPTIONS
  // Options: Aluminum, Vinyl, Wood
  window_age: 'Xow9Hvqhli49ClH8yqsO', // Window Age | SINGLE_OPTIONS

  // Age/Updates
  roof_age: 'F4rDP6UnHasOcvoMz0hi', // Roof Age | SINGLE_OPTIONS
  // Options: Less than 5, 5 to 10, 10 to 15, 15 to 20, 20+
  hot_water_tank_age: 'Gi7RpHI2z6bpdlQba7Vz', // Hot Water Tank Age | SINGLE_OPTIONS
  air_conditioning: '8G608snFsviBhqmzZSTo', // Air Conditioning | MULTIPLE_OPTIONS
  // Options: NO A/C, 0-5 yrs, 5-10 yrs, 10-15 yrs, 15-20 yrs, Needs to be Replaced
  last_time_kitchen_was_updated: 'KxfuV5ECP3IGiCIHc6JE', // Last time Kitchen was updated | SINGLE_OPTIONS
  last_time_bathrooms_were_updated: 'uWmtUXmqvjP9YbkxqQFS', // Last time bathrooms were updated | SINGLE_OPTIONS

  // Kitchen/Bathroom Notes
  kitchen_notes: 'Ft1r4XLswbAY0daLpZqO', // Kitchen Notes | LARGE_TEXT
  bathroom_notes: '940Hxv1DjXm9Np7vNhj1', // Bathroom Notes | LARGE_TEXT

  // Structural
  any_structural_issues_known: 'i6XCcCwMrEkbWdOLhly6', // Any Structural Issues Known? | TEXTBOX_LIST
  any_structural_issues_known_use: 'MBJ0ruuRQN5H3RjbC0w0', // Any Structural Issues Known? Use | RADIO
  any_structural_issues_known_details: 'EZ0P3gRPx0e69ClpZDmH', // Any Structural Issues Known? Details | LARGE_TEXT
  city_sewer_or_septic: '4K9lZdb8WBl2FSrq9I2R', // City Sewer or Septic? | SINGLE_OPTIONS
  // Options: City Sewer, Septic

  // Pricing & Financials
  proposed_down_payment: '0Wq2qVjwE3Qc5kCvtcAj', // Proposed Down Payment | MONETORY
  proposed_monthly_payment: 'AyQTFKzBOB3TAyg4KRyz', // Proposed Monthly Payment | MONETORY
  property_total_price: 'U3Ago0WNHeF0jv1lGmi4', // Property Total Price | MONETORY
  asking_price: 'FzXX5DwZoKsDGtL1VPXM', // Asking Price | TEXT
  after_repair_value: 'ObJfXzV1HIenuoOEHTnF', // After Repair Value | TEXT
  repair_costs: 'GHu2gR9AJ9X2Q4fx1cR3', // Repair Costs | MONETORY
  purchase_price: '8acbcZY3UlF5ruRViguZ', // Purchase Price | NUMERICAL
  target_sales_price: 'MkvThDMXmtMlzwDluPZC', // Target Sales Price | TEXT
  mao_max_allowable_offer: 'GW5FDNZ2H5wL5GXnOTog', // MAO (Max Allowable Offer) | TEXT

  // Wrap/Buyer Pricing
  wrap_price: 'ZE7us9k5BvHds8khLYlY', // Wrap Price | NUMERICAL
  wrap_price_2: 'pkAPZXIKrN14E82d2e0W', // Wrap Price 2 | NUMERICAL
  wrap_price_3: 'hKhK7NBVf7mIFDOQFmgN', // Wrap Price 3 | NUMERICAL
  buyer_down_payment: 'Lk6We3vWZfAsVFfNzaQO', // Buyer Down Payment | NUMERICAL
  buyer_down_payment_2: 'IZM6VmAgUq7BsATZJSTv', // Buyer Down Payment 2 | NUMERICAL
  buyer_down_payment_3: 'Tk6XZaKX4fRXn5VU8R6i', // Buyer Down Payment 3 | NUMERICAL
  buyer_piti: 'ewarJjL2jbBKp5Gz8lLd', // Buyer PITI | NUMERICAL
  buyer_piti_2: '3XyQWk5krFtZMMbjsbEY', // Buyer PITI 2 | NUMERICAL
  buyer_piti_3: '9bpw2gNt62ETJueiICpT', // Buyer PITI 3 | NUMERICAL

  // Loan Details
  mortgage_amount: 'wuwYChZbgCdeirPKJlyx', // Current Mortgage Balance | NUMERICAL
  original_loan_amount: 'GzD5zWcTQpDK8S7sohv0', // Original Loan Amount | MONETORY
  interest_rate: 'pUZJvTUx1Hwo46G01k28', // Interest Rate | TEXT
  origination_date: 'g20XruUZdhEFZXt0TAIK', // Origination Date | TEXT
  property_paid_off: 'k14Nu8f50dXIXQPxBkdi', // Property Paid Off | SINGLE_OPTIONS
  misc_loan_details: 'vDag6WlSjvbA778LDIjM', // Misc. Loan Details | LARGE_TEXT

  // Monthly Payment
  monthly_payment: 'anLPdB2AIIrDeueAu2PG', // Monthly Payment | TEXTBOX_LIST

  // Images & Media
  hero_image_upload: 'iONNOHIkBVMVtVhMXxuX', // Hero Image Upload | FILE_UPLOAD
  supporting_image_1_upload: 'dvLGQfCoVA5pdY7ztS8Z', // Supporting Image 1 Upload | FILE_UPLOAD
  supporting_image_2_upload: 'Lp1n2nM81uC4RYJFFUvn', // Supporting Image 2 Upload | FILE_UPLOAD
  supporting_image_3_upload: '8BFDPxTf9VCkvp0akEAP', // Supporting Image 3 Upload | FILE_UPLOAD
  supporting_image_4_upload: 'Z6FpsafFeasyLVNQxMdU', // Supporting Image 4 Upload | FILE_UPLOAD
  supporting_image_5_upload: 'ZXG5L2ASxbsgYfe63Hcl', // Supporting Image 5 Upload | FILE_UPLOAD
  supporting_image_6_upload: 'cO5le1Tf4SZOFkdSZtcz', // Supporting Image 6 Upload | FILE_UPLOAD
  supporting_image_7_upload: '5WDO0C6Osu4pzxDXi3jb', // Supporting Image 7 Upload | FILE_UPLOAD
  supporting_image_8_upload: 'sQJs76qije9Qx17DiuLZ', // Supporting Image 8 Upload | FILE_UPLOAD
  supporting_image_9_upload: 'EhjTfzJn4YykPDebDyJa', // Supporting Image 9 Upload | FILE_UPLOAD
  supporting_image_10_upload: 'O04rK4lhfQgmBy0h4hGz', // Supporting Image 10 Upload | FILE_UPLOAD
  images_25_upload: 'bBZ3D33AlWgS2mvZNvN4', // 25 images upload file | FILE_UPLOAD
  imejis_branded_image: 'geQG41J7EvnOipSVEVtU', // Imejis Branded Image | LARGE_TEXT
  comps: 'wATDx1OMs0y7Nnuz9Ve6', // Comps | FILE_UPLOAD
  google_drive_link: 'Z6NRjPrxWKeFGMYTJr8k', // Google Drive Link | TEXT

  // Social Media
  ai_generated_caption: 'L0rI3GED8RVqEVFebMIr', // AI Generated Caption | LARGE_TEXT
  social_post_urls: '9AnMRf8e0O1rqpzZQW7L', // Social Post URLs | LARGE_TEXT
  posted_date: 'p6a36PhyDK1b3ywpg233', // Posted Date | DATE
  scheduled_date: 'fZqdPu5zMXMA2vhVvCsX', // Scheduled Date | DATE

  // Property Details/Notes
  details: 'RW7UIpGEN8hwYbhGs9je', // Property Details | LARGE_TEXT
  motivation: 'mSoNEbNp3kct8FfL318J', // Motivation | LARGE_TEXT
  misc_notes: 'RmEz1gSPdmmvmksLYLeT', // Misc Notes | LARGE_TEXT
  property_notes: 'wAnKlytGK8s8dmL1vBkV', // Property Notes | LARGE_TEXT
  property_notes_2: 'xlxdsohzyWSuW3JKfUUj', // Property Notes 2 | LARGE_TEXT
  property_notes_3: 'CWedwX8Dd3elSNjcZduW', // Property Notes 3 | LARGE_TEXT
  past_property_notes: 'trpxyf3iuCYdMbz7i7Lx', // Past Property Notes | LARGE_TEXT
  comparable_notes: 'oauWVZcjiDlwtIKw5DDR', // Comparable Notes | LARGE_TEXT
  home_criteria_notes: 'BMavNSJGYoF1ofgFCNFU', // Home Criteria Notes | LARGE_TEXT

  // Source/Lead Info
  property_sources: 'kPUeWhwTKlhqnME9Wsuu', // Property Sources | SINGLE_OPTIONS
  // Options: Zillow, Inventory, Acquisitions
  property_source: 'Nq1y04v39saE6N59TMS3', // Property Source | TEXT
  property_source_2: 'Iz3Vi38deTIeJtBXMuu7', // Property Source 2 | TEXT
  property_source_3: 'nZvXdDjOQmxxEQGsfVre', // Property Source 3 | TEXT
  lead_source: '8ggOrNU2CEQy6GGzsSY8', // Lead Source Op | SINGLE_OPTIONS
  lead_temperature: 'KViJJcWuC2jhza0yGVe7', // Lead Temperature | RADIO
  // Options: Hot Lead, Warm Lead, Cold Lead
  lead_type: 'fRor2SoJJtTNgiTbXpUS', // Lead Type Op | SINGLE_OPTIONS
  keywords: 'ClKQmayueglgyKCocHFB', // Keywords | TEXT

  // Contact/Buyer Info
  contact_name: 'EM4Cb9d3DcwXfQh2UW8w', // Contact Name Op | TEXT
  buyer_type: 'GlZvGsqDZ8Fe74191Jyg', // Buyer Type Op | SINGLE_OPTIONS
  // Options: Home Buyer - Seller Financing, Investor - Cash Buyer, Investor Creative Financing, Unknown / Not Yet Qualified
  employer: '99NwKgWQ1lz5jphBfeHF', // Employer | TEXT
  job_description: 'NMzFs6XshXxAHVvMTJWs', // Job Description | TEXT
  marital_status: 'eLKAH9n2QYPP4PdUNN9L', // Marital Status | SINGLE_OPTIONS
  // Options: Single, Married
  do_you_have_children: 'ply4JTbOo6MrLnpzxLI5', // Do you have children? If so, how many? | TEXT
  monthly_income: 'ryZMLXfbAVcBSdTxBvU0', // Monthly Income | TEXT
  monthly_liabilities: 'Q9BpfS1RMIKP6KymlrGB', // Monthly Liabilities | TEXT
  monthly_liability_breakdown: 'OtE5WoPm3LFA8TQ71qFF', // Monthly Liability Breakdown | TEXT
  down_payment: 'RsonBtVCorhBi4ehUeAY', // Down Payment | TEXT
  credit_score: 'EzG6CII7TGNOmPlmTgvS', // Credit Score | NUMERICAL
  dti: 'fvrsvOhBnO0q8TnHkAMv', // DTI % | NUMERICAL
  proof_of_income_provided: 'SYmSHf220ZeDQO1A9p4e', // Proof of Income Provided | RADIO

  // Occupancy/Tenant
  occupant_status: 'CaxEnbsqMzTZqsesAGN4', // Occupant Status | SINGLE_OPTIONS
  // Options: Yes - Owner Occupied, Yes - Tenant Occupied, No - Vacant, Vacant, N/A
  tenant_rent_info: 'XBATY4NMcbvGPoOotWmz', // Tenant Rent & Info | LARGE_TEXT

  // Marketing
  marketing_description: 'ECPANbtNrVtw1pR1kgMy', // Marketing Description | LARGE_TEXT
  exit_strategy: '8UHZ7ecv9eibOirSWgYn', // Exit Strategy | SINGLE_OPTIONS
  // Options: Wholesale, Wholetail, Buy and Hold, Fix and Flip, Agent Listing
  access_instructions: 'KuaAQiDHa2PReobiBfqk', // Access Instructions | TEXT

  // Search/Preferences
  preferred_locations: 'BZfbKwdRyvA3042gxcRH', // Preferred Locations | TEXT
  preferred_zip_codes: 'f8HoNLDWBgaYsEo6QDHT', // Preferred Zip Codes | TEXT
  some_repairs: 'WQSMXtHWHZVFmE1KfCdT', // Okay with some repairs? | SINGLE_OPTIONS
  move_in_timeframe: 'USVisILmnbTTaUlZ4NvL', // Move-In Timeframe | SINGLE_OPTIONS
  search_criteria_value: 'gqEay2fbJZkkOiRUnjhV', // Search Criteria Value | NUMERICAL
  property_search: 'SwYv2kbP0vSFYSu3Ydx6', // Property Search | CHECKBOX

  // Zillow Links
  zillow_link: 'Mi7qqeSZZdvJxVZUFsGU', // Zillow Link | TEXT
  zillow_link_2: 'Nid2esLacYbZ9bSHxXBT', // Zillow Link 2 | TEXT
  zillow_link_3: 'j7EzUw1cjeU40KjQXfMs', // Zillow Link 3 | TEXT

  // Offers
  current_offer: 'vXecw2IXcSFF3sHrsCrr', // Current Offer Details | TEXTBOX_LIST
  manual_offer_details_log: '1dAFuScqHUy2Ovqz8nXa', // Manual Offer Details Log | LARGE_TEXT

  // Deal Management
  deal_type: 'uJkVXt7HyU07HAxoS7JG', // Deal Type | SINGLE_OPTIONS
  language: 'PEgHUoRn5UMujBEc1Ygl', // Language | SINGLE_OPTIONS
  // Options: English, Spanish
  property_code: 'bKEtmiXdyHtD2JUacwJP', // Property Code | TEXT
  object_created: 'C3HlQOUiHRMHvBrVOK9Y', // Object Created | RADIO
  created_in_propertypro: 'ApIYBn3GuIvjYGu1Xhs7', // Created in PropertyPro | RADIO

  // Actions/Follow-ups
  next_action_date: '32GhmrO6TsRh1WyqJ5Ha', // Next Action Date | DATE
  next_action_step: 'fJMW0egqagKvfAtJZAZ3', // Next Action Step (Quick Note) | TEXT
  deploy_deal_finder: 'KMo1F6HjoFi0RxKBnK6A', // Deploy Deal Finder | CHECKBOX
  send_sms: 'MuRXvwcOVd9XVXzP27mK', // Send SMS (Wholesalers) | CHECKBOX
  sent_buyer_deals_for_review: 'bBKEXagLrmSLf2uEfA2P', // Sent Buyer Deals for Review | DATE
  firm_or_brokerage: 'BdolevGDkIYohatiuQVQ', // Firm or Brokerage? Op | TEXT

  // Closing
  closing_checklist: 'LckrnvWZi8XnGbmphgPx', // CLOSING CHECKLIST | CHECKBOX
  bc_closing_checklist: 'ic7cNDynTQcN5UJBQUnc', // B-C Closing Checklist | CHECKBOX
  title_or_closing_problems: '5RHPNduSdEYhMNKcfPgH', // Title or Closing Problems | LARGE_TEXT
  all_commissions_paid: 'JQnUFVmhmcmFagEjAzQn', // All commissions paid? | RADIO
  external_commissions_paid_to: 'IPXpQ0P8GbRIhwmQ8ykg', // EXTERNAL COMMISSIONS PAID TO | TEXTBOX_LIST
  total_closing_expenses: 'U2zQbfFvPsB2zIuPjBrH', // Total Closing Expenses | TEXT
  list_all_other_closing_expenses: 'q5oykzAQAfVCL1vR6zRS', // List all other closing expenses | LARGE_TEXT
  post_close_actions_checklist: 'zJsKHyv330VuLNNxWqca', // POST CLOSE ACTIONS: CHECKLIST | CHECKBOX
  post_close_actions_trigger_task: 'cm3zYEll7Vq9fJjCmRsM', // POST CLOSE ACTIONS: trigger task for TC | CHECKBOX
};

// Helper to extract value from GHL custom field object
export const extractCustomFieldValue = (field: GHLCustomField | undefined): string => {
  if (!field) return '';
  // Handle different value formats from GHL API
  if (field.fieldValueString !== undefined) return field.fieldValueString;
  if (field.fieldValueNumber !== undefined) return String(field.fieldValueNumber);
  if (field.fieldValueArray !== undefined) return field.fieldValueArray.join(', ');
  if (field.fieldValueFiles?.[0]?.url) return field.fieldValueFiles[0].url;
  // Legacy format
  if (typeof field.fieldValue === 'string') return field.fieldValue;
  if (typeof field.value === 'string') return field.value;
  if (typeof field.value === 'number') return String(field.value);
  return '';
};

// Transform GHL Opportunity to Property
export const transformOpportunityToProperty = (opp: GHLOpportunity): Property => {
  const getCustomField = (fieldId: string): string => {
    const field = opp.customFields?.find((cf) => cf.id === fieldId);
    return extractCustomFieldValue(field);
  };

  const heroImage = getCustomField(PROPERTY_CUSTOM_FIELDS.heroImage);

  // Collect all supporting images from the 10 individual fields
  const supportingImages = [
    getCustomField(GHL_OPPORTUNITY_FIELDS.supporting_image_1_upload),
    getCustomField(GHL_OPPORTUNITY_FIELDS.supporting_image_2_upload),
    getCustomField(GHL_OPPORTUNITY_FIELDS.supporting_image_3_upload),
    getCustomField(GHL_OPPORTUNITY_FIELDS.supporting_image_4_upload),
    getCustomField(GHL_OPPORTUNITY_FIELDS.supporting_image_5_upload),
    getCustomField(GHL_OPPORTUNITY_FIELDS.supporting_image_6_upload),
    getCustomField(GHL_OPPORTUNITY_FIELDS.supporting_image_7_upload),
    getCustomField(GHL_OPPORTUNITY_FIELDS.supporting_image_8_upload),
    getCustomField(GHL_OPPORTUNITY_FIELDS.supporting_image_9_upload),
    getCustomField(GHL_OPPORTUNITY_FIELDS.supporting_image_10_upload),
  ].filter(Boolean); // Remove empty values

  // Combine hero image with supporting images for the images array
  // This ensures all property images are available in the carousel
  const allImages = [heroImage, ...supportingImages].filter(Boolean);
  const images = allImages.length > 0 ? allImages : [];
  
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
    socialMediaPropertyDescription: getCustomField(PROPERTY_CUSTOM_FIELDS.socialMediaDescription),
    heroImage: heroImage || '/placeholder.svg',
    images,
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
    queryFn: () => fetchGHL<{ customFields: GHLCustomFieldDefinition[] }>(
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