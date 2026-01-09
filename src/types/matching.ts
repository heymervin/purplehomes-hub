/**
 * AI Property Matching Types
 */

import { MatchDealStage } from './associations';

export type { MatchDealStage } from './associations';

/**
 * Affordability Formula Settings
 * All values configurable from Settings page
 */
export interface AffordabilitySettings {
  fixedOtherCosts: number;        // Default: 8310 (red-box costs)
  fixedLoanFees: number;          // Default: 1990
  downPaymentPercent: number;     // Default: 20
  closingCostPercent: number;     // Default: 1
  pointsPercent: number;          // Default: 2
  pointsFinancedPercent: number;  // Default: 80
  priceBuffer: number;            // Default: 0
  minDownPayment: number;         // Default: 10300
}

/**
 * Default affordability settings
 */
export const DEFAULT_AFFORDABILITY_SETTINGS: AffordabilitySettings = {
  fixedOtherCosts: 8310,
  fixedLoanFees: 1990,
  downPaymentPercent: 20,
  closingCostPercent: 1,
  pointsPercent: 2,
  pointsFinancedPercent: 80,
  priceBuffer: 0,
  minDownPayment: 10300,
};

/**
 * Zillow Match Flexibility Settings
 */
export interface ZillowMatchFlexibility {
  bedroomFlex: 'exact' | 'minus1' | 'minus2';    // Default: 'minus1'
  bathroomFlex: 'exact' | 'minus1' | 'minus2';   // Default: 'minus1'
  budgetFlexPercent: 0 | 5 | 10 | 15 | 20;       // Default: 10
}

/**
 * Default match flexibility settings
 */
export const DEFAULT_MATCH_FLEXIBILITY: ZillowMatchFlexibility = {
  bedroomFlex: 'minus1',
  bathroomFlex: 'minus1',
  budgetFlexPercent: 10,
};

/**
 * Zillow listing match status
 */
export interface ZillowMatchStatus {
  matchType: 'perfect' | 'near' | 'stretch' | 'partial';

  budget: {
    status: 'met' | 'close' | 'over';
    difference: number;        // positive = under, negative = over
    percentOver: number | null;
    label: string;             // e.g., "$11k under" or "5% over"
  };

  bedrooms: {
    status: 'met' | 'close' | 'miss';
    property: number;
    wanted: number;
    difference: number;
    label: string;             // e.g., "3 bed (exact)" or "2 bed (1 less)"
  };

  bathrooms: {
    status: 'met' | 'close' | 'miss';
    property: number;
    wanted: number;
    difference: number;
    label: string;
  };

  location: {
    status: 'met' | 'close' | 'miss';
    inPreferredCity: boolean;
    city: string;
    label: string;             // e.g., "In Dallas" or "Plano (12 mi)"
  };

  summary: string | null;      // e.g., "Slightly over budget, different city"
}

/**
 * Zillow filter state for search results
 */
export interface ZillowFilterState {
  showPerfect: boolean;
  showNear: boolean;
  showStretch: boolean;
  withinBudget: boolean;
  meetsBeds: boolean;
  meetsBaths: boolean;
}

export interface BuyerCriteria {
  contactId: string;
  recordId?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  monthlyIncome?: number;
  monthlyLiabilities?: number;
  downPayment?: number;
  desiredBeds?: number;
  desiredBaths?: number;
  location?: string;
  city?: string;
  state?: string;
  buyerType?: string;
  qualified?: boolean;
  language?: 'English' | 'Spanish'; // Buyer's preferred language
  dateAdded?: string; // Date the buyer was added to the system
  lat?: number;
  lng?: number;
  locationLat?: number; // Geocoded latitude
  locationLng?: number; // Geocoded longitude
  locationSource?: 'city' | 'zip' | 'address'; // Source of geocoded location
  preferredLocation?: string;
  preferredZipCodes?: string[];
}

export interface PropertyDetails {
  recordId: string;
  propertyCode: string;
  opportunityId?: string;
  address: string;
  city: string;
  state?: string;
  zipCode?: string;
  price?: number;
  beds: number;
  baths: number;
  sqft?: number;
  stage?: string;
  heroImage?: string;
  notes?: string;
  propertyLat?: number; // Geocoded latitude
  propertyLng?: number; // Geocoded longitude

