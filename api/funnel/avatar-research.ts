/**
 * Avatar Research API v2.0 - "Persist & Grow" System
 *
 * Pre-generation step that deeply researches the target buyer avatar.
 * Now with persistence, history tracking, effectiveness rating, and learning.
 *
 * Actions:
 * - generate: Generate new research (auto-saves)
 * - history: Get research history for a segment
 * - rate: Rate effectiveness of a research entry
 * - insights: Get learned insights for a segment
 * - link: Link research to a property funnel
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// Lazy-loaded OpenAI client to avoid module initialization crashes on Vercel
let openaiClient: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

// Airtable configuration
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_API_URL = 'https://api.airtable.com/v0';
const AVATAR_RESEARCH_TABLE = 'AvatarResearch';
const AVATAR_TEMPLATES_TABLE = 'AvatarTemplates'; // NEW: Evolving templates per segment

// Check if running on Vercel
const IS_VERCEL = process.env.VERCEL === '1' || process.env.VERCEL_ENV !== undefined;

// Import buyer avatars from the unified system with fallback
let avatarSystem: any = null;
try {
  const avatarPath = path.resolve(process.cwd(), 'src/data/ai-funnel-prompt-system.json');
  avatarSystem = JSON.parse(fs.readFileSync(avatarPath, 'utf-8'));
} catch {
  // Minimal fallback for Vercel
  avatarSystem = {
    buyerAvatars: {
      'first-time-buyer': { label: 'First-Time Buyer', dreams: [], fears: [], suspicions: [], failures: [], enemies: [], topObjections: [], beforeState: {}, afterState: {} },
      'credit-challenged': { label: 'Credit-Challenged', dreams: [], fears: [], suspicions: [], failures: [], enemies: [], topObjections: [], beforeState: {}, afterState: {} },
      'investor': { label: 'Investor', dreams: [], fears: [], suspicions: [], failures: [], enemies: [], topObjections: [], beforeState: {}, afterState: {} },
      'move-up-buyer': { label: 'Move-Up Buyer', dreams: [], fears: [], suspicions: [], failures: [], enemies: [], topObjections: [], beforeState: {}, afterState: {} },
      'self-employed': { label: 'Self-Employed', dreams: [], fears: [], suspicions: [], failures: [], enemies: [], topObjections: [], beforeState: {}, afterState: {} },
      'general': { label: 'General', dreams: [], fears: [], suspicions: [], failures: [], enemies: [], topObjections: [], beforeState: {}, afterState: {} }
    }
  };
}

// Types
type BuyerSegment = 'first-time-buyer' | 'credit-challenged' | 'investor' | 'move-up-buyer' | 'self-employed' | 'hispanic-seller-finance' | 'general' | 'custom';

interface PropertyContext {
  type?: string;
  city?: string;
  priceRange?: string;
}

interface AvatarResearchResult {
  buyerSegment: BuyerSegment;
  dreams: string[];
  fears: string[];
  suspicions: string[];
  failures: string[];
  enemies: string[];
  diaryEntry: string;
  keyFrustrations: string[];
  emotionalTriggers: string[];
  beforeState: { feelings: string; daily: string; status: string };
  afterState: { feelings: string; daily: string; status: string };
  transformationNarrative: string;
  objections: Array<{ objection: string; counter: string; proofPoint?: string }>;
  recommendedHooks: string[];
  recommendedAppeals: string[];
}

interface ResearchFeedback {
  liked: string[];
  disliked: string[];
  notes?: string;
}

interface InsightItem {
  value: string;
  frequency: number;
  avgEffectiveness: number;
  lastSeen: string;
}

interface FormulaStatsEntry {
  formulaId: string;
  formulaName: string;
  usageCount: number;
  avgEffectiveness: number;
  lastUsed: string;
}

interface FormulaStats {
  landingPage: FormulaStatsEntry[];
  hook: FormulaStatsEntry[];
  problem: FormulaStatsEntry[];
  solution: FormulaStatsEntry[];
  showcase: FormulaStatsEntry[];
  proof: FormulaStatsEntry[];
  cta: FormulaStatsEntry[];
}

interface SegmentInsights {
  topDreams: InsightItem[];
  topFears: InsightItem[];
  topSuspicions: InsightItem[];
  topObjections: InsightItem[];
  mostEffectiveHooks: string[];
  avgEffectiveness: number;
  totalResearches: number;
  totalRated: number;
  lastUpdated: string;
  formulaStats?: FormulaStats;
}

interface FormulaSelection {
  landingPageFormula: string;
  hookFormula: string;
  problemFormula: string;
  solutionFormula: string;
  showcaseFormula: string;
  proofFormula: string;
  ctaFormula: string;
}

interface AvatarResearchEntry {
  id: string;
  createdAt: string;
  buyerSegment: BuyerSegment;
  propertyContext: PropertyContext;
  research: AvatarResearchResult;
  effectiveness?: number;
  feedback?: ResearchFeedback;
  usedInFunnels: string[];
  formulasUsed?: FormulaSelection;
}

interface AvatarResearchHistory {
  segment: BuyerSegment;
  version: number;
  lastUpdated: string;
  entries: AvatarResearchEntry[];
  insights: SegmentInsights;
}

// NEW: Evolving Avatar Template - grows with each 7+ rating
interface LearnedItem {
  text: string;
  source: 'original' | 'learned';
  avgRating?: number;
  usageCount?: number;
  addedAt?: string;
}

interface LearnedObjection {
  objection: string;
  counter: string;
  source: 'original' | 'learned';
  avgRating?: number;
  addedAt?: string;
}

interface AvatarTemplate {
  segment: BuyerSegment;
  label: string;
  version: number;
  lastUpdated: string;
  totalLearnings: number;
  // Core avatar fields - evolve over time
  dreams: LearnedItem[];
  fears: LearnedItem[];
  suspicions: LearnedItem[];
  failures: LearnedItem[];
  enemies: LearnedItem[];
  objections: LearnedObjection[];
  beforeState: { feelings: string; daily: string; status: string };
  afterState: { feelings: string; daily: string; status: string };
  // Optional extended fields (e.g., Hispanic segment)
  culturalValues?: Record<string, string>;
  messagingRules?: { neverSay: string[]; alwaysSay: string[] };
  decisionStyle?: Record<string, any>;
  airtableRecordId?: string; // Track Airtable record for updates
}

// Constants
const RESEARCH_DIR = path.resolve(process.cwd(), 'public/research/avatars');
const INSIGHTS_DIR = path.resolve(process.cwd(), 'public/research/insights');
const MAX_ENTRIES = 100;
const MIN_RATING_FOR_INSIGHTS = 7;
const MIN_ENTRIES_FOR_PATTERNS = 3;
const MAX_ITEMS_PER_CATEGORY = 15; // Cap growth to prevent bloat
const SIMILARITY_THRESHOLD = 0.7; // For deduplication (0-1, higher = stricter)

// ============================================================
// AIRTABLE OPERATIONS
// ============================================================

/**
 * Fetch with automatic retry on rate limit errors (429)
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`[Avatar Research] Airtable retry ${attempt}/${maxRetries} after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      const response = await fetch(url, options);

      if (response.status === 429 && attempt < maxRetries) {
        console.warn(`[Avatar Research] Airtable rate limited (429) on attempt ${attempt + 1}/${maxRetries + 1}`);
        lastError = new Error(`Rate limited: ${response.statusText}`);
        continue;
      }

      return response;
    } catch (error) {
      console.error(`[Avatar Research] Airtable fetch error on attempt ${attempt + 1}:`, error);
      lastError = error as Error;

      if (attempt === maxRetries) {
        throw error;
      }
    }
  }

  throw lastError || new Error('Failed after retries');
}

/**
 * Save a single avatar research entry to Airtable
 */
