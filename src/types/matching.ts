/**
 * AI Property Matching Types
 */

import { MatchDealStage } from './associations';

export type { MatchDealStage } from './associations';

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
  locationScore: number; // 0-40 points
  bedsScore: number; // 0-25 points
  bathsScore: number; // 0-15 points
  budgetScore: number; // 0-20 points
  reasoning: string;
  locationReason: string; // Human-readable location explanation
  highlights: string[];
  concerns: string[];
  isPriority: boolean; // Within 50 miles OR in preferred ZIP
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
  createdAt?: string;
  updatedAt?: string;
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
 * Scored property for buyer-properties endpoint
 */
export interface ScoredProperty {
  property: PropertyDetails;
  score: MatchScore;
  currentStage?: string;  // Current deal stage
  matchId?: string;       // Reference to match record
  dateSent?: string;      // ISO date when property was sent to buyer
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
  budgetMultiplier: number; // Default: 8
  // Zillow Search Settings
  zillowMaxPrice: number; // Default: 275000 - Max price for 90+ Days search
  zillowMinDays: number; // Default: 90 - Min days on market for 90+ Days search
  zillowKeywords: string; // Default: 'seller finance OR owner finance OR bond for deed'
  updatedAt?: string;
}

/**
 * Default matching preferences
 */
export const DEFAULT_MATCHING_PREFERENCES: MatchingPreferences = {
  budgetMultiplier: 8,
  zillowMaxPrice: 275000,
  zillowMinDays: 90,
  zillowKeywords: 'seller finance OR owner finance OR bond for deed',
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
