import type { VercelRequest, VercelResponse } from '@vercel/node';
import Airtable from 'airtable';

// Initialize Airtable
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID || ''
);

const FUNNEL_ANALYTICS_TABLE = 'FunnelAnalytics';

interface AnalyticsPayload {
  sessionId: string;
  propertyId?: string;
  propertySlug?: string;
  buyerSegment?: string;
  avatarResearchId?: string;
  maxScrollDepth?: number;
  timeOnPage?: number;
  ctaClicks?: number;
  formSubmitted?: boolean;
  videoPlayed?: boolean;
}

interface AggregatedMetrics {
  totalSessions: number;
  avgScrollDepth: number;
  avgTimeOnPage: number;
  avgCTAClicks: number;
  conversionRate: number;
  videoPlayRate: number;
  bySegment: Record<string, {
    sessions: number;
    avgScrollDepth: number;
    avgTimeOnPage: number;
    ctaClickRate: number;
    conversionRate: number;
  }>;
  byProperty: Record<string, {
    sessions: number;
    avgScrollDepth: number;
    conversions: number;
  }>;
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).setHeader('Access-Control-Allow-Origin', '*')
      .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
      .setHeader('Access-Control-Allow-Headers', 'Content-Type')
      .end();
  }

  // Set CORS headers for all responses
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  const action = req.query.action as string;

  try {
    switch (action) {
      case 'track':
        return handleTrack(req, res);
      case 'update':
        return handleUpdate(req, res);
      case 'metrics':
        return handleMetrics(req, res);
      case 'property-metrics':
        return handlePropertyMetrics(req, res);
      default:
        return res.status(400).json({
          error: 'Unknown action',
          validActions: ['track', 'update', 'metrics', 'property-metrics']
        });
    }
  } catch (error) {
    console.error('Analytics API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Create new session tracking record
async function handleTrack(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const payload: AnalyticsPayload = req.body;

  if (!payload.sessionId) {
    return res.status(400).json({ error: 'sessionId is required' });
  }

  // Check if session already exists
  const existingRecords = await base(FUNNEL_ANALYTICS_TABLE)
    .select({
      filterByFormula: `{SessionID} = '${payload.sessionId}'`,
      maxRecords: 1
    })
    .firstPage();

  if (existingRecords.length > 0) {
    // Session exists, return existing record ID for updates
    return res.status(200).json({
      success: true,
      message: 'Session already exists',
      recordId: existingRecords[0].id,
      isExisting: true
    });
  }

  // Create new session record
  const record = await base(FUNNEL_ANALYTICS_TABLE).create({
    SessionID: payload.sessionId,
    PropertyID: payload.propertyId || '',
    PropertySlug: payload.propertySlug || '',
    BuyerSegment: payload.buyerSegment || '',
    AvatarResearchID: payload.avatarResearchId || '',
    MaxScrollDepth: payload.maxScrollDepth || 0,
    TimeOnPage: payload.timeOnPage || 0,
    CTAClicks: payload.ctaClicks || 0,
    FormSubmitted: payload.formSubmitted || false,
    VideoPlayed: payload.videoPlayed || false,
    EffectivenessScore: 0
  });

  return res.status(200).json({
    success: true,
    message: 'Session tracking started',
    recordId: record.id,
    isExisting: false
  });
}

// Update existing session with new data
async function handleUpdate(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sessionId, ...updates } = req.body as AnalyticsPayload & { recordId?: string };

  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId is required' });
  }

  // Find the session record
  const records = await base(FUNNEL_ANALYTICS_TABLE)
    .select({
      filterByFormula: `{SessionID} = '${sessionId}'`,
      maxRecords: 1
    })
    .firstPage();

  if (records.length === 0) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const record = records[0];
  const currentFields = record.fields;

  // Build update object, only updating fields that are provided and greater than current
  const updateFields: Record<string, any> = {};

  if (updates.maxScrollDepth !== undefined) {
    const currentScroll = (currentFields.MaxScrollDepth as number) || 0;
    updateFields.MaxScrollDepth = Math.max(currentScroll, updates.maxScrollDepth);
  }

  if (updates.timeOnPage !== undefined) {
    const currentTime = (currentFields.TimeOnPage as number) || 0;
    updateFields.TimeOnPage = Math.max(currentTime, updates.timeOnPage);
  }

  if (updates.ctaClicks !== undefined) {
    const currentClicks = (currentFields.CTAClicks as number) || 0;
    updateFields.CTAClicks = currentClicks + updates.ctaClicks;
  }

  if (updates.formSubmitted) {
    updateFields.FormSubmitted = true;
  }

  if (updates.videoPlayed) {
    updateFields.VideoPlayed = true;
  }

  // Calculate effectiveness score
  const scrollDepth = updateFields.MaxScrollDepth ?? (currentFields.MaxScrollDepth as number) ?? 0;
  const timeOnPage = updateFields.TimeOnPage ?? (currentFields.TimeOnPage as number) ?? 0;
  const ctaClicks = updateFields.CTAClicks ?? (currentFields.CTAClicks as number) ?? 0;
  const formSubmitted = updateFields.FormSubmitted ?? currentFields.FormSubmitted ?? false;

  // Effectiveness = weighted score (scroll 30%, time 20%, clicks 20%, conversion 30%)
  const scrollScore = Math.min(scrollDepth / 100, 1) * 30;
  const timeScore = Math.min(timeOnPage / 120, 1) * 20; // Cap at 2 minutes
  const clickScore = Math.min(ctaClicks / 3, 1) * 20; // Cap at 3 clicks
  const conversionScore = formSubmitted ? 30 : 0;

  updateFields.EffectivenessScore = Math.round(scrollScore + timeScore + clickScore + conversionScore);

  // Update record
  await base(FUNNEL_ANALYTICS_TABLE).update(record.id, updateFields);

  return res.status(200).json({
    success: true,
    message: 'Session updated',
    updates: updateFields
  });
}

