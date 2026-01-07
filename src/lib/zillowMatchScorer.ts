/**
 * Zillow Match Scorer
 * Calculates match status for Zillow listings against buyer criteria
 */

import type { BuyerCriteria } from '@/types/matching';
import type { ZillowListing } from '@/types/zillow';
import type {
  ZillowMatchStatus,
  ZillowMatchFlexibility,
  ZillowFilterState,
} from '@/types/matching';

/**
 * Calculate match status for a Zillow listing against buyer criteria
 */
export function calculateZillowMatchStatus(
  listing: ZillowListing,
  buyer: BuyerCriteria,
  maxAffordable: number,
  flexibility: ZillowMatchFlexibility
): ZillowMatchStatus {
  // Budget status
  const budgetDiff = maxAffordable - listing.price;
  const percentOver = budgetDiff < 0 ? Math.abs(budgetDiff / maxAffordable * 100) : null;

  let budgetStatus: 'met' | 'close' | 'over' = 'met';
  if (budgetDiff < 0) {
    if (percentOver && percentOver <= flexibility.budgetFlexPercent) {
      budgetStatus = 'close';
    } else {
      budgetStatus = 'over';
    }
  }

  const budgetLabel = budgetDiff >= 0
    ? `$${Math.abs(Math.round(budgetDiff / 1000))}k under`
    : `${percentOver?.toFixed(0)}% over`;

  // Bedrooms status
  const bedDiff = listing.beds - (buyer.desiredBeds || 0);
  let bedsStatus: 'met' | 'close' | 'miss' = 'met';

  if (bedDiff < 0) {
    const allowedDiff = flexibility.bedroomFlex === 'minus2' ? -2 :
                        flexibility.bedroomFlex === 'minus1' ? -1 : 0;
    if (bedDiff >= allowedDiff) {
      bedsStatus = 'close';
    } else {
      bedsStatus = 'miss';
    }
  }

  const bedsLabel = bedDiff === 0 ? `${listing.beds} bed (exact)` :
                    bedDiff > 0 ? `${listing.beds} bed (+${bedDiff})` :
                    `${listing.beds} bed (${bedDiff})`;

  // Bathrooms status
  const bathDiff = listing.baths - (buyer.desiredBaths || 0);
  let bathsStatus: 'met' | 'close' | 'miss' = 'met';

  if (bathDiff < 0) {
    const allowedDiff = flexibility.bathroomFlex === 'minus2' ? -2 :
                        flexibility.bathroomFlex === 'minus1' ? -1 : 0;
    if (bathDiff >= allowedDiff) {
      bathsStatus = 'close';
    } else {
      bathsStatus = 'miss';
    }
  }

  const bathsLabel = bathDiff === 0 ? `${listing.baths} bath (exact)` :
                     bathDiff > 0 ? `${listing.baths} bath (+${bathDiff})` :
                     `${listing.baths} bath (${bathDiff})`;

  // Location status
  const buyerCity = (buyer.city || buyer.preferredLocation || '').toLowerCase();
  const listingCity = listing.city.toLowerCase();
  const inPreferredCity = buyerCity && listingCity.includes(buyerCity);

  const locationStatus: 'met' | 'close' | 'miss' = inPreferredCity ? 'met' : 'close';
  const locationLabel = inPreferredCity ? `In ${listing.city}` : listing.city;

  // Calculate match type
  const statuses = [budgetStatus, bedsStatus, bathsStatus, locationStatus];
  const metCount = statuses.filter(s => s === 'met').length;
  const closeCount = statuses.filter(s => s === 'close').length;
  const missCount = statuses.filter(s => s === 'miss' || s === 'over').length;

  let matchType: 'perfect' | 'near' | 'stretch' | 'partial';
  if (metCount === 4 || (metCount === 3 && closeCount === 1)) {
    matchType = 'perfect';
  } else if (metCount >= 2 && missCount === 0) {
    matchType = 'near';
  } else if (metCount >= 2 || (metCount === 1 && closeCount >= 2)) {
    matchType = 'stretch';
  } else {
    matchType = 'partial';
  }

  // Generate summary for non-perfect matches
  let summary: string | null = null;
  if (matchType !== 'perfect') {
    const issues: string[] = [];
    if (budgetStatus === 'close') issues.push('slightly over budget');
    if (budgetStatus === 'over') issues.push(`over budget by ${percentOver?.toFixed(0)}%`);
    if (bedsStatus === 'close') issues.push(`${Math.abs(bedDiff)} less bedroom${Math.abs(bedDiff) > 1 ? 's' : ''}`);
    if (bedsStatus === 'miss') issues.push(`${Math.abs(bedDiff)} less bedrooms (outside flex)`);
    if (bathsStatus === 'close') issues.push(`${Math.abs(bathDiff)} less bathroom${Math.abs(bathDiff) > 1 ? 's' : ''}`);
    if (bathsStatus === 'miss') issues.push(`${Math.abs(bathDiff)} less bathrooms (outside flex)`);
    if (locationStatus === 'close') issues.push('different city');

    if (issues.length > 0) {
      summary = issues.join(', ');
      summary = summary.charAt(0).toUpperCase() + summary.slice(1);
    }
  }

  return {
    matchType,
    budget: {
      status: budgetStatus,
      difference: budgetDiff,
      percentOver,
      label: budgetLabel,
    },
    bedrooms: {
      status: bedsStatus,
      property: listing.beds,
      wanted: buyer.desiredBeds || 0,
      difference: bedDiff,
      label: bedsLabel,
    },
    bathrooms: {
      status: bathsStatus,
      property: listing.baths,
      wanted: buyer.desiredBaths || 0,
      difference: bathDiff,
      label: bathsLabel,
    },
    location: {
      status: locationStatus,
      inPreferredCity,
      city: listing.city,
      label: locationLabel,
    },
    summary,
  };
}

