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
 */
function buildMatchingPrompt(buyer: BuyerCriteria, property: PropertyDetails): string {
  const buyerName = `${buyer.firstName} ${buyer.lastName}`.trim();

  return `
Analyze the compatibility between this buyer and property using the EXACT scoring criteria below.

BUYER PROFILE:
- Name: ${buyerName}
- Monthly Income: ${buyer.monthlyIncome ? `$${buyer.monthlyIncome.toLocaleString()}` : 'Not specified'}
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
- ZIP Code: ${(property as any).zipCode || 'Not specified'}
- Price: ${property.price ? `$${property.price.toLocaleString()}` : 'Not listed'}
- Bedrooms: ${property.beds}
- Bathrooms: ${property.baths}
- Square Feet: ${property.sqft ? property.sqft.toLocaleString() : 'Not specified'}
- Status: ${property.stage || 'Available'}

SCORING CRITERIA (Total: 0-100 points):

1. LOCATION SCORE (0-40 points):
   - ZIP code match with buyer's preferred ZIPs: 40 pts
   - Same city or within 5 miles: 38 pts
   - Within 10 miles: 35 pts
   - Within 25 miles: 28 pts
   - Within 50 miles: 20 pts
   - Beyond 50 miles: 5-15 pts (decreasing with distance)
   - No location preference specified: 20 pts (neutral)

2. BEDROOMS SCORE (0-25 points):
   - Exact match with desired beds: 25 pts
   - Off by 1 bedroom: 15 pts
   - More bedrooms than desired: 10 pts
   - Fewer bedrooms than desired: 5 pts
   - No preference specified: 12 pts

3. BATHROOMS SCORE (0-15 points):
   - Meets or exceeds desired baths: 15 pts
   - Fewer baths than desired: 5 pts
   - No preference specified: 8 pts

4. BUDGET SCORE (0-20 points) - Based on down payment ratio (down payment / property price):
   - Down payment ratio >= 20%: 20 pts
   - Down payment ratio >= 10%: 15 pts
   - Down payment ratio >= 5%: 10 pts
   - Down payment ratio < 5%: 5 pts
   - No budget data available: 10 pts

IMPORTANT: Calculate each component score separately, then sum them for the total score (0-100).

Return JSON with:
- score: Number from 0-100 (sum of location + beds + baths + budget scores)
- reasoning: 2-3 sentences explaining the score with the breakdown
- highlights: Array of positive match points (e.g., ["In preferred ZIP code", "Exact bedroom count: 3 beds", "Strong down payment: 25%"])
- concerns: Array of potential issues (e.g., ["Fewer bedrooms than desired", "Low down payment ratio"]) or empty array if none
`.trim();
}

/**
 * Rule-based matching fallback (when OpenAI is unavailable)
 * Aligned with scoring in lib/matching/scorer.ts
 */
function generateRuleBasedScore(
  buyer: BuyerCriteria,
  property: PropertyDetails
): MatchScore {
  const highlights: string[] = [];
  const concerns: string[] = [];

  // ====================
  // LOCATION SCORE (0-40 points)
  // ====================
  let locationScore = 0;
  let isPriority = false;
  let locationReason = '';

  const buyerZips = buyer.preferredZipCodes || [];
  const propertyZip = property.zipCode || '';

  // Check ZIP match first
  if (buyerZips.length > 0 && propertyZip && buyerZips.includes(propertyZip)) {
    locationScore = 40;
    isPriority = true;
    locationReason = `In preferred ZIP ${propertyZip}`;
    highlights.push('In preferred ZIP code');
  } else if (buyer.city || buyer.location) {
    const buyerLocation = (buyer.city || buyer.location || '').toLowerCase();
    const propertyCity = (property.city || '').toLowerCase();

    if (propertyCity.includes(buyerLocation) || buyerLocation.includes(propertyCity)) {
      locationScore = 38; // Same city treated as within 5 miles
      isPriority = true;
      locationReason = `In preferred city: ${property.city}`;
      highlights.push(`Located in preferred area: ${property.city}`);
    } else {
      locationScore = 10;
      isPriority = false;
      locationReason = `Different location (${property.city})`;
      concerns.push(`Different location (${property.city})`);
    }
  } else {
    locationScore = 20; // No location preference - neutral
    locationReason = 'No location preference specified';
  }

  // ====================
  // BEDS SCORE (0-25 points)
  // ====================
  let bedsScore = 0;

  if (buyer.desiredBeds && property.beds) {
    if (property.beds === buyer.desiredBeds) {
      bedsScore = 25;
      highlights.push(`Exact bed count: ${property.beds} beds`);
    } else if (Math.abs(property.beds - buyer.desiredBeds) === 1) {
      bedsScore = 15;
      highlights.push(`Close bed count: ${property.beds} beds`);
    } else if (property.beds > buyer.desiredBeds) {
      bedsScore = 10;
      highlights.push(`${property.beds} beds (more than desired)`);
    } else {
      bedsScore = 5;
      concerns.push(`Fewer bedrooms: ${property.beds} vs ${buyer.desiredBeds} desired`);
    }
  } else if (property.beds) {
    bedsScore = 12;
    highlights.push(`${property.beds} beds`);
  } else {
    bedsScore = 12;
  }

  // ====================
  // BATHS SCORE (0-15 points)
  // ====================
  let bathsScore = 0;

  if (buyer.desiredBaths && property.baths) {
    if (property.baths >= buyer.desiredBaths) {
      bathsScore = 15;
      highlights.push(`${property.baths} baths`);
    } else {
      bathsScore = 5;
      concerns.push(`Fewer bathrooms: ${property.baths} vs ${buyer.desiredBaths} desired`);
    }
  } else if (property.baths) {
    bathsScore = 8;
    highlights.push(`${property.baths} baths`);
  } else {
    bathsScore = 8;
  }

  // ====================
  // BUDGET SCORE (0-20 points)
  // ====================
  let budgetScore = 0;

  if (buyer.downPayment && property.price) {
    const downPaymentRatio = (buyer.downPayment / property.price) * 100;

    if (downPaymentRatio >= 20) {
      budgetScore = 20;
      highlights.push(`Strong down payment: ${downPaymentRatio.toFixed(0)}% of price`);
    } else if (downPaymentRatio >= 10) {
      budgetScore = 15;
      highlights.push(`Adequate down payment: ${downPaymentRatio.toFixed(0)}%`);
    } else if (downPaymentRatio >= 5) {
      budgetScore = 10;
      highlights.push(`Down payment: ${downPaymentRatio.toFixed(0)}%`);
    } else {
      budgetScore = 5;
      concerns.push(`Low down payment ratio: ${downPaymentRatio.toFixed(0)}%`);
    }
  } else if (buyer.downPayment) {
    budgetScore = 10;
  } else {
    budgetScore = 10;
  }

  // ====================
  // TOTAL SCORE (0-100)
  // ====================
  const totalScore = Math.min(100, locationScore + bedsScore + bathsScore + budgetScore);

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
  const reasoning = `${matchQuality} (Score: ${Math.round(totalScore)}/100)\n\nScore Breakdown:\n• Location: ${locationScore}/40 pts (${locationReason})\n• Beds: ${bedsScore}/25 pts\n• Baths: ${bathsScore}/15 pts\n• Budget: ${budgetScore}/20 pts`;

  return {
    score: Math.round(totalScore),
    distanceMiles: null, // No distance calculation in client-side fallback
    locationScore,
    bedsScore,
    bathsScore,
    budgetScore,
    reasoning,
    locationReason,
    highlights,
    concerns,
    isPriority,
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
