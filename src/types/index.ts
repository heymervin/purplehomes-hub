export type PropertyStatus = 'pending' | 'posted' | 'scheduled' | 'skipped' | 'deleted' | 'processing';

export type PropertyCondition = 'Excellent' | 'Great' | 'Good' | 'Fair' | 'Poor' | 'Terrible' | 'Needs some Repair';

export type PropertyType = 
  | 'Single Family' 
  | 'Duplex' 
  | 'Multi Family' 
  | 'Condo' 
  | 'Lot' 
  | 'Mobile Home' 
  | 'Town House' 
  | 'Commercial' 
  | 'Triplex' 
  | '4-plex';

export interface Property {
  id: string;
  propertyCode: string;
  address: string;
  city: string;
  state?: string;
  price: number;
  beds: number;
  baths: number;
  sqft?: number;
  condition?: PropertyCondition;
  propertyType?: PropertyType;
  lat?: number;
  lng?: number;
  description?: string;
  heroImage: string;
  images: string[];
  status: PropertyStatus;
  caption?: string;
  brandedImage?: string;
  postedDate?: string;
  scheduledDate?: string;
  createdAt: string;
  ghlOpportunityId?: string;
  isDemo?: boolean;
  downPayment?: number;
  monthlyPayment?: number;
  source?: 'Inventory' | 'Lead' | 'Zillow';
  zillowUrl?: string;
  daysOnMarket?: number;
}

// Buyer Home Acquisition Pipeline (interested buyers who submit offers)
export type AcquisitionStage = 
  | 'inventory-discussions' 
  | 'property-sourcing' 
  | 'buyer-review' 
  | 'underwriting-checklist' 
  | 'offer-submitted' 
  | 'buyer-contract-signed' 
  | 'qualification-phase' 
  | 'closing-scheduled' 
  | 'closed-won' 
  | 'lost';

export interface BuyerAcquisition {
  id: string;
  name: string;
  email: string;
  phone: string;
  propertyId?: string;
  propertyAddress?: string;
  offerAmount?: number;
  message?: string;
  stage: AcquisitionStage;
  createdAt: string;
  updatedAt: string;
}

// Existing Buyers (closed/current buyers)
export type BuyerStage = 'under-contract' | 'escrow-opened' | 'closing-scheduled';
export type BuyerStatus = 'active' | 'qualified' | 'pending' | 'closed';

export interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
}

export interface BuyerChecklist {
  bcClosing: ChecklistItem[];
  postClose: ChecklistItem[];
  activeBuyer: ChecklistItem[];
}

export interface BuyerPreferences {
  minBeds?: number;
  maxBeds?: number;
  minBaths?: number;
  maxBaths?: number;
  minPrice?: number;
  maxPrice?: number;
  propertyType?: string;
  sqft?: number;
}

export interface BuyerMatches {
  internal: number;
  external: number;
}

export interface Buyer {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  preferredZipCodes: string[];
  preferences: BuyerPreferences;
  matches: BuyerMatches;
  maxBudget?: number;
dealType: 'Lease Option' | 'Bond for Deed' | 'Assignment' | 'Traditional Sale' | 'Cash' | 'Wrap' | 'Subject-To' | 'Multiple';
  status: BuyerStatus;
  stage: BuyerStage;
  checklist: BuyerChecklist;
  propertiesSent: string[];
  sentDealsForReview: string;
  createdAt: string;
}

export type DealStage = 'new-lead' | 'qualified' | 'under-contract' | 'closing' | 'closed';

export interface Deal {
  id: string;
  propertyId: string;
  property: Property;
  buyerId?: string;
  buyer?: Buyer;
  stage: DealStage;
  assignedTo?: string;
  daysInStage: number;
  notes: string[];
  createdAt: string;
}

export interface SocialAccount {
  id: string;
  platform: 'facebook' | 'instagram' | 'linkedin';
  accountName: string;
  profilePicture?: string;
  connected: boolean;
  lastPosted?: string;
}

export interface ScheduledPost {
  id: string;
  propertyId?: string;
  property?: Property;
  caption: string;
  image: string;
  platforms: string[];
  scheduledDate: string;
  status: 'scheduled' | 'posted' | 'failed';
}

export type ActivityType = 'posted' | 'scheduled' | 'caption-generated' | 'property-added' | 'status-changed' | 'buyer-added' | 'inventory-sent';

export interface Activity {
  id: string;
  type: ActivityType;
  propertyCode?: string;
  propertyId?: string;
  details: string;
  user?: string;
  status: 'success' | 'error' | 'pending';
  timestamp: string;
}

export interface ConnectionStatus {
  highLevel: boolean;
  openAI: boolean;
  imejis: boolean;
  lastChecked: string;
  failedSince?: string; // Track when connection first failed
}

// Sync History Log
export type SyncType = 'contacts' | 'properties' | 'opportunities' | 'social-accounts' | 'documents';
export type SyncStatus = 'success' | 'failed' | 'partial';

export interface SyncLogEntry {
  id: string;
  type: SyncType;
  status: SyncStatus;
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsFailed: number;
  duration: number; // in milliseconds
  error?: string;
  timestamp: string;
}

export interface ConnectionFailureNotification {
  id: string;
  sentAt: string;
  failedSince: string;
  recipientEmail: string;
  acknowledged: boolean;
}

// Property Pipeline (formerly Seller Acquisition Pipeline)
export type PropertyPipelineStage =
  | 'new'
  | 'active'
  | 'engaged'
  | 'contract'
  | 'sold'
  | 'off-market';

// Legacy alias for backwards compatibility
export type SellerAcquisitionStage = PropertyPipelineStage;

export interface SellerAcquisition {
  id: string;
  sellerName: string;
  email?: string;
  phone?: string;
  propertyAddress: string;
  city: string;
  state: string;
  zipCode: string;
  propertyType?: string;
  askingPrice?: number;
  notes?: string;
  stage: SellerAcquisitionStage;
  createdAt: string;
  updatedAt: string;
}

// Unified Contact (GHL-ready)
export type ContactType = 
  | 'buyer' 
  | 'seller' 
  | 'agent' 
  | 'wholesaler'
  | 'buyer-representative'
  | 'contractor'
  | 'private-money-lender'
  | 'institutional-lender'
  | 'owner'
  | 'unknown'
  | 'other';
  
export type ContactStatus = 'active' | 'inactive' | 'pending' | 'closed';

export interface Contact {
  id: string;
  ghlContactId?: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  type: ContactType;
  status: ContactStatus;
  zipCodes: string[];
  tags: string[];
  company?: string;
  brokerage?: string;
  licenseNumber?: string;
  markets: string[];
  notes?: string;
  isFavorite: boolean;
  lastActivityAt?: string;
  createdAt: string;
  updatedAt: string;
  propertyPreferences?: {
    bedCount?: number;
    bathCount?: number;
    squareFeet?: number;
    propertyType?: string;
  };
}