// src/lib/stateUtils.ts

export const US_STATES = [
  { abbr: 'AL', name: 'Alabama' },
  { abbr: 'AK', name: 'Alaska' },
  { abbr: 'AZ', name: 'Arizona' },
  { abbr: 'AR', name: 'Arkansas' },
  { abbr: 'CA', name: 'California' },
  { abbr: 'CO', name: 'Colorado' },
  { abbr: 'CT', name: 'Connecticut' },
  { abbr: 'DE', name: 'Delaware' },
  { abbr: 'FL', name: 'Florida' },
  { abbr: 'GA', name: 'Georgia' },
  { abbr: 'HI', name: 'Hawaii' },
  { abbr: 'ID', name: 'Idaho' },
  { abbr: 'IL', name: 'Illinois' },
  { abbr: 'IN', name: 'Indiana' },
  { abbr: 'IA', name: 'Iowa' },
  { abbr: 'KS', name: 'Kansas' },
  { abbr: 'KY', name: 'Kentucky' },
  { abbr: 'LA', name: 'Louisiana' },
  { abbr: 'ME', name: 'Maine' },
  { abbr: 'MD', name: 'Maryland' },
  { abbr: 'MA', name: 'Massachusetts' },
  { abbr: 'MI', name: 'Michigan' },
  { abbr: 'MN', name: 'Minnesota' },
  { abbr: 'MS', name: 'Mississippi' },
  { abbr: 'MO', name: 'Missouri' },
  { abbr: 'MT', name: 'Montana' },
  { abbr: 'NE', name: 'Nebraska' },
  { abbr: 'NV', name: 'Nevada' },
  { abbr: 'NH', name: 'New Hampshire' },
  { abbr: 'NJ', name: 'New Jersey' },
  { abbr: 'NM', name: 'New Mexico' },
  { abbr: 'NY', name: 'New York' },
  { abbr: 'NC', name: 'North Carolina' },
  { abbr: 'ND', name: 'North Dakota' },
  { abbr: 'OH', name: 'Ohio' },
  { abbr: 'OK', name: 'Oklahoma' },
  { abbr: 'OR', name: 'Oregon' },
  { abbr: 'PA', name: 'Pennsylvania' },
  { abbr: 'RI', name: 'Rhode Island' },
  { abbr: 'SC', name: 'South Carolina' },
  { abbr: 'SD', name: 'South Dakota' },
  { abbr: 'TN', name: 'Tennessee' },
  { abbr: 'TX', name: 'Texas' },
  { abbr: 'UT', name: 'Utah' },
  { abbr: 'VT', name: 'Vermont' },
  { abbr: 'VA', name: 'Virginia' },
  { abbr: 'WA', name: 'Washington' },
  { abbr: 'WV', name: 'West Virginia' },
  { abbr: 'WI', name: 'Wisconsin' },
  { abbr: 'WY', name: 'Wyoming' },
];

/**
 * Levenshtein distance - measures how many edits to transform one string to another
 */
function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Find best matching state using fuzzy matching
 */
function fuzzyMatchState(input: string): { abbr: string; name: string; confidence: 'exact' | 'high' | 'medium' } | null {
  const cleaned = input.trim().toLowerCase();

  if (!cleaned) return null;

  // 1. Exact abbreviation match
  const byAbbr = US_STATES.find(s => s.abbr.toLowerCase() === cleaned);
  if (byAbbr) return { ...byAbbr, confidence: 'exact' };

  // 2. Exact name match
  const byName = US_STATES.find(s => s.name.toLowerCase() === cleaned);
  if (byName) return { ...byName, confidence: 'exact' };

  // 3. Fuzzy match on name - find closest match
  let bestMatch: { abbr: string; name: string; distance: number } | null = null;

  for (const state of US_STATES) {
    const distance = levenshtein(cleaned, state.name.toLowerCase());
    const maxLen = Math.max(cleaned.length, state.name.length);

    // Only consider if within reasonable edit distance (30% of length)
    if (distance <= Math.ceil(maxLen * 0.3)) {
      if (!bestMatch || distance < bestMatch.distance) {
        bestMatch = { ...state, distance };
      }
    }
  }

  if (bestMatch) {
    // High confidence if very close (1-2 edits), medium otherwise
    const confidence = bestMatch.distance <= 2 ? 'high' : 'medium';
    return { abbr: bestMatch.abbr, name: bestMatch.name, confidence };
  }

  return null;
}

export interface NormalizeResult {
  abbr: string | null;
  originalValue: string;
  matchedName?: string;
  confidence: 'exact' | 'high' | 'medium' | 'none';
}

/**
 * Normalize any state input to 2-letter abbreviation
 *
 * Examples:
 *   "CA" → { abbr: "CA", confidence: "exact" }
 *   "California" → { abbr: "CA", confidence: "exact" }
 *   "lousiana" → { abbr: "LA", confidence: "high" } (typo, 1 edit)
 *   "Luisiana" → { abbr: "LA", confidence: "high" } (typo, 2 edits)
 *   "XYZ" → { abbr: null, confidence: "none" }
 */
export function normalizeState(input: string | undefined | null): NormalizeResult {
  if (!input || !input.trim()) {
    return { abbr: null, originalValue: '', confidence: 'none' };
  }

  const originalValue = input.trim();
  const match = fuzzyMatchState(originalValue);

  if (match) {
    return {
      abbr: match.abbr,
      originalValue,
      matchedName: match.name,
      confidence: match.confidence,
    };
  }

  return {
    abbr: null,
    originalValue,
    confidence: 'none',
  };
}

/**
 * Get full state name from abbreviation
 */
export function getStateName(abbr: string): string {
  const state = US_STATES.find(s => s.abbr === abbr);
  return state?.name || abbr;
}
