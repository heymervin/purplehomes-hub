/**
 * Full Caption Stress Test - All 16 Intents
 * Generates captions with realistic context for every intent
 *
 * Run with: npx tsx scripts/full-caption-stress-test.ts
 */

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const API_BASE = process.env.API_BASE || 'http://localhost:3001';

// ============================================================================
// TEST DATA
// ============================================================================

const TEST_PROPERTIES = {
  luxury: {
    id: 'prop-luxury-1',
    address: '4521 Lakeshore Drive',
    city: 'Austin',
    state: 'TX',
    price: 1250000,
    beds: 5,
    baths: 4,
    sqft: 4200,
    propertyType: 'Single Family',
    description: 'Stunning lakefront estate with panoramic views',
    heroImage: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800',
  },
  starter: {
    id: 'prop-starter-1',
    address: '782 Maple Avenue',
    city: 'Round Rock',
    state: 'TX',
    price: 285000,
    beds: 3,
    baths: 2,
    sqft: 1450,
    propertyType: 'Single Family',
    description: 'Charming starter home in family-friendly neighborhood',
    heroImage: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800',
  },
  investment: {
    id: 'prop-invest-1',
    address: '1205 Commerce Street',
    city: 'Dallas',
    state: 'TX',
    price: 189000,
    beds: 2,
    baths: 1,
    sqft: 1100,
    propertyType: 'Duplex',
    arv: 265000,
    repairCost: 35000,
    description: 'Value-add opportunity in emerging neighborhood',
    heroImage: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800',
  },
};