async function airtableSaveEntry(entry: AvatarResearchEntry): Promise<boolean> {
  console.log('[airtableSaveEntry] ====== STARTING ======');
  console.log('[airtableSaveEntry] Entry ID:', entry.id);
  console.log('[airtableSaveEntry] Has AIRTABLE_API_KEY:', !!AIRTABLE_API_KEY);
  console.log('[airtableSaveEntry] Has AIRTABLE_BASE_ID:', !!AIRTABLE_BASE_ID);
  console.log('[airtableSaveEntry] Table name:', AVATAR_RESEARCH_TABLE);

  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    console.warn('[airtableSaveEntry] Airtable credentials not configured - ABORTING');
    return false;
  }

  try {
    // Check if entry already exists
    console.log('[airtableSaveEntry] Checking for existing record...');
    const existingRecord = await airtableFindEntryById(entry.id);
    console.log('[airtableSaveEntry] Existing record:', existingRecord || 'NOT FOUND');

    // Format CreatedAt as YYYY-MM-DD for Airtable Date field compatibility
    const createdAtDate = entry.createdAt.split('T')[0]; // Extract just the date portion

    const fields = {
      'ID': entry.id,
      'Segment': entry.buyerSegment,
      'Research': JSON.stringify(entry.research),
      'Effectiveness': entry.effectiveness || null,
      'PropertyContext': JSON.stringify(entry.propertyContext),
      'Feedback': entry.feedback ? JSON.stringify(entry.feedback) : null,
      'UsedInFunnels': entry.usedInFunnels.join(','),
      'CreatedAt': createdAtDate,
    };
    console.log('[airtableSaveEntry] Fields prepared, Research length:', fields.Research?.length || 0);

    if (existingRecord) {
      // Update existing record
      console.log('[airtableSaveEntry] UPDATING existing record...');
      const url = `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${AVATAR_RESEARCH_TABLE}/${existingRecord}`;
      console.log('[airtableSaveEntry] PATCH URL:', url);

      const response = await fetchWithRetry(url, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fields }),
      });

      console.log('[airtableSaveEntry] PATCH response status:', response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[airtableSaveEntry] Airtable PATCH error:', errorText);
        return false;
      }
      console.log('[airtableSaveEntry] PATCH SUCCESS');
    } else {
      // Create new record
      console.log('[airtableSaveEntry] CREATING new record...');
      const url = `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${AVATAR_RESEARCH_TABLE}`;
      console.log('[airtableSaveEntry] POST URL:', url);

      const response = await fetchWithRetry(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fields }),
      });

      console.log('[airtableSaveEntry] POST response status:', response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[airtableSaveEntry] Airtable POST error:', errorText);
        return false;
      }

      const responseData = await response.json();
      console.log('[airtableSaveEntry] POST SUCCESS - Airtable record ID:', responseData?.id);
    }

    console.log('[airtableSaveEntry] ====== SUCCESS ====== Entry ID:', entry.id);
    return true;
  } catch (error) {
    console.error('[airtableSaveEntry] ====== ERROR ======');
    console.error('[airtableSaveEntry] Error type:', (error as Error)?.name);
    console.error('[airtableSaveEntry] Error message:', (error as Error)?.message);
    console.error('[airtableSaveEntry] Full error:', error);
    return false;
  }
}

/**
 * Find Airtable record ID by our entry ID
 */
async function airtableFindEntryById(entryId: string): Promise<string | null> {
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    return null;
  }

  try {
    const formula = encodeURIComponent(`{ID}="${entryId}"`);
    const response = await fetchWithRetry(
      `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${AVATAR_RESEARCH_TABLE}?filterByFormula=${formula}&maxRecords=1`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (data.records && data.records.length > 0) {
      return data.records[0].id;
    }

    return null;
  } catch (error) {
    console.error('[Avatar Research] Airtable find by ID failed:', error);
    return null;
  }
}

/**
 * Load all entries for a segment from Airtable
 */
