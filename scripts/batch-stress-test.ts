/**
 * Batch Tab Stress Test
 *
 * Simulates the complete batch flow:
 * 1. Create batch items with auto-initialized hashtags
 * 2. Generate captions via API
 * 3. Store captions in batch items
 * 4. Build final output with hashtags appended
 * 5. Verify all components work together
 */

import {
  INTENTS,
  INTENT_HASHTAGS,
  BASE_HASHTAGS,
  PREFERRED_HASHTAGS,
  generateLocationHashtags,
  PLATFORM_HASHTAG_RULES,
} from '../src/lib/socialHub/catalog';
import { getDefaultTone, getPrimaryTemplate } from '../src/lib/socialHub/rules';
import type { IntentId, ToneId, ImageTemplateId, SocialTabId } from '../src/lib/socialHub/types';

// ============================================================================
// MOCK DATA - Simulating real batch scenarios
// ============================================================================

const TEST_PROPERTIES = [
  {
    id: 'prop-1',
    address: '123 Main Street',
    city: 'Houston',
    state: 'TX',
    price: 275000,
    beds: 3,
    baths: 2,
    sqft: 1800,
  },
  {
    id: 'prop-2',
    address: '456 Oak Avenue',
    city: 'Dallas',
    state: 'TX',
    price: 425000,
    beds: 4,
    baths: 3,
    sqft: 2400,
  },
  {
    id: 'prop-3',
    address: '789 Sunset Blvd',
    city: 'San Antonio',
    state: 'TX',
    price: 185000,
    beds: 2,
    baths: 1,
    sqft: 1200,
  },
];

// ============================================================================
// BATCH ITEM SIMULATION (mirrors QuickBatchForm logic)
// ============================================================================

interface SimulatedBatchItem {
  id: string;
  tab: SocialTabId;
  propertyId?: string;
  intentId: IntentId;
  toneId: ToneId;
  templateId: ImageTemplateId;
  context: Record<string, string>;
  selectedHashtags: string[];
  scheduledDate: string;
  scheduledTime: string;
  status: 'draft' | 'pending' | 'generating' | 'ready' | 'failed';
  caption?: string;
  error?: string;
}

let itemCounter = 0;
function generateItemId(): string {
  return `batch-item-${Date.now()}-${++itemCounter}`;
}

// Same logic as QuickBatchForm.generateDefaultHashtags
function generateDefaultHashtags(intentId: string, property?: typeof TEST_PROPERTIES[0]): string[] {
  const hashtags: string[] = [];
  hashtags.push(...BASE_HASHTAGS);
  hashtags.push(...PREFERRED_HASHTAGS);
  const intentHashtags = INTENT_HASHTAGS[intentId] || [];
  hashtags.push(...intentHashtags);
  if (property) {
    const locationHashtags = generateLocationHashtags(property.city, property.state);
    hashtags.push(...locationHashtags);
  }
  return [...new Set(hashtags)].slice(0, 7);
}

// Same logic as QuickBatchForm.createPropertyBatchItem
function createPropertyBatchItem(
  property: typeof TEST_PROPERTIES[0],
  intentId: IntentId
): SimulatedBatchItem {
  return {
    id: generateItemId(),
    tab: 'property',
    propertyId: property.id,
    intentId,
    toneId: getDefaultTone(intentId) as ToneId,
    templateId: getPrimaryTemplate(intentId) as ImageTemplateId,
    context: {},
    selectedHashtags: generateDefaultHashtags(intentId, property),
    scheduledDate: new Date().toISOString().split('T')[0],
    scheduledTime: '09:00',
    status: 'draft',
  };
}

// Same logic as QuickBatchForm.createNonPropertyBatchItem
function createNonPropertyBatchItem(
  tab: SocialTabId,
  intentId: IntentId
): SimulatedBatchItem {
  return {
    id: generateItemId(),
    tab,
    intentId,
    toneId: getDefaultTone(intentId) as ToneId,
    templateId: getPrimaryTemplate(intentId) as ImageTemplateId,
    context: {},
    selectedHashtags: generateDefaultHashtags(intentId),
    scheduledDate: new Date().toISOString().split('T')[0],
    scheduledTime: '09:00',
    status: 'draft',
  };
}

