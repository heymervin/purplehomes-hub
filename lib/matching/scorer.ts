/**
 * Property Match Scoring Module
 * Implements hybrid location matching: ZIP codes + distance-based scoring
 *
 * Supports two modes:
 * 1. Sync (generateMatchScore) - Uses pre-geocoded coordinates from Airtable
 * 2. Async (generateMatchScoreAsync) - Falls back to live geocoding if coords missing
 */

import { matchPropertyZip } from './zipMatcher';
import { calculateDistance } from './distanceCalculator';
import { getOrGeocodeLocation, extractCityFromAddress } from './geocache';

export interface MatchScore {
  score: number;
  // New scoring breakdown (100 pts total)
  downPaymentScore: number; // 0-25 points
  monthlyAffordabilityScore: number; // 0-25 points
  locationScore: number; // 0-15 points
  bedsScore: number; // 0-15 points
  bathsScore: number; // 0-10 points
  propertyTypeScore: number; // 0-10 points
  // Legacy field for backwards compatibility
  budgetScore: number; // Sum of downPayment + monthlyAffordability (deprecated)
  reasoning: string;
  highlights: string[];
  concerns: string[];
  isPriority: boolean; // In preferred ZIP code OR within 50 miles
  distanceMiles: number | null;
  locationReason: string;
  matchingMode: 'full' | 'simplified'; // 'full' for Inventory/Partnered, 'simplified' for others
}

/**
 * Generates a comprehensive match score between a buyer and property
 * Uses hybrid location matching: ZIP codes + distance-based scoring
 *
 * NEW SCORING STRUCTURE (100 pts total):
 * - Down Payment:           25 pts (buyer DP vs property required DP)
 * - Monthly Affordability:  25 pts (property payment vs 50% of buyer income)
 * - Location:               15 pts (ZIP match or distance-based)
 * - Bedrooms:               15 pts (exact/close match)
 * - Bathrooms:              10 pts (meets requirement)
 * - Property Type:          10 pts (exact/partial match)
 *
 * SOURCE-BASED MATCHING:
 * - Inventory/Partnered: All 6 criteria (100 pts)
 * - Leads/Acquisitions/Zillow: Only Bed, Bath, Location (40 pts scaled to 100)
 *
 * @param buyer - Buyer record from Airtable
 * @param property - Property record from Airtable
 * @returns MatchScore object with detailed scoring breakdown
 */