// All 16 intents with realistic context
const ALL_INTENTS = [
  // ===== PROPERTY INTENTS (6) =====
  {
    intent: 'just-listed',
    domain: 'property',
    property: TEST_PROPERTIES.luxury,
    context: 'Private dock with boat lift. Chef\'s kitchen with Wolf appliances. Master suite with lake views. Minutes from downtown.',
    tone: 'luxury',
  },
  {
    intent: 'sold',
    domain: 'property',
    property: TEST_PROPERTIES.starter,
    context: 'Multiple offers in 48 hours. Sold $15K over asking. First-time buyers got their dream home.',
    tone: 'friendly',
  },
  {
    intent: 'under-contract',
    domain: 'property',
    property: TEST_PROPERTIES.luxury,
    context: 'Accepted offer after just 3 days on market. Backup offers welcome.',
    tone: 'professional',
  },
  {
    intent: 'price-drop',
    domain: 'property',
    property: TEST_PROPERTIES.starter,
    context: 'Price reduced by $20,000. Motivated seller. Won\'t last at this price.',
    tone: 'urgent',
  },
  {
    intent: 'open-house',
    domain: 'property',
    property: TEST_PROPERTIES.luxury,
    context: 'Open House: Saturday 1-4pm. Champagne reception. Private tours available.',
    tone: 'luxury',
  },
  {
    intent: 'investment',
    domain: 'property',
    property: TEST_PROPERTIES.investment,
    context: 'Cap rate 8.2%. Both units currently rented. $2,400/month gross income. Long-term tenants.',
    tone: 'investor',
  },

  // ===== PERSONAL INTENTS (4) =====
  {
    intent: 'life-update',
    domain: 'personal',
    property: null,
    context: 'Just got back from a week in Cabo with the family. Nothing like unplugging to remember why we work so hard. Feeling recharged and ready to help more families find their perfect home.',
    tone: 'casual',
  },
  {
    intent: 'milestone',
    domain: 'personal',
    property: null,
    context: 'Today marks 10 years since I got my real estate license. 247 families helped. Countless late nights. Zero regrets. This career chose me.',
    tone: 'friendly',
  },
  {
    intent: 'lesson-insight',
    domain: 'personal',
    property: null,
    context: 'Lost a deal yesterday because I rushed the inspection contingency. Lesson learned: Never let urgency override due diligence. Sharing this so you don\'t make the same mistake.',
    tone: 'professional',
  },
  {
    intent: 'behind-the-scenes',
    domain: 'personal',
    property: null,
    context: 'What my Sundays actually look like: 6am - review new listings, 8am - prep for open houses, 10am-4pm - back to back showings, 5pm - follow up calls, 7pm - family dinner (finally!). This job isn\'t 9-5 and I wouldn\'t have it any other way.',
    tone: 'casual',
  },

  // ===== PROFESSIONAL INTENTS (6) =====
  {
    intent: 'market-update',
    domain: 'professional',
    property: null,
    context: 'Headline: Austin Market Cooling But Still Competitive\nKey Stats: Median price down 3% YoY. Days on market up to 28. Inventory at 2.1 months.\nWhy It Matters: Buyers finally have some breathing room, but well-priced homes still move fast.',
    tone: 'professional',
  },
  {
    intent: 'buyer-tips',
    domain: 'professional',
    property: null,
    context: 'Tip Title: Get Pre-Approved Before You Start Looking\nTip Details: I see it every week - buyers fall in love with a home, then scramble to get financing. By the time they\'re approved, the home is gone. Get your pre-approval letter first. It takes 24 hours and gives you a massive advantage.',
    tone: 'friendly',
  },
  {
    intent: 'seller-tips',
    domain: 'professional',
    property: null,
    context: 'Tip Title: The $500 Fix That Adds $5,000 to Your Sale Price\nTip Details: Fresh paint on your front door and new house numbers. Sounds simple, but first impressions are everything. I\'ve seen this small investment pay for itself 10x over.',
    tone: 'professional',
  },
  {
    intent: 'investment-insight',
    domain: 'professional',
    property: null,
    context: 'Insight: Why I\'m Bullish on East Austin Duplexes Right Now\nKey Metric: Average duplex price $380K with 7.5% cap rate. New zoning changes allowing ADUs. Light rail extension coming 2026.',
    tone: 'investor',
  },
  {
    intent: 'client-success-story',
    domain: 'professional',
    property: null,
    context: 'Client Challenge: First-time buyers, outbid on 4 homes, losing hope.\nHow We Helped: Found an off-market property through my network. Negotiated $10K below asking.\nOutcome: They moved in last week. Keys in hand. Biggest smiles I\'ve seen all year.',
    tone: 'friendly',
  },
  {
    intent: 'community-spotlight',
    domain: 'professional',
    property: null,
    context: 'Spotlight: Rosita\'s Tacos on South Congress\nDetails: Family-owned for 30 years. Best breakfast tacos in Austin. The owner Rosa still makes the salsa by hand every morning. This is why I love selling homes here - it\'s not just houses, it\'s community.',
    tone: 'casual',
  },
];

interface CaptionResult {
  intent: string;
  domain: string;
  tone: string;
  context: string;
  caption: string;
  duration: number;
  success: boolean;
  error?: string;
  contextUsed?: boolean;
}

// ============================================================================
// GENERATE ALL CAPTIONS
// ============================================================================

