/**
 * Funnel Analytics API - "The Ultimate Algorithm"
 *
 * Tracks user behavior on funnel pages for automatic effectiveness scoring.
 * Replaces manual ratings with objective behavioral data.
 *
 * Actions:
 * - track: Store a single analytics session
 * - aggregate: Get aggregated stats for a property/segment
 * - auto-rate: Calculate and apply effectiveness rating to avatar research
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// Airtable configuration
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_API_URL = 'https://api.airtable.com/v0';
const ANALYTICS_TABLE = 'FunnelAnalytics';

// Scoring weights from PARKED_IDEAS.md
const WEIGHTS = {
  timeOnPage: 0.30,    // 30%
  scrollDepth: 0.20,   // 20%
  ctaClicks: 0.25,     // 25%
  formSubmission: 0.25 // 25%
};

// Targets for max score
const TARGETS = {
  timeOnPageSeconds: 120,  // 2 minutes
  scrollDepthPercent: 75   // 75%
};

// Minimum sessions before auto-rating
const MIN_SESSIONS_FOR_RATING = 3;

interface AnalyticsTrackRequest {
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

interface AnalyticsSession {
  sessionId: string;
  propertyId: string;
  propertySlug: string;
  avatarResearchId?: string;
  buyerSegment?: string;
  timeOnPageSeconds: number;
  maxScrollDepth: number;
  ctaClicks: number;
  formSubmitted: boolean;
  videoPlayed: boolean;
  effectivenessScore: number;
  timestamp: string;
}

/**
 * Retry fetch with exponential backoff
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = 3
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      if (response.status === 429) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      return response;
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries) {
        throw error;
      }
    }
  }

  throw lastError || new Error('Failed after retries');
}

/**
 * Calculate effectiveness score from session metrics
 */
function calculateEffectivenessScore(session: AnalyticsTrackRequest): number {
  // Time score: linear up to 2 minutes (120 seconds)
  const timeScore = Math.min(session.timeOnPageSeconds / TARGETS.timeOnPageSeconds, 1) * 10;

  // Scroll score: linear up to 75%
  const scrollScore = Math.min(session.maxScrollDepth / TARGETS.scrollDepthPercent, 1) * 10;

  // CTA score: binary (any click = 10)
  const ctaScore = session.ctaClicks > 0 ? 10 : 0;

  // Form score: binary (submitted = 10)
  const formScore = session.formSubmitted ? 10 : 0;

  // Weighted average
  const effectiveness =
    timeScore * WEIGHTS.timeOnPage +
    scrollScore * WEIGHTS.scrollDepth +
    ctaScore * WEIGHTS.ctaClicks +
    formScore * WEIGHTS.formSubmission;

  return Math.round(effectiveness * 10) / 10; // 1 decimal place
}

/**
 * Calculate aggregated effectiveness from multiple sessions
 */
function calculateAggregateEffectiveness(sessions: AnalyticsSession[]): number {
  if (sessions.length === 0) return 0;

  // Time score: average
  const avgTimeScore = sessions.reduce((sum, s) => {
    return sum + Math.min(s.timeOnPageSeconds / TARGETS.timeOnPageSeconds, 1) * 10;
  }, 0) / sessions.length;

  // Scroll score: average
  const avgScrollScore = sessions.reduce((sum, s) => {
    return sum + Math.min(s.maxScrollDepth / TARGETS.scrollDepthPercent, 1) * 10;
  }, 0) / sessions.length;

  // CTA click rate
  const ctaClickRate = sessions.filter(s => s.ctaClicks > 0).length / sessions.length;
  const ctaScore = ctaClickRate * 10;

  // Form submission rate
  const formRate = sessions.filter(s => s.formSubmitted).length / sessions.length;
  const formScore = formRate * 10;

  // Weighted average
  const effectiveness =
    avgTimeScore * WEIGHTS.timeOnPage +
    avgScrollScore * WEIGHTS.scrollDepth +
    ctaScore * WEIGHTS.ctaClicks +
    formScore * WEIGHTS.formSubmission;

  return Math.round(effectiveness * 10) / 10;
}

/**
 * Save analytics session to Airtable
 */
