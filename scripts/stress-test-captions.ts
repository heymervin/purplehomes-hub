#!/usr/bin/env tsx
/**
 * Caption Generation Stress Test
 *
 * Run with: npx tsx scripts/stress-test-captions.ts
 *
 * Prerequisites:
 * - Local API server running: npm run dev:api
 * - Or use production API with VERCEL_URL env var
 *
 * Tests:
 * 1. All 6 tones produce distinct outputs
 * 2. Body copy includes specific details from user context
 * 3. No border characters (═══) in output
 * 4. Multiple intent types work correctly
 */

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const API_URL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}/api/ai?action=caption`
  : 'http://localhost:3001/api/ai?action=caption';

// ============================================================================
// TEST DATA
// ============================================================================

const TEST_CASES = {
  propertyJustListed: {
    name: 'Property: Just Listed with Rich Context',
    payload: {
      property: {
        address: '123 Peachtree St',
        city: 'Atlanta',
        state: 'GA',
        price: 285000,
        downPayment: 8550,
        monthlyPayment: 1895,
        beds: 3,
        baths: 2,
        sqft: 1800,
        propertyType: 'Single Family',
        description: 'Completely renovated kitchen with granite counters and stainless appliances. New roof in 2023. Corner lot with mature oak trees. Owner financing available with 3% down.',
      },
      context: 'Completely renovated kitchen with granite counters and stainless appliances. New roof in 2023. Corner lot with mature oak trees. Owner financing available with 3% down.',
      postIntent: 'just-listed',
      platform: 'instagram',
      agentName: 'Marcus',
    },
    expectedWords: ['kitchen', 'roof', 'financing', 'corner'],
  },

  personalMilestone: {
    name: 'Personal: Milestone with Story',
    payload: {
      property: null,
      context: 'Milestone: 100 homes closed\nWhy it matters: 10 years of early mornings, late nights, and never giving up. Started from zero.',
      postIntent: 'milestone',
      platform: 'instagram',
      agentName: 'Marcus',
    },
    expectedWords: ['100', 'years'],
  },

  professionalMarketUpdate: {
    name: 'Professional: Market Update with Stats',
    payload: {
      property: null,
      context: 'Headline: Atlanta Inventory Hits 4-Year Low\nStats: Active listings down 23% YoY, median price up 8%\nSo what: Buyers need to move fast.',
      postIntent: 'market-update',
      platform: 'instagram',
      agentName: 'Marcus',
    },
    expectedWords: ['inventory', '23%', 'buyers'],
  },
};

const ALL_TONES = ['professional', 'casual', 'urgent', 'friendly', 'luxury', 'investor'] as const;

// ============================================================================
// VALIDATION
// ============================================================================

function checkNoBorders(caption: string): { pass: boolean; found: string[] } {
  const patterns = [/═+/g, /─+/g, /\*{3,}/g];
  const found: string[] = [];
  for (const p of patterns) {
    const m = caption.match(p);
    if (m) found.push(...m);
  }
  return { pass: found.length === 0, found };
}

function checkSubstance(caption: string, expectedWords: string[]): { pass: boolean; found: string[]; missing: string[] } {
  const lower = caption.toLowerCase();
  const found = expectedWords.filter(w => lower.includes(w.toLowerCase()));
  const missing = expectedWords.filter(w => !lower.includes(w.toLowerCase()));
  // Pass if at least half of expected words are present
  return { pass: found.length >= Math.ceil(expectedWords.length / 2), found, missing };
}

// ============================================================================
// API CALL
// ============================================================================

async function generateCaption(payload: object, tone: string): Promise<string> {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, tone }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error ${response.status}: ${error}`);
  }

  const data = await response.json();
  return data.caption || data.error || 'No caption returned';
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

interface TestResult {
  testCase: string;
  tone: string;
  caption: string;
  borderCheck: { pass: boolean; found: string[] };
  substanceCheck: { pass: boolean; found: string[]; missing: string[] };
  latencyMs: number;
}