async function airtableLoadEntriesBySegment(segment: BuyerSegment): Promise<AvatarResearchEntry[]> {
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    console.warn('[Avatar Research] Airtable credentials not configured');
    return [];
  }

  try {
    const formula = encodeURIComponent(`{Segment}="${segment}"`);
    const response = await fetchWithRetry(
      `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${AVATAR_RESEARCH_TABLE}?filterByFormula=${formula}&sort%5B0%5D%5Bfield%5D=CreatedAt&sort%5B0%5D%5Bdirection%5D=desc&maxRecords=${MAX_ENTRIES}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error('[Avatar Research] Airtable load error:', response.status, response.statusText);
      return [];
    }

    const data = await response.json();
    const entries: AvatarResearchEntry[] = [];

    for (const record of data.records || []) {
      try {
        const entry: AvatarResearchEntry = {
          id: record.fields['ID'] || record.id,
          createdAt: record.fields['CreatedAt'] || new Date().toISOString(),
          buyerSegment: record.fields['Segment'] || segment,
          propertyContext: record.fields['PropertyContext'] ? JSON.parse(record.fields['PropertyContext']) : {},
          research: record.fields['Research'] ? JSON.parse(record.fields['Research']) : null,
          effectiveness: record.fields['Effectiveness'] || undefined,
          feedback: record.fields['Feedback'] ? JSON.parse(record.fields['Feedback']) : undefined,
          usedInFunnels: record.fields['UsedInFunnels'] ? record.fields['UsedInFunnels'].split(',').filter(Boolean) : [],
        };
        entries.push(entry);
      } catch (parseError) {
        console.warn('[Avatar Research] Error parsing Airtable record:', parseError);
      }
    }

    console.log(`[Avatar Research] Loaded ${entries.length} entries from Airtable for segment: ${segment}`);
    return entries;
  } catch (error) {
    console.error('[Avatar Research] Airtable load failed:', error);
    return [];
  }
}

/**
 * Get a single entry by ID from Airtable
 */
async function airtableGetEntry(entryId: string, segment: BuyerSegment): Promise<AvatarResearchEntry | null> {
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    return null;
  }

  try {
    const formula = encodeURIComponent(`AND({ID}="${entryId}",{Segment}="${segment}")`);
    const response = await fetchWithRetry(
      `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${AVATAR_RESEARCH_TABLE}?filterByFormula=${formula}&maxRecords=1`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (!data.records || data.records.length === 0) {
      return null;
    }

    const record = data.records[0];
    return {
      id: record.fields['ID'] || record.id,
      createdAt: record.fields['CreatedAt'] || new Date().toISOString(),
      buyerSegment: record.fields['Segment'] || segment,
      propertyContext: record.fields['PropertyContext'] ? JSON.parse(record.fields['PropertyContext']) : {},
      research: record.fields['Research'] ? JSON.parse(record.fields['Research']) : null,
      effectiveness: record.fields['Effectiveness'] || undefined,
      feedback: record.fields['Feedback'] ? JSON.parse(record.fields['Feedback']) : undefined,
      usedInFunnels: record.fields['UsedInFunnels'] ? record.fields['UsedInFunnels'].split(',').filter(Boolean) : [],
    };
  } catch (error) {
    console.error('[Avatar Research] Airtable get entry failed:', error);
    return null;
  }
}

// ============================================================
// AVATAR TEMPLATES - Evolving base templates (NEW)
// ============================================================

/**
 * Simple similarity check using Jaccard index on words
 * Returns 0-1 where 1 is identical
 */
function textSimilarity(a: string, b: string): number {
  const wordsA = a.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const wordsB = b.toLowerCase().split(/\s+/).filter(w => w.length > 2);

  if (wordsA.length === 0 || wordsB.length === 0) return 0;

  const setA = new Set(wordsA);
  const setB = new Set(wordsB);

  // Count intersection
  let intersectionCount = 0;
  wordsA.forEach(word => {
    if (setB.has(word)) intersectionCount++;
  });

  // Union = A + B - intersection
  const unionCount = setA.size + setB.size - intersectionCount;

  return unionCount > 0 ? intersectionCount / unionCount : 0;
}

/**
 * Check if an item is a duplicate of existing items
 */
function isDuplicate(newText: string, existing: LearnedItem[]): boolean {
  return existing.some(item => textSimilarity(newText, item.text) >= SIMILARITY_THRESHOLD);
}

/**
 * Load avatar template from Airtable
 */
async function loadAvatarTemplate(segment: BuyerSegment): Promise<AvatarTemplate | null> {
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    console.warn('[Avatar Templates] Airtable not configured, using static JSON');
    return null;
  }

  try {
    const formula = encodeURIComponent(`{Segment}="${segment}"`);
    const response = await fetchWithRetry(
      `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${AVATAR_TEMPLATES_TABLE}?filterByFormula=${formula}&maxRecords=1`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error('[Avatar Templates] Load failed:', response.status);
      return null;
    }

    const data = await response.json();
    if (!data.records || data.records.length === 0) {
      console.log(`[Avatar Templates] No template found for ${segment}, will need seeding`);
      return null;
    }

    const record = data.records[0];
    const template: AvatarTemplate = {
      segment,
      label: record.fields['Label'] || segment,
      version: record.fields['Version'] || 1,
      lastUpdated: record.fields['LastUpdated'] || new Date().toISOString(),
      totalLearnings: record.fields['TotalLearnings'] || 0,
      dreams: record.fields['Dreams'] ? JSON.parse(record.fields['Dreams']) : [],
      fears: record.fields['Fears'] ? JSON.parse(record.fields['Fears']) : [],
      suspicions: record.fields['Suspicions'] ? JSON.parse(record.fields['Suspicions']) : [],
      failures: record.fields['Failures'] ? JSON.parse(record.fields['Failures']) : [],
      enemies: record.fields['Enemies'] ? JSON.parse(record.fields['Enemies']) : [],
      objections: record.fields['Objections'] ? JSON.parse(record.fields['Objections']) : [],
      beforeState: record.fields['BeforeState'] ? JSON.parse(record.fields['BeforeState']) : { feelings: '', daily: '', status: '' },
      afterState: record.fields['AfterState'] ? JSON.parse(record.fields['AfterState']) : { feelings: '', daily: '', status: '' },
      culturalValues: record.fields['CulturalValues'] ? JSON.parse(record.fields['CulturalValues']) : undefined,
      messagingRules: record.fields['MessagingRules'] ? JSON.parse(record.fields['MessagingRules']) : undefined,
      decisionStyle: record.fields['DecisionStyle'] ? JSON.parse(record.fields['DecisionStyle']) : undefined,
      airtableRecordId: record.id,
    };

    console.log(`[Avatar Templates] Loaded template for ${segment}, version ${template.version}, ${template.totalLearnings} learnings`);
    return template;
  } catch (error) {
    console.error('[Avatar Templates] Load error:', error);
    return null;
  }
}

/**
 * Save avatar template to Airtable (create or update)
 */
async function saveAvatarTemplate(template: AvatarTemplate): Promise<boolean> {
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    console.warn('[Avatar Templates] Airtable not configured');
    return false;
  }

  try {
    const fields = {
      'Segment': template.segment,
      'Label': template.label,
      'Version': template.version,
      'LastUpdated': new Date().toISOString().split('T')[0],
      'TotalLearnings': template.totalLearnings,
      'Dreams': JSON.stringify(template.dreams),
      'Fears': JSON.stringify(template.fears),
      'Suspicions': JSON.stringify(template.suspicions),
      'Failures': JSON.stringify(template.failures),
      'Enemies': JSON.stringify(template.enemies),
      'Objections': JSON.stringify(template.objections),
      'BeforeState': JSON.stringify(template.beforeState),
      'AfterState': JSON.stringify(template.afterState),
      'CulturalValues': template.culturalValues ? JSON.stringify(template.culturalValues) : null,
      'MessagingRules': template.messagingRules ? JSON.stringify(template.messagingRules) : null,
      'DecisionStyle': template.decisionStyle ? JSON.stringify(template.decisionStyle) : null,
    };

    if (template.airtableRecordId) {
      // Update existing
      const response = await fetchWithRetry(
        `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${AVATAR_TEMPLATES_TABLE}/${template.airtableRecordId}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ fields }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Avatar Templates] Update failed:', errorText);
        return false;
      }

      console.log(`[Avatar Templates] Updated template for ${template.segment}`);
      return true;
    } else {
      // Create new
      const response = await fetchWithRetry(
        `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${AVATAR_TEMPLATES_TABLE}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ fields }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Avatar Templates] Create failed:', errorText);
        return false;
      }

      console.log(`[Avatar Templates] Created template for ${template.segment}`);
      return true;
    }
  } catch (error) {
    console.error('[Avatar Templates] Save error:', error);
    return false;
  }
}

/**
 * Convert static JSON avatar to AvatarTemplate format
 */
function convertToTemplate(segment: BuyerSegment, staticAvatar: any): AvatarTemplate {
  const toLearnedItems = (items: string[] | undefined): LearnedItem[] => {
    return (items || []).map(text => ({
      text,
      source: 'original' as const,
    }));
  };

  const toLearnedObjections = (objs: Array<{objection: string; counter: string}> | undefined): LearnedObjection[] => {
    return (objs || []).map(o => ({
      objection: o.objection,
      counter: o.counter,
      source: 'original' as const,
    }));
  };

  return {
    segment,
    label: staticAvatar.label || segment,
    version: 1,
    lastUpdated: new Date().toISOString(),
    totalLearnings: 0,
    dreams: toLearnedItems(staticAvatar.dreams),
    fears: toLearnedItems(staticAvatar.fears),
    suspicions: toLearnedItems(staticAvatar.suspicions),
    failures: toLearnedItems(staticAvatar.failures),
    enemies: toLearnedItems(staticAvatar.enemies),
    objections: toLearnedObjections(staticAvatar.topObjections),
    beforeState: staticAvatar.beforeState || { feelings: '', daily: '', status: '' },
    afterState: staticAvatar.afterState || { feelings: '', daily: '', status: '' },
    culturalValues: staticAvatar.culturalValues,
    messagingRules: staticAvatar.messagingRules,
    decisionStyle: staticAvatar.decisionStyle,
  };
}

/**
 * Merge high-rated research into template (called when rating >= 7)
 */
async function mergeLearnedResearchIntoTemplate(
  segment: BuyerSegment,
  research: AvatarResearchResult,
  rating: number
): Promise<{ merged: boolean; newItemsCount: number }> {
  console.log(`[Avatar Templates] Merging learnings from ${rating}/10 rated research into ${segment}`);

  // Load current template
  let template = await loadAvatarTemplate(segment);

  // If no template exists, create from static JSON
  if (!template) {
    const staticAvatar = avatarSystem?.buyerAvatars?.[segment];
    if (!staticAvatar) {
      console.warn(`[Avatar Templates] No static avatar found for ${segment}`);
      return { merged: false, newItemsCount: 0 };
    }
    template = convertToTemplate(segment, staticAvatar);
  }

  let newItemsCount = 0;
  const now = new Date().toISOString();

  // Helper to merge items
  const mergeItems = (existing: LearnedItem[], newTexts: string[]): LearnedItem[] => {
    const updated = [...existing];

    for (const text of newTexts) {
      if (!text || text.trim().length < 5) continue; // Skip empty/tiny items

      // Check for duplicates
      const existingMatch = updated.find(item => textSimilarity(text, item.text) >= SIMILARITY_THRESHOLD);

      if (existingMatch) {
        // Update existing item's rating
        if (existingMatch.source === 'learned') {
          const prevCount = existingMatch.usageCount || 1;
          const prevAvg = existingMatch.avgRating || rating;
          existingMatch.avgRating = (prevAvg * prevCount + rating) / (prevCount + 1);
          existingMatch.usageCount = prevCount + 1;
        }
      } else {
        // Add new item
        updated.push({
          text,
          source: 'learned',
          avgRating: rating,
          usageCount: 1,
          addedAt: now,
        });
        newItemsCount++;
      }
    }

    // Sort by avgRating (highest first) and cap at MAX_ITEMS_PER_CATEGORY
    return updated
      .sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0))
      .slice(0, MAX_ITEMS_PER_CATEGORY);
  };

  // Merge each category
  template.dreams = mergeItems(template.dreams, research.dreams || []);
  template.fears = mergeItems(template.fears, research.fears || []);
  template.suspicions = mergeItems(template.suspicions, research.suspicions || []);
  template.failures = mergeItems(template.failures, research.failures || []);
  template.enemies = mergeItems(template.enemies, research.enemies || []);

  // Merge objections (slightly different structure)
  for (const obj of research.objections || []) {
    if (!obj.objection || obj.objection.trim().length < 5) continue;

    const existingMatch = template.objections.find(o =>
      textSimilarity(obj.objection, o.objection) >= SIMILARITY_THRESHOLD
    );

    if (existingMatch && existingMatch.source === 'learned') {
      // Update rating
      const prevAvg = existingMatch.avgRating || rating;
      existingMatch.avgRating = (prevAvg + rating) / 2;
    } else if (!existingMatch) {
      template.objections.push({
        objection: obj.objection,
        counter: obj.counter,
        source: 'learned',
        avgRating: rating,
        addedAt: now,
      });
      newItemsCount++;
    }
  }

  // Cap objections
  template.objections = template.objections
    .sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0))
    .slice(0, MAX_ITEMS_PER_CATEGORY);

  // Update metadata
  template.version += 1;
  template.lastUpdated = now;
  template.totalLearnings += newItemsCount;

  // Save back to Airtable
  const saved = await saveAvatarTemplate(template);

  console.log(`[Avatar Templates] Merged ${newItemsCount} new items into ${segment}, version now ${template.version}`);

  return { merged: saved, newItemsCount };
}

/**
 * Get template for generation (Airtable first, then static JSON fallback)
 */
async function getTemplateForGeneration(segment: BuyerSegment): Promise<AvatarTemplate | null> {
  // Try Airtable first
  const template = await loadAvatarTemplate(segment);
  if (template) {
    return template;
  }

  // Fallback to static JSON
  const staticAvatar = avatarSystem?.buyerAvatars?.[segment];
  if (staticAvatar) {
    return convertToTemplate(segment, staticAvatar);
  }

  return null;
}

// ============================================================
// UNIFIED LOAD/SAVE (Airtable primary, filesystem fallback)
// ============================================================

async function loadHistoryAsync(segment: BuyerSegment): Promise<AvatarResearchHistory> {
  // Try Airtable first
  const airtableEntries = await airtableLoadEntriesBySegment(segment);

  if (airtableEntries.length > 0) {
    // Build history from Airtable entries
    const history = createEmptyHistory(segment);
    history.entries = airtableEntries;
    history.insights = calculateInsights(airtableEntries);
    history.lastUpdated = new Date().toISOString();
    return history;
  }

  // Fallback to filesystem (local dev)
  if (!IS_VERCEL) {
    const filePath = getHistoryFilePath(segment);
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(content);
      }
    } catch (error) {
      console.error(`[Avatar Research] Error loading history for ${segment}:`, error);
    }
  }

  return createEmptyHistory(segment);
}

// Sync version for backwards compatibility (tries filesystem only)
function loadHistory(segment: BuyerSegment): AvatarResearchHistory {
  if (!IS_VERCEL) {
    const filePath = getHistoryFilePath(segment);
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(content);
      }
    } catch (error) {
      console.error(`[Avatar Research] Error loading history for ${segment}:`, error);
    }
  }

  return createEmptyHistory(segment);
}

function getHistoryFilePath(segment: BuyerSegment): string {
  return path.join(RESEARCH_DIR, `${segment}.json`);
}

async function saveEntryAsync(entry: AvatarResearchEntry): Promise<boolean> {
  console.log('[saveEntryAsync] ====== STARTING ======');
  console.log('[saveEntryAsync] Entry ID:', entry.id);
  console.log('[saveEntryAsync] Entry segment:', entry.buyerSegment);
  console.log('[saveEntryAsync] IS_VERCEL:', IS_VERCEL);

  // Try Airtable first
  console.log('[saveEntryAsync] Calling airtableSaveEntry...');
  const savedToAirtable = await airtableSaveEntry(entry);
  console.log('[saveEntryAsync] airtableSaveEntry result:', savedToAirtable);

  // Also save to filesystem if not on Vercel (for local dev)
  if (!IS_VERCEL) {
    console.log('[saveEntryAsync] Saving to filesystem (local dev)...');
    try {
      const history = loadHistory(entry.buyerSegment);
      const existingIndex = history.entries.findIndex(e => e.id === entry.id);

      if (existingIndex >= 0) {
        history.entries[existingIndex] = entry;
      } else {
        history.entries.unshift(entry);
        if (history.entries.length > MAX_ENTRIES) {
          history.entries = history.entries.slice(0, MAX_ENTRIES);
        }
      }

      history.insights = calculateInsights(history.entries);
      history.lastUpdated = new Date().toISOString();

      if (!fs.existsSync(RESEARCH_DIR)) {
        fs.mkdirSync(RESEARCH_DIR, { recursive: true });
      }
      fs.writeFileSync(getHistoryFilePath(entry.buyerSegment), JSON.stringify(history, null, 2), 'utf-8');
      console.log('[saveEntryAsync] Filesystem save SUCCESS');
    } catch (error) {
      console.warn('[saveEntryAsync] Filesystem save FAILED:', error);
    }
  }

  console.log('[saveEntryAsync] ====== DONE ====== Airtable result:', savedToAirtable);
  return savedToAirtable;
}

function createEmptyHistory(segment: BuyerSegment): AvatarResearchHistory {
  return {
    segment,
    version: 1,
    lastUpdated: new Date().toISOString(),
    entries: [],
    insights: {
      topDreams: [],
      topFears: [],
      topSuspicions: [],
      topObjections: [],
      mostEffectiveHooks: [],
      avgEffectiveness: 0,
      totalResearches: 0,
      totalRated: 0,
      lastUpdated: new Date().toISOString(),
    },
  };
}

// ============================================================
// INSIGHTS CALCULATION
// ============================================================

function calculateInsights(entries: AvatarResearchEntry[]): SegmentInsights {
  const ratedEntries = entries.filter(e => e.effectiveness !== undefined);
  const highRatedEntries = ratedEntries.filter(e => (e.effectiveness || 0) >= MIN_RATING_FOR_INSIGHTS);

  // Aggregate dreams, fears, suspicions, objections
  const dreamCounts = new Map<string, { count: number; totalRating: number }>();
  const fearCounts = new Map<string, { count: number; totalRating: number }>();
  const suspicionCounts = new Map<string, { count: number; totalRating: number }>();
  const objectionCounts = new Map<string, { count: number; totalRating: number }>();
  const hookCounts = new Map<string, { count: number; totalRating: number }>();

  for (const entry of highRatedEntries) {
    // ✅ NULL SAFETY: Skip entries without research data
    if (!entry.research) {
      console.warn(`[Avatar Research] Entry ${entry.id} has null research, skipping insights calculation`);
      continue;
    }

    const rating = entry.effectiveness || 0;

    // Dreams
    for (const dream of entry.research.dreams || []) {
      const existing = dreamCounts.get(dream) || { count: 0, totalRating: 0 };
      dreamCounts.set(dream, { count: existing.count + 1, totalRating: existing.totalRating + rating });
    }

    // Fears
    for (const fear of entry.research.fears || []) {
      const existing = fearCounts.get(fear) || { count: 0, totalRating: 0 };
      fearCounts.set(fear, { count: existing.count + 1, totalRating: existing.totalRating + rating });
    }

    // Suspicions
    for (const suspicion of entry.research.suspicions || []) {
      const existing = suspicionCounts.get(suspicion) || { count: 0, totalRating: 0 };
      suspicionCounts.set(suspicion, { count: existing.count + 1, totalRating: existing.totalRating + rating });
    }

    // Objections
    for (const obj of entry.research.objections || []) {
      const existing = objectionCounts.get(obj.objection) || { count: 0, totalRating: 0 };
      objectionCounts.set(obj.objection, { count: existing.count + 1, totalRating: existing.totalRating + rating });
    }

    // Hooks
    for (const hook of entry.research.recommendedHooks || []) {
      const existing = hookCounts.get(hook) || { count: 0, totalRating: 0 };
      hookCounts.set(hook, { count: existing.count + 1, totalRating: existing.totalRating + rating });
    }
  }

  // Convert to sorted arrays
  const now = new Date().toISOString();

  const toInsightItems = (map: Map<string, { count: number; totalRating: number }>): InsightItem[] => {
    return Array.from(map.entries())
      .map(([value, { count, totalRating }]) => ({
        value,
        frequency: count,
        avgEffectiveness: count > 0 ? totalRating / count : 0,
        lastSeen: now,
      }))
      .sort((a, b) => b.avgEffectiveness - a.avgEffectiveness)
      .slice(0, 10); // Top 10
  };

  // Calculate average effectiveness
  const totalRating = ratedEntries.reduce((sum, e) => sum + (e.effectiveness || 0), 0);
  const avgEffectiveness = ratedEntries.length > 0 ? totalRating / ratedEntries.length : 0;

  // 🆕 Calculate formula stats for strategy learning
  const formulaStats = calculateFormulaStats(highRatedEntries);

  return {
    topDreams: toInsightItems(dreamCounts),
    topFears: toInsightItems(fearCounts),
    topSuspicions: toInsightItems(suspicionCounts),
    topObjections: toInsightItems(objectionCounts),
    mostEffectiveHooks: Array.from(hookCounts.entries())
      .sort((a, b) => b[1].totalRating / b[1].count - a[1].totalRating / a[1].count)
      .slice(0, 5)
      .map(([hook]) => hook),
    avgEffectiveness: Math.round(avgEffectiveness * 10) / 10,
    totalResearches: entries.length,
    totalRated: highRatedEntries.length,
    lastUpdated: now,
    formulaStats,
  };
}

/**
 * Calculate formula effectiveness stats from rated entries
 * Tracks which formulas work best for this segment
 */
function calculateFormulaStats(ratedEntries: AvatarResearchEntry[]): {
  landingPage: FormulaStatsEntry[];
  hook: FormulaStatsEntry[];
  problem: FormulaStatsEntry[];
  solution: FormulaStatsEntry[];
  showcase: FormulaStatsEntry[];
  proof: FormulaStatsEntry[];
  cta: FormulaStatsEntry[];
} {
  // Maps for each formula category: formulaId -> { totalRating, count, lastUsed }
  const lpStats = new Map<string, { totalRating: number; count: number; lastUsed: string }>();
  const hookStats = new Map<string, { totalRating: number; count: number; lastUsed: string }>();
  const problemStats = new Map<string, { totalRating: number; count: number; lastUsed: string }>();
  const solutionStats = new Map<string, { totalRating: number; count: number; lastUsed: string }>();
  const showcaseStats = new Map<string, { totalRating: number; count: number; lastUsed: string }>();
  const proofStats = new Map<string, { totalRating: number; count: number; lastUsed: string }>();
  const ctaStats = new Map<string, { totalRating: number; count: number; lastUsed: string }>();

  for (const entry of ratedEntries) {
    if (!entry.formulasUsed || !entry.effectiveness) continue;

    const rating = entry.effectiveness;
    const timestamp = entry.createdAt;

    // Helper to aggregate formula stats
    const aggregate = (map: Map<string, { totalRating: number; count: number; lastUsed: string }>, id: string) => {
      if (!id) return;
      const existing = map.get(id) || { totalRating: 0, count: 0, lastUsed: '' };
      map.set(id, {
        totalRating: existing.totalRating + rating,
        count: existing.count + 1,
        lastUsed: timestamp > existing.lastUsed ? timestamp : existing.lastUsed,
      });
    };

    aggregate(lpStats, entry.formulasUsed.landingPageFormula);
    aggregate(hookStats, entry.formulasUsed.hookFormula);
    aggregate(problemStats, entry.formulasUsed.problemFormula);
    aggregate(solutionStats, entry.formulasUsed.solutionFormula);
    aggregate(showcaseStats, entry.formulasUsed.showcaseFormula);
    aggregate(proofStats, entry.formulasUsed.proofFormula);
    aggregate(ctaStats, entry.formulasUsed.ctaFormula);
  }

  // Convert map to sorted array
  const toStatsArray = (map: Map<string, { totalRating: number; count: number; lastUsed: string }>): FormulaStatsEntry[] => {
    return Array.from(map.entries())
      .map(([formulaId, { totalRating, count, lastUsed }]) => ({
        formulaId,
        formulaName: formulaId, // Could be enriched with actual name from prompt system
        usageCount: count,
        avgEffectiveness: Math.round((totalRating / count) * 10) / 10,
        lastUsed,
      }))
      .sort((a, b) => b.avgEffectiveness - a.avgEffectiveness);
  };

  return {
    landingPage: toStatsArray(lpStats),
    hook: toStatsArray(hookStats),
    problem: toStatsArray(problemStats),
    solution: toStatsArray(solutionStats),
    showcase: toStatsArray(showcaseStats),
    proof: toStatsArray(proofStats),
    cta: toStatsArray(ctaStats),
  };
}

// ============================================================
// AVATAR GENERATION
// ============================================================

function getBaseAvatar(segment: BuyerSegment): Partial<AvatarResearchResult> | null {
  const avatars = avatarSystem.buyerAvatars as Record<string, typeof avatarSystem.buyerAvatars['first-time-buyer']>;
  if (segment === 'custom' || segment === 'general' || !avatars[segment]) {
    return null;
  }

  const avatar = avatars[segment];
  return {
    buyerSegment: segment,
    dreams: avatar.dreams,
    fears: avatar.fears,
    suspicions: avatar.suspicions,
    failures: avatar.failures,
    enemies: avatar.enemies,
    beforeState: avatar.beforeState,
    afterState: avatar.afterState,
    objections: avatar.topObjections.map(o => ({
      objection: o.objection,
      counter: o.counter,
    })),
  };
}

function getSegmentDescription(segment: BuyerSegment): string {
  const descriptions: Record<BuyerSegment, string> = {
    'first-time-buyer': 'First-time homebuyer who has never owned property, likely renting, dreaming of their first home',
    'credit-challenged': 'Buyer with credit challenges (score below 640) who has been rejected by traditional lenders',
    'investor': 'Real estate investor looking for cash flow or appreciation properties to add to their portfolio',
    'move-up-buyer': 'Current homeowner looking to upgrade to a larger or nicer home',
    'self-employed': 'Self-employed or business owner who has difficulty documenting income for traditional mortgages',
    'hispanic-seller-finance': 'Hispanic/Latino family seeking seller-financing in Southern Louisiana, often with ITIN, cash income, prioritizing familia, dignidad, and confianza',
    'general': 'General home buyer with no specific targeting',
    'custom': 'Custom buyer segment',
  };
  return descriptions[segment] || 'General home buyer';
}

function formatLearnedInsights(insights: SegmentInsights): string {
  if (insights.totalRated < MIN_ENTRIES_FOR_PATTERNS) {
    return '';
  }

  const sections: string[] = [];

  if (insights.topDreams.length > 0) {
    sections.push(`Top Dreams (proven effective):
${insights.topDreams.slice(0, 3).map(d => `- "${d.value}" (avg effectiveness: ${d.avgEffectiveness.toFixed(1)})`).join('\n')}`);
  }

  if (insights.topFears.length > 0) {
    sections.push(`Top Fears (proven effective):
${insights.topFears.slice(0, 3).map(f => `- "${f.value}" (avg effectiveness: ${f.avgEffectiveness.toFixed(1)})`).join('\n')}`);
  }

  if (insights.topObjections.length > 0) {
    sections.push(`Top Objections to Address:
${insights.topObjections.slice(0, 3).map(o => `- "${o.value}"`).join('\n')}`);
  }

  if (sections.length === 0) {
    return '';
  }

  return `
=== LEARNED INSIGHTS (from ${insights.totalRated} rated research entries) ===
Build on these proven patterns:

${sections.join('\n\n')}

Use these as a foundation but generate fresh, specific content.
`;
}

/**
 * Format evolved template content for AI prompt
 * Shows learned items with ratings to guide AI generation
 */
function formatTemplateForPrompt(template: AvatarTemplate): string {
  const sections: string[] = [];

  // Helper to format items with ratings
  const formatItems = (items: LearnedItem[], label: string): string => {
    if (items.length === 0) return '';

    const learned = items.filter(i => i.source === 'learned' && i.avgRating);
    const original = items.filter(i => i.source === 'original');

    let content = `**${label}:**\n`;

    if (learned.length > 0) {
      content += `PROVEN (high-rated):\n${learned.slice(0, 5).map(i =>
        `  - "${i.text}" (rated ${i.avgRating?.toFixed(1) || '?'}/10)`
      ).join('\n')}\n`;
    }

    if (original.length > 0) {
      content += `BASE KNOWLEDGE:\n${original.slice(0, 3).map(i =>
        `  - "${i.text}"`
      ).join('\n')}\n`;
    }

    return content;
  };

  sections.push(formatItems(template.dreams, 'Dreams'));
  sections.push(formatItems(template.fears, 'Fears'));
  sections.push(formatItems(template.suspicions, 'Suspicions'));
  sections.push(formatItems(template.failures, 'Past Failures'));
  sections.push(formatItems(template.enemies, 'Enemies'));

  // Objections
  if (template.objections.length > 0) {
    const learned = template.objections.filter(o => o.source === 'learned');
    const original = template.objections.filter(o => o.source === 'original');

    let objContent = '**Top Objections (with counters):**\n';

    if (learned.length > 0) {
      objContent += 'PROVEN:\n' + learned.slice(0, 3).map(o =>
        `  - "${o.objection}" → Counter: "${o.counter}" (rated ${o.avgRating?.toFixed(1) || '?'}/10)`
      ).join('\n') + '\n';
    }

    if (original.length > 0) {
      objContent += 'BASE:\n' + original.slice(0, 2).map(o =>
        `  - "${o.objection}" → Counter: "${o.counter}"`
      ).join('\n') + '\n';
    }

    sections.push(objContent);
  }

  // Before/After states
  if (template.beforeState.feelings || template.afterState.feelings) {
    sections.push(`**Transformation:**
BEFORE: ${template.beforeState.feelings} | ${template.beforeState.daily} | Status: ${template.beforeState.status}
AFTER: ${template.afterState.feelings} | ${template.afterState.daily} | Status: ${template.afterState.status}`);
  }

  // Cultural values (for hispanic-seller-finance)
  if (template.culturalValues) {
    sections.push(`**Cultural Values:**
${Object.entries(template.culturalValues).map(([k, v]) => `  - ${k}: ${v}`).join('\n')}`);
  }

  // Messaging rules
  if (template.messagingRules) {
    sections.push(`**Messaging Rules:**
NEVER SAY: ${template.messagingRules.neverSay?.join(', ') || 'N/A'}
ALWAYS SAY: ${template.messagingRules.alwaysSay?.join(', ') || 'N/A'}`);
  }

  const filtered = sections.filter(s => s.trim().length > 0);

  if (filtered.length === 0) return '';

  return `
=== EVOLVED AVATAR TEMPLATE (v${template.version}, ${template.totalLearnings} learnings) ===
This template has evolved from ${template.totalLearnings} user ratings. Prioritize PROVEN items.

${filtered.join('\n\n')}

INSTRUCTIONS: Use the PROVEN items as strong foundations. Create variations that capture the same emotional truth. Add fresh perspectives while honoring what's working.
`;
}

async function generateAvatarResearch(
  segment: BuyerSegment,
  propertyContext: PropertyContext,
  customDescription?: string
): Promise<AvatarResearchResult> {
  console.log('[generateAvatarResearch] ====== STARTING OpenAI generation ======');
  console.log('[generateAvatarResearch] Segment:', segment);
  console.log('[generateAvatarResearch] PropertyContext:', JSON.stringify(propertyContext));

  // NEW: Load evolved template from Airtable (with fallback to static JSON)
  const template = await getTemplateForGeneration(segment);
  console.log('[generateAvatarResearch] Template loaded:', template ? `v${template.version}, ${template.totalLearnings} learnings` : 'NO');

  // Format template content for prompt (includes proven/learned items)
  const templatePromptContent = template ? formatTemplateForPrompt(template) : '';
  console.log('[generateAvatarResearch] Has evolved template content:', templatePromptContent.length > 0);

  // Also load insights from history for additional context
  const history = loadHistory(segment);
  console.log('[generateAvatarResearch] History entries:', history.entries.length);

  const learnedInsights = formatLearnedInsights(history.insights);
  console.log('[generateAvatarResearch] Has learned insights:', learnedInsights.length > 0);

  const propertyContextStr = [
    propertyContext.type && `Property Type: ${propertyContext.type}`,
    propertyContext.city && `Location: ${propertyContext.city}`,
    propertyContext.priceRange && `Price Range: ${propertyContext.priceRange}`,
  ].filter(Boolean).join('\n');

  const segmentDescription = segment === 'custom'
    ? customDescription
    : getSegmentDescription(segment);

  // Build prompt with evolved template knowledge
  const prompt = `You are a master copywriter and market researcher. Your task is to deeply understand a specific buyer avatar for a real estate funnel.

BUYER SEGMENT: ${segment}
DESCRIPTION: ${segmentDescription}

PROPERTY CONTEXT:
${propertyContextStr || 'General property listing'}

${templatePromptContent}

${learnedInsights}

CRITICAL INSTRUCTION: Generate FRESH, UNIQUE content. DO NOT use generic phrases like "stop paying landlord's mortgage" or "build equity" - these are overused. Think deeper about THIS specific buyer in THIS specific location (${propertyContext.city || 'their area'}). What are THEIR unique dreams, fears, and frustrations? Be creative and specific.

${template ? `IMPORTANT: This avatar has EVOLVED based on user ratings. Items marked "PROVEN" have consistently scored 7+/10. Use these as strong foundations - capture their emotional essence but create fresh variations. Items marked "BASE KNOWLEDGE" are starting points - feel free to evolve beyond them.` : `Use these themes as INSPIRATION ONLY (do NOT copy verbatim - create NEW variations):
- Dreams themes: stability, ownership pride, family space, investment
- Fear themes: rejection, financial mistakes, hidden problems
- Suspicion themes: industry distrust, feeling taken advantage of
`}

Generate comprehensive avatar research using these frameworks:

1. **27-WORD PERSUASION (Blair Warren)** - Be SPECIFIC and UNIQUE, not generic!
   - Dreams: What do they secretly dream about? (Go beyond "build equity" - what SPECIFIC life changes do they want?)
   - Fears: What keeps them up at 3am? (Be vivid and emotional, not generic)
   - Suspicions: What conspiracy theories do they half-believe about the industry?
   - Failures: What specific past experiences haunt them? (Vivid stories, not bullet points)
   - Enemies: Who do they blame? (Be specific - a type of person, institution, or system)

2. **DAY IN THE LIFE DIARY**
   Write a 80-100 word diary entry from this buyer's perspective BEFORE they found Purple Homes.
   Include morning frustrations, emotional moments, and what keeps them up at night.

3. **BEFORE/AFTER STATE**
   - Before: Their feelings, daily reality, and how others see them
   - After: Their feelings, daily reality, and status after becoming a homeowner
   - Transformation narrative (2-3 sentences)

4. **TOP OBJECTIONS WITH COUNTERS**
   List 5 specific objections this buyer would have, with:
   - The objection itself
   - A compelling counter-argument
   - A proof point or statistic if applicable

5. **RECOMMENDED HOOKS**
   Based on this avatar, suggest 5 hook angles that would grab their attention.

6. **RECOMMENDED EMOTIONAL APPEALS**
   List the top 3 emotional appeals that would resonate with this buyer.

Respond in JSON format with these exact keys:
{
  "dreams": ["string array"],
  "fears": ["string array"],
  "suspicions": ["string array"],
  "failures": ["string array"],
  "enemies": ["string array"],
  "diaryEntry": "string",
  "keyFrustrations": ["string array"],
  "emotionalTriggers": ["string array"],
  "beforeState": {"feelings": "", "daily": "", "status": ""},
  "afterState": {"feelings": "", "daily": "", "status": ""},
  "transformationNarrative": "string",
  "objections": [{"objection": "", "counter": "", "proofPoint": ""}],
  "recommendedHooks": ["string array"],
  "recommendedAppeals": ["string array"]
}`;

  console.log('[generateAvatarResearch] Calling OpenAI (gpt-4o-mini)...');
  console.log('[generateAvatarResearch] Prompt length:', prompt.length);

  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.9, // Higher for more creative, unique output
    response_format: { type: 'json_object' },
  });

  console.log('[generateAvatarResearch] OpenAI response received');
  console.log('[generateAvatarResearch] Response content length:', response.choices[0]?.message?.content?.length || 0);

  const generated = JSON.parse(response.choices[0].message.content || '{}');
  console.log('[generateAvatarResearch] Parsed JSON, has dreams:', generated.dreams?.length || 0);
  console.log('[generateAvatarResearch] ====== OpenAI generation COMPLETE ======');

  // Helper to extract text from template items
  const getTemplateTexts = (items: LearnedItem[] | undefined): string[] =>
    (items || []).map(i => i.text);

  const getTemplateObjections = (objs: LearnedObjection[] | undefined): Array<{objection: string; counter: string}> =>
    (objs || []).map(o => ({ objection: o.objection, counter: o.counter }));

  return {
    buyerSegment: segment,
    dreams: generated.dreams || getTemplateTexts(template?.dreams) || [],
    fears: generated.fears || getTemplateTexts(template?.fears) || [],
    suspicions: generated.suspicions || getTemplateTexts(template?.suspicions) || [],
    failures: generated.failures || getTemplateTexts(template?.failures) || [],
    enemies: generated.enemies || getTemplateTexts(template?.enemies) || [],
    diaryEntry: generated.diaryEntry || '',
    keyFrustrations: generated.keyFrustrations || [],
    emotionalTriggers: generated.emotionalTriggers || [],
    beforeState: generated.beforeState || template?.beforeState || { feelings: '', daily: '', status: '' },
    afterState: generated.afterState || template?.afterState || { feelings: '', daily: '', status: '' },
    transformationNarrative: generated.transformationNarrative || '',
    objections: generated.objections || getTemplateObjections(template?.objections) || [],
    recommendedHooks: generated.recommendedHooks || [],
    recommendedAppeals: generated.recommendedAppeals || [],
  };
}

// ============================================================
// API HANDLER
// ============================================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = req.query.action as string || 'generate';

  console.log(`[Avatar Research API] Action: ${action}, Environment: ${IS_VERCEL ? 'Vercel' : 'Local'}`);

  try {
    // Ensure directories exist (local dev only)
    if (!IS_VERCEL) {
      try {
        if (!fs.existsSync(RESEARCH_DIR)) {
          fs.mkdirSync(RESEARCH_DIR, { recursive: true });
        }
        if (!fs.existsSync(INSIGHTS_DIR)) {
          fs.mkdirSync(INSIGHTS_DIR, { recursive: true });
        }
      } catch (err) {
        console.warn('[Avatar Research API] Could not create directories:', err);
      }
    }

    switch (action) {
      // --------------------------------------------------------
      // ACTION: generate - Generate and auto-save new research
      // --------------------------------------------------------
      case 'generate': {
        if (req.method !== 'POST') {
          return res.status(405).json({ error: 'Method not allowed' });
        }

        const { buyerSegment, propertyType, propertyCity, propertyPrice, customDescription } = req.body;

        if (!buyerSegment) {
          return res.status(400).json({ error: 'Missing required field: buyerSegment' });
        }

        if (buyerSegment === 'custom' && !customDescription) {
          return res.status(400).json({ error: 'Custom buyer segment requires customDescription' });
        }

        console.log('[Avatar Research API] Generating research for:', buyerSegment);

        // Build property context
        const propertyContext: PropertyContext = {
          type: propertyType,
          city: propertyCity,
          priceRange: propertyPrice ? `$${Math.floor(propertyPrice / 50000) * 50}k-$${Math.ceil(propertyPrice / 50000) * 50}k` : undefined,
        };

        // Generate research
        const research = await generateAvatarResearch(buyerSegment, propertyContext, customDescription);

        // Create entry
        const entry: AvatarResearchEntry = {
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          buyerSegment,
          propertyContext,
          research,
          usedInFunnels: [],
        };

        // Save to Airtable (and filesystem as fallback)
        const saved = await saveEntryAsync(entry);

        console.log('[Avatar Research API] Research saved with ID:', entry.id, 'Airtable:', saved);

        return res.json({
          success: true,
          researchId: entry.id,
          avatarResearch: research,
          savedAt: entry.createdAt,
          savedToAirtable: saved,
        });
      }

      // --------------------------------------------------------
      // ACTION: history - Get research history for a segment
      // --------------------------------------------------------
      case 'history': {
        const segment = req.query.segment as BuyerSegment;

        if (!segment) {
          return res.status(400).json({ error: 'Missing required parameter: segment' });
        }

        const history = await loadHistoryAsync(segment);

        return res.json({
          success: true,
          history,
        });
      }

      // --------------------------------------------------------
      // ACTION: rate - Rate effectiveness of a research entry
      // --------------------------------------------------------
      case 'rate': {
        if (req.method !== 'POST') {
          return res.status(405).json({ error: 'Method not allowed' });
        }

        const { researchId, segment, effectiveness, feedback } = req.body;

        if (!researchId || !segment) {
          return res.status(400).json({ error: 'Missing required fields: researchId, segment' });
        }

        if (effectiveness === undefined || effectiveness < 1 || effectiveness > 10) {
          return res.status(400).json({ error: 'effectiveness must be between 1 and 10' });
        }

        // Try to get entry from Airtable first
        let entry = await airtableGetEntry(researchId, segment);

        // Fallback to filesystem
        if (!entry && !IS_VERCEL) {
          const history = loadHistory(segment);
          entry = history.entries.find(e => e.id === researchId) || null;
        }

        if (!entry) {
          return res.status(404).json({ error: 'Research entry not found' });
        }

        // Update entry
        entry.effectiveness = effectiveness;
        if (feedback) {
          entry.feedback = feedback;
        }

        // Save updated entry
        const saved = await saveEntryAsync(entry);

        // NEW: Merge into evolving template if rating >= 7
        let templateLearning = { merged: false, newItemsCount: 0 };
        if (effectiveness >= MIN_RATING_FOR_INSIGHTS && entry.research) {
          templateLearning = await mergeLearnedResearchIntoTemplate(
            segment,
            entry.research,
            effectiveness
          );
        }

        // Reload history to get updated insights
        const history = await loadHistoryAsync(segment);

        console.log('[Avatar Research API] Research rated:', researchId, 'Effectiveness:', effectiveness, 'Saved:', saved, 'Template learning:', templateLearning);

        return res.json({
          success: true,
          updated: true,
          savedToAirtable: saved,
          newInsights: history.insights,
          templateLearning, // NEW: Info about template updates
        });
      }

      // --------------------------------------------------------
      // ACTION: insights - Get learned insights for a segment
      // --------------------------------------------------------
      case 'insights': {
        const segment = req.query.segment as BuyerSegment;

        if (!segment) {
          return res.status(400).json({ error: 'Missing required parameter: segment' });
        }

        const history = await loadHistoryAsync(segment);

        return res.json({
          success: true,
          insights: history.insights,
        });
      }

      // --------------------------------------------------------
      // ACTION: link - Link research to a property funnel
      // --------------------------------------------------------
      case 'link': {
        if (req.method !== 'POST') {
          return res.status(405).json({ error: 'Method not allowed' });
        }

        const { researchId, segment, propertySlug } = req.body;

        if (!researchId || !segment || !propertySlug) {
          return res.status(400).json({ error: 'Missing required fields: researchId, segment, propertySlug' });
        }

        // Try to get entry from Airtable first
        let entry = await airtableGetEntry(researchId, segment);

        // Fallback to filesystem
        if (!entry && !IS_VERCEL) {
          const history = loadHistory(segment);
          entry = history.entries.find(e => e.id === researchId) || null;
        }

        if (!entry) {
          return res.status(404).json({ error: 'Research entry not found' });
        }

        // Add property slug if not already linked
        if (!entry.usedInFunnels.includes(propertySlug)) {
          entry.usedInFunnels.push(propertySlug);
          await saveEntryAsync(entry);
        }

        return res.json({
          success: true,
          linkedFunnels: entry.usedInFunnels,
        });
      }

      // --------------------------------------------------------
      // ACTION: get - Get a specific research entry by ID
      // --------------------------------------------------------
      case 'get': {
        // Accept both 'id' and 'researchId' for backwards compatibility
        const researchId = (req.query.id || req.query.researchId) as string;
        const segment = req.query.segment as BuyerSegment;

        if (!researchId || !segment) {
          return res.status(400).json({ error: 'Missing required parameters: id (or researchId), segment' });
        }

        // Try Airtable first
        let entry = await airtableGetEntry(researchId, segment);

        // Fallback to filesystem
        if (!entry && !IS_VERCEL) {
          const history = loadHistory(segment);
          entry = history.entries.find(e => e.id === researchId) || null;
        }

        if (!entry) {
          return res.status(404).json({ error: 'Research entry not found' });
        }

        return res.json({
          success: true,
          entry,
        });
      }

      // --------------------------------------------------------
      // ACTION: test - Test Airtable connection and configuration
      // --------------------------------------------------------
      case 'test': {
        const testResults: Record<string, any> = {
          environment: IS_VERCEL ? 'vercel' : 'local',
          hasAirtableKey: !!AIRTABLE_API_KEY,
          hasAirtableBase: !!AIRTABLE_BASE_ID,
          tableName: AVATAR_RESEARCH_TABLE,
          hasOpenAIKey: !!(process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY),
          openAIKeySource: process.env.OPENAI_API_KEY ? 'OPENAI_API_KEY' : process.env.VITE_OPENAI_API_KEY ? 'VITE_OPENAI_API_KEY' : 'NONE',
        };

        // Try to connect to Airtable
        if (AIRTABLE_API_KEY && AIRTABLE_BASE_ID) {
          try {
            const response = await fetch(
              `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${AVATAR_RESEARCH_TABLE}?maxRecords=1`,
              {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                  'Content-Type': 'application/json',
                },
              }
            );

            if (response.ok) {
              const data = await response.json();
              testResults.airtableConnection = 'success';
              testResults.recordCount = data.records?.length || 0;
            } else {
              const errorText = await response.text();
              testResults.airtableConnection = 'failed';
              testResults.airtableError = errorText;
            }
          } catch (error) {
            testResults.airtableConnection = 'error';
            testResults.airtableError = String(error);
          }
        }

        // Also try a test write if requested
        if (req.query.testWrite === 'true') {
          try {
            const testFields = {
              'ID': `test-${Date.now()}`,
              'Segment': 'first-time-buyer',
              'Research': JSON.stringify({ test: true }),
              'PropertyContext': JSON.stringify({ test: true }),
              'UsedInFunnels': '',
              'CreatedAt': new Date().toISOString().split('T')[0], // YYYY-MM-DD format for Airtable
            };

            console.log('[Test] Attempting to write test record with fields:', Object.keys(testFields));

            const writeResponse = await fetch(
              `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${AVATAR_RESEARCH_TABLE}`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ fields: testFields }),
              }
            );

            if (writeResponse.ok) {
              const writeData = await writeResponse.json();
              testResults.testWrite = 'success';
              testResults.testWriteRecordId = writeData.id;
            } else {
              const errorText = await writeResponse.text();
              testResults.testWrite = 'failed';
              testResults.testWriteError = errorText;
              testResults.testWriteStatus = writeResponse.status;
            }
          } catch (writeError) {
            testResults.testWrite = 'error';
            testResults.testWriteError = String(writeError);
          }
        }

        return res.json({
          success: true,
          message: 'Avatar Research API test',
          ...testResults,
        });
      }

      // --------------------------------------------------------
      // ACTION: seed-templates - Seed AvatarTemplates from JSON
      // --------------------------------------------------------
      case 'seed-templates': {
        if (req.method !== 'POST') {
          return res.status(405).json({ error: 'Method not allowed - use POST' });
        }

        const results: Record<string, { success: boolean; message: string }> = {};
        const segments: BuyerSegment[] = [
          'first-time-buyer',
          'credit-challenged',
          'investor',
          'move-up-buyer',
          'self-employed',
          'hispanic-seller-finance' as BuyerSegment,
          'general',
        ];

        for (const segment of segments) {
          // Check if template already exists
          const existing = await loadAvatarTemplate(segment);
          if (existing) {
            results[segment] = { success: true, message: `Already exists (v${existing.version}, ${existing.totalLearnings} learnings)` };
            continue;
          }

          // Get static avatar from JSON
          const staticAvatar = avatarSystem?.buyerAvatars?.[segment];
          if (!staticAvatar) {
            results[segment] = { success: false, message: 'No static avatar in JSON' };
            continue;
          }

          // Convert and save
          const template = convertToTemplate(segment, staticAvatar);
          const saved = await saveAvatarTemplate(template);

          results[segment] = saved
            ? { success: true, message: 'Created from JSON' }
            : { success: false, message: 'Airtable save failed' };
        }

        const successCount = Object.values(results).filter(r => r.success).length;

        return res.json({
          success: true,
          message: `Seeded ${successCount}/${segments.length} templates`,
          results,
        });
      }

      // --------------------------------------------------------
      // ACTION: get-template - Get current template for a segment
      // --------------------------------------------------------
      case 'get-template': {
        const segment = req.query.segment as BuyerSegment;

        if (!segment) {
          return res.status(400).json({ error: 'Missing required parameter: segment' });
        }

        const template = await getTemplateForGeneration(segment);

        if (!template) {
          return res.status(404).json({ error: 'Template not found' });
        }

        return res.json({
          success: true,
          template,
        });
      }

      default:
        return res.status(400).json({
          error: 'Unknown action',
          validActions: ['generate', 'history', 'rate', 'insights', 'link', 'get', 'test', 'seed-templates', 'get-template'],
        });
    }
  } catch (error) {
    console.error('[Avatar Research API] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: String(error),
    });
  }
}

/**
 * EXPORTED FUNCTION for direct use by funnel generation
 * Generates full avatar research entry and saves it to Airtable
 * Returns the complete entry with ID
 */
export async function generateAvatarResearchEntry(
  buyerSegment: BuyerSegment,
  propertyContext: PropertyContext,
  customDescription?: string
): Promise<AvatarResearchEntry | null> {
  console.log('[Avatar Research Entry] ====== STARTING generateAvatarResearchEntry ======');
  console.log('[Avatar Research Entry] Input segment:', buyerSegment);
  console.log('[Avatar Research Entry] Input propertyContext:', JSON.stringify(propertyContext));
  console.log('[Avatar Research Entry] Has customDescription:', !!customDescription);

  try {
    // Generate the actual AI research
    console.log('[Avatar Research Entry] Calling generateAvatarResearch (OpenAI call)...');
    const research = await generateAvatarResearch(buyerSegment, propertyContext, customDescription);
    console.log('[Avatar Research Entry] OpenAI research generated:', research ? 'SUCCESS' : 'NULL');
    console.log('[Avatar Research Entry] Research has dreams:', research?.dreams?.length || 0);

    // Create complete entry
    const entryId = crypto.randomUUID();
    console.log('[Avatar Research Entry] Generated entry ID:', entryId);

    const entry: AvatarResearchEntry = {
      id: entryId,
      createdAt: new Date().toISOString(),
      buyerSegment,
      propertyContext,
      research,
      usedInFunnels: [],
    };
    console.log('[Avatar Research Entry] Entry created with ID:', entry.id);

    // Save to Airtable (and filesystem as fallback)
    console.log('[Avatar Research Entry] Calling saveEntryAsync...');
    const saved = await saveEntryAsync(entry);
    console.log('[Avatar Research Entry] saveEntryAsync result:', saved);

    console.log('[Avatar Research Entry] ====== SUCCESS ====== ID:', entry.id, 'Saved to Airtable:', saved);
    return entry;
  } catch (error) {
    console.error('[Avatar Research Entry] ====== ERROR ======');
    console.error('[Avatar Research Entry] Error type:', (error as Error)?.name);
    console.error('[Avatar Research Entry] Error message:', (error as Error)?.message);
    console.error('[Avatar Research Entry] Full error:', error);
    return null;
  }
}

/**
 * EXPORTED FUNCTION to get learned insights for a buyer segment
 * Returns formatted insights string for injection into AI prompts
 * Now async to support Airtable
 */
export async function getLearnedInsightsForPrompt(buyerSegment: BuyerSegment): Promise<string> {
  try {
    const history = await loadHistoryAsync(buyerSegment);
    const formatted = formatLearnedInsights(history.insights);

    if (formatted) {
      console.log(`[Avatar Research] Injecting ${history.insights.totalRated} learned insights for ${buyerSegment}`);
    }

    return formatted;
  } catch (error) {
    console.error('[Avatar Research] Error loading insights:', error);
    return '';
  }
}

/**
 * Load research history for a segment (exported for formula selection)
 * Now async to support Airtable
 */
export async function loadResearchHistory(buyerSegment: BuyerSegment): Promise<AvatarResearchHistory> {
  return loadHistoryAsync(buyerSegment);
}