/**
 * Filter listings based on filter state
 */
export function filterZillowListings(
  listings: Array<{ listing: ZillowListing; matchStatus: ZillowMatchStatus }>,
  filters: ZillowFilterState
): Array<{ listing: ZillowListing; matchStatus: ZillowMatchStatus }> {
  return listings.filter(({ matchStatus }) => {
    // Match type filter
    const matchTypeAllowed =
      (filters.showPerfect && matchStatus.matchType === 'perfect') ||
      (filters.showNear && matchStatus.matchType === 'near') ||
      (filters.showStretch && (matchStatus.matchType === 'stretch' || matchStatus.matchType === 'partial'));

    if (!matchTypeAllowed) return false;

    // Individual criteria filters
    if (filters.withinBudget && matchStatus.budget.status === 'over') return false;
    if (filters.meetsBeds && matchStatus.bedrooms.status === 'miss') return false;
    if (filters.meetsBaths && matchStatus.bathrooms.status === 'miss') return false;

    return true;
  });
}

/**
 * Count listings by match type
 */
export function countByMatchType(
  listings: Array<{ matchStatus: ZillowMatchStatus }>
): { perfect: number; near: number; stretch: number; partial: number } {
  return listings.reduce(
    (acc, { matchStatus }) => {
      acc[matchStatus.matchType]++;
      return acc;
    },
    { perfect: 0, near: 0, stretch: 0, partial: 0 }
  );
}

/**
 * Sort listings by match quality
 * Perfect > Near > Stretch > Partial, then by budget difference
 */
export function sortByMatchQuality(
  listings: Array<{ listing: ZillowListing; matchStatus: ZillowMatchStatus }>
): Array<{ listing: ZillowListing; matchStatus: ZillowMatchStatus }> {
  const matchTypeOrder = { perfect: 0, near: 1, stretch: 2, partial: 3 };

  return [...listings].sort((a, b) => {
    // First sort by match type
    const typeCompare = matchTypeOrder[a.matchStatus.matchType] - matchTypeOrder[b.matchStatus.matchType];
    if (typeCompare !== 0) return typeCompare;

    // Then by budget difference (more under budget = better)
    return b.matchStatus.budget.difference - a.matchStatus.budget.difference;
  });
}
