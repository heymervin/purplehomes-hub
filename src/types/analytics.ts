/**
 * Funnel Analytics Types
 *
 * Tracks user behavior on funnel pages for automatic effectiveness scoring.
 * Replaces manual ratings with objective behavioral data.
 */

export interface AnalyticsSession {
  sessionId: string;
  propertyId: string;
  propertySlug: string;
  avatarResearchId?: string;
  buyerSegment?: string;

  // Tracked metrics
  timeOnPageSeconds: number;
  maxScrollDepth: number;        // 0-100 percentage
  ctaClicks: number;
  formSubmitted: boolean;
  videoPlayed: boolean;

  // Calculated
  effectivenessScore: number;    // 1-10
  timestamp: string;             // ISO date
}

export interface AnalyticsTrackRequest {
  propertyId: string;
  propertySlug: string;
  avatarResearchId?: string;
  buyerSegment?: string;
  sessionId: string;
  timeOnPageSeconds: number;
  maxScrollDepth: number;
  ctaClicks: number;
  formSubmitted: boolean;
  videoPlayed: boolean;
  timestamp: string;
}

export interface AnalyticsAggregateResponse {
  propertyId: string;
  totalSessions: number;
  avgTimeOnPage: number;
  avgScrollDepth: number;
  ctaClickRate: number;          // % of sessions with clicks
  formSubmissionRate: number;    // % of sessions with submission
  videoPlayRate: number;         // % of sessions with video play
  avgEffectivenessScore: number; // Calculated 1-10
}

export interface FunnelAnalytics {
  trackCtaClick: (ctaType: string) => void;
  trackFormSubmission: () => void;
  trackVideoPlay: () => void;
}

export interface UseFunnelAnalyticsOptions {
  propertyId: string;
  propertySlug: string;
  avatarResearchId?: string;
  buyerSegment?: string;
}

// Scoring weights from PARKED_IDEAS.md
export const ANALYTICS_WEIGHTS = {
  timeOnPage: 0.30,    // 30%
  scrollDepth: 0.20,   // 20%
  ctaClicks: 0.25,     // 25%
  formSubmission: 0.25 // 25%
} as const;

// Targets for max score
export const ANALYTICS_TARGETS = {
  timeOnPageSeconds: 120,  // 2 minutes
  scrollDepthPercent: 75   // 75%
} as const;