// Get aggregated metrics for AI Performance dashboard
async function handleMetrics(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const days = parseInt(req.query.days as string) || 30;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  // Fetch all records within timeframe
  const records: Airtable.Record<any>[] = [];
  await base(FUNNEL_ANALYTICS_TABLE)
    .select({
      filterByFormula: `IS_AFTER({TimeStamp}, '${cutoffDate.toISOString().split('T')[0]}')`
    })
    .eachPage((pageRecords, fetchNextPage) => {
      records.push(...pageRecords);
      fetchNextPage();
    });

  if (records.length === 0) {
    return res.status(200).json({
      success: true,
      metrics: {
        totalSessions: 0,
        avgScrollDepth: 0,
        avgTimeOnPage: 0,
        avgCTAClicks: 0,
        conversionRate: 0,
        videoPlayRate: 0,
        bySegment: {},
        byProperty: {}
      },
      period: `${days} days`,
      message: 'No data available for this period'
    });
  }

  // Aggregate metrics
  const metrics: AggregatedMetrics = {
    totalSessions: records.length,
    avgScrollDepth: 0,
    avgTimeOnPage: 0,
    avgCTAClicks: 0,
    conversionRate: 0,
    videoPlayRate: 0,
    bySegment: {},
    byProperty: {}
  };

  let totalScrollDepth = 0;
  let totalTimeOnPage = 0;
  let totalCTAClicks = 0;
  let conversions = 0;
  let videoPlays = 0;

  const segmentData: Record<string, {
    sessions: number;
    scrollDepth: number;
    timeOnPage: number;
    clicks: number;
    conversions: number
  }> = {};

  const propertyData: Record<string, {
    sessions: number;
    scrollDepth: number;
    conversions: number;
    slug: string;
  }> = {};

  for (const record of records) {
    const fields = record.fields;

    const scrollDepth = (fields.MaxScrollDepth as number) || 0;
    const timeOnPage = (fields.TimeOnPage as number) || 0;
    const ctaClicks = (fields.CTAClicks as number) || 0;
    const formSubmitted = fields.FormSubmitted as boolean;
    const videoPlayed = fields.VideoPlayed as boolean;
    const segment = (fields.BuyerSegment as string) || 'unknown';
    const propertyId = (fields.PropertyID as string) || 'unknown';
    const propertySlug = (fields.PropertySlug as string) || '';

    totalScrollDepth += scrollDepth;
    totalTimeOnPage += timeOnPage;
    totalCTAClicks += ctaClicks;
    if (formSubmitted) conversions++;
    if (videoPlayed) videoPlays++;

    // Aggregate by segment
    if (!segmentData[segment]) {
      segmentData[segment] = { sessions: 0, scrollDepth: 0, timeOnPage: 0, clicks: 0, conversions: 0 };
    }
    segmentData[segment].sessions++;
    segmentData[segment].scrollDepth += scrollDepth;
    segmentData[segment].timeOnPage += timeOnPage;
    segmentData[segment].clicks += ctaClicks;
    if (formSubmitted) segmentData[segment].conversions++;

    // Aggregate by property
    if (propertyId && propertyId !== 'unknown') {
      if (!propertyData[propertyId]) {
        propertyData[propertyId] = { sessions: 0, scrollDepth: 0, conversions: 0, slug: propertySlug };
      }
      propertyData[propertyId].sessions++;
      propertyData[propertyId].scrollDepth += scrollDepth;
      if (formSubmitted) propertyData[propertyId].conversions++;
    }
  }

  // Calculate averages
  metrics.avgScrollDepth = Math.round(totalScrollDepth / records.length);
  metrics.avgTimeOnPage = Math.round(totalTimeOnPage / records.length);
  metrics.avgCTAClicks = Math.round((totalCTAClicks / records.length) * 10) / 10;
  metrics.conversionRate = Math.round((conversions / records.length) * 1000) / 10;
  metrics.videoPlayRate = Math.round((videoPlays / records.length) * 1000) / 10;

  // Calculate segment metrics
  for (const [segment, data] of Object.entries(segmentData)) {
    metrics.bySegment[segment] = {
      sessions: data.sessions,
      avgScrollDepth: Math.round(data.scrollDepth / data.sessions),
      avgTimeOnPage: Math.round(data.timeOnPage / data.sessions),
      ctaClickRate: Math.round((data.clicks / data.sessions) * 100) / 100,
      conversionRate: Math.round((data.conversions / data.sessions) * 1000) / 10
    };
  }

  // Calculate property metrics (top 10)
  const sortedProperties = Object.entries(propertyData)
    .sort((a, b) => b[1].sessions - a[1].sessions)
    .slice(0, 10);

  for (const [propertyId, data] of sortedProperties) {
    metrics.byProperty[propertyId] = {
      sessions: data.sessions,
      avgScrollDepth: Math.round(data.scrollDepth / data.sessions),
      conversions: data.conversions
    };
  }

  return res.status(200).json({
    success: true,
    metrics,
    period: `${days} days`,
    recordCount: records.length
  });
}

