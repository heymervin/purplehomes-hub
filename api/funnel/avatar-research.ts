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

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
type BuyerSegment = 'first-time-buyer' | 'credit-challenged' | 'investor' | 'move-up-buyer' | 'self-employed' | 'general' | 'custom';

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
}

interface AvatarResearchHistory {
  segment: BuyerSegment;
  version: number;
  lastUpdated: string;
  entries: AvatarResearchEntry[];
  insights: SegmentInsights;
}

// Constants
const RESEARCH_DIR = path.resolve(process.cwd(), 'public/research/avatars');
const INSIGHTS_DIR = path.resolve(process.cwd(), 'public/research/insights');
const MAX_ENTRIES = 100;
const MIN_RATING_FOR_INSIGHTS = 7;
const MIN_ENTRIES_FOR_PATTERNS = 3;

// ============================================================
// FILE OPERATIONS
// ============================================================

function getHistoryFilePath(segment: BuyerSegment): string {
  return path.join(RESEARCH_DIR, `${segment}.json`);
}

function loadHistory(segment: BuyerSegment): AvatarResearchHistory {
  if (IS_VERCEL) {
    // On Vercel, return empty history (can't read from filesystem)
    return createEmptyHistory(segment);
  }

  const filePath = getHistoryFilePath(segment);
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.error(`[Avatar Research] Error loading history for ${segment}:`, error);
  }

  // Return empty history if file doesn't exist or is invalid
  return createEmptyHistory(segment);
}

function saveHistory(history: AvatarResearchHistory): void {
  if (IS_VERCEL) {
    console.log('[Avatar Research] Skipping history save on Vercel (read-only filesystem)');
    return;
  }

  const filePath = getHistoryFilePath(history.segment);
  try {
    fs.writeFileSync(filePath, JSON.stringify(history, null, 2), 'utf-8');
  } catch (error) {
    console.warn('[Avatar Research] Could not save history:', error);
  }
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
    totalRated: ratedEntries.length,
    lastUpdated: now,
    formulaStats,
  };
}

/**
 * Calculate formula effectiveness stats from rated entries
 * Tracks which formulas work best for this segment
 */
interface FormulaStatsEntry {
  formulaId: string;
  formulaName: string;
  usageCount: number;
  avgEffectiveness: number;
  lastUsed: string;
}

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

