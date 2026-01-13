/**
 * Stress Test Script for Social Hub
 * Tests Imejis API and AI Caption Generation
 *
 * Run with: npx tsx scripts/stress-test.ts
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const API_BASE = process.env.API_BASE || 'http://localhost:3001';
const IMEJIS_API_KEY = process.env.VITE_IMEJIS_API_KEY || 'ysU0Hk6MVBSg6NVLDoPwx';
const IMEJIS_BASE_URL = 'https://render.imejis.io/v1';

// Test property data
const TEST_PROPERTY = {
  id: 'test-prop-1',
  address: '123 Oak Street',
  city: 'Austin',
  state: 'TX',
  price: 450000,
  beds: 3,
  baths: 2,
  sqft: 1800,
  propertyType: 'Single Family',
  heroImage: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800',
};

// Test contexts for each domain
const TEST_CONTEXTS = {
  property: {
    intent: 'just-listed',
    context: 'Corner lot with amazing sunset views. Updated kitchen with granite countertops and stainless appliances. Great neighborhood near top schools.',
  },
  personal: {
    intent: 'milestone',
    context: 'Just closed my 100th real estate transaction! Five years in this business and every deal has taught me something new.',
  },
  professional: {
    intent: 'buyer-tips',
    context: 'Tip Title: Always Get a Sewer Scope\nTip Details: A $200 sewer scope inspection saved my client $47,000 last week when we discovered root intrusion.',
  },
};

interface TestResult {
  name: string;
  success: boolean;
  duration: number;
  error?: string;
  details?: any;
}

const results: TestResult[] = [];

// ============================================================================
// TEST 1: Imejis API Health Check
// ============================================================================
async function testImejisHealth(): Promise<TestResult> {
  const start = Date.now();
  const name = 'Imejis API Health';

  try {
    // Test with a simple template render (just-listed)
    const templateId = 'QorQjk-HEOq1c9qMKxTN4'; // Just Listed template ID from profiles.ts

    const response = await fetch(`${IMEJIS_BASE_URL}/${templateId}`, {
      method: 'POST',
      headers: {
        'dma-api-key': IMEJIS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // Use actual field IDs from the template profile
        'image_comp_1767862725425_2jgk7k965': { image: TEST_PROPERTY.heroImage, opacity: 1 },
        'text_comp_1767864783352_5o7fpiht0': { text: TEST_PROPERTY.address },
        'text_comp_1767864146031_237ayry70': { text: `$${TEST_PROPERTY.price.toLocaleString()}` },
      }),
    });

    const duration = Date.now() - start;

    if (response.ok) {
      const contentType = response.headers.get('content-type');
      return {
        name,
        success: true,
        duration,
        details: { status: response.status, contentType },
      };
    } else {
      const errorText = await response.text();
      return {
        name,
        success: false,
        duration,
        error: `HTTP ${response.status}: ${errorText.substring(0, 200)}`,
      };
    }
  } catch (error) {
    return {
      name,
      success: false,
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ============================================================================
// TEST 2: AI Caption - Property Domain
// ============================================================================
async function testCaptionProperty(): Promise<TestResult> {
  const start = Date.now();
  const name = 'AI Caption - Property (just-listed)';

  try {
    const response = await fetch(`${API_BASE}/api/ai?action=caption`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        property: TEST_PROPERTY,
        context: TEST_CONTEXTS.property.context,
        postIntent: TEST_CONTEXTS.property.intent,
        tone: 'urgent',
        platform: 'instagram',
      }),
    });

    const duration = Date.now() - start;
    const data = await response.json();

    if (response.ok && data.caption) {
      // Verify caption contains expected elements
      const hasAddress = data.caption.includes(TEST_PROPERTY.address) ||
                         data.caption.toLowerCase().includes('oak');
      const hasContext = data.caption.toLowerCase().includes('corner') ||
                         data.caption.toLowerCase().includes('sunset') ||
                         data.caption.toLowerCase().includes('kitchen');

      return {
        name,
        success: true,
        duration,
        details: {
          captionLength: data.caption.length,
          hasAddress,
          hasContext,
          preview: data.caption.substring(0, 150) + '...',
        },
      };
    } else {
      return {
        name,
        success: false,
        duration,
        error: data.error || 'No caption returned',
      };
    }
  } catch (error) {
    return {
      name,
      success: false,
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ============================================================================
// TEST 3: AI Caption - Personal Domain (Context MUST be used)
// ============================================================================
async function testCaptionPersonal(): Promise<TestResult> {
  const start = Date.now();
  const name = 'AI Caption - Personal (milestone)';

  try {
    const response = await fetch(`${API_BASE}/api/ai?action=caption`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        property: null,
        context: TEST_CONTEXTS.personal.context,
        postIntent: TEST_CONTEXTS.personal.intent,
        tone: 'friendly',
        platform: 'facebook',
      }),
    });

    const duration = Date.now() - start;
    const data = await response.json();

    if (response.ok && data.caption) {
      // CRITICAL: Verify context is actually used in caption
      const has100th = data.caption.includes('100') || data.caption.toLowerCase().includes('hundred');
      const hasFiveYears = data.caption.toLowerCase().includes('five') ||
                           data.caption.includes('5');
      const contextUsed = has100th || hasFiveYears;

      return {
        name,
        success: contextUsed,
        duration,
        details: {
          captionLength: data.caption.length,
          contextUsed,
          has100th,
          hasFiveYears,
          preview: data.caption.substring(0, 150) + '...',
        },
        error: contextUsed ? undefined : 'CONTEXT NOT USED IN CAPTION - regression detected!',
      };
    } else {
      return {
        name,
        success: false,
        duration,
        error: data.error || 'No caption returned',
      };
    }
  } catch (error) {
    return {
      name,
      success: false,
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ============================================================================
// TEST 4: AI Caption - Professional Domain (Context MUST be used)
// ============================================================================
async function testCaptionProfessional(): Promise<TestResult> {
  const start = Date.now();
  const name = 'AI Caption - Professional (buyer-tips)';

  try {
    const response = await fetch(`${API_BASE}/api/ai?action=caption`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        property: null,
        context: TEST_CONTEXTS.professional.context,
        postIntent: TEST_CONTEXTS.professional.intent,
        tone: 'professional',
        platform: 'instagram',
      }),
    });

    const duration = Date.now() - start;
    const data = await response.json();

    if (response.ok && data.caption) {
      // CRITICAL: Verify context is actually used in caption
      const hasSewerScope = data.caption.toLowerCase().includes('sewer');
      const has47k = data.caption.includes('47') || data.caption.includes('47,000');
      const hasRootIntrusion = data.caption.toLowerCase().includes('root');
      const contextUsed = hasSewerScope || has47k || hasRootIntrusion;

      return {
        name,
        success: contextUsed,
        duration,
        details: {
          captionLength: data.caption.length,
          contextUsed,
          hasSewerScope,
          has47k,
          preview: data.caption.substring(0, 150) + '...',
        },
        error: contextUsed ? undefined : 'CONTEXT NOT USED IN CAPTION - regression detected!',
      };
    } else {
      return {
        name,
        success: false,
        duration,
        error: data.error || 'No caption returned',
      };
    }
  } catch (error) {
    return {
      name,
      success: false,
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ============================================================================
// TEST 5: AI Health Endpoint
// ============================================================================
async function testAIHealth(): Promise<TestResult> {
  const start = Date.now();
  const name = 'AI Health Endpoint';

  try {
    const response = await fetch(`${API_BASE}/api/ai?action=health`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const duration = Date.now() - start;
    const data = await response.json();

    if (response.ok && data.status) {
      return {
        name,
        success: true,
        duration,
        details: {
          status: data.status,
          integrityPassed: data.integrity?.passed,
          expectedIntents: data.integrity?.expectedIntents,
          foundIntents: data.integrity?.foundIntents,
        },
      };
    } else {
      return {
        name,
        success: false,
        duration,
        error: data.error || 'Invalid health response',
      };
    }
  } catch (error) {
    return {
      name,
      success: false,
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ============================================================================
// RUN ALL TESTS
// ============================================================================
async function runStressTest() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 SOCIAL HUB STRESS TEST');
  console.log('='.repeat(60) + '\n');

  console.log(`📍 API Base: ${API_BASE}`);
  console.log(`📍 Imejis: ${IMEJIS_BASE_URL}`);
  console.log('');

  // Run tests
  const tests = [
    testImejisHealth,
    testAIHealth,
    testCaptionProperty,
    testCaptionPersonal,
    testCaptionProfessional,
  ];

  for (const test of tests) {
    process.stdout.write(`Running ${test.name}... `);
    const result = await test();
    results.push(result);

    if (result.success) {
      console.log(`✅ PASS (${result.duration}ms)`);
    } else {
      console.log(`❌ FAIL (${result.duration}ms)`);
      console.log(`   Error: ${result.error}`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESULTS SUMMARY');
  console.log('='.repeat(60) + '\n');

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`Total: ${results.length}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ❌`);
  console.log('');

  // Detailed results
  for (const result of results) {
    const icon = result.success ? '✅' : '❌';
    console.log(`${icon} ${result.name}`);
    console.log(`   Duration: ${result.duration}ms`);
    if (result.details) {
      console.log(`   Details: ${JSON.stringify(result.details, null, 2).split('\n').join('\n   ')}`);
    }
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    console.log('');
  }

  // Exit code
  process.exit(failed > 0 ? 1 : 0);
}

runStressTest().catch(console.error);