// Get metrics for a specific property
async function handlePropertyMetrics(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const propertyId = req.query.propertyId as string;

  if (!propertyId) {
    return res.status(400).json({ error: 'propertyId is required' });
  }

  const records: Airtable.Record<any>[] = [];
  await base(FUNNEL_ANALYTICS_TABLE)
    .select({
      filterByFormula: `{PropertyID} = '${propertyId}'`
    })
    .eachPage((pageRecords, fetchNextPage) => {
      records.push(...pageRecords);
      fetchNextPage();
    });

  if (records.length === 0) {
    return res.status(200).json({
      success: true,
      propertyId,
      metrics: null,
      message: 'No analytics data for this property'
    });
  }

  let totalScrollDepth = 0;
  let totalTimeOnPage = 0;
  let totalCTAClicks = 0;
  let conversions = 0;
  let videoPlays = 0;

  for (const record of records) {
    const fields = record.fields;
    totalScrollDepth += (fields.MaxScrollDepth as number) || 0;
    totalTimeOnPage += (fields.TimeOnPage as number) || 0;
    totalCTAClicks += (fields.CTAClicks as number) || 0;
    if (fields.FormSubmitted) conversions++;
    if (fields.VideoPlayed) videoPlays++;
  }

  return res.status(200).json({
    success: true,
    propertyId,
    metrics: {
      totalSessions: records.length,
      avgScrollDepth: Math.round(totalScrollDepth / records.length),
      avgTimeOnPage: Math.round(totalTimeOnPage / records.length),
      avgCTAClicks: Math.round((totalCTAClicks / records.length) * 10) / 10,
      conversionRate: Math.round((conversions / records.length) * 1000) / 10,
      videoPlayRate: Math.round((videoPlays / records.length) * 1000) / 10,
      totalConversions: conversions
    }
  });
}
