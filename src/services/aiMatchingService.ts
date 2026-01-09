/**
 * AI Property Matching Service
 * Uses OpenAI to match buyers with properties based on criteria
 */

import type { BuyerCriteria, PropertyDetails, MatchScore } from '@/types/matching';

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

/**
 * Generate match score using OpenAI
 */
export async function generateMatchScore(
  buyer: BuyerCriteria,
  property: PropertyDetails
): Promise<MatchScore> {
  if (!OPENAI_API_KEY) {
    // Fallback to rule-based matching if no OpenAI key
    return generateRuleBasedScore(buyer, property);
  }

  try {
    const prompt = buildMatchingPrompt(buyer, property);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `You are a real estate matching expert. Analyze buyer-property compatibility using EXACT scoring criteria provided.

CRITICAL RULES:
1. Calculate each score component separately, then sum for total (0-100)
2. Do NOT add concerns that contradict the score - if ZIP matches (40 pts), do NOT mention distance as a concern
3. Highlights and concerns must be consistent with the scoring breakdown
4. If location scores high (ZIP match or same city), do NOT raise location concerns

Return ONLY valid JSON: {"score": <number 0-100>, "reasoning": "<string with score breakdown>", "highlights": ["<string>"], "concerns": ["<string>"]}`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('[AI Matching] OpenAI API error:', error);
      // Fallback to rule-based
      return generateRuleBasedScore(buyer, property);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const matchScore: MatchScore = JSON.parse(content);

    // Validate response
    if (typeof matchScore.score !== 'number' || matchScore.score < 0 || matchScore.score > 100) {
      throw new Error('Invalid score format');
    }

    return matchScore;
  } catch (error) {
    console.error('[AI Matching] Error generating score:', error);
    // Fallback to rule-based matching
    return generateRuleBasedScore(buyer, property);
  }
}

/**
 * Build OpenAI prompt for matching
 * Aligned with rule-based scoring in lib/matching/scorer.ts
 *
 * NEW SCORING STRUCTURE (100 pts total):
 * - Down Payment: 25 pts
 * - Monthly Affordability: 25 pts
 * - Location: 15 pts
 * - Bedrooms: 15 pts
 * - Bathrooms: 10 pts
 * - Property Type: 10 pts
 */