// ============================================================================
// API CALLS
// ============================================================================

async function generateCaption(params: {
  intentId: string;
  toneId: string;
  property?: typeof TEST_PROPERTIES[0];
  context?: string;
}): Promise<{ success: boolean; caption: string; error?: string }> {
  try {
    const response = await fetch('http://localhost:3001/api/ai?action=caption', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        property: params.property || null,
        context: params.context || '',
        tone: params.toneId,
        platform: 'all',
        postIntent: params.intentId,
      }),
    });

    if (!response.ok) {
      return { success: false, caption: '', error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    return { success: true, caption: data.caption || '' };
  } catch (error) {
    return { success: false, caption: '', error: String(error) };
  }
}

// ============================================================================
// BATCH GENERATION SIMULATION (mirrors QuickBatchForm.handleGenerate)
// ============================================================================

async function generateBatchItem(
  item: SimulatedBatchItem,
  property?: typeof TEST_PROPERTIES[0]
): Promise<SimulatedBatchItem> {
  // Build context string (same as QuickBatchForm.buildContextString)
  let contextString = '';
  if (property) {
    contextString = `${property.beds} bed, ${property.baths} bath property in ${property.city}`;
  } else {
    contextString = `Testing ${item.intentId} content`;
  }

  const result = await generateCaption({
    intentId: item.intentId,
    toneId: item.toneId,
    property,
    context: contextString,
  });

  if (result.success) {
    return {
      ...item,
      caption: result.caption,
      status: 'ready',
    };
  } else {
    return {
      ...item,
      status: 'failed',
      error: result.error,
    };
  }
}

// ============================================================================
// PUBLISH SIMULATION (mirrors QuickBatchForm.handlePublish)
// ============================================================================

function buildPublishPayload(item: SimulatedBatchItem): {
  summary: string;
  hashtagCount: number;
  captionLength: number;
  fullLength: number;
} {
  // Same logic as QuickBatchForm publish
  const maxHashtags = PLATFORM_HASHTAG_RULES.facebook?.maxHashtags || 5;
  const hashtagString = item.selectedHashtags.slice(0, maxHashtags).join(' ');
  const fullCaption = hashtagString
    ? `${item.caption || ''}\n\n${hashtagString}`
    : item.caption || '';

  return {
    summary: fullCaption,
    hashtagCount: item.selectedHashtags.slice(0, maxHashtags).length,
    captionLength: (item.caption || '').length,
    fullLength: fullCaption.length,
  };
}

// ============================================================================
// STRESS TEST
// ============================================================================