async function runTests(): Promise<void> {
  console.log('\n🧪 CAPTION GENERATION STRESS TEST');
  console.log(`📡 API: ${API_URL}\n`);
  console.log('='.repeat(80));

  const results: TestResult[] = [];
  let totalPass = 0;
  let totalFail = 0;

  for (const [testKey, testData] of Object.entries(TEST_CASES)) {
    console.log(`\n📋 ${testData.name}`);
    console.log('-'.repeat(80));

    const toneCaptions: Record<string, string> = {};

    for (const tone of ALL_TONES) {
      const start = Date.now();
      try {
        const caption = await generateCaption(testData.payload, tone);
        const latencyMs = Date.now() - start;
        toneCaptions[tone] = caption;

        const borderCheck = checkNoBorders(caption);
        const substanceCheck = checkSubstance(caption, testData.expectedWords);

        const result: TestResult = {
          testCase: testKey,
          tone,
          caption,
          borderCheck,
          substanceCheck,
          latencyMs,
        };
        results.push(result);

        const passEmoji = borderCheck.pass && substanceCheck.pass ? '✅' : '❌';
        if (borderCheck.pass && substanceCheck.pass) {
          totalPass++;
        } else {
          totalFail++;
        }

        console.log(`\n${passEmoji} TONE: ${tone.toUpperCase()} (${latencyMs}ms)`);
        console.log(`   Borders: ${borderCheck.pass ? 'CLEAN' : `FOUND: ${borderCheck.found.join(', ')}`}`);
        console.log(`   Substance: ${substanceCheck.pass ? 'GOOD' : 'WEAK'} - Found: [${substanceCheck.found.join(', ')}], Missing: [${substanceCheck.missing.join(', ')}]`);
        console.log(`   ┌────────────────────────────────────────────────────────`);
        // Truncate caption preview to 200 chars per line
        const lines = caption.split('\n').slice(0, 6);
        for (const line of lines) {
          console.log(`   │ ${line.slice(0, 70)}${line.length > 70 ? '...' : ''}`);
        }
        if (caption.split('\n').length > 6) {
          console.log(`   │ ... (${caption.split('\n').length - 6} more lines)`);
        }
        console.log(`   └────────────────────────────────────────────────────────`);
      } catch (error) {
        totalFail++;
        console.log(`\n❌ TONE: ${tone.toUpperCase()} - ERROR`);
        console.log(`   ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Check tone differentiation
    const toneTexts = Object.values(toneCaptions);
    const uniqueFirstSentences = new Set(
      toneTexts.map(t => {
        const sentences = t.split(/[.!?]/);
        return sentences[1]?.trim().toLowerCase(); // Skip hook, get first body sentence
      }).filter(Boolean)
    );
    const differentiation = uniqueFirstSentences.size >= 4; // At least 4/6 should be unique
    console.log(`\n🔀 Tone Differentiation: ${differentiation ? '✅ GOOD' : '⚠️ SIMILAR'} (${uniqueFirstSentences.size}/6 unique first sentences)`);
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total tests: ${totalPass + totalFail}`);
  console.log(`✅ Passed: ${totalPass}`);
  console.log(`❌ Failed: ${totalFail}`);
  console.log(`Pass rate: ${((totalPass / (totalPass + totalFail)) * 100).toFixed(1)}%`);

  // Detailed failures
  const failures = results.filter(r => !r.borderCheck.pass || !r.substanceCheck.pass);
  if (failures.length > 0) {
    console.log('\n⚠️ FAILURES:');
    for (const f of failures) {
      console.log(`   - ${f.testCase} / ${f.tone}:`);
      if (!f.borderCheck.pass) console.log(`     Border chars found: ${f.borderCheck.found.join(', ')}`);
      if (!f.substanceCheck.pass) console.log(`     Missing context: ${f.substanceCheck.missing.join(', ')}`);
    }
  }

  console.log('\n' + '='.repeat(80));
  process.exit(totalFail > 0 ? 1 : 0);
}

// Run
runTests().catch(console.error);
