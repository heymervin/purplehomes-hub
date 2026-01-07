/**
 * Apify Client for Zillow Property Search
 * Integrates with Apify's jupri~zillow-scraper to find external property listings
 */

import { ApifyClient } from 'apify-client';
import type { BuyerCriteria } from '@/types/matching';
import type { ZillowListing, ZillowSearchType } from '@/types/zillow';

// Initialize Apify client
const client = new ApifyClient({
  token: process.env.APIFY_API_TOKEN,
});

const ZILLOW_ACTOR_ID = 'jupri~zillow-scraper';

/**
 * Zillow settings passed from the API
 */
export interface ZillowSearchSettings {
  maxPrice: number;
  minDays: number;
  keywords: string;
}

/**
 * Run Zillow search via Apify for a specific buyer and search type
 *
 * @param buyer - Buyer criteria including location and preferences
 * @param searchType - Type of search to perform
 * @param maxPrice - Optional max price override (for Affordability search)
 * @param settings - Optional Zillow settings from the API
 * @returns Object containing listings array and Apify run ID
 */
export async function runZillowSearch(
  buyer: BuyerCriteria,
  searchType: ZillowSearchType,
  maxPrice?: number,
  settings?: ZillowSearchSettings
): Promise<{ listings: ZillowListing[], runId: string }> {
  const input = buildApifyInput(buyer, searchType, maxPrice, settings);

  console.log('[Apify] Running Zillow search:', { searchType, location: input.location, input });

  try {
    const run = await client.actor(ZILLOW_ACTOR_ID).call(input, {
      memory: 8192, // Specify memory in call options
    });

    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    console.log(`[Apify] Zillow search completed: ${items.length} raw results, runId: ${run.id}`);

    // Debug: Log first raw item to see full structure
    if (items.length > 0) {
      console.log('[Apify] Raw first item keys:', Object.keys(items[0]));
      console.log('[Apify] Raw first item (full):', JSON.stringify(items[0], null, 2).slice(0, 3000));
    }

    // Transform all results
    let listings = items.map(transformApifyResult);

    // Post-fetch filter for 90+ Days search (min_days doesn't work for sale searches)
    if (searchType === '90+ Days') {
      const minDays = settings?.minDays || 90;
      const beforeFilter = listings.length;
      listings = listings.filter(listing =>
        listing.daysOnMarket && listing.daysOnMarket >= minDays
      );
      console.log(`[Apify] Filtered ${minDays}+ days: ${beforeFilter} -> ${listings.length} results`);
    }

    // Limit to 20 results after filtering
    listings = listings.slice(0, 20);

    return {
      listings,
      runId: run.id,
    };
  } catch (error) {
    console.error('[Apify] Zillow search failed:', error);
    throw new Error('Zillow search failed');
  }
}

/**
 * Map internal property type to Zillow property type
 */
function mapPropertyTypeToZillow(propertyType: string): string | undefined {
  // Apify uses camelCase types (e.g., 'singleFamily' not 'SINGLE_FAMILY')
  const mapping: Record<string, string> = {
    'Single Family': 'singleFamily',
    'Condo': 'condo',
    'Town House': 'townhouse',
    'Townhouse': 'townhouse',
    'Multi Family': 'multiFamily',
    'Duplex': 'multiFamily',
    'Triplex': 'multiFamily',
    '4-plex': 'multiFamily',
    'Mobile Home': 'manufactured',
    'Lot': 'land',
    'Land': 'land',
  };
  return mapping[propertyType];
}

/**
 * Build Apify input based on buyer criteria and search type
 */
function buildApifyInput(
  buyer: BuyerCriteria,
  searchType: ZillowSearchType,
  maxPrice?: number,
  settings?: ZillowSearchSettings
): Record<string, any> {
  const location = buyer.preferredLocation || buyer.city || buyer.location || '';

  // Convert to string enums as required by the actor
  const minBeds = buyer.desiredBeds ? String(buyer.desiredBeds) : undefined;
  const minBaths = buyer.desiredBaths ? String(buyer.desiredBaths) : undefined;

  // Build base input with corrected parameter names
  // Note: includes:* params default to false, set to true to get extra data
  const baseInput: Record<string, any> = {
    location: [location],           // Array format required
    search_type: 'sale',            // Correct enum value (not 'sell')
    limit: 20,                      // Correct param name (not 'maxResults')
    'includes:attributionInfo': true,  // Get agent/broker info
    'includes:description': true,      // Get property descriptions
  };

  // Always include beds filter if available
  if (minBeds) {
    baseInput.min_beds = minBeds;
  }

  // Always include baths filter if available
  if (minBaths) {
    baseInput.min_baths = minBaths;
  }

  // Add property type filter if available
  const buyerWithPrefs = buyer as any; // Extended buyer type
  if (buyerWithPrefs.preferences?.propertyType) {
    const zillowType = mapPropertyTypeToZillow(buyerWithPrefs.preferences.propertyType);
    if (zillowType) {
      baseInput.types = [zillowType];
    }
  }

  // Add sqft filter if available
  if (buyerWithPrefs.preferences?.sqft) {
    baseInput.min_area = buyerWithPrefs.preferences.sqft;
  }

  // Search type specific configurations
  if (searchType === 'Creative Financing') {
    return {
      ...baseInput,
      prompt: settings?.keywords || 'seller finance OR owner finance OR bond for deed',
    };
  }

  if (searchType === '90+ Days') {
    return {
      ...baseInput,
      // Note: max_days filters for "listed within X days" (recent), not "on market X+ days"
      // So we don't use it - we filter post-fetch by daysOnMarket instead
      max_price: settings?.maxPrice || 275000,
      limit: 200,             // Fetch many to filter down to 90+ days (stale listings)
    };
  }

  if (searchType === 'Affordability') {
    return {
      ...baseInput,
      max_price: maxPrice,    // Calculated from buyer's down payment
    };
  }

  // Fallback
  return baseInput;
}