async function airtableSaveSession(session: AnalyticsSession): Promise<boolean> {
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    console.warn('[analytics] Airtable credentials not configured');
    return false;
  }

  try {
    const url = `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${ANALYTICS_TABLE}`;

    const fields = {
      'SessionID': session.sessionId,
      'PropertyID': session.propertyId,
      'PropertySlug': session.propertySlug,
      'AvatarResearchID': session.avatarResearchId || null,
      'BuyerSegment': session.buyerSegment || null,
      'TimeOnPage': session.timeOnPageSeconds,
      'MaxScrollDepth': session.maxScrollDepth,
      'CTAClicks': session.ctaClicks,
      'FormSubmitted': session.formSubmitted,
      'VideoPlayed': session.videoPlayed,
      'EffectivenessScore': session.effectivenessScore,
      'Timestamp': session.timestamp
    };

    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[analytics] Airtable POST error:', errorText);
      return false;
    }

    console.log('[analytics] Session saved:', session.sessionId);
    return true;
  } catch (error) {
    console.error('[analytics] Error saving session:', error);
    return false;
  }
}

/**
 * Get sessions for an avatar research entry
 */
async function airtableGetSessionsByAvatarResearch(avatarResearchId: string): Promise<AnalyticsSession[]> {
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    return [];
  }

  try {
    const formula = encodeURIComponent(`{AvatarResearchID}="${avatarResearchId}"`);
    const url = `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${ANALYTICS_TABLE}?filterByFormula=${formula}`;

    const response = await fetchWithRetry(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
      },
    });

    if (!response.ok) {
      console.error('[analytics] Failed to fetch sessions');
      return [];
    }

    const data = await response.json();
    return (data.records || []).map((record: any) => ({
      sessionId: record.fields.SessionID,
      propertyId: record.fields.PropertyID,
      propertySlug: record.fields.PropertySlug,
      avatarResearchId: record.fields.AvatarResearchID,
      buyerSegment: record.fields.BuyerSegment,
      timeOnPageSeconds: record.fields.TimeOnPage || 0,
      maxScrollDepth: record.fields.MaxScrollDepth || 0,
      ctaClicks: record.fields.CTAClicks || 0,
      formSubmitted: record.fields.FormSubmitted || false,
      videoPlayed: record.fields.VideoPlayed || false,
      effectivenessScore: record.fields.EffectivenessScore || 0,
      timestamp: record.fields.Timestamp
    }));
  } catch (error) {
    console.error('[analytics] Error fetching sessions:', error);
    return [];
  }
}

/**
 * Get aggregated stats for a property
 */
async function airtableGetAggregatedStats(propertyId?: string, propertySlug?: string): Promise<any> {
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    return null;
  }

  try {
    let formula = '';
    if (propertyId) {
      formula = encodeURIComponent(`{PropertyID}="${propertyId}"`);
    } else if (propertySlug) {
      formula = encodeURIComponent(`{PropertySlug}="${propertySlug}"`);
    } else {
      return null;
    }

    const url = `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${ANALYTICS_TABLE}?filterByFormula=${formula}`;

    const response = await fetchWithRetry(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const sessions: AnalyticsSession[] = (data.records || []).map((record: any) => ({
      sessionId: record.fields.SessionID,
      propertyId: record.fields.PropertyID,
      propertySlug: record.fields.PropertySlug,
      timeOnPageSeconds: record.fields.TimeOnPage || 0,
      maxScrollDepth: record.fields.MaxScrollDepth || 0,
      ctaClicks: record.fields.CTAClicks || 0,
      formSubmitted: record.fields.FormSubmitted || false,
      videoPlayed: record.fields.VideoPlayed || false,
      effectivenessScore: record.fields.EffectivenessScore || 0,
      timestamp: record.fields.Timestamp
    }));

    if (sessions.length === 0) {
      return {
        propertyId: propertyId || propertySlug,
        totalSessions: 0,
        avgTimeOnPage: 0,
        avgScrollDepth: 0,
        ctaClickRate: 0,
        formSubmissionRate: 0,
        videoPlayRate: 0,
        avgEffectivenessScore: 0
      };
    }

    return {
      propertyId: propertyId || propertySlug,
      totalSessions: sessions.length,
      avgTimeOnPage: Math.round(sessions.reduce((sum, s) => sum + s.timeOnPageSeconds, 0) / sessions.length),
      avgScrollDepth: Math.round(sessions.reduce((sum, s) => sum + s.maxScrollDepth, 0) / sessions.length),
      ctaClickRate: Math.round((sessions.filter(s => s.ctaClicks > 0).length / sessions.length) * 100),
      formSubmissionRate: Math.round((sessions.filter(s => s.formSubmitted).length / sessions.length) * 100),
      videoPlayRate: Math.round((sessions.filter(s => s.videoPlayed).length / sessions.length) * 100),
      avgEffectivenessScore: calculateAggregateEffectiveness(sessions)
    };
  } catch (error) {
    console.error('[analytics] Error getting aggregated stats:', error);
    return null;
  }
}

