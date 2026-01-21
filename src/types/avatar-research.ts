/**
 * Avatar Research Types
 *
 * Types for the "Persist & Grow" avatar research system.
 * Supports saving research history, tracking effectiveness, and learning from patterns.
 */

import type { BuyerSegment } from './funnel';

/**
 * Full avatar research result from AI generation
 */
export interface AvatarResearchResult {
  buyerSegment: BuyerSegment;
  // 27-Word Persuasion Framework
  dreams: string[];
  fears: string[];
  suspicions: string[];
  failures: string[];
  enemies: string[];
  // Day in the Life
  diaryEntry: string;
  keyFrustrations: string[];
  emotionalTriggers: string[];
  // Before/After State
  beforeState: {
    feelings: string;
    daily: string;
    status: string;
  };
  afterState: {
    feelings: string;
    daily: string;
    status: string;
  };
  transformationNarrative: string;
  // Objections with counters
  objections: Array<{
    objection: string;
    counter: string;
    proofPoint?: string;
  }>;
  // AI recommendations
  recommendedHooks: string[];
  recommendedAppeals: string[];
}

/**
 * Property context for research (helps AI tailor research)
 */
export interface PropertyContext {
  type?: string;        // e.g., "Single Family", "Condo"
  city?: string;        // e.g., "New Orleans"
  priceRange?: string;  // e.g., "$100k-200k", "$200k-300k"
}

/**
 * User feedback on research effectiveness
 */
export interface ResearchFeedback {
  liked: string[];      // Aspects that worked (e.g., "dreams", "fears", "objections")
  disliked: string[];   // Aspects that didn't resonate
  notes?: string;       // Free-form feedback
}

/**
 * Formula selection imported from funnel types
 */
export interface FormulaSelection {
  landingPageFormula: string;
  hookFormula: string;
  problemFormula: string;
  solutionFormula: string;
  showcaseFormula: string;
  proofFormula: string;
  ctaFormula: string;
}

/**
 * A single research entry in the history
 */
export interface AvatarResearchEntry {
  id: string;                           // UUID
  createdAt: string;                    // ISO timestamp
  buyerSegment: BuyerSegment;
  propertyContext: PropertyContext;
  research: AvatarResearchResult;
  effectiveness?: number;               // 1-10 rating (set via feedback)
  feedback?: ResearchFeedback;
  usedInFunnels: string[];              // Property slugs that used this research
  formulasUsed?: FormulaSelection;      // Which formulas were used (v2.1)
}

/**
 * Insight item with tracking metrics
 */
export interface InsightItem {
  value: string;
  frequency: number;          // How often this appears
  avgEffectiveness: number;   // Average rating when this was used
  lastSeen: string;           // ISO timestamp
}

/**
 * Formula effectiveness tracking
 */
export interface FormulaEffectiveness {
  formulaId: string;
  formulaName: string;
  usageCount: number;
  avgEffectiveness: number;
  lastUsed: string;
}

/**
 * Aggregated insights for a buyer segment
 */
export interface SegmentInsights {
  topDreams: InsightItem[];
  topFears: InsightItem[];
  topSuspicions: InsightItem[];
  topObjections: InsightItem[];
  mostEffectiveHooks: string[];
  avgEffectiveness: number;
  totalResearches: number;
  totalRated: number;
  lastUpdated: string;
  // Formula tracking (v2.1 - Strategy Learning)
  formulaStats?: {
    landingPage: FormulaEffectiveness[];
    hook: FormulaEffectiveness[];
    problem: FormulaEffectiveness[];
    solution: FormulaEffectiveness[];
    showcase: FormulaEffectiveness[];
    proof: FormulaEffectiveness[];
    cta: FormulaEffectiveness[];
  };
}

/**
 * Complete research history for a buyer segment
 */
export interface AvatarResearchHistory {
  segment: BuyerSegment;
  version: number;
  lastUpdated: string;
  entries: AvatarResearchEntry[];
  insights: SegmentInsights;
}

/**
 * Cross-segment patterns (learned from all segments)
 */
export interface GlobalPatterns {
  version: number;
  lastUpdated: string;
  // Patterns that work across all segments
  universalDreams: InsightItem[];
  universalFears: InsightItem[];
  universalObjections: InsightItem[];
  // Segment-specific top performers
  segmentHighlights: Record<BuyerSegment, {
    topDream: string;
    topFear: string;
    topObjection: string;
    avgEffectiveness: number;
  }>;
}

/**
 * API request types
 */
export interface GenerateAvatarResearchRequest {
  buyerSegment: BuyerSegment;
  propertyType?: string;
  propertyCity?: string;
  propertyPrice?: number;
  customDescription?: string;
}

export interface RateResearchRequest {
  researchId: string;
  effectiveness: number;  // 1-10
  feedback?: ResearchFeedback;
}

export interface LinkResearchToFunnelRequest {
  researchId: string;
  propertySlug: string;
}

/**
 * API response types
 */
export interface GenerateAvatarResearchResponse {
  success: boolean;
  researchId: string;
  avatarResearch: AvatarResearchResult;
  savedAt: string;
  error?: string;
}

export interface GetHistoryResponse {
  success: boolean;
  history: AvatarResearchHistory;
  error?: string;
}

export interface GetInsightsResponse {
  success: boolean;
  insights: SegmentInsights;
  globalPatterns?: GlobalPatterns;
  error?: string;
}

export interface RateResearchResponse {
  success: boolean;
  updated: boolean;
  newInsights?: SegmentInsights;
  error?: string;
}

/**
 * Default empty insights structure
 */
export const DEFAULT_SEGMENT_INSIGHTS: SegmentInsights = {
  topDreams: [],
  topFears: [],
  topSuspicions: [],
  topObjections: [],
  mostEffectiveHooks: [],
  avgEffectiveness: 0,
  totalResearches: 0,
  totalRated: 0,
  lastUpdated: new Date().toISOString(),
};

/**
 * Default empty history structure
 */
export function createEmptyHistory(segment: BuyerSegment): AvatarResearchHistory {
  return {
    segment,
    version: 1,
    lastUpdated: new Date().toISOString(),
    entries: [],
    insights: { ...DEFAULT_SEGMENT_INSIGHTS },
  };
}

/**
 * Constants
 */
export const MAX_ENTRIES_PER_SEGMENT = 100;
export const MIN_RATING_FOR_INSIGHTS = 7;
export const MIN_ENTRIES_FOR_PATTERN_EXTRACTION = 3;
