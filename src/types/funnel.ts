/**
 * Funnel Content Types v2.0
 *
 * Types for AI-generated property funnel content stored as markdown files.
 * Enhanced with buyer avatar targeting and A/B testing support.
 * Each property can have associated marketing content following the PAS+AIDA framework.
 */

/**
 * Buyer Segment Types - Based on 27-Word Persuasion avatars
 */
export type BuyerSegment =
  | 'first-time-buyer'
  | 'credit-challenged'
  | 'investor'
  | 'move-up-buyer'
  | 'self-employed'
  | 'hispanic-seller-finance'
  | 'general';

/**
 * AI Input Fields - Editable fields that feed into AI generation
 * These are stored in markdown alongside generated content
 */
export interface FunnelInputs {
  // Financing Details
  financingType: string;      // Default: "Owner Finance"
  termLength: string;         // Default: "30 years"
  interestRate: string;       // Optional

  // Urgency & Scarcity
  availabilityStatus: string; // Default: "Available"
  urgencyMessage: string;     // Custom urgency text for funnel (e.g., "Only 2 spots left!")
  specialOffer: string;       // Optional promo/bonus

  // Lifestyle/Emotional
  neighborhoodHighlights: string; // Schools, parks, etc.
  idealBuyerProfile: string;      // "Perfect for first-time buyers..."
  uniqueFeatures: string;         // What makes this property special

  // Optional Section Inputs
  nearbyPlaces?: string;      // Schools, malls, transport distances for Location section
  paymentNotes?: string;      // Additional payment/financing notes
  virtualTourUrl?: string;    // YouTube, Vimeo, Matterport embed URL

  // Enhanced v2.0 inputs
  buyerSegment?: BuyerSegment;    // Target buyer avatar for copy optimization
  avatarDescription?: string;     // Custom persona description for emotional targeting
  generateVariants?: boolean;     // Generate A/B test variants for hook/CTA
}

export const DEFAULT_FUNNEL_INPUTS: FunnelInputs = {
  financingType: 'Owner Finance',
  termLength: '', // User must fill this in
  interestRate: '',
  availabilityStatus: 'Available',
  urgencyMessage: '',
  specialOffer: '',
  neighborhoodHighlights: '',
  idealBuyerProfile: '',
  uniqueFeatures: '',
  nearbyPlaces: '',
  paymentNotes: '',
  virtualTourUrl: '',
  buyerSegment: 'first-time-buyer',
  avatarDescription: '',
  generateVariants: false,
};

export const FINANCING_TYPE_OPTIONS = [
  'Owner Finance',
  'Lease Option',
  'Bond for Deed',
  'Subject-To',
  'Wrap Mortgage',
] as const;

export const AVAILABILITY_STATUS_OPTIONS = [
  'Available',
  'Under Review',
  'Multiple Offers',
  'Pending',
] as const;

export const BUYER_SEGMENT_OPTIONS: { value: BuyerSegment; label: string; description: string }[] = [
  {
    value: 'first-time-buyer',
    label: 'First-Time Buyer',
    description: 'Never owned property, dreaming of their first home'
  },
  {
    value: 'credit-challenged',
    label: 'Credit-Challenged',
    description: 'Score below 640, rejected by traditional lenders'
  },
  {
    value: 'investor',
    label: 'Real Estate Investor',
    description: 'Looking for cash flow or appreciation properties'
  },
  {
    value: 'move-up-buyer',
    label: 'Move-Up Buyer',
    description: 'Current homeowner looking to upgrade'
  },
  {
    value: 'self-employed',
    label: 'Self-Employed',
    description: 'Business owner with hard-to-document income'
  },
  {
    value: 'hispanic-seller-finance',
    label: 'Hispanic/Latino Buyer',
    description: 'Spanish-first family buyer who can afford a home but not the bank - values respect, transparency, and family legacy'
  },
  {
    value: 'general',
    label: 'General',
    description: 'Broad audience, no specific targeting'
  },
] as const;

/**
 * Testimonial for social proof carousel
 * Can be real testimonials entered by user or AI-generated
 */