async function generateCaption(test: typeof ALL_INTENTS[0]): Promise<CaptionResult> {
  const start = Date.now();

  try {
    const response = await fetch(`${API_BASE}/api/ai?action=caption`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        property: test.property,
        context: test.context,
        postIntent: test.intent,
        tone: test.tone,
        platform: 'instagram',
      }),
    });

    const duration = Date.now() - start;
    const data = await response.json();

    if (response.ok && data.caption) {
      // Check if context was used (for personal/professional)
      let contextUsed = true;
      if (test.domain !== 'property') {
        // Extract key phrases from context to verify they appear in caption
        const contextLower = test.context.toLowerCase();
        const captionLower = data.caption.toLowerCase();

        // Look for distinctive words from the context
        const contextWords = contextLower.split(/\s+/).filter(w => w.length > 5);
        const matchedWords = contextWords.filter(w => captionLower.includes(w));
        contextUsed = matchedWords.length >= 2;
      }

      return {
        intent: test.intent,
        domain: test.domain,
        tone: test.tone,
        context: test.context,
        caption: data.caption,
        duration,
        success: true,
        contextUsed,
      };
    } else {
      return {
        intent: test.intent,
        domain: test.domain,
        tone: test.tone,
        context: test.context,
        caption: '',
        duration,
        success: false,
        error: data.error || 'No caption returned',
      };
    }
  } catch (error) {
    return {
      intent: test.intent,
      domain: test.domain,
      tone: test.tone,
      context: test.context,
      caption: '',
      duration: Date.now() - start,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function runFullTest() {
  console.log('\n' + '='.repeat(70));
  console.log('🧪 FULL CAPTION STRESS TEST - ALL 16 INTENTS');
  console.log('='.repeat(70) + '\n');

  const results: CaptionResult[] = [];

  for (let i = 0; i < ALL_INTENTS.length; i++) {
    const test = ALL_INTENTS[i];
    process.stdout.write(`[${i + 1}/${ALL_INTENTS.length}] ${test.domain}/${test.intent}... `);

    const result = await generateCaption(test);
    results.push(result);

    if (result.success) {
      console.log(`✅ (${result.duration}ms)`);
    } else {
      console.log(`❌ ${result.error}`);
    }
  }

  // Generate markdown document
  const markdown = generateMarkdownReport(results);

  // Write to file
  const outputPath = path.resolve(process.cwd(), 'docs/caption-stress-test-results.md');
  fs.writeFileSync(outputPath, markdown);

  console.log('\n' + '='.repeat(70));
  console.log('📄 Report saved to: docs/caption-stress-test-results.md');
  console.log('='.repeat(70) + '\n');

  // Summary
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const contextUsedCount = results.filter(r => r.contextUsed).length;

  console.log(`Total: ${results.length}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ❌`);
  console.log(`Context properly used: ${contextUsedCount}/${results.filter(r => r.domain !== 'property').length} (Personal/Professional)`);

  process.exit(failed > 0 ? 1 : 0);
}

function generateMarkdownReport(results: CaptionResult[]): string {
  const timestamp = new Date().toISOString();

  let md = `# Social Hub Caption Stress Test Results

**Generated:** ${timestamp}
**Total Intents Tested:** ${results.length}
**Passed:** ${results.filter(r => r.success).length}
**Failed:** ${results.filter(r => !r.success).length}

---

## Summary

| Domain | Intent | Tone | Duration | Status |
|--------|--------|------|----------|--------|
${results.map(r => `| ${r.domain} | ${r.intent} | ${r.tone} | ${r.duration}ms | ${r.success ? '✅' : '❌'} |`).join('\n')}

---

## Property Intents (6)

${results.filter(r => r.domain === 'property').map(r => `
### ${r.intent.toUpperCase()}

**Tone:** ${r.tone}
**Duration:** ${r.duration}ms

**Context Provided:**
> ${r.context}

**Generated Caption:**
\`\`\`
${r.caption}
\`\`\`

---
`).join('\n')}

## Personal Intents (4)

${results.filter(r => r.domain === 'personal').map(r => `
### ${r.intent.toUpperCase()}

**Tone:** ${r.tone}
**Duration:** ${r.duration}ms
**Context Used in Output:** ${r.contextUsed ? '✅ Yes' : '❌ No'}

**Context Provided:**
> ${r.context}

**Generated Caption:**
\`\`\`
${r.caption}
\`\`\`

---
`).join('\n')}

## Professional Intents (6)

${results.filter(r => r.domain === 'professional').map(r => `
### ${r.intent.toUpperCase()}

**Tone:** ${r.tone}
**Duration:** ${r.duration}ms
**Context Used in Output:** ${r.contextUsed ? '✅ Yes' : '❌ No'}

**Context Provided:**
> ${r.context}

**Generated Caption:**
\`\`\`
${r.caption}
\`\`\`

---
`).join('\n')}

## Test Configuration

\`\`\`json
${JSON.stringify({
  apiBase: API_BASE,
  platform: 'instagram',
  propertiesUsed: Object.keys(TEST_PROPERTIES),
}, null, 2)}
\`\`\`
`;

  return md;
}

runFullTest().catch(console.error);