export function generateMatchScore(buyer: any, property: any): MatchScore {
  const highlights: string[] = [];
  const concerns: string[] = [];

  // Extract buyer data
  const buyerFields = buyer.fields;

  // Handle both string and array formats from Airtable
  let preferredZipCodes = buyerFields['Preferred Zip Codes'] || [];
  if (typeof preferredZipCodes === 'string') {
    preferredZipCodes = preferredZipCodes.includes(',')
      ? preferredZipCodes.split(',').map((z: string) => z.trim())
      : [preferredZipCodes.trim()];
  }

  const desiredBeds = buyerFields['No. of Bedrooms'];
  const desiredBaths = buyerFields['No. of Bath'];
  const buyerDownPayment = buyerFields['Downpayment'];
  const buyerMonthlyIncome = buyerFields['Monthly Income'];
  const buyerCity = buyerFields['City'] || buyerFields['Preferred Location'] || '';

  // Buyer property type preferences (handle array or comma-separated string)
  let buyerPropertyTypes = buyerFields['Property Types'] || buyerFields['Preferred Property Types'] || [];
  if (typeof buyerPropertyTypes === 'string') {
    buyerPropertyTypes = buyerPropertyTypes.split(',').map((t: string) => t.trim().toLowerCase());
  } else if (Array.isArray(buyerPropertyTypes)) {
    buyerPropertyTypes = buyerPropertyTypes.map((t: string) => t.toLowerCase());
  }

  // Buyer coordinates (from Airtable, pre-geocoded)
  const buyerLat = buyerFields['Lat'];
  const buyerLng = buyerFields['Lng'];

  // Extract property data
  const propertyFields = property.fields;
  const propertyAddress = propertyFields['Address'] || '';
  const propertyCity = propertyFields['City'] || '';
  const propertyBeds = propertyFields['Beds'];
  const propertyBaths = propertyFields['Baths'];
  const propertyZipCode = propertyFields['Zip Code'] || propertyFields['ZIP Code'];
  const propertyType = (propertyFields['Property Type'] || '').toLowerCase();

  // NEW: Property financial fields for affordability matching
  const propertyDownPayment = propertyFields['Down Payment'] || propertyFields['Downpayment'] || propertyFields['Required Down Payment'];
  const propertyMonthlyPayment = propertyFields['Monthly Payment'] || propertyFields['Monthly Mortgage Payment'];

  // NEW: Property source for source-based matching
  const propertySource: string = propertyFields['Source'] || 'Inventory';

  // Property coordinates (from Airtable, pre-geocoded)
  const propertyLat = propertyFields['Lat'];
  const propertyLng = propertyFields['Lng'];

  // Determine matching mode based on property source
  const useFullMatching = propertySource === 'Inventory' || propertySource === 'Partnered';
  const matchingMode: 'full' | 'simplified' = useFullMatching ? 'full' : 'simplified';

  // ====================
  // LOCATION SCORE (0-15 points) - Updated from 40
  // Priority: ZIP match > Distance-based > No location data
  // ====================

  let locationScore = 0;
  let isPriority = false;
  let distanceMiles: number | null = null;
  let locationReason = '';

  const hasZipCodes = Array.isArray(preferredZipCodes) && preferredZipCodes.length > 0;
  const hasCoordinates = isValidCoordinate(buyerLat) && isValidCoordinate(buyerLng) &&
                         isValidCoordinate(propertyLat) && isValidCoordinate(propertyLng);

  const inPreferredZip = hasZipCodes && matchPropertyZip(propertyZipCode, propertyAddress, preferredZipCodes);

  if (hasCoordinates) {
    distanceMiles = calculateDistance(buyerLat, buyerLng, propertyLat, propertyLng);
  }

  if (inPreferredZip) {
    locationScore = 15; // Max score for ZIP match
    isPriority = true;
    locationReason = `In preferred ZIP ${propertyZipCode}`;
    highlights.push('In preferred ZIP code');
  } else if (distanceMiles !== null) {
    const { score, reason, priority } = calculateDistanceScoreNew(distanceMiles, buyerCity);
    locationScore = score;
    isPriority = priority;
    locationReason = reason;

    if (priority) {
      highlights.push(reason);
    } else {
      concerns.push(reason);
    }
  } else if (hasZipCodes) {
    locationScore = 5;
    isPriority = false;
    locationReason = 'Not in preferred ZIP codes';
    concerns.push('Not in preferred ZIP codes');
  } else {
    locationScore = 8; // Neutral score
    locationReason = 'No location preference specified';
  }

  // ====================
  // BEDS MATCH (0-15 points) - Updated from 25
  // ====================

  let bedsScore = 0;

  if (desiredBeds && propertyBeds) {
    if (propertyBeds === desiredBeds) {
      bedsScore = 15;
      highlights.push(`Exact bed count: ${propertyBeds} beds`);
    } else if (Math.abs(propertyBeds - desiredBeds) === 1) {
      bedsScore = 10;
      highlights.push(`Close bed count: ${propertyBeds} beds`);
    } else if (propertyBeds > desiredBeds) {
      bedsScore = 7;
      highlights.push(`${propertyBeds} beds (more than desired)`);
    } else {
      bedsScore = 3;
      concerns.push(`Fewer bedrooms: ${propertyBeds} vs ${desiredBeds} desired`);
    }
  } else if (propertyBeds) {
    bedsScore = 8; // No preference specified
    highlights.push(`${propertyBeds} beds`);
  } else {
    bedsScore = 8; // No data
  }

  // ====================
  // BATHS MATCH (0-10 points) - Updated from 15
  // ====================

  let bathsScore = 0;

  if (desiredBaths && propertyBaths) {
    if (propertyBaths >= desiredBaths) {
      bathsScore = 10;
      highlights.push(`${propertyBaths} baths`);
    } else {
      bathsScore = 3;
      concerns.push(`Fewer bathrooms: ${propertyBaths} vs ${desiredBaths} desired`);
    }
  } else if (propertyBaths) {
    bathsScore = 5; // No preference specified
    highlights.push(`${propertyBaths} baths`);
  } else {
    bathsScore = 5; // No data
  }

  // ====================
  // DOWN PAYMENT SCORE (0-25 points) - NEW
  // Direct comparison of buyer DP vs property required DP
  // ====================

  let downPaymentScore = 0;

  if (useFullMatching) {
    downPaymentScore = calculateDownPaymentScore(buyerDownPayment, propertyDownPayment);

    if (buyerDownPayment && propertyDownPayment) {
      if (buyerDownPayment >= propertyDownPayment) {
        highlights.push(`Down payment covers requirement: $${buyerDownPayment.toLocaleString()} / $${propertyDownPayment.toLocaleString()}`);
      } else {
        const shortfall = propertyDownPayment - buyerDownPayment;
        concerns.push(`Down payment short by $${shortfall.toLocaleString()}`);
      }
    }
  }

  // ====================
  // MONTHLY AFFORDABILITY SCORE (0-25 points) - NEW
  // Property payment should be <= 50% of buyer's monthly income
  // ====================

  let monthlyAffordabilityScore = 0;

  if (useFullMatching) {
    monthlyAffordabilityScore = calculateMonthlyAffordabilityScore(buyerMonthlyIncome, propertyMonthlyPayment);

    if (buyerMonthlyIncome && propertyMonthlyPayment) {
      const maxAffordable = buyerMonthlyIncome * 0.5;
      if (propertyMonthlyPayment <= maxAffordable) {
        highlights.push(`Monthly payment affordable: $${propertyMonthlyPayment.toLocaleString()}/mo (${((propertyMonthlyPayment / buyerMonthlyIncome) * 100).toFixed(0)}% of income)`);
      } else {
        const overPercent = ((propertyMonthlyPayment - maxAffordable) / maxAffordable * 100).toFixed(0);
        concerns.push(`Monthly payment ${overPercent}% over 50% affordability threshold`);
      }
    }
  }

  // ====================
  // PROPERTY TYPE SCORE (0-10 points) - NEW
  // ====================

  let propertyTypeScore = 0;

  if (useFullMatching) {
    propertyTypeScore = calculatePropertyTypeScore(buyerPropertyTypes, propertyType);

    if (buyerPropertyTypes.length > 0 && propertyType) {
      if (buyerPropertyTypes.includes(propertyType)) {
        highlights.push(`Preferred property type: ${propertyType}`);
      } else if (hasPartialPropertyTypeMatch(buyerPropertyTypes, propertyType)) {
        highlights.push(`Similar property type: ${propertyType}`);
      }
    }
  }

  // ====================
  // TOTAL SCORE CALCULATION
  // ====================

  let totalScore: number;
  const scoreBreakdown: string[] = [];

  if (useFullMatching) {
    // Full matching: All 6 criteria (100 pts total)
    totalScore = Math.min(100,
      downPaymentScore +
      monthlyAffordabilityScore +
      locationScore +
      bedsScore +
      bathsScore +
      propertyTypeScore
    );

    // Build score breakdown for full matching
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

    // Build score breakdown for simplified matching
    scoreBreakdown.push(`Location: ${locationScore}/15 pts (${locationReason})`);
    scoreBreakdown.push(`Beds: ${bedsScore}/15 pts`);
    scoreBreakdown.push(`Baths: ${bathsScore}/10 pts`);
    scoreBreakdown.push(`[Simplified matching for ${propertySource} - financial criteria not scored]`);
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

  // Compose full reasoning
  let reasoning = `${matchQuality} (Score: ${Math.round(totalScore)}/100)\n\n`;
  reasoning += `Score Breakdown:\n${scoreBreakdown.map(s => `• ${s}`).join('\n')}`;

  if (isPriority) {
    reasoning = `[PRIORITY] ${reasoning}`;
  }

  // Legacy budgetScore for backwards compatibility (sum of DP + affordability)
  const budgetScore = downPaymentScore + monthlyAffordabilityScore;

  return {
    score: Math.round(totalScore),
    downPaymentScore,
    monthlyAffordabilityScore,
    locationScore,
    bedsScore,
    bathsScore,
    propertyTypeScore,
    budgetScore, // Legacy field
    reasoning,
    highlights,
    concerns,
    isPriority,
    distanceMiles,
    locationReason,
    matchingMode,
  };
}

/**
 * Score breakdown helper for debugging
 */
export function getScoreBreakdown(score: MatchScore): string {
  const mode = score.matchingMode === 'simplified' ? ' [SIMPLIFIED]' : '';
  return `
Total Score: ${score.score}/100 ${score.isPriority ? '(PRIORITY)' : ''}${mode}
  - Down Payment: ${score.downPaymentScore}/25
  - Monthly Affordability: ${score.monthlyAffordabilityScore}/25
  - Location: ${score.locationScore}/15
  - Beds: ${score.bedsScore}/15
  - Baths: ${score.bathsScore}/10
  - Property Type: ${score.propertyTypeScore}/10

Highlights: ${score.highlights.join(', ')}
${score.concerns.length > 0 ? `Concerns: ${score.concerns.join(', ')}` : ''}
`.trim();
}

/**
 * Calculate Down Payment Score (0-25 points)
 * Direct comparison of buyer's available DP vs property's required DP
 */
function calculateDownPaymentScore(
  buyerDownPayment: number | undefined,
  propertyDownPayment: number | undefined
): number {
  // If either is missing, return neutral score
  if (!buyerDownPayment || !propertyDownPayment) return 12;

  if (buyerDownPayment >= propertyDownPayment) return 25;        // Can afford
  if (buyerDownPayment >= propertyDownPayment * 0.9) return 20;  // 10% short
  if (buyerDownPayment >= propertyDownPayment * 0.75) return 15; // 25% short
  if (buyerDownPayment >= propertyDownPayment * 0.5) return 10;  // 50% short
  return 5; // Significantly short
}

/**
 * Calculate Monthly Affordability Score (0-25 points)
 * Property monthly payment should be <= 50% of buyer's monthly income
 */
function calculateMonthlyAffordabilityScore(
  buyerMonthlyIncome: number | undefined,
  propertyMonthlyPayment: number | undefined
): number {
  // If either is missing, return neutral score
  if (!buyerMonthlyIncome || !propertyMonthlyPayment) return 12;

  const maxAffordable = buyerMonthlyIncome * 0.5; // 50% rule

  if (propertyMonthlyPayment <= maxAffordable) return 25;        // Perfect
  if (propertyMonthlyPayment <= maxAffordable * 1.1) return 20;  // 10% over
  if (propertyMonthlyPayment <= maxAffordable * 1.25) return 15; // 25% over
  if (propertyMonthlyPayment <= maxAffordable * 1.5) return 10;  // 50% over
  return 5; // Significantly over
}

/**
 * Calculate Property Type Score (0-10 points)
 */
function calculatePropertyTypeScore(
  buyerPropertyTypes: string[],
  propertyType: string
): number {
  // If buyer has no preference or property has no type, neutral score
  if (!buyerPropertyTypes || buyerPropertyTypes.length === 0 || !propertyType) return 5;

  // Exact match
  if (buyerPropertyTypes.includes(propertyType)) return 10;

  // Partial match (e.g., "single family" matches "single family home")
  if (hasPartialPropertyTypeMatch(buyerPropertyTypes, propertyType)) return 5;

  // No match
  return 2;
}

/**
 * Check for partial property type matches
 * Handles variations like "single family" vs "single family home"
 */
function hasPartialPropertyTypeMatch(buyerTypes: string[], propertyType: string): boolean {
  // Common property type aliases
  const aliases: Record<string, string[]> = {
    'single family': ['single family home', 'sfh', 'house', 'detached'],
    'condo': ['condominium', 'condo unit'],
    'townhouse': ['townhome', 'town house', 'row house'],
    'duplex': ['2-unit', 'two unit', 'multi family'],
    'triplex': ['3-unit', 'three unit'],
    'mobile home': ['manufactured home', 'mobile'],
  };

  for (const buyerType of buyerTypes) {
    // Check if property type contains buyer type or vice versa
    if (propertyType.includes(buyerType) || buyerType.includes(propertyType)) {
      return true;
    }

    // Check aliases
    const typeAliases = aliases[buyerType] || [];
    if (typeAliases.some(alias => propertyType.includes(alias) || alias.includes(propertyType))) {
      return true;
    }
  }

  return false;
}

/**
 * Calculate location score based on distance (NEW - scaled to 15 pts max)
 * Returns score, reason string, and priority flag
 */
function calculateDistanceScoreNew(distanceMiles: number, buyerCity: string): {
  score: number;
  reason: string;
  priority: boolean;
} {
  const locationLabel = buyerCity || 'preferred area';

  if (distanceMiles <= 10) {
    return {
      score: 14, // Was 25-38, now scaled to 15 max
      reason: `${distanceMiles.toFixed(1)} mi from ${locationLabel}`,
      priority: true,
    };
  }

  if (distanceMiles <= 25) {
    return {
      score: 11, // Was 20-28
      reason: `${distanceMiles.toFixed(1)} mi from ${locationLabel}`,
      priority: true,
    };
  }

  if (distanceMiles <= 50) {
    return {
      score: 8, // Was 15-20
      reason: `${distanceMiles.toFixed(1)} mi from ${locationLabel}`,
      priority: true,
    };
  }

  if (distanceMiles <= 100) {
    return {
      score: 5, // Was 10
      reason: `${distanceMiles.toFixed(0)} mi from ${locationLabel}`,
      priority: false,
    };
  }

  // Beyond 100 miles
  return {
    score: 2,
    reason: `${distanceMiles.toFixed(0)} mi away`,
    priority: false,
  };
}

/**
 * Check if a coordinate value is valid
 */
function isValidCoordinate(value: any): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

/**
 * Calculate location score based on distance
 * Returns score, reason string, and priority flag
 */
function calculateDistanceScore(distanceMiles: number, buyerCity: string): {
  score: number;
  reason: string;
  priority: boolean;
} {
  const locationLabel = buyerCity || 'preferred area';

  if (distanceMiles <= 5) {
    return {
      score: 38,
      reason: `${distanceMiles.toFixed(1)} mi from ${locationLabel}`,
      priority: true,
    };
  }

  if (distanceMiles <= 10) {
    return {
      score: 35,
      reason: `${distanceMiles.toFixed(1)} mi from ${locationLabel}`,
      priority: true,
    };
  }

  if (distanceMiles <= 25) {
    return {
      score: 28,
      reason: `${distanceMiles.toFixed(1)} mi from ${locationLabel}`,
      priority: true,
    };
  }

  if (distanceMiles <= 50) {
    return {
      score: 20,
      reason: `${distanceMiles.toFixed(1)} mi from ${locationLabel}`,
      priority: true,
    };
  }

  // Beyond 50 miles - lower score, not priority
  // Score decreases as distance increases: 15 at 50mi, down to 5 at 200+ mi
  const score = Math.max(5, 15 - Math.floor(distanceMiles / 20));

  return {
    score,
    reason: `${distanceMiles.toFixed(0)} mi away`,
    priority: false,
  };
}

/**
 * Async version of generateMatchScore with live geocoding fallback
 *
 * If buyer or property coordinates are missing in Airtable,
 * this function will attempt to geocode them using Mapbox.
 *
 * Use this version when scoring ALL properties for a buyer (Zillow-style view)
 * where real-time distance calculation is important.
 *
 * @param buyer - Buyer record from Airtable
 * @param property - Property record from Airtable
 * @returns Promise<MatchScore> with detailed scoring breakdown
 */
export async function generateMatchScoreAsync(buyer: any, property: any): Promise<MatchScore> {
  const buyerFields = buyer.fields;
  const propertyFields = property.fields;

  // Extract buyer location data
  const buyerCity = buyerFields['City'] || buyerFields['Preferred Location'] || '';
  const buyerState = buyerFields['State'] || 'LA';
  let buyerLat = buyerFields['Lat'];
  let buyerLng = buyerFields['Lng'];

  // Extract property location data
  const propertyAddress = propertyFields['Address'] || '';
  const propertyCity = propertyFields['City'] || '';
  const propertyState = propertyFields['State'] || buyerState || 'LA';
  let propertyLat = propertyFields['Lat'];
  let propertyLng = propertyFields['Lng'];

  // Geocode buyer if coordinates missing but city is available
  if (!isValidCoordinate(buyerLat) || !isValidCoordinate(buyerLng)) {
    if (buyerCity) {
      const coords = await getOrGeocodeLocation(buyerCity, buyerState);
      if (coords) {
        buyerLat = coords.lat;
        buyerLng = coords.lng;
      }
    }
  }

  // Geocode property if coordinates missing
  if (!isValidCoordinate(propertyLat) || !isValidCoordinate(propertyLng)) {
    // Try full address first, then city
    const locationToGeocode = propertyAddress || propertyCity;
    if (locationToGeocode) {
      const coords = await getOrGeocodeLocation(locationToGeocode, propertyState);
      if (coords) {
        propertyLat = coords.lat;
        propertyLng = coords.lng;
      }
    }
  }

  // Now call the sync scorer with potentially updated coordinates
  // Create modified records with geocoded coordinates
  const buyerWithCoords = {
    ...buyer,
    fields: {
      ...buyerFields,
      'Lat': buyerLat,
      'Lng': buyerLng,
    },
  };

  const propertyWithCoords = {
    ...property,
    fields: {
      ...propertyFields,
      'Lat': propertyLat,
      'Lng': propertyLng,
    },
  };

  return generateMatchScore(buyerWithCoords, propertyWithCoords);
}