  // Financial fields
  monthlyPayment?: number; // Monthly mortgage payment
  downPayment?: number; // Down payment amount

  // Images (up to 25 supporting images)
  images?: string[]; // Array of image URLs (supporting images)

  // Property metadata
  propertyType?: string; // Property type (Single Family, Duplex, etc.)
  condition?: string; // Property condition (Excellent, Great, Good, etc.)

  // Source tracking fields
  source?: 'Inventory' | 'Partnered' | 'Acquisitions' | 'Zillow'; // Property source
  zillowType?: 'Keywords' | 'Formula' | 'DOM'; // Zillow search type (only if source = 'Zillow')
  zillowZpid?: string; // Zillow property ID for deduplication
  zillowUrl?: string; // Link to original Zillow listing
  daysOnMarket?: number; // Days on market (primarily for Zillow properties)
  createdAt?: string; // Created timestamp for sorting
}

export interface MatchScore {
  score: number; // 0-100
  distance?: number; // Distance in miles (legacy, use distanceMiles)
  distanceMiles: number | null; // Distance in miles (null if no coordinates)

  // New scoring breakdown (100 pts total)
  downPaymentScore: number; // 0-25 points - Buyer DP vs Property DP
  monthlyAffordabilityScore: number; // 0-25 points - Property payment vs 50% of buyer income
  locationScore: number; // 0-15 points
  bedsScore: number; // 0-15 points
  bathsScore: number; // 0-10 points
  propertyTypeScore: number; // 0-10 points

  // Legacy field for backwards compatibility (sum of downPayment + monthlyAffordability scores)
  budgetScore: number; // 0-50 points (deprecated, kept for backwards compatibility)

  reasoning: string;
  locationReason: string; // Human-readable location explanation
  highlights: string[];
  concerns: string[];
  isPriority: boolean; // Within 50 miles OR in preferred ZIP

  // Source-based matching metadata
  matchingMode?: 'full' | 'simplified'; // 'full' for Inventory/Partnered, 'simplified' for Leads/Acquisitions/Zillow
}

/**
 * Activity types for match history tracking
 */
export type MatchActivityType =
  | 'stage-change'
  | 'email-sent'
  | 'sms-sent'
  | 'sms-email-sent'
  | 'showing-scheduled'
  | 'showing-completed'
  | 'note-added'
  | 'offer-submitted'
  | 'match-created';

/**
 * Activity entry for match history
 */
export interface MatchActivity {
  id: string;
  type: MatchActivityType;
  timestamp: string;
  details: string;
  user?: string;
  metadata?: {
    fromStage?: MatchDealStage;
    toStage?: MatchDealStage;
    showingDate?: string;
    emailSubject?: string;
    offerAmount?: number;
    note?: string;
  };
}

export interface PropertyMatch {
  id: string; // Match record ID
  buyerRecordId: string;
  propertyRecordId: string;
  contactId: string;
  propertyCode: string;
  score: number;
  distance?: number; // Distance in miles
  reasoning: string;
  highlights: string[];
  concerns?: string[];
  isPriority?: boolean; // Within 50 miles OR in preferred ZIP
  status: MatchDealStage; // Updated to use GHL association labels
  activities?: MatchActivity[]; // Activity history stored in Airtable JSON field
  ghlRelationId?: string; // GHL relation ID for syncing
  isFinalProperty?: boolean; // True if this is the buyer's confirmed final property choice
  createdAt?: string;
  updatedAt?: string;
  dateSent?: string; // ISO date when deal was sent to buyer
}

export interface BuyerWithMatches extends BuyerCriteria {
  matches: Array<PropertyMatch & { property?: PropertyDetails }>;
  totalMatches: number;
}

export interface PropertyWithMatches extends PropertyDetails {
  matches: Array<PropertyMatch & { buyer?: BuyerCriteria }>;
  totalMatches: number;
}