async function runBatchStressTest() {
  console.log('='.repeat(70));
  console.log('BATCH TAB STRESS TEST - Full Flow Simulation');
  console.log('='.repeat(70));
  console.log('\nSimulating: Create Items → Generate Captions → Build Publish Payload\n');

  const results: Array<{
    intent: string;
    tab: string;
    property?: string;
    success: boolean;
    hashtagsInitialized: number;
    hashtagsPublished: number;
    captionLength: number;
    fullCaptionLength: number;
    captionPreview: string;
    hashtagsPreview: string;
    error?: string;
  }> = [];

  // Test 1: Property intents with different properties
  console.log('-'.repeat(70));
  console.log('PHASE 1: Property Posts (3 properties × 6 intents = 18 tests)');
  console.log('-'.repeat(70));

  const propertyIntents = INTENTS.filter(i => i.tab === 'property');
  for (const intent of propertyIntents) {
    for (const property of TEST_PROPERTIES) {
      // Step 1: Create batch item (simulates adding property to batch)
      const item = createPropertyBatchItem(property, intent.id as IntentId);

      console.log(`\n[${intent.id}] ${property.address.split(' ').slice(0, 2).join(' ')}...`);
      console.log(`  📋 Created: ${item.selectedHashtags.length} hashtags auto-selected`);

      // Step 2: Generate caption (simulates "Generate Posts" button)
      const generatedItem = await generateBatchItem(item, property);

      if (generatedItem.status === 'ready') {
        // Step 3: Build publish payload (simulates "Publish" button)
        const payload = buildPublishPayload(generatedItem);

        console.log(`  ✅ Generated: ${payload.captionLength} chars`);
        console.log(`  📤 Publish: ${payload.fullLength} chars (${payload.hashtagCount} hashtags)`);

        results.push({
          intent: intent.id,
          tab: intent.tab,
          property: property.city,
          success: true,
          hashtagsInitialized: item.selectedHashtags.length,
          hashtagsPublished: payload.hashtagCount,
          captionLength: payload.captionLength,
          fullCaptionLength: payload.fullLength,
          captionPreview: (generatedItem.caption || '').substring(0, 60) + '...',
          hashtagsPreview: item.selectedHashtags.slice(0, 3).join(' '),
        });
      } else {
        console.log(`  ❌ Failed: ${generatedItem.error}`);
        results.push({
          intent: intent.id,
          tab: intent.tab,
          property: property.city,
          success: false,
          hashtagsInitialized: item.selectedHashtags.length,
          hashtagsPublished: 0,
          captionLength: 0,
          fullCaptionLength: 0,
          captionPreview: '',
          hashtagsPreview: item.selectedHashtags.slice(0, 3).join(' '),
          error: generatedItem.error,
        });
      }

      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  // Test 2: Personal intents
  console.log('\n' + '-'.repeat(70));
  console.log('PHASE 2: Personal Posts (4 intents)');
  console.log('-'.repeat(70));

  const personalIntents = INTENTS.filter(i => i.tab === 'personal');
  for (const intent of personalIntents) {
    const item = createNonPropertyBatchItem('personal', intent.id as IntentId);

    console.log(`\n[${intent.id}]`);
    console.log(`  📋 Created: ${item.selectedHashtags.length} hashtags auto-selected`);

    const generatedItem = await generateBatchItem(item);

    if (generatedItem.status === 'ready') {
      const payload = buildPublishPayload(generatedItem);
      console.log(`  ✅ Generated: ${payload.captionLength} chars`);
      console.log(`  📤 Publish: ${payload.fullLength} chars (${payload.hashtagCount} hashtags)`);

      results.push({
        intent: intent.id,
        tab: intent.tab,
        success: true,
        hashtagsInitialized: item.selectedHashtags.length,
        hashtagsPublished: payload.hashtagCount,
        captionLength: payload.captionLength,
        fullCaptionLength: payload.fullLength,
        captionPreview: (generatedItem.caption || '').substring(0, 60) + '...',
        hashtagsPreview: item.selectedHashtags.slice(0, 3).join(' '),
      });
    } else {
      console.log(`  ❌ Failed: ${generatedItem.error}`);
      results.push({
        intent: intent.id,
        tab: intent.tab,
        success: false,
        hashtagsInitialized: item.selectedHashtags.length,
        hashtagsPublished: 0,
        captionLength: 0,
        fullCaptionLength: 0,
        captionPreview: '',
        hashtagsPreview: item.selectedHashtags.slice(0, 3).join(' '),
        error: generatedItem.error,
      });
    }

    await new Promise(resolve => setTimeout(resolve, 300));
  }

  // Test 3: Professional intents
  console.log('\n' + '-'.repeat(70));
  console.log('PHASE 3: Professional Posts (6 intents)');
  console.log('-'.repeat(70));

  const professionalIntents = INTENTS.filter(i => i.tab === 'professional');
  for (const intent of professionalIntents) {
    const item = createNonPropertyBatchItem('professional', intent.id as IntentId);

    console.log(`\n[${intent.id}]`);
    console.log(`  📋 Created: ${item.selectedHashtags.length} hashtags auto-selected`);

    const generatedItem = await generateBatchItem(item);

    if (generatedItem.status === 'ready') {
      const payload = buildPublishPayload(generatedItem);
      console.log(`  ✅ Generated: ${payload.captionLength} chars`);
      console.log(`  📤 Publish: ${payload.fullLength} chars (${payload.hashtagCount} hashtags)`);

      results.push({
        intent: intent.id,
        tab: intent.tab,
        success: true,
        hashtagsInitialized: item.selectedHashtags.length,
        hashtagsPublished: payload.hashtagCount,
        captionLength: payload.captionLength,
        fullCaptionLength: payload.fullLength,
        captionPreview: (generatedItem.caption || '').substring(0, 60) + '...',
        hashtagsPreview: item.selectedHashtags.slice(0, 3).join(' '),
      });
    } else {
      console.log(`  ❌ Failed: ${generatedItem.error}`);
      results.push({
        intent: intent.id,
        tab: intent.tab,
        success: false,
        hashtagsInitialized: item.selectedHashtags.length,
        hashtagsPublished: 0,
        captionLength: 0,
        fullCaptionLength: 0,
        captionPreview: '',
        hashtagsPreview: item.selectedHashtags.slice(0, 3).join(' '),
        error: generatedItem.error,
      });
    }

    await new Promise(resolve => setTimeout(resolve, 300));
  }

  // ============================================================================
  // SUMMARY
  // ============================================================================

  console.log('\n' + '='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70));

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`\nTotal Tests: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);

  // By tab
  const tabs = ['property', 'personal', 'professional'] as const;
  for (const tab of tabs) {
    const tabResults = results.filter(r => r.tab === tab);
    const tabPassed = tabResults.filter(r => r.success).length;
    console.log(`\n${tab.toUpperCase()}: ${tabPassed}/${tabResults.length} passed`);
  }

  // Hashtag verification
  console.log('\n' + '-'.repeat(70));
  console.log('HASHTAG FLOW VERIFICATION');
  console.log('-'.repeat(70));

  const successResults = results.filter(r => r.success);

  // Check that hashtags are properly initialized
  const allInitialized = successResults.every(r => r.hashtagsInitialized === 7);
  console.log(`\n✓ Auto-initialization: ${allInitialized ? 'PASS' : 'FAIL'} (expected 7 hashtags per item)`);

  // Check that hashtags are trimmed for Facebook (5 max)
  const allTrimmed = successResults.every(r => r.hashtagsPublished === 5);
  console.log(`✓ Facebook limit (5): ${allTrimmed ? 'PASS' : 'FAIL'}`);

  // Check that hashtags are appended to caption
  const allAppended = successResults.every(r => r.fullCaptionLength > r.captionLength);
  console.log(`✓ Hashtags appended: ${allAppended ? 'PASS' : 'FAIL'}`);

  // Stats
  console.log('\n' + '-'.repeat(70));
  console.log('STATISTICS');
  console.log('-'.repeat(70));

  if (successResults.length > 0) {
    const avgCaption = successResults.reduce((sum, r) => sum + r.captionLength, 0) / successResults.length;
    const avgFull = successResults.reduce((sum, r) => sum + r.fullCaptionLength, 0) / successResults.length;
    const avgHashtagsInit = successResults.reduce((sum, r) => sum + r.hashtagsInitialized, 0) / successResults.length;
    const avgHashtagsPub = successResults.reduce((sum, r) => sum + r.hashtagsPublished, 0) / successResults.length;

    console.log(`\nAverage caption length: ${avgCaption.toFixed(0)} chars`);
    console.log(`Average with hashtags: ${avgFull.toFixed(0)} chars`);
    console.log(`Average hashtags initialized: ${avgHashtagsInit.toFixed(1)}`);
    console.log(`Average hashtags published: ${avgHashtagsPub.toFixed(1)}`);
  }

  // Sample outputs
  console.log('\n' + '-'.repeat(70));
  console.log('SAMPLE OUTPUTS (first 3)');
  console.log('-'.repeat(70));

  successResults.slice(0, 3).forEach((r, i) => {
    console.log(`\n${i + 1}. [${r.tab}/${r.intent}]${r.property ? ` (${r.property})` : ''}`);
    console.log(`   Caption: ${r.captionPreview}`);
    console.log(`   Hashtags: ${r.hashtagsPreview}...`);
    console.log(`   Final length: ${r.fullCaptionLength} chars`);
  });

  // Final result
  console.log('\n' + '='.repeat(70));
  if (failed > 0) {
    console.log('⚠️  SOME TESTS FAILED');
    process.exit(1);
  } else if (!allInitialized || !allTrimmed || !allAppended) {
    console.log('⚠️  HASHTAG FLOW VERIFICATION FAILED');
    process.exit(1);
  } else {
    console.log('🎉 ALL BATCH TESTS PASSED - Full flow verified!');
  }
  console.log('='.repeat(70));
}

runBatchStressTest().catch(console.error);