function buildMatchingPrompt(buyer: BuyerCriteria, property: PropertyDetails): string {
  const buyerName = `${buyer.firstName} ${buyer.lastName}`.trim();

  // Determine if we should use full or simplified matching based on property source
  const propertySource = property.source || 'Inventory';
  const useFullMatching = propertySource === 'Inventory' || propertySource === 'Partnered';

  // Calculate max affordable monthly payment (50% rule)
  const maxAffordablePayment = buyer.monthlyIncome ? buyer.monthlyIncome * 0.5 : null;

  return `
Analyze the compatibility between this buyer and property using the EXACT scoring criteria below.

BUYER PROFILE:
- Name: ${buyerName}
- Monthly Income: ${buyer.monthlyIncome ? `$${buyer.monthlyIncome.toLocaleString()}` : 'Not specified'}
- Max Affordable Payment (50% rule): ${maxAffordablePayment ? `$${maxAffordablePayment.toLocaleString()}/mo` : 'Cannot calculate'}
- Monthly Liabilities: ${buyer.monthlyLiabilities ? `$${buyer.monthlyLiabilities.toLocaleString()}` : 'Not specified'}
- Down Payment Available: ${buyer.downPayment ? `$${buyer.downPayment.toLocaleString()}` : 'Not specified'}
- Desired Bedrooms: ${buyer.desiredBeds || 'Any'}
- Desired Bathrooms: ${buyer.desiredBaths || 'Any'}
- Preferred Location/City: ${buyer.city || buyer.location || 'Any'}
- Preferred ZIP Codes: ${(buyer as any).preferredZipCodes?.join(', ') || 'Not specified'}
- Buyer Type: ${buyer.buyerType || 'Not specified'}

PROPERTY:
- Address: ${property.address}
- City: ${property.city}
- ZIP Code: ${property.zipCode || 'Not specified'}
- Source: ${propertySource}
- Required Down Payment: ${property.downPayment ? `$${property.downPayment.toLocaleString()}` : 'Not specified'}
- Monthly Payment: ${property.monthlyPayment ? `$${property.monthlyPayment.toLocaleString()}/mo` : 'Not specified'}
- Price: ${property.price ? `$${property.price.toLocaleString()}` : 'Not listed'}
- Bedrooms: ${property.beds}
- Bathrooms: ${property.baths}
- Property Type: ${property.propertyType || 'Not specified'}
- Square Feet: ${property.sqft ? property.sqft.toLocaleString() : 'Not specified'}
- Status: ${property.stage || 'Available'}

${useFullMatching ? `
SCORING CRITERIA - FULL MATCHING (Total: 0-100 points):
Used for Inventory and Partnered properties where all financial terms are known.

1. DOWN PAYMENT SCORE (0-25 points) - Compare buyer's DP to property's required DP:
   - Buyer DP >= Property DP: 25 pts (can afford)
   - Buyer DP >= 90% of Property DP: 20 pts (10% short)
   - Buyer DP >= 75% of Property DP: 15 pts (25% short)
   - Buyer DP >= 50% of Property DP: 10 pts (50% short)
   - Buyer DP < 50% of Property DP: 5 pts (significantly short)
   - Either value missing: 12 pts (neutral)

2. MONTHLY AFFORDABILITY SCORE (0-25 points) - Property payment vs 50% of buyer income:
   - Payment <= 50% of income: 25 pts (perfect)
   - Payment <= 55% of income: 20 pts (10% over threshold)
   - Payment <= 62.5% of income: 15 pts (25% over threshold)
   - Payment <= 75% of income: 10 pts (50% over threshold)
   - Payment > 75% of income: 5 pts (significantly over)
   - Either value missing: 12 pts (neutral)

3. LOCATION SCORE (0-15 points):
   - ZIP code match: 15 pts
   - Within 10 miles: 14 pts
   - Within 25 miles: 11 pts
   - Within 50 miles: 8 pts
   - Within 100 miles: 5 pts
   - Beyond 100 miles: 2 pts
   - No location preference: 8 pts (neutral)

4. BEDROOMS SCORE (0-15 points):
   - Exact match: 15 pts
   - Off by 1 bedroom: 10 pts
   - More bedrooms than desired: 7 pts
   - Fewer bedrooms: 3 pts
   - No preference: 8 pts

5. BATHROOMS SCORE (0-10 points):
   - Meets or exceeds desired: 10 pts
   - Fewer baths: 3 pts
   - No preference: 5 pts

6. PROPERTY TYPE SCORE (0-10 points):
   - Exact match: 10 pts
   - Similar type: 5 pts
   - No match/preference: 2-5 pts
` : `
SCORING CRITERIA - SIMPLIFIED MATCHING (Scaled to 0-100):
Used for ${propertySource} properties where financial terms are unknown.
Only score Location + Bedrooms + Bathrooms (40 pts), then scale to 100.

1. LOCATION SCORE (0-15 points):
   - ZIP code match: 15 pts
   - Within 10 miles: 14 pts
   - Within 25 miles: 11 pts
   - Within 50 miles: 8 pts
   - Within 100 miles: 5 pts
   - Beyond 100 miles: 2 pts

2. BEDROOMS SCORE (0-15 points):
   - Exact match: 15 pts
   - Off by 1: 10 pts
   - More beds: 7 pts
   - Fewer beds: 3 pts

3. BATHROOMS SCORE (0-10 points):
   - Meets/exceeds: 10 pts
   - Fewer: 3 pts

FINAL SCORE = (Location + Beds + Baths) / 40 * 100
`}

Return JSON with:
- score: Number from 0-100
- reasoning: 2-3 sentences explaining the score with breakdown
- highlights: Array of positive match points
- concerns: Array of potential issues or empty array if none
`.trim();
}

/**
 * Rule-based matching fallback (when OpenAI is unavailable)
 * Aligned with scoring in lib/matching/scorer.ts
 *
 * NEW SCORING STRUCTURE (100 pts total):
 * - Down Payment: 25 pts
 * - Monthly Affordability: 25 pts
 * - Location: 15 pts
 * - Bedrooms: 15 pts
 * - Bathrooms: 10 pts
 * - Property Type: 10 pts
 */