export interface Testimonial {
  quote: string;
  authorName: string;
  authorTitle?: string;
  rating?: number; // 1-5 stars, defaults to 5
}

/**
 * Formula tracking for learning which copywriting formulas work best
 * Enables exploration/exploitation learning loop
 */
export interface FormulaSelection {
  landingPageFormula: string;  // ID from landingPageFormulas (e.g., "epiphany-bridge")
  hookFormula: string;         // ID from funnelFormulas.hook (e.g., "pas-hook")
  problemFormula: string;      // ID from funnelFormulas.problem
  solutionFormula: string;     // ID from funnelFormulas.solution
  showcaseFormula: string;     // ID from funnelFormulas.propertyShowcase
  proofFormula: string;        // ID from funnelFormulas.socialProof
  ctaFormula: string;          // ID from funnelFormulas.callToAction
}

export interface FunnelContent {
  // Metadata
  propertySlug: string;
  generatedAt: string;
  propertyHash: string; // Hash of key property fields to detect changes

  // AI Input Fields (user-editable before generation)
  inputs: FunnelInputs;

  // Funnel Sections (PAS + AIDA Framework)
  hook: string | { headline: string; subheadline?: string; highlight?: string; benefit?: string; urgency?: string; bonus?: string };
  problem: string | { headline: string; body: string };  // Pain points - structured or flat string
  solution: string;       // Purple Homes creative financing solution
  propertyShowcase: string; // Property description and features
  socialProof: string;    // Testimonials and trust builders
  callToAction: string;   // CTA text and urgency

  // Optional Sections
  locationNearby?: string;    // Location value, nearby amenities
  qualifier?: string;         // "Perfect for..." section
  pricingOptions?: string;    // Payment breakdown
  virtualTourUrl?: string;    // Video/360 tour embed URL
  faq?: string;               // FAQ content (Q&A format)

  // A/B Test Variants (v2.0)
  hookVariantB?: string;      // Alternative hook for testing
  ctaVariantB?: string;       // Alternative CTA for testing

  // Real Testimonials (v2.2) - User-entered testimonials override AI-generated socialProof
  testimonials?: Testimonial[];  // If empty/undefined, falls back to socialProof

  // Avatar Research Link (v2.0 - Persist & Grow)
  avatarResearchId?: string;  // Links to avatar research entry for tracking effectiveness

  // Formula Tracking (v2.1 - Strategy Learning)
  formulasUsed?: FormulaSelection;  // Which formulas were used to generate this funnel

  // Spanish Translations (v2.3 - Bilingual Funnel Support)
  es?: {
    hook: string | { headline: string; subheadline?: string; highlight?: string; benefit?: string; urgency?: string; bonus?: string };
    problem: string | { headline: string; body: string };
    solution: string;
    propertyShowcase: string;
    callToAction: string;
    qualifier?: string;
    faq?: string;
    testimonials?: Testimonial[];
  };
}

export interface FunnelContentRequest {
  // Property data for AI generation (from GHL/Airtable)
  address: string;
  city: string;
  state: string;
  zipCode: string;
  price: number;
  downPayment?: number;
  monthlyPayment?: number;
  beds: number;
  baths: number;
  sqft?: number;
  propertyType?: string;
  condition?: string;
  description?: string;

  // User-editable input fields
  inputs?: FunnelInputs;
}

export interface GenerateFunnelResponse {
  success: boolean;
  content?: FunnelContent;
  error?: string;
}

export interface SaveFunnelResponse {
  success: boolean;
  filePath?: string;
  error?: string;
}

/**
 * Generate a hash from property data to detect changes
 */
export function generatePropertyHash(data: FunnelContentRequest): string {
  const keyFields = [
    data.address,
    data.city,
    data.price,
    data.downPayment,
    data.monthlyPayment,
    data.beds,
    data.baths,
  ].join('|');

  // Simple hash function
  let hash = 0;
  for (let i = 0; i < keyFields.length; i++) {
    const char = keyFields.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}