async function generateAvatarResearch(
  segment: BuyerSegment,
  propertyContext: PropertyContext,
  customDescription?: string
): Promise<AvatarResearchResult> {
  const baseAvatar = getBaseAvatar(segment);
  const history = loadHistory(segment);
  const learnedInsights = formatLearnedInsights(history.insights);

  const propertyContextStr = [
    propertyContext.type && `Property Type: ${propertyContext.type}`,
    propertyContext.city && `Location: ${propertyContext.city}`,
    propertyContext.priceRange && `Price Range: ${propertyContext.priceRange}`,
  ].filter(Boolean).join('\n');

  const segmentDescription = segment === 'custom'
    ? customDescription
    : getSegmentDescription(segment);

  const prompt = `You are a master copywriter and market researcher. Your task is to deeply understand a specific buyer avatar for a real estate funnel.

BUYER SEGMENT: ${segment}
DESCRIPTION: ${segmentDescription}

PROPERTY CONTEXT:
${propertyContextStr || 'General property listing'}

${baseAvatar ? `BASE AVATAR DATA (enhance and personalize this):
Dreams: ${JSON.stringify(baseAvatar.dreams)}
Fears: ${JSON.stringify(baseAvatar.fears)}
Suspicions: ${JSON.stringify(baseAvatar.suspicions)}
Failures: ${JSON.stringify(baseAvatar.failures)}
Enemies: ${JSON.stringify(baseAvatar.enemies)}
` : ''}
${learnedInsights}

Generate comprehensive avatar research using these frameworks:

1. **27-WORD PERSUASION (Blair Warren)**
   - Dreams: What do they secretly dream about regarding homeownership?
   - Fears: What are they most afraid of in the buying process?
   - Suspicions: What do they suspect about agents/lenders that might be true?
   - Failures: Where have they failed before that you can help justify?
   - Enemies: Who or what can you help them fight against?

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

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    response_format: { type: 'json_object' },
  });

  const generated = JSON.parse(response.choices[0].message.content || '{}');

  return {
    buyerSegment: segment,
    dreams: generated.dreams || baseAvatar?.dreams || [],
    fears: generated.fears || baseAvatar?.fears || [],
    suspicions: generated.suspicions || baseAvatar?.suspicions || [],
    failures: generated.failures || baseAvatar?.failures || [],
    enemies: generated.enemies || baseAvatar?.enemies || [],
    diaryEntry: generated.diaryEntry || '',
    keyFrustrations: generated.keyFrustrations || [],
    emotionalTriggers: generated.emotionalTriggers || [],
    beforeState: generated.beforeState || baseAvatar?.beforeState || { feelings: '', daily: '', status: '' },
    afterState: generated.afterState || baseAvatar?.afterState || { feelings: '', daily: '', status: '' },
    transformationNarrative: generated.transformationNarrative || '',
    objections: generated.objections || baseAvatar?.objections || [],
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

        // Load history, add entry, enforce max limit
        const history = loadHistory(buyerSegment);
        history.entries.unshift(entry); // Add to beginning
        if (history.entries.length > MAX_ENTRIES) {
          history.entries = history.entries.slice(0, MAX_ENTRIES);
        }
        history.lastUpdated = new Date().toISOString();
        history.insights.totalResearches = history.entries.length;

        // Save
        saveHistory(history);

        console.log('[Avatar Research API] Research saved with ID:', entry.id);

        return res.json({
          success: true,
          researchId: entry.id,
          avatarResearch: research,
          savedAt: entry.createdAt,
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

        const history = loadHistory(segment);

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

        const history = loadHistory(segment);
        const entry = history.entries.find(e => e.id === researchId);

        if (!entry) {
          return res.status(404).json({ error: 'Research entry not found' });
        }

        // Update entry
        entry.effectiveness = effectiveness;
        if (feedback) {
          entry.feedback = feedback;
        }

        // Recalculate insights
        history.insights = calculateInsights(history.entries);
        history.lastUpdated = new Date().toISOString();

        // Save
        saveHistory(history);

        console.log('[Avatar Research API] Research rated:', researchId, 'Effectiveness:', effectiveness);

        return res.json({
          success: true,
          updated: true,
          newInsights: history.insights,
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

        const history = loadHistory(segment);

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

        const history = loadHistory(segment);
        const entry = history.entries.find(e => e.id === researchId);

        if (!entry) {
          return res.status(404).json({ error: 'Research entry not found' });
        }

        // Add property slug if not already linked
        if (!entry.usedInFunnels.includes(propertySlug)) {
          entry.usedInFunnels.push(propertySlug);
          history.lastUpdated = new Date().toISOString();
          saveHistory(history);
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
        const researchId = req.query.id as string;
        const segment = req.query.segment as BuyerSegment;

        if (!researchId || !segment) {
          return res.status(400).json({ error: 'Missing required parameters: id, segment' });
        }

        const history = loadHistory(segment);
        const entry = history.entries.find(e => e.id === researchId);

        if (!entry) {
          return res.status(404).json({ error: 'Research entry not found' });
        }

        return res.json({
          success: true,
          entry,
        });
      }

      default:
        return res.status(400).json({
          error: 'Unknown action',
          validActions: ['generate', 'history', 'rate', 'insights', 'link', 'get'],
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
 * Generates full avatar research entry and saves it
 * Returns the complete entry with ID
 */
export async function generateAvatarResearchEntry(
  buyerSegment: BuyerSegment,
  propertyContext: PropertyContext,
  customDescription?: string
): Promise<AvatarResearchEntry | null> {
  try {
    console.log('[Avatar Research] Generating full research for:', buyerSegment);

    // Generate the actual AI research
    const research = await generateAvatarResearch(buyerSegment, propertyContext, customDescription);

    // Create complete entry (not a stub!)
    const entry: AvatarResearchEntry = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      buyerSegment,
      propertyContext,
      research, // ← Full research data, not null!
      usedInFunnels: [],
    };

    // Load history, add entry, enforce max limit
    const history = loadHistory(buyerSegment);
    history.entries.unshift(entry); // Add to beginning
    if (history.entries.length > MAX_ENTRIES) {
      history.entries = history.entries.slice(0, MAX_ENTRIES);
    }
    history.lastUpdated = new Date().toISOString();
    history.insights.totalResearches = history.entries.length;

    // Save to file system
    saveHistory(history);

    console.log('[Avatar Research] Full research saved with ID:', entry.id);

    return entry;
  } catch (error) {
    console.error('[Avatar Research] Error generating entry:', error);
    return null;
  }
}

/**
 * EXPORTED FUNCTION to get learned insights for a buyer segment
 * Returns formatted insights string for injection into AI prompts
 */
export function getLearnedInsightsForPrompt(buyerSegment: BuyerSegment): string {
  try {
    const history = loadHistory(buyerSegment);
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
 */
export function loadResearchHistory(buyerSegment: BuyerSegment): AvatarResearchHistory {
  return loadHistory(buyerSegment);
}
