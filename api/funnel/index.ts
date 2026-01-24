/**
 * Funnel Content API v2.0
 *
 * Enhanced AI-powered funnel generation using the Purple Homes Unified Prompt System.
 * Integrates 600+ copywriting techniques, avatar research, and advanced frameworks.
 *
 * Content is stored as markdown files in /public/content/properties/
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';

// Check if running on Vercel (read-only filesystem)
const IS_VERCEL = process.env.VERCEL === '1' || process.env.VERCEL_ENV !== undefined;

// Lazy-loaded prompt system to avoid module initialization crashes
let promptSystem: any = null;
function getPromptSystem(): any {
  if (promptSystem) return promptSystem;

  try {
    const promptSystemPath = path.resolve(process.cwd(), 'src/data/ai-funnel-prompt-system.json');
    promptSystem = JSON.parse(fs.readFileSync(promptSystemPath, 'utf-8'));
    return promptSystem;
  } catch {
    // Minimal fallback for Vercel - basic buyer avatars
    promptSystem = {
      buyerAvatars: {
        'first-time-buyer': {
          label: 'First-Time Buyer',
          dreams: ['Own their first home', 'Build equity', 'Stop renting'],
          fears: ['Being denied', 'Hidden costs', 'Making a mistake'],
          suspicions: ['Too good to be true', 'Hidden fees'],
          failures: ['Bank rejection', 'Saving enough'],
          enemies: ['High down payments', 'Strict banks'],
          topObjections: [
            { objection: 'I have bad credit', counter: 'We work with all credit types' },
            { objection: "I don't have 20% down", counter: 'Down payments start at just 5-10%' }
          ],
          beforeState: { feelings: 'Frustrated', daily: 'Paying rent', status: 'Stuck renting' },
          afterState: { feelings: 'Proud', daily: 'Building equity', status: 'Homeowner' }
        },
        'credit-challenged': {
          label: 'Credit-Challenged',
          dreams: ['Get approved despite credit', 'Rebuild credit as homeowner'],
          fears: ['Another rejection', 'Predatory lenders'],
          suspicions: ['Scams targeting bad credit'],
          failures: ['Multiple denials'],
          enemies: ['Traditional banks', 'Credit requirements'],
          topObjections: [
            { objection: 'My credit is too low', counter: 'No minimum credit score required' }
          ],
          beforeState: { feelings: 'Hopeless', daily: 'Worried about credit', status: 'Rejected' },
          afterState: { feelings: 'Hopeful', daily: 'Improving credit', status: 'Approved' }
        },
        'investor': {
          label: 'Investor',
          dreams: ['Build portfolio', 'Cash flow'],
          fears: ['Bad deal', 'Hidden issues'],
          suspicions: ['Inflated prices'],
          failures: ['Missed opportunities'],
          enemies: ['Slow closings', 'Competition'],
          topObjections: [
            { objection: 'What are the numbers?', counter: 'We provide full financials upfront' }
          ],
          beforeState: { feelings: 'Searching', daily: 'Looking for deals', status: 'Hunting' },
          afterState: { feelings: 'Satisfied', daily: 'Collecting rent', status: 'Landlord' }
        },
        'move-up-buyer': {
          label: 'Move-Up Buyer',
          dreams: ['Upgrade home', 'Better neighborhood'],
          fears: ['Selling current home', 'Market timing'],
          suspicions: ['Agent pressure'],
          failures: ['Failed offers'],
          enemies: ['Bidding wars', 'Contingencies'],
          topObjections: [
            { objection: 'I need to sell first', counter: 'We can work with your timeline' }
          ],
          beforeState: { feelings: 'Cramped', daily: 'Outgrowing space', status: 'Ready to move' },
          afterState: { feelings: 'Comfortable', daily: 'Enjoying space', status: 'Upgraded' }
        },
        'self-employed': {
          label: 'Self-Employed',
          dreams: ['Get approved without W2s', 'Own despite income docs'],
          fears: ['Income verification', 'Tax return scrutiny'],
          suspicions: ['Extra requirements'],
          failures: ['Denied for income type'],
          enemies: ['W2 requirements', 'DTI calculations'],
          topObjections: [
            { objection: 'My income is hard to verify', counter: 'We use bank statements, not tax returns' }
          ],
          beforeState: { feelings: 'Frustrated', daily: 'Explaining income', status: 'Self-employed' },
          afterState: { feelings: 'Validated', daily: 'Homeowner', status: 'Approved' }
        },
        'general': {
          label: 'General',
          dreams: ['Own a home'],
          fears: ['Rejection', 'Process complexity'],
          suspicions: ['Hidden costs'],
          failures: ['Past rejections'],
          enemies: ['Red tape'],
          topObjections: [
            { objection: 'Is this legit?', counter: "We've helped hundreds of families" }
          ],
          beforeState: { feelings: 'Uncertain', daily: 'Researching', status: 'Looking' },
          afterState: { feelings: 'Confident', daily: 'Homeowner', status: 'Closed' }
        }
      },
      viralHookTemplates: { categories: {} },
      staccatoPatterns: { patterns: [] },
      editingProtocols: { antiPatterns: { avoid: [] }, CUBA: { name: 'CUBA', checks: [] }, powerWordInjection: { byEmotion: {} } },
      marketSophisticationLevels: { levels: [{ stage: 1, name: 'Basic', approach: 'Direct', example: 'Own your home' }] }
    };
    return promptSystem;
  }
}

// Lazy-loaded OpenAI client
let openaiClient: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!openaiClient) {
    // Check both OPENAI_API_KEY and VITE_OPENAI_API_KEY for compatibility
    const apiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

// Content directory path - only used in local development
const CONTENT_DIR = path.resolve(process.cwd(), 'public/content/properties');

// Airtable configuration
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_API_URL = 'https://api.airtable.com/v0';

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
        console.log(`[Funnel API] Airtable retry ${attempt}/${maxRetries} after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      const response = await fetch(url, options);

      if (response.status === 429 && attempt < maxRetries) {
        console.warn(`[Funnel API] Airtable rate limited (429) on attempt ${attempt + 1}/${maxRetries + 1}`);
        lastError = new Error(`Rate limited: ${response.statusText}`);
        continue;
      }

      return response;
    } catch (error) {
      console.error(`[Funnel API] Airtable fetch error on attempt ${attempt + 1}:`, error);
      lastError = error as Error;

      if (attempt === maxRetries) {
        throw error;
      }
    }
  }

  throw lastError || new Error('Failed after retries');
}

/**
 * Save funnel content to Airtable by record ID
 */