function generateRuleBasedScore(
  buyer: BuyerCriteria,
  property: PropertyDetails
): MatchScore {
  const highlights: string[] = [];
  const concerns: string[] = [];

  // Determine matching mode based on property source
  const propertySource = property.source || 'Inventory';
  const useFullMatching = propertySource === 'Inventory' || propertySource === 'Partnered';
  const matchingMode: 'full' | 'simplified' = useFullMatching ? 'full' : 'simplified';

  // ====================
  // LOCATION SCORE (0-15 points) - Updated from 40
  // ====================
  let locationScore = 0;
  let isPriority = false;
  let locationReason = '';

  const buyerZips = buyer.preferredZipCodes || [];
  const propertyZip = property.zipCode || '';

  if (buyerZips.length > 0 && propertyZip && buyerZips.includes(propertyZip)) {
    locationScore = 15;
    isPriority = true;
    locationReason = `In preferred ZIP ${propertyZip}`;
    highlights.push('In preferred ZIP code');
  } else if (buyer.city || buyer.location) {
    const buyerLocation = (buyer.city || buyer.location || '').toLowerCase();
    const propertyCity = (property.city || '').toLowerCase();

    if (propertyCity.includes(buyerLocation) || buyerLocation.includes(propertyCity)) {
      locationScore = 14;
      isPriority = true;
      locationReason = `In preferred city: ${property.city}`;
      highlights.push(`Located in preferred area: ${property.city}`);
    } else {
      locationScore = 5;
      isPriority = false;
      locationReason = `Different location (${property.city})`;
      concerns.push(`Different location (${property.city})`);
    }
  } else {
    locationScore = 8; // No location preference - neutral
    locationReason = 'No location preference specified';
  }

  // ====================
  // BEDS SCORE (0-15 points) - Updated from 25
  // ====================
  let bedsScore = 0;

  if (buyer.desiredBeds && property.beds) {
    if (property.beds === buyer.desiredBeds) {
      bedsScore = 15;
      highlights.push(`Exact bed count: ${property.beds} beds`);
    } else if (Math.abs(property.beds - buyer.desiredBeds) === 1) {
      bedsScore = 10;
      highlights.push(`Close bed count: ${property.beds} beds`);
    } else if (property.beds > buyer.desiredBeds) {
      bedsScore = 7;
      highlights.push(`${property.beds} beds (more than desired)`);
    } else {
      bedsScore = 3;
      concerns.push(`Fewer bedrooms: ${property.beds} vs ${buyer.desiredBeds} desired`);
    }
  } else if (property.beds) {
    bedsScore = 8;
    highlights.push(`${property.beds} beds`);
  } else {
    bedsScore = 8;
  }

  // ====================
  // BATHS SCORE (0-10 points) - Updated from 15
  // ====================
  let bathsScore = 0;

  if (buyer.desiredBaths && property.baths) {
    if (property.baths >= buyer.desiredBaths) {
      bathsScore = 10;
      highlights.push(`${property.baths} baths`);
    } else {
      bathsScore = 3;
      concerns.push(`Fewer bathrooms: ${property.baths} vs ${buyer.desiredBaths} desired`);
    }
  } else if (property.baths) {
    bathsScore = 5;
    highlights.push(`${property.baths} baths`);
  } else {
    bathsScore = 5;
  }

  // ====================
  // DOWN PAYMENT SCORE (0-25 points) - NEW
  // ====================
  let downPaymentScore = 0;

  if (useFullMatching) {
    const buyerDP = buyer.downPayment;
    const propertyDP = property.downPayment;

    if (!buyerDP || !propertyDP) {
      downPaymentScore = 12; // Neutral
    } else if (buyerDP >= propertyDP) {
      downPaymentScore = 25;
      highlights.push(`Down payment covers requirement: $${buyerDP.toLocaleString()}`);
    } else if (buyerDP >= propertyDP * 0.9) {
      downPaymentScore = 20;
      highlights.push(`Down payment close to requirement`);
    } else if (buyerDP >= propertyDP * 0.75) {
      downPaymentScore = 15;
      concerns.push(`Down payment 25% short of requirement`);
    } else if (buyerDP >= propertyDP * 0.5) {
      downPaymentScore = 10;
      concerns.push(`Down payment 50% short of requirement`);
    } else {
      downPaymentScore = 5;
      concerns.push(`Down payment significantly below requirement`);
    }
  }

  // ====================
  // MONTHLY AFFORDABILITY SCORE (0-25 points) - NEW
  // ====================
  let monthlyAffordabilityScore = 0;

  if (useFullMatching) {
    const buyerIncome = buyer.monthlyIncome;
    const propertyPayment = property.monthlyPayment;

    if (!buyerIncome || !propertyPayment) {
      monthlyAffordabilityScore = 12; // Neutral
    } else {
      const maxAffordable = buyerIncome * 0.5;
      if (propertyPayment <= maxAffordable) {
        monthlyAffordabilityScore = 25;
        const pctOfIncome = ((propertyPayment / buyerIncome) * 100).toFixed(0);
        highlights.push(`Monthly payment affordable (${pctOfIncome}% of income)`);
      } else if (propertyPayment <= maxAffordable * 1.1) {
        monthlyAffordabilityScore = 20;
        highlights.push(`Monthly payment slightly above 50% threshold`);
      } else if (propertyPayment <= maxAffordable * 1.25) {
        monthlyAffordabilityScore = 15;
        concerns.push(`Monthly payment 25% above affordability threshold`);
      } else if (propertyPayment <= maxAffordable * 1.5) {
        monthlyAffordabilityScore = 10;
        concerns.push(`Monthly payment 50% above affordability threshold`);
      } else {
        monthlyAffordabilityScore = 5;
        concerns.push(`Monthly payment significantly exceeds affordability`);
      }
    }
  }

  // ====================
  // PROPERTY TYPE SCORE (0-10 points) - NEW
  // ====================
  let propertyTypeScore = 0;

  if (useFullMatching) {
    // For simplicity in fallback, give neutral score since we don't have buyer preferences
    propertyTypeScore = 5;
    if (property.propertyType) {
      highlights.push(`Property type: ${property.propertyType}`);
    }
  }

  // ====================
  // TOTAL SCORE CALCULATION
  // ====================
  let totalScore: number;
  const scoreBreakdown: string[] = [];

  if (useFullMatching) {
    totalScore = Math.min(100,
      downPaymentScore +
      monthlyAffordabilityScore +
      locationScore +
      bedsScore +
      bathsScore +
      propertyTypeScore
    );

    scoreBreakdown.push(`Down Payment: ${downPaymentScore}/25 pts`);
    scoreBreakdown.push(`Monthly Affordability: ${monthlyAffordabilityScore}/25 pts`);
    scoreBreakdown.push(`Location: ${locationScore}/15 pts (${locationReason})`);
    scoreBreakdown.push(`Beds: ${bedsScore}/15 pts`);
    scoreBreakdown.push(`Baths: ${bathsScore}/10 pts`);
    scoreBreakdown.push(`Property Type: ${propertyTypeScore}/10 pts`);
  } else {
    // Simplified matching: Only bed, bath, location (40 pts) scaled to 100
    const baseScore = locationScore + bedsScore + bathsScore;
    totalScore = Math.round((baseScore / 40) * 100);

    scoreBreakdown.push(`Location: ${locationScore}/15 pts (${locationReason})`);
    scoreBreakdown.push(`Beds: ${bedsScore}/15 pts`);
    scoreBreakdown.push(`Baths: ${bathsScore}/10 pts`);
    scoreBreakdown.push(`[Simplified matching for ${propertySource}]`);
  }

  // Determine match quality label
  let matchQuality = '';
  if (totalScore >= 80) {
    matchQuality = 'Excellent Match';
  } else if (totalScore >= 60) {
    matchQuality = 'Good Match';
  } else if (totalScore >= 40) {
    matchQuality = 'Fair Match';
  } else {
    matchQuality = 'Limited Match';
  }

  // Build reasoning
  const reasoning = `${matchQuality} (Score: ${Math.round(totalScore)}/100)\n\nScore Breakdown:\n${scoreBreakdown.map(s => `• ${s}`).join('\n')}`;

  // Legacy budgetScore for backwards compatibility
  const budgetScore = downPaymentScore + monthlyAffordabilityScore;

  return {
    score: Math.round(totalScore),
    distanceMiles: null,
    downPaymentScore,
    monthlyAffordabilityScore,
    locationScore,
    bedsScore,
    bathsScore,
    propertyTypeScore,
    budgetScore, // Legacy field
    reasoning,
    locationReason,
    highlights,
    concerns,
    isPriority,
    matchingMode,
  };
}

/**
 * Batch generate scores for multiple buyer-property pairs
 */
export async function batchGenerateScores(
  buyers: BuyerCriteria[],
  properties: PropertyDetails[],
  minScore: number = 60,
  onProgress?: (progress: { current: number; total: number; buyer: string }) => void
): Promise<Array<{ buyer: BuyerCriteria; property: PropertyDetails; score: MatchScore }>> {
  const matches: Array<{ buyer: BuyerCriteria; property: PropertyDetails; score: MatchScore }> = [];
  const total = buyers.length * properties.length;
  let current = 0;

  for (const buyer of buyers) {
    for (const property of properties) {
      current++;

      if (onProgress) {
        onProgress({
          current,
          total,
          buyer: `${buyer.firstName} ${buyer.lastName}`,
        });
      }

      const score = await generateMatchScore(buyer, property);

      // Only keep matches above threshold
      if (score.score >= minScore) {
        matches.push({ buyer, property, score });
      }

      // Small delay to avoid rate limiting (if using OpenAI)
      if (OPENAI_API_KEY) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  return matches;
}
