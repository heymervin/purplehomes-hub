#!/usr/bin/env tsx
/**
 * Show full captions from stress test
 */

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const API_URL = 'http://localhost:3001/api/ai?action=caption';

const TEST_CASES = {
  propertyJustListed: {
    name: 'Property: Just Listed',
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
  },
  personalMilestone: {
    name: 'Personal: Milestone',
    payload: {
      property: null,
      context: 'Milestone: 100 homes closed\nWhy it matters: 10 years of early mornings, late nights, and never giving up. Started from zero.',
      postIntent: 'milestone',
      platform: 'instagram',
      agentName: 'Marcus',
    },
  },
  professionalMarketUpdate: {
    name: 'Professional: Market Update',
    payload: {
      property: null,
      context: 'Headline: Atlanta Inventory Hits 4-Year Low\nStats: Active listings down 23% YoY, median price up 8%\nSo what: Buyers need to move fast.',
      postIntent: 'market-update',
      platform: 'instagram',
      agentName: 'Marcus',
    },
  },
};

const ALL_TONES = ['professional', 'casual', 'urgent', 'friendly', 'luxury', 'investor'] as const;

async function generateCaption(payload: object, tone: string): Promise<string> {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, tone }),
  });

  if (!response.ok) {
    const error = await response.text();
    return `ERROR: ${error}`;
  }

  const data = await response.json();
  return data.caption || data.error || 'No caption returned';
}

async function main() {
  console.log('\n' + '═'.repeat(80));
  console.log('CAPTION GENERATION STRESS TEST - FULL OUTPUT');
  console.log('═'.repeat(80));

  for (const [testKey, testData] of Object.entries(TEST_CASES)) {
    console.log('\n\n' + '▓'.repeat(80));
    console.log(`▓ ${testData.name.toUpperCase()}`);
    console.log('▓'.repeat(80));

    for (const tone of ALL_TONES) {
      console.log(`\n┌${'─'.repeat(78)}┐`);
      console.log(`│ TONE: ${tone.toUpperCase().padEnd(70)}│`);
      console.log(`├${'─'.repeat(78)}┤`);

      try {
        const caption = await generateCaption(testData.payload, tone);
        // Print caption with proper formatting
        const lines = caption.split('\n');
        for (const line of lines) {
          // Wrap long lines
          if (line.length <= 76) {
            console.log(`│ ${line.padEnd(76)}│`);
          } else {
            // Word wrap
            let remaining = line;
            while (remaining.length > 0) {
              const chunk = remaining.slice(0, 76);
              console.log(`│ ${chunk.padEnd(76)}│`);
              remaining = remaining.slice(76);
            }
          }
        }
      } catch (error) {
        console.log(`│ ERROR: ${String(error).slice(0, 70).padEnd(76)}│`);
      }

      console.log(`└${'─'.repeat(78)}┘`);
    }
  }

  console.log('\n' + '═'.repeat(80));
  console.log('END OF TEST');
  console.log('═'.repeat(80) + '\n');
}

main().catch(console.error);
