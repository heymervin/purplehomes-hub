/**
 * Zillow API - Consolidated endpoint for Zillow-related operations
 *
 * Routes:
 * - action=search (GET) - Search Zillow for properties matching buyer criteria
 * - action=save (POST) - Save a Zillow property to the system
 * - action=check (GET) - Check if a Zillow property already exists
 * - action=check-batch (POST) - Check multiple ZPIDs at once for saved status
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { runZillowSearch, type ZillowSearchSettings } from '../../src/lib/apify';
import { calculateMaxAffordablePrice, hasValidDownPayment } from '../../src/lib/affordability';
import { findCachedSearch, saveCachedSearch, getSearchAge } from '../../src/lib/airtable-cache';
import type { ZillowSearchResponse, ZillowSearchType, ZillowListing } from '../../src/types/zillow';
import type { BuyerCriteria } from '../../src/types/matching';

const AIRTABLE_API_URL = 'https://api.airtable.com/v0';
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const PREFERENCES_TABLE = 'Matching Preferences';

// Default Zillow settings
const DEFAULT_ZILLOW_SETTINGS: ZillowSearchSettings = {
  maxPrice: 275000,
  minDays: 90,
  keywords: 'seller finance OR owner finance OR bond for deed',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action } = req.query;

  switch (action) {
    case 'search':
      if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
      }
      return handleSearch(req, res);

    case 'save':
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }
      return handleSave(req, res);

    case 'check':
      if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
      }
      return handleCheck(req, res);

    case 'check-batch':
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }
      return handleCheckBatch(req, res);

    default:
      return res.status(400).json({
        error: 'Unknown action',
        validActions: ['search', 'save', 'check', 'check-batch'],
      });
  }
}

// ============================================================================
// SEARCH (from api/zillow/search.ts)
// ============================================================================

async function handleSearch(req: VercelRequest, res: VercelResponse) {
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
      validTypes: validSearchTypes,
    });
  }

  try {
    // Fetch buyer from Airtable
    const headers = { Authorization: `Bearer ${AIRTABLE_API_KEY}` };
    const buyerRes = await fetch(`${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Buyers/${buyerId}`, {
      headers,
    });

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
          console.log('[Zillow API] Using settings from Airtable:', zillowSettings);
        }
      }
    } catch (err) {
      console.log('[Zillow API] Using default settings (fetch failed)');
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
      console.log(
        `[Zillow API] Returning cached results for buyer ${buyer.firstName} ${buyer.lastName} (${searchType})`
      );

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
    console.log(
      `[Zillow API] Running fresh search for buyer ${buyer.firstName} ${buyer.lastName} (${searchType})`
    );

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
    ).catch((err: unknown) => console.error('[Zillow API] Failed to save cache:', err));

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
    console.error('[Zillow API Search Error]', error);
    return res.status(500).json({
      error: 'Zillow search failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// ============================================================================
// SAVE (from api/properties/save-from-zillow.ts)
// ============================================================================

async function handleSave(req: VercelRequest, res: VercelResponse) {
  const {
    listing,
    buyerId,
    zillowType,
  }: {
    listing: ZillowListing;
    buyerId: string;
    zillowType: ZillowSearchType;
  } = req.body;

  if (!listing || !buyerId || !zillowType) {
    return res.status(400).json({
      error: 'Missing required fields: listing, buyerId, zillowType',
    });
  }

  const headers = {
    Authorization: `Bearer ${AIRTABLE_API_KEY}`,
    'Content-Type': 'application/json',
  };

  try {
    // Step 1: Check if ZPID already exists (prevent duplicates)
    const existingQuery = encodeURIComponent(`{Zillow ZPID} = "${listing.zpid}"`);
    const checkRes = await fetch(
      `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Properties?filterByFormula=${existingQuery}`,
      { headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` } }
    );
    const checkData = await checkRes.json();

    if (checkData.records?.length > 0) {
      return res.status(409).json({
        error: 'Property already saved',
        propertyId: checkData.records[0].id,
        message: 'This Zillow property is already in your system',
      });
    }

    // Step 2: Generate property code
    const propertyCode = `ZIL-${listing.zpid}`;

    // Step 3: Create property in Airtable
    console.log(`[Zillow API] Creating property: ${listing.address}`);

    const createRes = await fetch(`${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Properties`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        fields: {
          'Property Code': propertyCode,
          Address: listing.address,
          City: listing.city,
          State: listing.state,
          'Zip Code': listing.zipCode,
          'Property Total Price': listing.price,
          Beds: listing.beds,
          Baths: listing.baths,
          Sqft: listing.sqft,
          'Hero Image': listing.images[0] || '',
          Source: 'Zillow',
          'Zillow ZPID': listing.zpid,
          Lat: listing.lat,
          Lng: listing.lng,
          // Supporting images (images 2-10)
          ...(listing.images[1] && { 'Supporting Image 1': listing.images[1] }),
          ...(listing.images[2] && { 'Supporting Image 2': listing.images[2] }),
          ...(listing.images[3] && { 'Supporting Image 3': listing.images[3] }),
          ...(listing.images[4] && { 'Supporting Image 4': listing.images[4] }),
          ...(listing.images[5] && { 'Supporting Image 5': listing.images[5] }),
          ...(listing.images[6] && { 'Supporting Image 6': listing.images[6] }),
          ...(listing.images[7] && { 'Supporting Image 7': listing.images[7] }),
          ...(listing.images[8] && { 'Supporting Image 8': listing.images[8] }),
          ...(listing.images[9] && { 'Supporting Image 9': listing.images[9] }),
        },
      }),
    });

    if (!createRes.ok) {
      const errorData = await createRes.json();
      console.error('[Zillow API] Airtable error:', errorData);
      throw new Error(`Failed to create property: ${errorData.error?.message || 'Unknown error'}`);
    }

    const propertyData = await createRes.json();

    console.log(`[Zillow API] Property created successfully: ${propertyData.id}`);

    return res.json({
      success: true,
      property: propertyData,
      matchCreated: false,
      message: `Saved ${listing.address} to system`,
    });
  } catch (error) {
    console.error('[Zillow API Save Error]', error);
    return res.status(500).json({
      error: 'Failed to save property',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// ============================================================================
// CHECK (from api/properties/check-zillow.ts)
// ============================================================================

async function handleCheck(req: VercelRequest, res: VercelResponse) {
  const { zpid } = req.query;

  if (!zpid || typeof zpid !== 'string') {
    return res.status(400).json({ error: 'zpid required' });
  }

  try {
    const headers = { Authorization: `Bearer ${AIRTABLE_API_KEY}` };
    const filterFormula = encodeURIComponent(`{Zillow ZPID} = "${zpid}"`);

    const response = await fetch(
      `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Properties?filterByFormula=${filterFormula}`,
      { headers }
    );

    if (!response.ok) {
      throw new Error('Airtable query failed');
    }

    const data = await response.json();

    return res.json({
      exists: data.records?.length > 0,
      propertyId: data.records?.[0]?.id || null,
      propertyCode: data.records?.[0]?.fields?.['Property Code'] || null,
    });
  } catch (error) {
    console.error('[Zillow API Check Error]', error);
    return res.status(500).json({
      error: 'Check failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// ============================================================================
// CHECK-BATCH - Check multiple ZPIDs at once for saved status
// ============================================================================

async function handleCheckBatch(req: VercelRequest, res: VercelResponse) {
  const { zpids }: { zpids: string[] } = req.body;

  if (!zpids || !Array.isArray(zpids) || zpids.length === 0) {
    return res.status(400).json({ error: 'zpids array required' });
  }

  // Limit batch size to prevent abuse
  if (zpids.length > 100) {
    return res.status(400).json({ error: 'Maximum 100 ZPIDs per batch' });
  }

  try {
    const headers = { Authorization: `Bearer ${AIRTABLE_API_KEY}` };

    // Build OR formula: OR({Zillow ZPID}="123", {Zillow ZPID}="456", ...)
    const conditions = zpids.map((zpid) => `{Zillow ZPID}="${zpid}"`).join(',');
    const filterFormula = encodeURIComponent(`OR(${conditions})`);

    const response = await fetch(
      `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Properties?filterByFormula=${filterFormula}&fields[]=Zillow%20ZPID&fields[]=Property%20Code`,
      { headers }
    );

    if (!response.ok) {
      throw new Error('Airtable query failed');
    }

    const data = await response.json();

    // Build a map of zpid -> { propertyId, propertyCode }
    const saved: Record<string, { propertyId: string; propertyCode: string }> = {};
    for (const record of data.records || []) {
      const zpid = record.fields?.['Zillow ZPID'];
      if (zpid) {
        saved[zpid] = {
          propertyId: record.id,
          propertyCode: record.fields?.['Property Code'] || '',
        };
      }
    }

    return res.json({
      saved,
      totalChecked: zpids.length,
      totalSaved: Object.keys(saved).length,
    });
  } catch (error) {
    console.error('[Zillow API Check-Batch Error]', error);
    return res.status(500).json({
      error: 'Batch check failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