/**
 * Transform Apify result item to ZillowListing format
 */
function transformApifyResult(item: any): ZillowListing {
  // Debug: log available photo-related fields
  const photoFields = ['imgSrc', 'responsivePhotos', 'originalPhotos', 'photos', 'hiResImageLink',
    'desktopWebHdpImageLink', 'hdpUrl', 'photoCount', 'streetViewTileImageUrlMediumAddress',
    'hugePhotos', 'mediumPhotos', 'small'];
  const presentFields = photoFields.filter(f => item[f] !== undefined);
  console.log(`[Apify Transform] Address: ${item.address?.streetAddress || item.abbreviatedAddress}, Photo fields present:`, presentFields);
  if (item.responsivePhotos) console.log('[Apify Transform] responsivePhotos sample:', JSON.stringify(item.responsivePhotos[0]).slice(0, 200));
  // Handle address - can be string or object with {streetAddress, city, state, zipcode}
  const addressObj = item.address;
  const streetAddress = typeof addressObj === 'object' && addressObj
    ? addressObj.streetAddress || ''
    : (item.streetAddress || item.address || '');
  const city = typeof addressObj === 'object' && addressObj
    ? addressObj.city || ''
    : (item.city || '');
  const state = typeof addressObj === 'object' && addressObj
    ? addressObj.state || ''
    : (item.state || '');
  const zipCode = typeof addressObj === 'object' && addressObj
    ? addressObj.zipcode || ''
    : (item.zipcode || item.zip || '');

  // Handle price - can be number or object with {value}
  const price = typeof item.price === 'object' && item.price
    ? item.price.value || 0
    : (item.price || 0);

  // Handle images - try multiple sources
  let images: string[] = [];

  // First try imgSrc (main thumbnail - most reliable)
  if (item.imgSrc) {
    images.push(item.imgSrc);
  }

  // Then try responsivePhotos (detailed photos)
  if (item.responsivePhotos && Array.isArray(item.responsivePhotos) && item.responsivePhotos.length > 0) {
    const responsiveUrls = item.responsivePhotos
      .slice(0, 7) // Limit to 7 photos
      .map((p: any) => {
        // Get largest jpeg available (last in array)
        const jpegs = p.mixedSources?.jpeg;
        if (jpegs && jpegs.length > 0) {
          return jpegs[jpegs.length - 1]?.url; // Get largest
        }
        return null;
      })
      .filter(Boolean);
    images = [...images, ...responsiveUrls];
  }

  // Try originalPhotos if available
  if (images.length === 0 && item.originalPhotos && Array.isArray(item.originalPhotos)) {
    images = item.originalPhotos.slice(0, 7).map((p: any) => p.url).filter(Boolean);
  }

  // Fallback to hiResImageLink or desktopWebHdpImageLink
  if (images.length === 0) {
    if (item.hiResImageLink) images.push(item.hiResImageLink);
    else if (item.desktopWebHdpImageLink) images.push(item.desktopWebHdpImageLink);
  }

  // Handle location - can be nested in location object
  const lat = item.location?.latitude || item.latitude || item.lat || 0;
  const lng = item.location?.longitude || item.longitude || item.lng || 0;

  return {
    zpid: item.zpid || item.id || String(Math.random()),
    address: streetAddress,
    city,
    state,
    zipCode,
    price,
    beds: item.bedrooms || item.beds || 0,
    baths: item.bathrooms || item.baths || 0,
    sqft: item.livingArea || item.sqft || item.squareFeet,
    propertyType: item.propertyType || item.homeType || 'SINGLE_FAMILY',
    description: item.description || '',
    images,
    zillowUrl: item.url || item.detailUrl || (item.zpid ? `https://www.zillow.com/homedetails/${item.zpid}_zpid/` : ''),
    daysOnMarket: item.daysOnZillow || item.dom || item.timeOnZillow,
    lat,
    lng,
    scrapedAt: new Date().toISOString(),
    listingAgent: (item.attributionInfo || item.brokerageName) ? {
      name: item.attributionInfo?.agentName || item.brokerageName || '',
      phone: item.attributionInfo?.agentPhoneNumber || item.attributionInfo?.brokerPhoneNumber || '',
      brokerName: item.attributionInfo?.brokerName || item.brokerageName,
    } : undefined,
  };
}