async function airtableSaveContent(recordId: string, content: FunnelContent): Promise<boolean> {
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    console.warn('[Funnel API] Airtable credentials not configured');
    return false;
  }

  try {
    const response = await fetchWithRetry(
      `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Properties/${recordId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: {
            'FunnelContent': JSON.stringify(content),
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Funnel API] Airtable save error:', errorText);
      return false;
    }

    console.log('[Funnel API] Content saved to Airtable record:', recordId);
    return true;
  } catch (error) {
    console.error('[Funnel API] Airtable save failed:', error);
    return false;
  }
}

/**
 * Read funnel content from Airtable by record ID
 */
async function airtableReadContent(recordId: string): Promise<FunnelContent | null> {
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    console.warn('[Funnel API] Airtable credentials not configured');
    return null;
  }

  try {
    const response = await fetchWithRetry(
      `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Properties/${recordId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error('[Funnel API] Airtable read error:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();
    const funnelContentStr = data.fields?.['FunnelContent'];

    if (!funnelContentStr) {
      console.log('[Funnel API] No FunnelContent in Airtable record:', recordId);
      return null;
    }

    const content = JSON.parse(funnelContentStr) as FunnelContent;
    console.log('[Funnel API] Content loaded from Airtable record:', recordId);
    return content;
  } catch (error) {
    console.error('[Funnel API] Airtable read failed:', error);
    return null;
  }
}

/**
 * Find Airtable record by address
 */
async function airtableFindByAddress(address: string, city: string): Promise<string | null> {
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    return null;
  }

  try {
    // Search by address (use formula to find matching record)
    const formula = encodeURIComponent(`AND({Address}="${address}",{City}="${city}")`);
    const response = await fetchWithRetry(
      `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Properties?filterByFormula=${formula}&maxRecords=1`,
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
    console.error('[Funnel API] Airtable find by address failed:', error);
    return null;
  }
}

/**
 * Try to write content to filesystem (local dev only)
 * Returns true if successful, false if filesystem is read-only (Vercel)
 */
function tryWriteContent(slug: string, content: FunnelContent): boolean {
  if (IS_VERCEL) {
    console.log('[Funnel API] Skipping file write on Vercel (read-only filesystem)');
    return false;
  }

  try {
    if (!fs.existsSync(CONTENT_DIR)) {
      fs.mkdirSync(CONTENT_DIR, { recursive: true });
    }
    const filePath = path.join(CONTENT_DIR, `${slug}.md`);
    fs.writeFileSync(filePath, contentToMarkdown(content), 'utf-8');
    console.log('[Funnel API] Content saved to:', filePath);
    return true;
  } catch (error) {
    console.warn('[Funnel API] Could not write to filesystem:', error);
    return false;
  }
}

/**
 * Try to read content from filesystem (local dev only)
 * Returns null if file doesn't exist or filesystem error
 */
function tryReadContent(slug: string): FunnelContent | null {
  // Skip file operations on Vercel - use Airtable instead
  if (IS_VERCEL) {
    return null;
  }

  try {
    const filePath = path.join(CONTENT_DIR, `${slug}.md`);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    return parseMarkdownContent(fileContent);
  } catch (error) {
    console.warn('[Funnel API] Could not read from filesystem:', error);
    return null;
  }
}

/**
 * Try to delete content from filesystem
 */
function tryDeleteContent(slug: string): boolean {
  if (IS_VERCEL) {
    return false;
  }

  try {
    const filePath = path.join(CONTENT_DIR, `${slug}.md`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log('[Funnel API] Content deleted:', filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.warn('[Funnel API] Could not delete from filesystem:', error);
    return false;
  }
}

type BuyerSegment = 'first-time-buyer' | 'credit-challenged' | 'investor' | 'move-up-buyer' | 'self-employed' | 'general';

interface FunnelInputs {
  financingType: string;
  termLength: string;
  interestRate: string;
  availabilityStatus: string;
  urgencyMessage: string;
  specialOffer: string;
  neighborhoodHighlights: string;
  idealBuyerProfile: string;
  uniqueFeatures: string;
  // Optional section inputs
  nearbyPlaces?: string;
  paymentNotes?: string;
  virtualTourUrl?: string;
  // Enhanced inputs
  buyerSegment?: BuyerSegment;
  avatarDescription?: string; // Custom persona description for emotional targeting
  generateVariants?: boolean; // Generate A/B test variants
}

const DEFAULT_INPUTS: FunnelInputs = {
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

interface FunnelContentRequest {
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
  inputs?: FunnelInputs;
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

interface HookStructure {
  headline: string;      // Main emotional hook - SHORT (5-10 words max, e.g., "Your Dream Home. No Bank Required.")
  subheadline?: string;  // Supporting line (15-20 words, e.g., "Stop settling for cramped apartments. Start building your future.")
  highlight?: string;    // Key phrase FROM headline to visually emphasize (e.g., "Dream Home")
  benefit?: string;      // Short benefit phrase shown with price (e.g., "No bank qualifying")
  urgency?: string;      // Time-sensitive offer (e.g., "Apply by Friday for $1,500 off closing costs")
  bonus?: string;        // Extra incentive (e.g., "FREE home warranty for a year")
}

interface FunnelContent {
  propertySlug: string;
  generatedAt: string;
  propertyHash: string;
  inputs: FunnelInputs;
  hook: string | HookStructure;  // Support both old string and new structured format
  problem: string;
  solution: string;
  propertyShowcase: string;
  socialProof: string;
  callToAction: string;
  // Optional sections
  locationNearby?: string;
  qualifier?: string;
  pricingOptions?: string;
  virtualTourUrl?: string;
  faq?: string;
  // A/B test variants
  hookVariantB?: string;
  ctaVariantB?: string;
  // Avatar Research Link (Persist & Grow)
  avatarResearchId?: string;
  // Formula Tracking (Strategy Learning)
  formulasUsed?: FormulaSelection;
}

/**
 * Get avatar data for prompt enhancement
 */
function getAvatarContext(segment: BuyerSegment): string {
  const ps = getPromptSystem();
  const avatars = ps.buyerAvatars as Record<string, any>;
  const avatar = avatars[segment];

  if (!avatar) {
    return '';
  }

  return `
TARGET BUYER AVATAR: ${avatar.label}
- Dreams: ${avatar.dreams.join(', ')}
- Fears: ${avatar.fears.join(', ')}
- Suspicions: ${avatar.suspicions.join(', ')}
- Past Failures: ${avatar.failures.join(', ')}
- Enemies (who/what they fight against): ${avatar.enemies.join(', ')}

EMOTIONAL TRANSFORMATION:
- Before State: ${avatar.beforeState.feelings} | ${avatar.beforeState.daily} | "${avatar.beforeState.status}"
- After State: ${avatar.afterState.feelings} | ${avatar.afterState.daily} | "${avatar.afterState.status}"

TOP OBJECTIONS TO ADDRESS:
${avatar.topObjections.map((o: any, i: number) => `${i + 1}. "${o.objection}" → Counter: "${o.counter}"`).join('\n')}
`;
}

/**
 * Get viral hooks for the segment
 */
function getViralHooks(segment: BuyerSegment): string[] {
  const hooks: string[] = [];
  const templates = getPromptSystem().viralHookTemplates.categories;

  // Select hooks based on segment
  if (segment === 'credit-challenged') {
    hooks.push(...templates['social-proof'].slice(0, 2));
    hooks.push(...templates['contrarian'].slice(0, 2));
  } else if (segment === 'first-time-buyer') {
    hooks.push(...templates['fear-urgency'].slice(0, 2));
    hooks.push(...templates['direct-benefit'].slice(0, 2));
  } else if (segment === 'investor') {
    hooks.push(...templates['curiosity-gap'].slice(0, 2));
    hooks.push(...templates['direct-benefit'].slice(0, 2));
  } else {
    hooks.push(...templates['pattern-interrupt'].slice(0, 2));
    hooks.push(...templates['question-hooks'].slice(0, 2));
  }

  return hooks;
}

/**
 * Get staccato patterns for punchy writing
 */
function getStaccatoPatterns(): string {
  return getPromptSystem().staccatoPatterns.patterns
    .map((p: { name: string; formula: string; examples: string[] }) => `- ${p.name}: "${p.formula}" (e.g., "${p.examples[0]}")`)
    .join('\n');
}

/**
 * Get anti-patterns to avoid
 */
function getAntiPatterns(): string {
  return getPromptSystem().editingProtocols.antiPatterns.avoid.slice(0, 15).join(', ');
}

/**
 * Get CUBA Protocol editing checklist
 */
function getCUBAProtocol(): string {
  const cuba = getPromptSystem().editingProtocols.CUBA;
  return `${cuba.name} - Quality Checklist:
${cuba.checks.map((c: { flag: string; question: string; fix: string }) => `• ${c.flag}: ${c.question} → ${c.fix}`).join('\n')}`;
}

/**
 * Get power words based on emotional appeal
 */
function getPowerWords(emotions: string[]): string {
  const powerWords = getPromptSystem().editingProtocols.powerWordInjection.byEmotion;
  const selectedWords: string[] = [];

  emotions.forEach(emotion => {
    if (powerWords[emotion as keyof typeof powerWords]) {
      selectedWords.push(...powerWords[emotion as keyof typeof powerWords].slice(0, 5));
    }
  });

  return selectedWords.length > 0
    ? `Power Words to Use: ${selectedWords.join(', ')}`
    : '';
}

/**
 * Detect market sophistication level based on buyer segment
 */
function getMarketSophisticationLevel(segment: BuyerSegment): string {
  // Map segments to sophistication levels
  const segmentToLevel: Record<BuyerSegment, number> = {
    'first-time-buyer': 2, // Enlarged Promise - some awareness
    'credit-challenged': 3, // Unique Mechanism - aware of challenges
    'investor': 4, // Enhanced Mechanism - sophisticated buyers
    'move-up-buyer': 3, // Unique Mechanism - experienced but looking for value
    'self-employed': 3, // Unique Mechanism - aware of their challenges
    'general': 2, // Enlarged Promise - mixed awareness
  };

  const levelIndex = segmentToLevel[segment] || 2;
  const level = getPromptSystem().marketSophisticationLevels.levels[levelIndex - 1];

  return `Market Sophistication: Stage ${level.stage} - ${level.name}
Approach: ${level.approach}
Example: "${level.example}"`;
}

/**
 * Select formulas using exploration/exploitation strategy
 * - Early stage (< 20 rated): 70% exploration, 30% exploitation
 * - Mature stage (20+): 30% exploration, 70% exploitation
 */
async function selectFormulas(segment: BuyerSegment): Promise<FormulaSelection> {
  // Get landing page formulas and section formulas from prompt system
  const lpFormulas = (promptSystem as any).landingPageFormulas?.formulas || [];
  const hookFormulas = (promptSystem as any).funnelFormulas?.hook?.formulas || [];
  const problemFormulas = (promptSystem as any).funnelFormulas?.problem?.formulas || [];
  const solutionFormulas = (promptSystem as any).funnelFormulas?.solution?.formulas || [];
  const showcaseFormulas = (promptSystem as any).funnelFormulas?.propertyShowcase?.formulas || [];
  const proofFormulas = (promptSystem as any).funnelFormulas?.socialProof?.formulas || [];
  const ctaFormulas = (promptSystem as any).funnelFormulas?.callToAction?.formulas || [];

  // Try to get learned insights for exploitation
  let formulaStats: any = null;
  let totalRated = 0;
  try {
    const avatarResearchModule = await import('./avatar-research');
    const history = await avatarResearchModule.loadResearchHistory(segment);
    formulaStats = (history?.insights as any)?.formulaStats;
    totalRated = history?.insights?.totalRated || 0;
  } catch (error) {
    console.warn('[Formula Selection] Could not load formula stats:', error);
  }

  // Determine exploration rate based on data maturity
  const explorationRate = totalRated < 20 ? 0.7 : 0.3;
  const shouldExplore = Math.random() < explorationRate;

  // Helper to select formula: exploit best or explore randomly
  const selectFormula = (
    formulas: Array<{ id: string; name: string }>,
    stats: any[] | undefined,
    segmentBestFor?: string[]
  ): string => {
    if (!formulas.length) return '';

    // Filter by segment preference if available
    let candidates = formulas;
    if (segmentBestFor) {
      const preferred = formulas.filter((f: any) =>
        f.bestFor?.includes(segment)
      );
      if (preferred.length > 0) candidates = preferred;
    }

    // Exploit: use best performing formula
    if (!shouldExplore && stats && stats.length > 0) {
      const sorted = [...stats].sort((a, b) => b.avgEffectiveness - a.avgEffectiveness);
      const bestId = sorted[0]?.formulaId;
      if (bestId && candidates.find((f: any) => f.id === bestId)) {
        console.log(`[Formula Selection] Exploiting ${sorted[0].formulaName} (avg: ${sorted[0].avgEffectiveness.toFixed(1)})`);
        return bestId;
      }
    }

    // Explore: random selection
    const randomIndex = Math.floor(Math.random() * candidates.length);
    console.log(`[Formula Selection] Exploring ${candidates[randomIndex].name || candidates[randomIndex].id}`);
    return candidates[randomIndex].id || '';
  };

  const selection: FormulaSelection = {
    landingPageFormula: selectFormula(lpFormulas, formulaStats?.landingPage, [segment]),
    hookFormula: selectFormula(hookFormulas, formulaStats?.hook),
    problemFormula: selectFormula(problemFormulas, formulaStats?.problem),
    solutionFormula: selectFormula(solutionFormulas, formulaStats?.solution),
    showcaseFormula: selectFormula(showcaseFormulas, formulaStats?.showcase),
    proofFormula: selectFormula(proofFormulas, formulaStats?.proof),
    ctaFormula: selectFormula(ctaFormulas, formulaStats?.cta),
  };

  console.log(`[Formula Selection] Mode: ${shouldExplore ? 'EXPLORE' : 'EXPLOIT'} (rated: ${totalRated})`);
  console.log(`[Formula Selection] Selected:`, selection);

  return selection;
}

/**
 * Get formula details for prompt injection
 */
function getFormulaContext(selection: FormulaSelection): string {
  const lpFormulas = (promptSystem as any).landingPageFormulas?.formulas || [];
  const hookFormulas = (promptSystem as any).funnelFormulas?.hook?.formulas || [];
  const problemFormulas = (promptSystem as any).funnelFormulas?.problem?.formulas || [];
  const solutionFormulas = (promptSystem as any).funnelFormulas?.solution?.formulas || [];
  const showcaseFormulas = (promptSystem as any).funnelFormulas?.propertyShowcase?.formulas || [];
  const proofFormulas = (promptSystem as any).funnelFormulas?.socialProof?.formulas || [];
  const ctaFormulas = (promptSystem as any).funnelFormulas?.callToAction?.formulas || [];

  const lpFormula = lpFormulas.find((f: any) => f.id === selection.landingPageFormula);
  const hookFormula = hookFormulas.find((f: any) => f.id === selection.hookFormula);
  const problemFormula = problemFormulas.find((f: any) => f.id === selection.problemFormula);
  const solutionFormula = solutionFormulas.find((f: any) => f.id === selection.solutionFormula);
  const showcaseFormula = showcaseFormulas.find((f: any) => f.id === selection.showcaseFormula);
  const proofFormula = proofFormulas.find((f: any) => f.id === selection.proofFormula);
  const ctaFormula = ctaFormulas.find((f: any) => f.id === selection.ctaFormula);

  let context = `=== 📋 SELECTED FORMULAS (You MUST follow these) ===\n\n`;

  if (lpFormula) {
    context += `LANDING PAGE FRAMEWORK: ${lpFormula.name} (${lpFormula.source})
Description: ${lpFormula.description}
Structure:
${Object.entries(lpFormula.structure || {}).map(([section, instruction]) => `  - ${section}: ${instruction}`).join('\n')}

`;
  }

  if (hookFormula) {
    context += `HOOK FORMULA: ${hookFormula.name}
Pattern: ${hookFormula.pattern}
Example: ${hookFormula.example}

`;
  }

  if (problemFormula) {
    context += `PROBLEM FORMULA: ${problemFormula.name}
Pattern: ${problemFormula.pattern}
Example: ${problemFormula.example}

`;
  }

  if (solutionFormula) {
    context += `SOLUTION FORMULA: ${solutionFormula.name}
Pattern: ${solutionFormula.pattern}
Example: ${solutionFormula.example}

`;
  }

  if (showcaseFormula) {
    context += `PROPERTY SHOWCASE FORMULA: ${showcaseFormula.name}
Pattern: ${showcaseFormula.pattern}
Example: ${showcaseFormula.example}

`;
  }

  if (proofFormula) {
    context += `SOCIAL PROOF FORMULA: ${proofFormula.name}
Pattern: ${proofFormula.pattern}
Example: ${proofFormula.example}

`;
  }

  if (ctaFormula) {
    context += `CTA FORMULA: ${ctaFormula.name}
Pattern: ${ctaFormula.pattern}
Example: ${ctaFormula.example}

`;
  }

  return context;
}

/**
 * Generate a URL-safe slug from property address and city
 */
function generateSlug(address: string, city: string, state: string, zipCode: string): string {
  const combined = `${address}-${city}-${state}-${zipCode}`;
  return combined
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Generate a hash from property data to detect changes
 */
function generatePropertyHash(data: FunnelContentRequest): string {
  const keyFields = [
    data.address,
    data.city,
    data.price,
    data.downPayment,
    data.monthlyPayment,
    data.beds,
    data.baths,
  ].join('|');

  let hash = 0;
  for (let i = 0; i < keyFields.length; i++) {
    const char = keyFields.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

/**
 * Parse markdown file to FunnelContent object
 */
function parseMarkdownContent(content: string): FunnelContent | null {
  try {
    // Extract frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) return null;

    const frontmatter = frontmatterMatch[1];
    const body = content.slice(frontmatterMatch[0].length).trim();

    // Parse frontmatter
    const propertySlug = frontmatter.match(/propertySlug:\s*"([^"]+)"/)?.[1] || '';
    const generatedAt = frontmatter.match(/generatedAt:\s*"([^"]+)"/)?.[1] || '';
    const propertyHash = frontmatter.match(/propertyHash:\s*"([^"]+)"/)?.[1] || '';
    const avatarResearchId = frontmatter.match(/avatarResearchId:\s*"([^"]+)"/)?.[1] || undefined;

    // Parse inputs from frontmatter (JSON format)
    let inputs: FunnelInputs = { ...DEFAULT_INPUTS };
    const inputsMatch = frontmatter.match(/inputs:\s*(\{[\s\S]*?\})\n/);
    if (inputsMatch) {
      try {
        inputs = { ...DEFAULT_INPUTS, ...JSON.parse(inputsMatch[1]) };
      } catch {
        // Keep defaults if parse fails
      }
    }

    // Parse sections
    const sections: Record<string, string> = {};
    const sectionRegex = /^#\s+(\w+)\n([\s\S]*?)(?=^#\s+\w+|\Z)/gm;
    let match;
    while ((match = sectionRegex.exec(body + '\n# END')) !== null) {
      if (match[1] !== 'END') {
        sections[match[1].toLowerCase()] = match[2].trim();
      }
    }

    return {
      propertySlug,
      generatedAt,
      propertyHash,
      inputs,
      hook: sections['hook'] || '',
      problem: sections['problem'] || '',
      solution: sections['solution'] || '',
      propertyShowcase: sections['propertyshowcase'] || sections['property'] || '',
      socialProof: sections['socialproof'] || sections['social'] || '',
      callToAction: sections['calltoaction'] || sections['cta'] || '',
      // Optional sections
      locationNearby: sections['locationnearby'] || sections['location'] || undefined,
      qualifier: sections['qualifier'] || undefined,
      pricingOptions: sections['pricingoptions'] || sections['pricing'] || undefined,
      virtualTourUrl: sections['virtualtoururl'] || sections['virtualtour'] || inputs.virtualTourUrl || undefined,
      faq: sections['faq'] || undefined,
      // Avatar Research Link (Persist & Grow)
      avatarResearchId,
    };
  } catch (error) {
    console.error('Error parsing markdown:', error);
    return null;
  }
}

/**
 * Convert FunnelContent to markdown string
 */
function contentToMarkdown(content: FunnelContent): string {
  // Build optional sections
  const optionalSections: string[] = [];

  if (content.locationNearby) {
    optionalSections.push(`# LocationNearby\n${content.locationNearby}`);
  }
  if (content.qualifier) {
    optionalSections.push(`# Qualifier\n${content.qualifier}`);
  }
  if (content.pricingOptions) {
    optionalSections.push(`# PricingOptions\n${content.pricingOptions}`);
  }
  if (content.virtualTourUrl) {
    optionalSections.push(`# VirtualTourUrl\n${content.virtualTourUrl}`);
  }
  if (content.faq) {
    optionalSections.push(`# FAQ\n${content.faq}`);
  }

  const optionalContent = optionalSections.length > 0
    ? '\n' + optionalSections.join('\n\n') + '\n'
    : '';

  return `---
propertySlug: "${content.propertySlug}"
generatedAt: "${content.generatedAt}"
propertyHash: "${content.propertyHash}"
inputs: ${JSON.stringify(content.inputs)}${content.avatarResearchId ? `\navatarResearchId: "${content.avatarResearchId}"` : ''}
---

# Hook
${content.hook}

# Problem
${content.problem}

# Solution
${content.solution}

# PropertyShowcase
${content.propertyShowcase}

# SocialProof
${content.socialProof}

# CallToAction
${content.callToAction}
${optionalContent}`;
}

/**
 * Generate funnel content using AI v2.1
 *
 * Enhanced with:
 * - 27-Word Persuasion buyer avatars
 * - Viral hook templates
 * - Staccato writing patterns
 * - CUBA/NESB editing protocols
 * - Market sophistication awareness
 * - Optional A/B test variants
 * - 🆕 Formula Selection with Exploration/Exploitation
 * - 🆕 12 Landing Page Frameworks
 */
async function generateFunnelContent(data: FunnelContentRequest, avatarResearchId?: string): Promise<FunnelContent> {
  const slug = generateSlug(data.address, data.city, data.state, data.zipCode);
  const hash = generatePropertyHash(data);
  const inputs = { ...DEFAULT_INPUTS, ...data.inputs };
  const buyerSegment = inputs.buyerSegment || 'first-time-buyer';

  // Build context from inputs
  const termContext = inputs.termLength
    ? (inputs.interestRate
        ? `Terms: ${inputs.termLength} at ${inputs.interestRate} interest.`
        : `Terms: ${inputs.termLength}.`)
    : (inputs.interestRate ? `Interest Rate: ${inputs.interestRate}.` : '');

  // Get avatar-based context
  const avatarContext = getAvatarContext(buyerSegment);
  const viralHooks = getViralHooks(buyerSegment);
  const staccatoPatterns = getStaccatoPatterns();
  const antiPatterns = getAntiPatterns();

  // 🎨 ADVANCED COPYWRITING TECHNIQUES (600+ frameworks)
  const cubaProtocol = getCUBAProtocol();
  const marketSophistication = getMarketSophisticationLevel(buyerSegment);
  const powerWords = getPowerWords(['urgency', 'trust', 'curiosity']); // Default emotions

  // 🎯 FORMULA SELECTION: Exploration/Exploitation Strategy
  const selectedFormulas = await selectFormulas(buyerSegment);
  const formulaContext = getFormulaContext(selectedFormulas);

  // 🧠 LEARNING INJECTION: Get learned insights from rated research
  let learnedInsights = '';
  try {
    const avatarResearchModule = await import('./avatar-research');
    learnedInsights = await avatarResearchModule.getLearnedInsightsForPrompt(buyerSegment);
  } catch (error) {
    console.warn('[Funnel API] Could not load learned insights:', error);
  }

  const prompt = `You are a master real estate copywriter for Purple Homes Solutions - the TOP conversion-focused funnel writer in creative financing. You specialize in owner financing and helping buyers who don't qualify for traditional mortgages.

=== YOUR MISSION ===
Generate a HIGH-CONVERTING funnel that makes the reader feel understood, builds trust, and compels action. This isn't generic real estate copy - this is emotionally intelligent persuasion.

=== PROPERTY DATA ===
Address: ${data.address}, ${data.city}, ${data.state} ${data.zipCode}
Price: $${data.price.toLocaleString()}
Down Payment: ${data.downPayment ? `$${data.downPayment.toLocaleString()}` : 'Contact for details'}
Monthly Payment: ${data.monthlyPayment ? `$${data.monthlyPayment.toLocaleString()}/mo` : 'Contact for details'}
Beds: ${data.beds} | Baths: ${data.baths} | Sqft: ${data.sqft ? data.sqft.toLocaleString() : 'N/A'}
Type: ${data.propertyType || 'Single Family'} | Condition: ${data.condition || 'Good'}
Financing: ${inputs.financingType}
${termContext}
${data.description ? `Description: ${data.description}` : ''}
${inputs.neighborhoodHighlights ? `Neighborhood: ${inputs.neighborhoodHighlights}` : ''}
${inputs.uniqueFeatures ? `Features: ${inputs.uniqueFeatures}` : ''}
${inputs.specialOffer ? `SPECIAL OFFER: ${inputs.specialOffer}` : ''}
${inputs.urgencyMessage ? `URGENCY/SCARCITY: "${inputs.urgencyMessage}"` : (inputs.availabilityStatus !== 'Available' ? `STATUS: "${inputs.availabilityStatus}"` : '')}

=== BUYER AVATAR (27-WORD PERSUASION FRAMEWORK) ===
${avatarContext}
${inputs.avatarDescription ? `
🎯 SPECIFIC AVATAR DESCRIPTION (PRIORITIZE THIS):
"${inputs.avatarDescription}"
↑ This is the EXACT persona to write for. Use their specific situation, language, and emotions.
` : ''}

${learnedInsights ? `=== 🧠 LEARNED INSIGHTS (From High-Performing Past Funnels) ===
${learnedInsights}
👆 CRITICAL: Use these proven patterns - they've been validated by real buyer behavior!
` : ''}

=== VIRAL HOOK INSPIRATION ===
Draw from these patterns (adapt, don't copy):
${viralHooks.map(h => `• "${h}"`).join('\n')}

=== WRITING STYLE: STACCATO ===
Use punchy, short sentences. Fragment when powerful. Patterns to use:
${staccatoPatterns}

=== 🎯 MARKET SOPHISTICATION STRATEGY ===
${marketSophistication}

=== 💥 POWER WORDS TO INJECT ===
${powerWords}
Use these strategically throughout your copy to trigger emotional responses.

${formulaContext}
🚨 IMPORTANT: You MUST follow the specific formulas selected above. These have been chosen by our learning algorithm.

=== CRITICAL: WHAT TO AVOID ===
Never use these weak phrases: ${antiPatterns}

Instead of vague language, use SPECIFICITY:
• "affordable" → "$1,450/month"
• "beautiful home" → "Natural light floods the open floor plan"
• "great opportunity" → "$10K below comps, seller motivated"

=== EDITING CHECK (APPLY BEFORE OUTPUT) ===
${cubaProtocol}

After writing, review each section using CUBA before finalizing.

=== OUTPUT REQUIREMENTS ===

Generate these sections in JSON format:

1. **hook** (STRUCTURED OBJECT with these fields):
   - "headline": VERY SHORT emotional hook (5-10 words ONLY, punchy, speaks to avatar's dreams). Examples: "Your Dream Home. No Bank Required." or "Stop Renting. Start Owning."
   - "subheadline": Supporting line (15-20 words, expands on headline, emotional). Example: "Stop settling for cramped apartments. Start building your family's future today."
   - "highlight": The 1-3 word KEY PHRASE from headline that should be visually emphasized (must be exact text from headline)
   - "benefit": Short benefit phrase, 3-5 words max (e.g., "No bank qualifying" or "Move in 30 days")
   - "urgency": ONLY if there's a special offer - combine time + offer in ONE phrase (e.g., "Apply this week for $1,000 off closing costs")${inputs.specialOffer ? `
   IMPORTANT: Use this special offer in urgency: "${inputs.specialOffer}"` : ''}
   - "bonus": ONLY include if there's an ADDITIONAL offer beyond urgency (e.g., "FREE home warranty"). Leave empty/omit if no additional bonus.

   Example format:
   "hook": {
     "headline": "Your Dream Home. No Bank Required.",
     "subheadline": "Stop settling for cramped apartments. Start building your family's future today.",
     "highlight": "Dream Home",
     "benefit": "No bank qualifying",
     "urgency": "Apply this week for $1,000 off closing costs"
   }

2. **problem** (3-4 sentences using staccato): Address avatar's fears, suspicions, past failures. Make them feel SEEN.

3. **solution** (3-4 sentences): Bridge from pain to Purple Homes. Address their top objection. Build trust.

4. **propertyShowcase** (4-5 sentences): Paint the AFTER state. Sensory language. Future pace their life in this home.

5. **testimonials** (ARRAY of 6 testimonial objects): Generate 6 diverse, realistic testimonials for the scrolling carousel.
   Each testimonial must have:
   - "quote": The testimonial text (2-3 sentences, specific challenge + specific result + emotion)
   - "authorName": First name + last initial (e.g., "Sarah M.", "Marcus T.", "Jennifer L.")
   - "authorTitle": Their title (vary these: "First-Time Homeowner", "Proud Homeowner", "Small Business Owner", "Happy Mom of 3", "Purple Homes Family")
   - "rating": Always 5

   Make each testimonial DIFFERENT - vary the challenges (credit issues, self-employed, divorce, immigrants, single parents, etc.) and the emotional journey. These should feel like real people sharing real stories.

   Example format:
   "testimonials": [
     {"quote": "I was rejected by three banks. Purple Homes saw my potential, not just my score. Now I'm building equity!", "authorName": "Sarah M.", "authorTitle": "First-Time Homeowner", "rating": 5},
     {"quote": "After my divorce, my credit took a hit. Traditional lenders wouldn't look at me. Purple Homes changed everything.", "authorName": "Marcus T.", "authorTitle": "Proud Homeowner", "rating": 5},
     ...4 more...
   ]

6. **callToAction** (2-3 sentences): Urgency + easy action + what happens next. Phone: (504) 475-0672

7. **locationNearby**: ${inputs.nearbyPlaces ? `Based on: ${inputs.nearbyPlaces}. ` : ''}One place per line, format: "Place Name - X min drive". NO bullet characters.

8. **qualifier**: Generate 4 statements for ideal buyer criteria. One per line, NO bullet characters. Example:
   "You're tired of paying rent with nothing to show for it
   You have steady income but banks keep saying no
   You want a safe neighborhood with good schools
   You're ready to stop dreaming and start owning"
   Tailor to ${buyerSegment} avatar. Do NOT just output "This home is perfect for you if..."

9. **pricingOptions**: Clean breakdown with all payment details

10. **faq**: 4-5 Q&A pairs addressing common objections for ${inputs.financingType.toLowerCase()}

${inputs.generateVariants ? `
11. **hookVariantB**: A/B Test Variant - Use a DIFFERENT formula than hook:
   - If hook is curiosity → variant is social-proof: "[Name] was [challenge]. Now they're [result]."
   - If hook is direct-benefit → variant is contrarian: "Stop [common advice]. Here's why."
   - Make it distinctly different to test which resonates more

12. **ctaVariantB**: A/B Test Variant - Use a DIFFERENT urgency type than callToAction:
   - Scarcity: "Only [X] showing slots this week. Call now: (504) 475-0672"
   - Risk-Reversal: "No commitment. No pressure. Just answers. Call (504) 475-0672"
   - Easy-Action: "Text 'HOME' to schedule your private tour"
   - Direct: "Call (504) 475-0672. Let's get you home."
` : ''}

Respond ONLY in valid JSON with these exact keys.`;

  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.75,
    response_format: { type: 'json_object' },
  });

  const generatedContent = JSON.parse(response.choices[0].message.content || '{}');

  // Helper to ensure a value is a string (AI sometimes returns arrays/objects)
  const ensureString = (value: unknown): string => {
    if (typeof value === 'string') return value;
    if (value === null || value === undefined) return '';

    if (Array.isArray(value)) {
      // For FAQ arrays, format as Q/A pairs
      if (value.length > 0 && typeof value[0] === 'object') {
        const first = value[0] as Record<string, unknown>;
        if ('question' in first || 'Q' in first) {
          return value.map((item: Record<string, unknown>) => {
            const q = String(item.question || item.Q || '');
            const a = String(item.answer || item.A || '');
            return `Q: ${q}\nA: ${a}`;
          }).join('\n\n');
        }
        // For pricing arrays or other object arrays, format nicely
        return value.map((item: Record<string, unknown>) => {
          return Object.entries(item)
            .map(([key, val]) => `${key}: ${val}`)
            .join('\n');
        }).join('\n\n');
      }
      // For simple string arrays (bullet points)
      return value.map(item => typeof item === 'string' ? `• ${item}` : `• ${String(item)}`).join('\n');
    }

    // For objects (like pricing), format as key-value pairs
    if (value && typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      return Object.entries(obj)
        .map(([key, val]) => {
          // Format key nicely (camelCase to Title Case)
          const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
          return `${formattedKey}: ${val}`;
        })
        .join('\n');
    }

    return String(value);
  };

  // Handle hook - can be structured object or string (for backward compatibility)
  const processHook = (hookData: unknown): string | HookStructure => {
    if (typeof hookData === 'object' && hookData !== null && 'headline' in hookData) {
      // New structured format
      const structured = hookData as Record<string, unknown>;
      return {
        headline: String(structured.headline || ''),
        subheadline: structured.subheadline ? String(structured.subheadline) : undefined,
        highlight: structured.highlight ? String(structured.highlight) : undefined,
        benefit: structured.benefit ? String(structured.benefit) : undefined,
        urgency: structured.urgency ? String(structured.urgency) : undefined,
        bonus: structured.bonus ? String(structured.bonus) : undefined,
      };
    }
    // Old string format (backward compatible)
    return ensureString(hookData);
  };

  return {
    propertySlug: slug,
    generatedAt: new Date().toISOString(),
    propertyHash: hash,
    inputs,
    hook: processHook(generatedContent.hook),
    problem: ensureString(generatedContent.problem),
    solution: ensureString(generatedContent.solution),
    propertyShowcase: ensureString(generatedContent.propertyShowcase),
    socialProof: ensureString(generatedContent.socialProof),
    callToAction: ensureString(generatedContent.callToAction),
    // Optional sections
    locationNearby: generatedContent.locationNearby ? ensureString(generatedContent.locationNearby) : undefined,
    qualifier: generatedContent.qualifier ? ensureString(generatedContent.qualifier) : undefined,
    pricingOptions: generatedContent.pricingOptions ? ensureString(generatedContent.pricingOptions) : undefined,
    virtualTourUrl: inputs.virtualTourUrl || undefined,
    faq: generatedContent.faq ? ensureString(generatedContent.faq) : undefined,
    // A/B variants
    hookVariantB: generatedContent.hookVariantB || undefined,
    ctaVariantB: generatedContent.ctaVariantB || undefined,
    // Avatar Research Link
    avatarResearchId: avatarResearchId || undefined,
    // Formula Tracking (Strategy Learning)
    formulasUsed: selectedFormulas,
  };
}

/**
 * Generate avatar research and get the research ID
 */
/**
 * Generate full avatar research by directly calling the avatar research generation logic
 * This ensures research entries are complete, not stubs with null data
 */
async function generateAvatarResearchAndGetId(
  buyerSegment: BuyerSegment,
  propertyType?: string,
  propertyCity?: string,
  propertyPrice?: number
): Promise<string | undefined> {
  console.log('[Avatar Research Generation] ====== STARTING ======');
  console.log('[Avatar Research Generation] Input:', { buyerSegment, propertyType, propertyCity, propertyPrice });

  try {
    // Import the avatar research module dynamically
    console.log('[Avatar Research Generation] Importing avatar-research module...');
    const avatarResearchModule = await import('./avatar-research');
    console.log('[Avatar Research Generation] Module imported successfully');

    // Build property context
    const propertyContext = {
      type: propertyType,
      city: propertyCity,
      priceRange: propertyPrice ? `$${Math.floor(propertyPrice / 50000) * 50}k-$${Math.ceil(propertyPrice / 50000) * 50}k` : undefined,
    };
    console.log('[Avatar Research Generation] Property context:', propertyContext);

    // Generate full avatar research (not a stub!)
    // This will call the actual AI generation and save complete research
    console.log('[Avatar Research Generation] Calling generateAvatarResearchEntry...');
    const research = await avatarResearchModule.generateAvatarResearchEntry(
      buyerSegment,
      propertyContext
    );
    console.log('[Avatar Research Generation] generateAvatarResearchEntry returned:', research ? { id: research.id, hasResearch: !!research.research } : 'null');

    if (research && research.id) {
      console.log('[Avatar Research Generation] ====== SUCCESS ====== ID:', research.id);
      return research.id;
    }

    console.warn('[Avatar Research Generation] ====== FAILED ====== No ID returned');
    return undefined;
  } catch (error) {
    console.error('[Avatar Research Generation] ====== ERROR ======', error);
    // Don't fail funnel generation if avatar research fails - continue without it
    return undefined;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = req.query.action as string;

  console.log(`[Funnel API] Action: ${action}, Environment: ${IS_VERCEL ? 'Vercel' : 'Local'}`);

  try {
    switch (action) {
      case 'generate': {
        if (req.method !== 'POST') {
          return res.status(405).json({ error: 'Method not allowed' });
        }

        const propertyData = req.body as FunnelContentRequest & { recordId?: string };

        if (!propertyData.address || !propertyData.city) {
          return res.status(400).json({ error: 'Missing required fields: address, city' });
        }

        console.log('[Funnel API] Generating content for:', propertyData.address);

        // Persist & Grow: Generate avatar research with timeout
        // Avatar research is optional - if it times out, we continue without it
        const inputs = { ...DEFAULT_INPUTS, ...propertyData.inputs };
        let avatarResearchId: string | undefined;

        try {
          // Set a 8-second timeout for avatar research to leave time for funnel generation
          const AVATAR_RESEARCH_TIMEOUT = 8000;

          const avatarResearchPromise = generateAvatarResearchAndGetId(
            inputs.buyerSegment || 'first-time-buyer',
            propertyData.propertyType,
            propertyData.city,
            propertyData.price
          );

          const timeoutPromise = new Promise<undefined>((_, reject) =>
            setTimeout(() => reject(new Error('Avatar research timeout')), AVATAR_RESEARCH_TIMEOUT)
          );

          avatarResearchId = await Promise.race([avatarResearchPromise, timeoutPromise]);

          if (avatarResearchId) {
            console.log('[Funnel API] Avatar research generated with ID:', avatarResearchId);
          }
        } catch (error) {
          // Don't fail funnel generation if avatar research fails or times out
          const errorMsg = (error as Error)?.message || 'Unknown error';
          console.warn('[Funnel API] Avatar research skipped:', errorMsg);
        }

        const content = await generateFunnelContent(propertyData, avatarResearchId);
        console.log('[Funnel API] Content generated, avatarResearchId in content:', content.avatarResearchId || 'NOT SET');

        // Try to auto-save to filesystem (works on local, skipped on Vercel)
        const savedToFile = tryWriteContent(content.propertySlug, content);

        // Also save to Airtable if recordId provided
        let savedToAirtable = false;
        const recordId = propertyData.recordId || (req.query.recordId as string);
        if (recordId) {
          savedToAirtable = await airtableSaveContent(recordId, content);
        } else {
          // Try to find property by address
          const foundRecordId = await airtableFindByAddress(propertyData.address, propertyData.city);
          if (foundRecordId) {
            savedToAirtable = await airtableSaveContent(foundRecordId, content);
          }
        }

        console.log('[Funnel API] ====== GENERATE COMPLETE ======');
        console.log('[Funnel API] Response avatarResearchId:', content.avatarResearchId || 'NOT SET');
        console.log('[Funnel API] savedToFile:', savedToFile);
        console.log('[Funnel API] savedToAirtable:', savedToAirtable);

        return res.json({
          success: true,
          content,
          filePath: savedToFile ? `/content/properties/${content.propertySlug}.md` : null,
          savedToFile,
          savedToAirtable,
          note: !savedToFile && !savedToAirtable ? 'Content generated. Pass recordId to persist to Airtable.' : undefined,
        });
      }

      case 'get': {
        const slug = req.query.slug as string;
        const recordId = req.query.recordId as string;

        if (!slug && !recordId) {
          return res.status(400).json({ error: 'Missing slug or recordId parameter' });
        }

        // Try Airtable first if recordId provided
        if (recordId) {
          const airtableContent = await airtableReadContent(recordId);
          if (airtableContent) {
            return res.json({ success: true, content: airtableContent, exists: true, source: 'airtable' });
          }
        }

        // Fall back to filesystem
        if (slug) {
          const fileContent = tryReadContent(slug);
          if (fileContent) {
            return res.json({ success: true, content: fileContent, exists: true, source: 'file' });
          }
        }

        return res.json({ success: true, content: null, exists: false });
      }

      case 'save': {
        if (req.method !== 'POST') {
          return res.status(405).json({ error: 'Method not allowed' });
        }

        const { slug, content, recordId } = req.body as { slug: string; content: FunnelContent; recordId?: string };

        if (!content) {
          return res.status(400).json({ error: 'Missing content' });
        }

        // Try filesystem save (local dev only)
        const savedToFile = slug ? tryWriteContent(slug, content) : false;

        // Save to Airtable if recordId provided
        let savedToAirtable = false;
        const targetRecordId = recordId || (req.query.recordId as string);
        if (targetRecordId) {
          savedToAirtable = await airtableSaveContent(targetRecordId, content);
        }

        if (!savedToFile && !savedToAirtable) {
          return res.json({
            success: true,
            filePath: null,
            savedToFile: false,
            savedToAirtable: false,
            note: 'Content not persisted. Provide recordId to save to Airtable.',
          });
        }

        return res.json({
          success: true,
          filePath: savedToFile ? `/content/properties/${slug}.md` : null,
          savedToFile,
          savedToAirtable,
        });
      }

      case 'delete': {
        if (req.method !== 'POST' && req.method !== 'DELETE') {
          return res.status(405).json({ error: 'Method not allowed' });
        }

        const slug = req.query.slug as string || req.body?.slug;

        if (!slug) {
          return res.status(400).json({ error: 'Missing slug parameter' });
        }

        const deleted = tryDeleteContent(slug);

        return res.json({ success: true, deleted });
      }

      case 'list': {
        if (IS_VERCEL) {
          // Can't list files on Vercel
          return res.json({ success: true, slugs: [], note: 'File listing not available on Vercel' });
        }

        try {
          if (!fs.existsSync(CONTENT_DIR)) {
            return res.json({ success: true, slugs: [] });
          }
          const files = fs.readdirSync(CONTENT_DIR)
            .filter(f => f.endsWith('.md'))
            .map(f => f.replace('.md', ''));
          return res.json({ success: true, slugs: files });
        } catch {
          return res.json({ success: true, slugs: [] });
        }
      }

      case 'test':
        // Simple test to verify function loads
        return res.json({
          success: true,
          message: 'Funnel API is working',
          environment: IS_VERCEL ? 'vercel' : 'local',
          hasPromptSystem: !!promptSystem,
          hasAirtableConfig: !!(AIRTABLE_API_KEY && AIRTABLE_BASE_ID),
        });

      case 'clear-inputs': {
        // Clear all hardcoded inputs from all properties, reset to defaults
        if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
          return res.status(500).json({ error: 'Airtable not configured' });
        }

        try {
          // Fetch all properties with FunnelContent
          const listResponse = await fetchWithRetry(
            `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Properties?fields%5B%5D=FunnelContent&filterByFormula=NOT(%7BFunnelContent%7D%3D'')`,
            {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                'Content-Type': 'application/json',
              },
            }
          );

          if (!listResponse.ok) {
            throw new Error(`Failed to list properties: ${listResponse.status}`);
          }

          const listData = await listResponse.json();
          const records = listData.records || [];
          console.log(`[Funnel API] Found ${records.length} properties with FunnelContent`);

          let cleared = 0;
          let errors = 0;

          for (const record of records) {
            try {
              const funnelContentStr = record.fields?.FunnelContent;
              if (!funnelContentStr) continue;

              const content = JSON.parse(funnelContentStr);

              // Reset inputs to defaults (blank)
              content.inputs = { ...DEFAULT_INPUTS };

              // Save back to Airtable
              const updateResponse = await fetchWithRetry(
                `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Properties/${record.id}`,
                {
                  method: 'PATCH',
                  headers: {
                    'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    fields: {
                      'FunnelContent': JSON.stringify(content),
                    },
                  }),
                }
              );

              if (updateResponse.ok) {
                cleared++;
                console.log(`[Funnel API] Cleared inputs for: ${record.id}`);
              } else {
                errors++;
                console.error(`[Funnel API] Failed to clear: ${record.id}`);
              }
            } catch (e) {
              errors++;
              console.error(`[Funnel API] Error processing ${record.id}:`, e);
            }
          }

          return res.json({
            success: true,
            message: `Cleared inputs from ${cleared} properties`,
            cleared,
            errors,
            total: records.length,
          });
        } catch (error) {
          console.error('[Funnel API] Clear inputs error:', error);
          return res.status(500).json({ error: 'Failed to clear inputs', details: String(error) });
        }
      }

      default:
        return res.status(400).json({ error: 'Unknown action', validActions: ['generate', 'get', 'save', 'delete', 'list', 'test', 'clear-inputs'] });
    }
  } catch (error) {
    console.error('[Funnel API] Error:', error);
    return res.status(500).json({ error: 'Internal server error', details: String(error) });
  }
}