/**
 * Auto-rate avatar research based on analytics
 */
async function autoRateAvatarResearch(avatarResearchId: string, buyerSegment: string): Promise<number | null> {
  // Get all sessions for this avatar research
  const sessions = await airtableGetSessionsByAvatarResearch(avatarResearchId);

  if (sessions.length < MIN_SESSIONS_FOR_RATING) {
    console.log(`[analytics] Not enough sessions for auto-rating (${sessions.length}/${MIN_SESSIONS_FOR_RATING})`);
    return null;
  }

  // Calculate aggregate effectiveness
  const effectiveness = calculateAggregateEffectiveness(sessions);

  // Call the existing avatar-research rate endpoint
  try {
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3001';

    const response = await fetch(`${baseUrl}/api/funnel/avatar-research?action=rate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        researchId: avatarResearchId,
        segment: buyerSegment,
        effectiveness,
        feedback: {
          autoRated: true,
          sessionCount: sessions.length,
          ratedAt: new Date().toISOString()
        }
      })
    });

    if (response.ok) {
      console.log(`[analytics] Auto-rated avatar research ${avatarResearchId}: ${effectiveness}`);
      return effectiveness;
    } else {
      console.error('[analytics] Failed to auto-rate:', await response.text());
      return null;
    }
  } catch (error) {
    console.error('[analytics] Error auto-rating:', error);
    return null;
  }
}

/**
 * Main handler
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const action = req.query.action as string;

  try {
    switch (action) {
      case 'track': {
        if (req.method !== 'POST') {
          return res.status(405).json({ error: 'Method not allowed' });
        }

        const data = req.body as AnalyticsTrackRequest;

        // Validate required fields
        if (!data.propertySlug || !data.sessionId) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        // Calculate effectiveness score
        const effectivenessScore = calculateEffectivenessScore(data);

        // Build session object
        const session: AnalyticsSession = {
          sessionId: data.sessionId,
          propertyId: data.propertyId,
          propertySlug: data.propertySlug,
          avatarResearchId: data.avatarResearchId,
          buyerSegment: data.buyerSegment,
          timeOnPageSeconds: data.timeOnPageSeconds,
          maxScrollDepth: data.maxScrollDepth,
          ctaClicks: data.ctaClicks,
          formSubmitted: data.formSubmitted,
          videoPlayed: data.videoPlayed,
          effectivenessScore,
          timestamp: data.timestamp || new Date().toISOString()
        };

        // Save to Airtable
        const saved = await airtableSaveSession(session);

        // Auto-rate if form was submitted (high-value signal)
        let autoRated = false;
        if (data.formSubmitted && data.avatarResearchId && data.buyerSegment) {
          const rating = await autoRateAvatarResearch(data.avatarResearchId, data.buyerSegment);
          autoRated = rating !== null;
        }

        return res.status(200).json({
          success: true,
          saved,
          effectivenessScore,
          autoRated
        });
      }

      case 'aggregate': {
        if (req.method !== 'GET') {
          return res.status(405).json({ error: 'Method not allowed' });
        }

        const { propertyId, propertySlug } = req.query;
        const stats = await airtableGetAggregatedStats(
          propertyId as string,
          propertySlug as string
        );

        return res.status(200).json({
          success: true,
          stats
        });
      }

      case 'auto-rate': {
        if (req.method !== 'POST') {
          return res.status(405).json({ error: 'Method not allowed' });
        }

        const { avatarResearchId, buyerSegment } = req.body;

        if (!avatarResearchId || !buyerSegment) {
          return res.status(400).json({ error: 'Missing avatarResearchId or buyerSegment' });
        }

        const rating = await autoRateAvatarResearch(avatarResearchId, buyerSegment);

        return res.status(200).json({
          success: rating !== null,
          rating
        });
      }

      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }
  } catch (error) {
    console.error('[analytics] Handler error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: (error as Error).message
    });
  }
}
