/**
 * Zillow Search API Endpoint
 * Searches Zillow for properties matching a buyer's criteria via Apify
 * Implements 24-hour caching in Airtable
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { runZillowSearch, type ZillowSearchSettings } from '../../src/lib/apify';
import { calculateMaxAffordablePrice, hasValidDownPayment } from '../../src/lib/affordability';
import { findCachedSearch, saveCachedSearch, getSearchAge } from '../../src/lib/airtable-cache';
import type { ZillowSearchResponse, ZillowSearchType } from '../../src/types/zillow';
import type { BuyerCriteria } from '../../src/types/matching';

const AIRTABLE_API_URL = 'https://api.airtable.com/v0';
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const PREFERENCES_TABLE = 'Matching Preferences';

// Default Zillow settings
const DEFAULT_ZILLOW_SETTINGS: ZillowSearchSettings = {
  maxPrice: 275000,
  minDays: 90,
  keywords: 'seller finance OR owner finance OR bond for deed',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { buyerId, searchType } = req.query;

  // Validate required parameters
  if (!buyerId || typeof buyerId !== 'string') {
    return res.status(400).json({ error: 'buyerId required' });
  }

  if (!searchType || typeof searchType !== 'string') {
    return res.status(400).json({ error: 'searchType required' });
  }

  // Validate search type
  const validSearchTypes: ZillowSearchType[] = ['Creative Financing', '90+ Days', 'Affordability'];
  if (!validSearchTypes.includes(searchType as ZillowSearchType)) {
    return res.status(400).json({
      error: 'Invalid searchType',
      validTypes: validSearchTypes
    });
  }

  try {
    // Fetch buyer from Airtable
    const headers = { Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}` };
    const buyerRes = await fetch(
      `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Buyers/${buyerId}`,
      { headers }
    );

    if (!buyerRes.ok) {
      return res.status(404).json({ error: 'Buyer not found' });
    }

    const buyerData = await buyerRes.json();
    const buyer: BuyerCriteria = {
      contactId: buyerData.fields['Contact ID'],
      recordId: buyerData.id,
      firstName: buyerData.fields['First Name'] || '',
      lastName: buyerData.fields['Last Name'] || '',
      email: buyerData.fields['Email'] || '',
      city: buyerData.fields['City'],
      state: buyerData.fields['State'],
      preferredLocation: buyerData.fields['Preferred Location'],
      desiredBeds: buyerData.fields['No. of Bedrooms'],
      desiredBaths: buyerData.fields['No. of Bath'],
      downPayment: buyerData.fields['Downpayment'],
      location: buyerData.fields['City'] || buyerData.fields['State'],
    };

    // Validate buyer has location
    const location = buyer.preferredLocation || buyer.city || buyer.location;
    if (!location) {
      return res.json({
        results: [],
        searchType: searchType as ZillowSearchType,
        buyerCriteria: {
          location: '',
          beds: buyer.desiredBeds || null,
          maxPrice: null,
        },
        totalResults: 0,
        cached: false,
        error: 'Buyer location required for Zillow search',
      } as ZillowSearchResponse);
    }

    // Calculate max price for affordability search
    let maxPrice: number | null = null;
    if (searchType === 'Affordability') {
      if (!hasValidDownPayment(buyer.downPayment)) {
        return res.json({
          results: [],
          searchType: searchType as ZillowSearchType,
          buyerCriteria: {
            location,
            beds: buyer.desiredBeds || null,
            maxPrice: null,
          },
          totalResults: 0,
          cached: false,
          error: 'Sufficient down payment required for affordability search (minimum $10,300)',
        } as ZillowSearchResponse);
      }
      maxPrice = calculateMaxAffordablePrice(buyer.downPayment!);
    }

    // Fetch Zillow settings from Airtable
    let zillowSettings = DEFAULT_ZILLOW_SETTINGS;
    try {
      const settingsUrl = `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${encodeURIComponent(PREFERENCES_TABLE)}?maxRecords=1`;
      const settingsRes = await fetch(settingsUrl, { headers });
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        if (settingsData.records && settingsData.records.length > 0) {
          const record = settingsData.records[0];
          zillowSettings = {
            maxPrice: record.fields['Zillow Max Price'] ?? DEFAULT_ZILLOW_SETTINGS.maxPrice,
            minDays: record.fields['Zillow Min Days'] ?? DEFAULT_ZILLOW_SETTINGS.minDays,
            keywords: record.fields['Zillow Keywords'] ?? DEFAULT_ZILLOW_SETTINGS.keywords,
          };
          console.log('[Zillow Search] Using settings from Airtable:', zillowSettings);
        }
      }
    } catch (err) {
      console.log('[Zillow Search] Using default settings (fetch failed)');
    }

    // Check cache first
    const cached = await findCachedSearch(
      buyer.recordId!,
      searchType as ZillowSearchType,
      location,
      buyer.desiredBeds || null,
      maxPrice
    );

    if (cached) {
      console.log(`[Zillow Search] Returning cached results for buyer ${buyer.firstName} ${buyer.lastName} (${searchType})`);

      return res.json({
        results: cached.results,
        searchType: searchType as ZillowSearchType,
        buyerCriteria: {
          location,
          beds: buyer.desiredBeds || null,
          maxPrice,
        },
        apifyRunId: cached.apifyRunId,
        totalResults: cached.results.length,
        cached: true,
        cachedAt: cached.lastSynced,
        searchAge: getSearchAge(cached.lastSynced),
      } as ZillowSearchResponse);
    }

    // No cache - run fresh Apify search
    console.log(`[Zillow Search] Running fresh search for buyer ${buyer.firstName} ${buyer.lastName} (${searchType})`);

    const { listings, runId } = await runZillowSearch(
      buyer,
      searchType as ZillowSearchType,
      maxPrice || undefined,
      zillowSettings
    );

    // Save to cache (async, don't wait)
    saveCachedSearch(
      buyer.recordId!,
      searchType as ZillowSearchType,
      location,
      buyer.desiredBeds || null,
      maxPrice,
      listings,
      runId
    ).catch((err: unknown) => console.error('[Zillow Search] Failed to save cache:', err));

    const response: ZillowSearchResponse = {
      results: listings,
      searchType: searchType as ZillowSearchType,
      buyerCriteria: {
        location,
        beds: buyer.desiredBeds || null,
        maxPrice,
      },
      apifyRunId: runId,
      totalResults: listings.length,
      cached: false,
    };

    return res.json(response);
  } catch (error) {
    console.error('[Zillow Search Error]', error);
    return res.status(500).json({
      error: 'Zillow search failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