export interface MatchingJobStatus {
  status: 'idle' | 'running' | 'completed' | 'error';
  progress?: number;
  totalBuyers?: number;
  totalProperties?: number;
  processedBuyers?: number;
  createdMatches?: number;
  error?: string;
}

export interface RunMatchingRequest {
  buyerContactId?: string; // For single buyer
  propertyCode?: string; // For single property
  minScore?: number; // Minimum score threshold (default: 60)
  refreshAll?: boolean; // Re-match everything
}

export interface RunMatchingResponse {
  success: boolean;
  message: string;
  stats: {
    buyersProcessed: number;
    propertiesProcessed: number;
    matchesCreated: number;
    matchesUpdated: number;
    duplicatesSkipped?: number;
    withinRadius?: number; // Priority matches count
  };
}

export interface MatchFilters {
  matchStatus?: MatchDealStage;
  minScore?: number;
  priorityOnly?: boolean;
  matchLimit?: number;
  dateRange?: '7days' | '30days' | 'all';
}

/**
 * UI-level matching filters used by the Matching page components
 */
export interface MatchingFilters {
  search: string;
  minScore: string;
  priorityOnly: boolean;
  matchStatus: string;
}

/**
 * Scored property for buyer-properties endpoint
 */
export interface ScoredProperty {
  property: PropertyDetails;
  score: MatchScore;
  currentStage?: string;  // Current deal stage
  matchId?: string;       // Reference to match record
  dateSent?: string;      // ISO date when property was sent to buyer
  isFinalProperty?: boolean; // True if this is the buyer's confirmed final property choice
}

/**
 * Response from buyer-properties endpoint
 */
export interface BuyerPropertiesResponse {
  buyer: BuyerCriteria;
  priorityMatches: ScoredProperty[]; // Within 50mi or ZIP match
  exploreMatches: ScoredProperty[];  // Beyond 50mi
  totalCount: number;
  stats: {
    priorityCount: number;
    exploreCount: number;
    timeMs: number;
  };
}

/**
 * Scored buyer for property-buyers endpoint
 */
export interface ScoredBuyer {
  buyer: BuyerCriteria;
  score: MatchScore;
  currentStage?: string;  // Current deal stage
  matchId?: string;       // Reference to match record
  dateSent?: string;      // ISO date when property was sent to buyer
  isFinalProperty?: boolean; // True if this is the buyer's confirmed final property choice
}

/**
 * Response from property-buyers endpoint
 */
export interface PropertyBuyersResponse {
  property: PropertyDetails;
  buyers: ScoredBuyer[]; // All buyers sorted by score
  totalCount: number;
  stats: {
    timeMs: number;
  };
}

/**
 * Matching Preferences - User-configurable matching settings
 */
export interface MatchingPreferences {
  id?: string;
  budgetMultiplier: number; // Minimum down payment percentage (Default: 20%)

  // Zillow Search Settings
  zillowMaxPrice: number; // Default: 275000 - Max price for 90+ Days search
  zillowMinDays: number; // Default: 90 - Min days on market for 90+ Days search
  zillowKeywords: string; // Default: 'seller finance OR owner finance OR bond for deed'

  // Affordability Formula Settings
  affordability: AffordabilitySettings;

  // Match Flexibility Settings
  matchFlexibility: ZillowMatchFlexibility;

  updatedAt?: string;
}

/**
 * Default matching preferences
 */
export const DEFAULT_MATCHING_PREFERENCES: MatchingPreferences = {
  budgetMultiplier: 20,
  zillowMaxPrice: 275000,
  zillowMinDays: 90,
  zillowKeywords: 'seller finance OR owner finance OR bond for deed',
  affordability: DEFAULT_AFFORDABILITY_SETTINGS,
  matchFlexibility: DEFAULT_MATCH_FLEXIBILITY,
};

/**
 * Source filter options (excludes Zillow which has its own section)
 */
export type PropertySourceFilter = 'Inventory' | 'Partnered' | 'Acquisitions';

/**
 * Match filter state for property matching page
 */
export interface MatchFilterState {
  sources: PropertySourceFilter[];
  sameCity: boolean;
  withinBudget: boolean;
}
