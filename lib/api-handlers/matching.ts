/**
 * Property Matching API
 * Handles running matching between buyers and properties
 * Uses hybrid location scoring: ZIP codes + Mapbox geocoding
 *
 * Consolidated endpoints:
 * - action=run - Run full matching
 * - action=run-buyer - Run matching for single buyer
 * - action=run-property - Run matching for single property
 * - action=health - Health check
 * - action=debug-geocode - Debug geocoding config
 * - action=aggregated-buyers - Fetch buyers with matches (aggregated)
 * - action=aggregated-properties - Fetch properties with matches (aggregated)
 * - action=clear - Clear all matches (DELETE method)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateMatchScore } from '../matching/scorer';
import type { MatchScore } from '../matching/scorer';
import {
  geocodeBuyerLocation,
  geocodePropertyLocation,
  isMapboxConfigured,
  geocode,
} from '../mapbox';
import { gunzipSync } from 'zlib';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_API_URL = 'https://api.airtable.com/v0';

// In-memory cache for aggregated endpoints (semi-static data)
const aggregatedBuyersCache = new Map<string, { data: any[], timestamp: number }>();
const aggregatedPropertiesCache = new Map<string, { data: any[], timestamp: number }>();
const AGGREGATED_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Helper to extract ZIP code from city string (e.g., "Kenner, LA 70062" -> "70062")
function extractZipFromCity(city: string | undefined): string | undefined {
  if (!city) return undefined;
  const match = city.match(/\b\d{5}\b/);
  return match ? match[0] : undefined;
}

export async function matchingHandler(req: VercelRequest, res: VercelResponse) {
  console.log('[Matching API] Request:', {
    method: req.method,
    action: req.query.action,
  });

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    return res.status(500).json({
      error: 'Airtable credentials not configured',
    });
  }

  const headers = {
    'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
    'Content-Type': 'application/json',
  };

  const { action } = req.query;

  try {
    switch (action) {
      case 'health':
        // Health check endpoint to verify function is working
        return res.status(200).json({
          status: 'ok',
          timestamp: new Date().toISOString(),
          env: {
            hasAirtableKey: !!AIRTABLE_API_KEY,
            hasAirtableBase: !!AIRTABLE_BASE_ID,
          },
          node: process.version,
        });

      case 'run':
        return await handleRunMatching(req, res, headers);

      case 'run-buyer':
        return await handleRunBuyerMatching(req, res, headers);

      case 'run-property':
        return await handleRunPropertyMatching(req, res, headers);

      case 'debug-geocode':
        return await handleDebugGeocode(req, res, headers);

      // Aggregated endpoints (merged from aggregated.ts)
      case 'aggregated-buyers':
        if (req.method !== 'GET') {
          return res.status(405).json({ error: 'Method not allowed' });
        }
        return await handleAggregatedBuyers(req, res, headers);

      case 'aggregated-properties':
        if (req.method !== 'GET') {
          return res.status(405).json({ error: 'Method not allowed' });
        }
        return await handleAggregatedProperties(req, res, headers);

      // Clear matches endpoint (merged from clear.ts)
      case 'clear':
        if (req.method !== 'DELETE') {
          return res.status(405).json({ error: 'Method not allowed. Use DELETE.' });
        }
        return await handleClearMatches(req, res, headers);

      // Buyer-properties endpoint (Zillow-style: all properties for a buyer)
      case 'buyer-properties':
        if (req.method !== 'GET') {
          return res.status(405).json({ error: 'Method not allowed' });
        }
        return await handleBuyerProperties(req, res, headers);

      // Property-buyers endpoint (all buyers for a property)
      case 'property-buyers':
        if (req.method !== 'GET') {
          return res.status(405).json({ error: 'Method not allowed' });
        }
        return await handlePropertyBuyers(req, res, headers);

      // Match stats endpoint (for dashboard summary)
      case 'match-stats':
        if (req.method !== 'GET') {
          return res.status(405).json({ error: 'Method not allowed' });
        }
        return await handleMatchStats(req, res, headers);

      // Matching preferences endpoints
      case 'get-preferences':
        if (req.method !== 'GET') {
          return res.status(405).json({ error: 'Method not allowed' });
        }
        return await handleGetPreferences(req, res, headers);

      case 'update-preferences':
        if (req.method !== 'PUT' && req.method !== 'POST') {
          return res.status(405).json({ error: 'Method not allowed. Use PUT or POST.' });
        }
        return await handleUpdatePreferences(req, res, headers);

      default:
        return res.status(400).json({ error: 'Unknown action', action });
    }
  } catch (error: any) {
    console.error('[Matching API] Error:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error',
      stack: error.stack,
    });
  }
}

/**
 * Geocode buyers and properties that are missing coordinates
 * Updates Airtable records with geocoded coordinates
 */
async function geocodeRecordsWithMissingCoordinates(
  buyers: any[],
  properties: any[],
  headers: any
): Promise<{ geocodedBuyers: number; geocodedProperties: number }> {
  if (!isMapboxConfigured()) {
    console.log('[Matching] Mapbox not configured, skipping geocoding');
    return { geocodedBuyers: 0, geocodedProperties: 0 };
  }

  let geocodedBuyers = 0;
  let geocodedProperties = 0;

  // Geocode buyers without coordinates
  const buyersToGeocode = buyers.filter(
    (b) => !b.fields['Lat'] || !b.fields['Lng']
  );

  if (buyersToGeocode.length > 0) {
    console.log(`[Matching] Geocoding ${buyersToGeocode.length} buyers without coordinates`);

    for (const buyer of buyersToGeocode) {
      try {
        const result = await geocodeBuyerLocation({
          city: buyer.fields['City'],
          preferredLocation: buyer.fields['Preferred Location'],
          state: buyer.fields['State'],
          preferredZipCodes: parseZipCodes(buyer.fields['Preferred Zip Codes']),
        });

        if (result) {
          // Update buyer record with coordinates
          await updateRecordCoordinates(
            'Buyers',
            buyer.id,
            {
              'Lat': result.lat,
              'Lng': result.lng,
            },
            headers
          );

          // Update the in-memory buyer object
          buyer.fields['Lat'] = result.lat;
          buyer.fields['Lng'] = result.lng;

          geocodedBuyers++;
        }

        // Rate limit: 10 requests per second
        await delay(100);
      } catch (error) {
        console.error(`[Matching] Error geocoding buyer ${buyer.id}:`, error);
      }
    }
  }

  // Geocode properties without coordinates
  const propertiesToGeocode = properties.filter(
    (p) => !p.fields['Lat'] || !p.fields['Lng']
  );

  if (propertiesToGeocode.length > 0) {
    console.log(`[Matching] Geocoding ${propertiesToGeocode.length} properties without coordinates`);

    for (const property of propertiesToGeocode) {
      try {
        const result = await geocodePropertyLocation({
          address: property.fields['Address'],
          city: property.fields['City'],
          state: property.fields['State'],
          zipCode: property.fields['Zip Code'] || property.fields['ZIP Code'],
        });

        if (result) {
          // Update property record with coordinates
          await updateRecordCoordinates(
            'Properties',
            property.id,
            {
              'Lat': result.lat,
              'Lng': result.lng,
            },
            headers
          );

          // Update the in-memory property object
          property.fields['Lat'] = result.lat;
          property.fields['Lng'] = result.lng;

          geocodedProperties++;
        }

        // Rate limit: 10 requests per second
        await delay(100);
      } catch (error) {
        console.error(`[Matching] Error geocoding property ${property.id}:`, error);
      }
    }
  }

  console.log(`[Matching] Geocoding complete: ${geocodedBuyers} buyers, ${geocodedProperties} properties`);
  return { geocodedBuyers, geocodedProperties };
}

/**
 * Update a record's coordinates in Airtable
 */
async function updateRecordCoordinates(
  table: string,
  recordId: string,
  fields: Record<string, any>,
  headers: any
): Promise<void> {
  try {
    const response = await fetch(
      `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${encodeURIComponent(table)}/${recordId}`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ fields }),
      }
    );

    if (!response.ok) {
      console.warn(`[Matching] Failed to update ${table}/${recordId} coordinates: ${response.status}`);
    }
  } catch (error) {
    console.error(`[Matching] Error updating ${table}/${recordId} coordinates:`, error);
  }
}

/**
 * Parse ZIP codes from string or array
 */
function parseZipCodes(value: any): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    return value.split(',').map((z) => z.trim()).filter(Boolean);
  }
  return [];
}

/**
 * Simple delay helper
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Helper to collect supporting images from Airtable fields
 * Supporting images are stored in individual fields: Supporting Image 1 through Supporting Image 25
 */
function collectSupportingImages(propertyFields: any): string[] {
  const images: string[] = [];
  for (let i = 1; i <= 25; i++) {
    const fieldName = `Supporting Image ${i}`;
    const imageUrl = propertyFields[fieldName];
    if (imageUrl && typeof imageUrl === 'string') {
      images.push(imageUrl);
    }
  }
  return images;
}

/**
 * Fetches cached data from System Cache table
 * Returns null if cache is not available or invalid
 * Handles both compressed (v2) and uncompressed (v1) cache data
 */
async function fetchCachedData(cacheKey: string, headers: any): Promise<any | null> {
  try {
    const formula = encodeURIComponent(`{cache_key} = "${cacheKey}"`);
    const cacheRes = await fetch(
      `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/System%20Cache?filterByFormula=${formula}`,
      { headers }
    );

    if (!cacheRes.ok) {
      console.warn(`[Matching] Failed to fetch cache for ${cacheKey}, will use direct Airtable query`);
      return null;
    }

    const cacheData = await cacheRes.json();
    const record = cacheData.records?.[0];

    if (!record || !record.fields.is_valid) {
      console.warn(`[Matching] Cache not found or invalid for ${cacheKey}, will use direct Airtable query`);
      return null;
    }

    // Handle both compressed and uncompressed data
    let data;
    const isCompressed = record.fields.compressed === true;
    const version = record.fields.version || 1;

    if (isCompressed && version >= 2) {
      // Decompress gzipped base64 data
      const compressedBuffer = Buffer.from(record.fields.data, 'base64');
      const decompressed = gunzipSync(compressedBuffer);
      data = JSON.parse(decompressed.toString());
      console.log(`[Matching] Loaded ${data.records?.length || 0} records from compressed cache: ${cacheKey}`);
    } else {
      // Legacy uncompressed data
      data = JSON.parse(record.fields.data || '{"records":[]}');
      console.log(`[Matching] Loaded ${data.records?.length || 0} records from uncompressed cache: ${cacheKey}`);
    }

    return data;

  } catch (error) {
    console.error(`[Matching] Error fetching/decompressing cache for ${cacheKey}:`, error);
    return null;
  }
}

/**
 * Updates a cache record with new data
 */
async function updateCacheRecord(cacheKey: string, data: any, recordCount: number, headers: any): Promise<void> {
  try {
    const formula = encodeURIComponent(`{cache_key} = "${cacheKey}"`);
    const findRes = await fetch(
      `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/System%20Cache?filterByFormula=${formula}`,
      { headers }
    );

    if (!findRes.ok) {
      console.warn(`[Matching] Failed to find cache record for ${cacheKey}`);
      return;
    }

    const findData = await findRes.json();
    const recordId = findData.records?.[0]?.id;

    const cacheFields = {
      cache_key: cacheKey,
      data: JSON.stringify(data),
      record_count: recordCount,
      source_count: recordCount,
      last_synced: new Date().toISOString(),
      is_valid: true,
      version: 1,
    };

    if (recordId) {
      // Update existing record
      await fetch(
        `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/System%20Cache/${recordId}`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            fields: cacheFields,
          }),
        }
      );
      console.log(`[Matching] Updated cache record for ${cacheKey}`);
    } else {
      // Create new record
      await fetch(
        `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/System%20Cache`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            fields: cacheFields,
          }),
        }
      );
      console.log(`[Matching] Created cache record for ${cacheKey}`);
    }
  } catch (error) {
    console.error(`[Matching] Error updating cache for ${cacheKey}:`, error);
  }
}

/**
 * Fetches all records from a table with pagination support
 * Used to refresh cache when a record is not found
 */
async function fetchAllRecordsFromTable(tableName: string, headers: any): Promise<any[]> {
  const allRecords: any[] = [];
  let offset: string | undefined;

  do {
    const url = new URL(`${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}`);
    url.searchParams.set('pageSize', '100');
    if (offset) url.searchParams.set('offset', offset);

    const response = await fetch(url.toString(), { headers });
    const data = await response.json();

    allRecords.push(...(data.records || []));
    offset = data.offset;
  } while (offset);

  return allRecords;
}

/**
 * Syncs the buyers cache by fetching all records from Airtable
 * Returns the fresh records array
 */
async function syncBuyersCache(headers: any): Promise<any[]> {
  console.log('[Matching] Syncing buyers cache - fetching all buyers from Airtable...');
  const records = await fetchAllRecordsFromTable('Buyers', headers);

  const cacheData = { records };
  await updateCacheRecord('buyers', cacheData, records.length, headers);

  console.log(`[Matching] Buyers cache synced with ${records.length} records`);
  return records;
}

/**
 * Syncs the properties cache by fetching all records from Airtable
 * Returns the fresh records array
 */
async function syncPropertiesCache(headers: any): Promise<any[]> {
  console.log('[Matching] Syncing properties cache - fetching all properties from Airtable...');
  const records = await fetchAllRecordsFromTable('Properties', headers);

  const cacheData = { records };
  await updateCacheRecord('properties', cacheData, records.length, headers);

  console.log(`[Matching] Properties cache synced with ${records.length} records`);
  return records;
}

/**
 * Invalidates a cache entry by setting is_valid to false
 */
async function invalidateCache(cacheKey: string, headers: any): Promise<void> {
  try {
    const formula = encodeURIComponent(`{cache_key} = "${cacheKey}"`);
    const findRes = await fetch(
      `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/System%20Cache?filterByFormula=${formula}`,
      { headers }
    );

    if (!findRes.ok) return;

    const findData = await findRes.json();
    const recordId = findData.records?.[0]?.id;

    if (recordId) {
      await fetch(
        `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/System%20Cache/${recordId}`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            fields: { is_valid: false }
          })
        }
      );
      console.log(`[Matching] Invalidated cache: ${cacheKey}`);
    }
  } catch (error) {
    console.error(`[Matching] Error invalidating cache for ${cacheKey}:`, error);
  }
}

/**
 * Fetches existing matches and builds both a skip set and a match ID map
 * Returns { skipSet, matchMap } where matchMap is "contactId:propertyCode" -> matchRecordId
 */
async function fetchExistingMatches(headers: any, refreshAll: boolean): Promise<{
  skipSet: Set<string>;
  matchMap: Map<string, string>;
}> {
  if (refreshAll) {
    console.log('[Matching] refreshAll=true, will re-create all matches');
    return { skipSet: new Set(), matchMap: new Map() };
  }

  try {
    // ALWAYS fetch ALL matches from Airtable for accurate duplicate prevention
    // Note: Cannot rely on cache because it's limited to ~100 matches due to Airtable's 100KB field size limit
    console.log('[Matching] Fetching ALL existing matches from Airtable with pagination for duplicate prevention...');
    let matchRecords: any[] = [];
    let offset: string | undefined;
    let pageCount = 0;

    // Paginate through ALL existing matches
    do {
      pageCount++;
      const url = new URL(`${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Property-Buyer%20Matches`);
      url.searchParams.set('pageSize', '100');
      if (offset) url.searchParams.set('offset', offset);

      const res = await fetch(url.toString(), { headers });

      if (!res.ok) {
        console.warn('[Matching] Failed to fetch existing matches page', pageCount, ', proceeding with partial skip set');
        break;
      }

      const data = await res.json();
      matchRecords.push(...(data.records || []));
      offset = data.offset;

      console.log(`[Matching] Fetched page ${pageCount}: ${data.records?.length || 0} matches (total so far: ${matchRecords.length})`);
    } while (offset);

    console.log(`[Matching] Finished fetching ${matchRecords.length} existing matches from Airtable across ${pageCount} pages`);

    const skipSet = new Set<string>();
    const matchMap = new Map<string, string>();

    for (const match of matchRecords) {
      const contactIds = match.fields['Contact ID'] || [];
      const propertyCodes = match.fields['Property Code'] || [];

      // Build skip keys and match ID map for all combinations (handles linked records)
      for (const cid of contactIds) {
        for (const pid of propertyCodes) {
          const key = `${cid}:${pid}`;
          skipSet.add(key);
          matchMap.set(key, match.id); // Store Airtable record ID for updates
        }
      }
    }

    console.log(`[Matching] Loaded ${skipSet.size} existing match pairings into skipSet for duplicate prevention`);
    return { skipSet, matchMap };

  } catch (error) {
    console.error('[Matching] Error loading existing matches:', error);
    return { skipSet: new Set(), matchMap: new Map() };
  }
}

/**
 * Batch create new matches in Airtable (up to 10 per request, 5 concurrent)
 */
async function batchCreateMatches(matches: any[], headers: any): Promise<number> {
  if (matches.length === 0) return 0;

  const BATCH_SIZE = 10;
  const CONCURRENCY = 5;

  const executeBatch = async (batch: any[]): Promise<number> => {
    try {
      const createRes = await fetch(
        `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Property-Buyer%20Matches`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ records: batch }),
        }
      );
      if (!createRes.ok) {
        const errorText = await createRes.text();
        console.error(`[Matching] Batch create failed:`, createRes.status, errorText);
        return 0;
      }
      return batch.length;
    } catch (error) {
      console.error(`[Matching] Error in batch create:`, error);
      return 0;
    }
  };

  return parallelBatchExecute(matches, BATCH_SIZE, CONCURRENCY, executeBatch);
}

/**
 * Execute batches in parallel with concurrency limit
 */
async function parallelBatchExecute<T>(
  items: T[],
  batchSize: number,
  concurrency: number,
  executor: (batch: T[]) => Promise<number>
): Promise<number> {
  if (items.length === 0) return 0;

  // Split into batches of batchSize
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }

  let totalProcessed = 0;

  // Process batches in parallel chunks of 'concurrency'
  for (let i = 0; i < batches.length; i += concurrency) {
    const chunk = batches.slice(i, i + concurrency);
    const results = await Promise.all(chunk.map(batch => executor(batch)));
    totalProcessed += results.reduce((sum, n) => sum + n, 0);
  }

  return totalProcessed;
}

/**
 * Batch update existing matches in Airtable (up to 10 per request, 5 concurrent)
 */
async function batchUpdateMatches(updates: any[], headers: any): Promise<number> {
  if (updates.length === 0) return 0;

  const BATCH_SIZE = 10;
  const CONCURRENCY = 5;

  const executeBatch = async (batch: any[]): Promise<number> => {
    try {
      const updateRes = await fetch(
        `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Property-Buyer%20Matches`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ records: batch }),
        }
      );
      if (!updateRes.ok) {
        const errorText = await updateRes.text();
        console.error(`[Matching] Batch update failed:`, updateRes.status, errorText);
        return 0;
      }
      return batch.length;
    } catch (error) {
      console.error(`[Matching] Error in batch update:`, error);
      return 0;
    }
  };

  return parallelBatchExecute(updates, BATCH_SIZE, CONCURRENCY, executeBatch);
}

/**
 * Run matching for all buyers against all properties
 */
async function handleRunMatching(req: VercelRequest, res: VercelResponse, headers: any) {
  const startTime = Date.now();
  const { minScore = 30, refreshAll = false } = req.body || {};

  console.log('[Matching] Starting full matching', { minScore, refreshAll, timestamp: new Date().toISOString() });

  try {
    // Try to fetch buyers from cache first
    console.log('[Matching] Attempting to fetch buyers from cache...');
    let buyersData = await fetchCachedData('buyers', headers);
    let buyers = buyersData?.records || [];

    // Fallback to direct Airtable query if cache unavailable
    if (!buyersData || buyers.length === 0) {
      console.log('[Matching] Cache miss - fetching buyers from Airtable...');
      const buyersRes = await fetch(`${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Buyers`, { headers });
      if (!buyersRes.ok) {
        const errorText = await buyersRes.text();
        console.error('[Matching] Failed to fetch buyers:', buyersRes.status, errorText);
        throw new Error(`Failed to fetch buyers: ${buyersRes.status} ${buyersRes.statusText}`);
      }
      const directBuyersData = await buyersRes.json();
      buyers = directBuyersData.records || [];
    }
    console.log(`[Matching] Loaded ${buyers.length} buyers in ${Date.now() - startTime}ms`);

    // Try to fetch properties from cache first
    console.log('[Matching] Attempting to fetch properties from cache...');
    let propertiesData = await fetchCachedData('properties', headers);
    let properties = propertiesData?.records || [];

    // Fallback to direct Airtable query if cache unavailable
    if (!propertiesData || properties.length === 0) {
      console.log('[Matching] Cache miss - fetching properties from Airtable...');
      const propertiesRes = await fetch(`${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Properties`, { headers });
      if (!propertiesRes.ok) {
        const errorText = await propertiesRes.text();
        console.error('[Matching] Failed to fetch properties:', propertiesRes.status, errorText);
        throw new Error(`Failed to fetch properties: ${propertiesRes.status} ${propertiesRes.statusText}`);
      }
      const directPropertiesData = await propertiesRes.json();
      properties = directPropertiesData.records || [];
    }
    console.log(`[Matching] Loaded ${properties.length} properties in ${Date.now() - startTime}ms`);

    if (buyers.length === 0 || properties.length === 0) {
      console.warn('[Matching] No buyers or properties found, skipping matching');
      return res.status(200).json({
        success: true,
        message: 'No buyers or properties found to match',
        stats: { buyersProcessed: 0, propertiesProcessed: 0, matchesCreated: 0, matchesUpdated: 0, duplicatesSkipped: 0, withinRadius: 0, geocodedBuyers: 0, geocodedProperties: 0 },
      });
    }

    // Geocode buyers and properties that are missing coordinates
    console.log('[Matching] Starting geocoding for records without coordinates...');
    const geocodingResult = await geocodeRecordsWithMissingCoordinates(buyers, properties, headers);
    console.log(`[Matching] Geocoding complete in ${Date.now() - startTime}ms`);

    console.log(`[Matching] Processing ${buyers.length} buyers × ${properties.length} properties = ${buyers.length * properties.length} combinations`);

    // Load existing matches into memory
    const { skipSet, matchMap } = await fetchExistingMatches(headers, refreshAll);

    let duplicatesSkipped = 0;
    let withinRadius = 0;

    // Collect matches to create/update in memory
    const matchesToCreate: any[] = [];
    const matchesToUpdate: any[] = [];

    // Log sample data for debugging
    if (buyers.length > 0 && properties.length > 0) {
      console.log('[Matching] Sample buyer data:', {
        id: buyers[0].id,
        hasFields: !!buyers[0].fields,
        fields: buyers[0].fields ? Object.keys(buyers[0].fields).slice(0, 10) : 'NO FIELDS!'
      });
      console.log('[Matching] Sample property data:', {
        id: properties[0].id,
        hasFields: !!properties[0].fields,
        fields: properties[0].fields ? Object.keys(properties[0].fields).slice(0, 10) : 'NO FIELDS!'
      });
    }

    // Process each buyer
    console.log('[Matching] Starting matching loop...');
    const totalCombinations = buyers.length * properties.length;
    let processed = 0;
    let scoredMatches = 0;
    const progressInterval = Math.max(1, Math.floor(totalCombinations / 10)); // Log every 10%

    for (const buyer of buyers) {
      for (const property of properties) {
        processed++;

        // Log progress periodically
        if (processed % progressInterval === 0 || processed === totalCombinations) {
          const elapsed = Date.now() - startTime;
          const progress = (processed / totalCombinations * 100).toFixed(1);
          console.log(`[Matching] Progress: ${progress}% (${processed}/${totalCombinations}) - ${elapsed}ms elapsed - ${scoredMatches} matches above threshold`);
        }

        // Check skip set
        const pairKey = `${buyer.id}:${property.id}`;
        if (skipSet.has(pairKey) && !refreshAll) {
          duplicatesSkipped++;
          continue;
        }

        // Generate match score
        const score = generateMatchScore(buyer, property);

        // Log first match for debugging
        if (scoredMatches === 0 && score.score >= minScore) {
          console.log('[Matching] First match found:', {
            buyerId: buyer.id,
            propertyId: property.id,
            score: score.score,
            reasoning: score.reasoning,
            highlights: score.highlights
          });
        }

        scoredMatches++;

        if (score.score >= minScore) {
          // Build match notes
          let matchNotes = score.reasoning;
          matchNotes += `\n\nHighlights: ${score.highlights.join(', ')}`;
          if (score.concerns && score.concerns.length > 0) {
            matchNotes += `\n\nConcerns: ${score.concerns.join(', ')}`;
          }

          // Build fields object
          const matchFields: any = {
            'Match Score': score.score,
            'Match Notes': matchNotes,
            'Match Status': 'Active',
            'Is Priority': score.isPriority,
            'Distance': score.distanceMiles,
          };

          // Check if this is an update or create
          const existingMatchId = matchMap.get(pairKey);
          if (existingMatchId) {
            // Queue for batch update
            matchesToUpdate.push({
              id: existingMatchId,
              fields: matchFields,
            });
          } else {
            // Queue for batch create
            // Linked record fields need Airtable record IDs
            matchFields['Property Code'] = [property.id];
            matchFields['Contact ID'] = [buyer.id];
            // Text fields for GHL identifiers
            matchFields['Contact ID (for GHL)'] = buyer.fields['Contact ID'];
            matchFields['Opportunity ID (for GHL) '] = property.fields['Property Code'];
            matchesToCreate.push({
              fields: matchFields,
            });
          }

          if (score.isPriority) {
            withinRadius++;
          }
        }
      }
    }

    // Execute batch operations
    console.log(`[Matching] Executing batch operations: ${matchesToCreate.length} creates, ${matchesToUpdate.length} updates`);
    const matchesCreated = await batchCreateMatches(matchesToCreate, headers);
    const matchesUpdated = await batchUpdateMatches(matchesToUpdate, headers);

    // Auto-refresh matches cache if we created or updated any matches
    if (matchesCreated > 0 || matchesUpdated > 0) {
      console.log('[Matching] Auto-refreshing matches cache with new data...');
      try {
        // Fetch all matches from Airtable to refresh the cache
        const allMatchesRes = await fetch(
          `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Property-Buyer%20Matches`,
          { headers }
        );

        if (allMatchesRes.ok) {
          const allMatchesData = await allMatchesRes.json();
          const allMatches = allMatchesData.records || [];

          // Build indexes for fast lookup
          const buyerIndex: Record<string, string[]> = {};
          const propertyIndex: Record<string, string[]> = {};

          allMatches.forEach((r: any) => {
            const buyerRecordId = r.fields['Contact ID']?.[0] || '';
            const propertyRecordId = r.fields['Property Code']?.[0] || '';

            if (buyerRecordId) {
              if (!buyerIndex[buyerRecordId]) buyerIndex[buyerRecordId] = [];
              buyerIndex[buyerRecordId].push(r.id);
            }

            if (propertyRecordId) {
              if (!propertyIndex[propertyRecordId]) propertyIndex[propertyRecordId] = [];
              propertyIndex[propertyRecordId].push(r.id);
            }
          });

          // Update the cache with fresh data
          const cacheData = {
            records: allMatches,
            buyerIndex,
            propertyIndex,
          };

          await updateCacheRecord('matches', cacheData, allMatches.length, headers);
          console.log('[Matching] Successfully auto-refreshed matches cache with new data');
        } else {
          console.warn('[Matching] Failed to fetch matches for cache refresh, will invalidate');
          await invalidateCache('matches', headers);
        }
      } catch (error) {
        console.error('[Matching] Error auto-refreshing matches cache:', error);
        await invalidateCache('matches', headers);
      }
    }

    const totalTime = Date.now() - startTime;
    console.log(`[Matching] Completed in ${totalTime}ms`, {
      matchesCreated,
      matchesUpdated,
      duplicatesSkipped,
      withinRadius,
    });

    return res.status(200).json({
      success: true,
      message: `Matching complete! Created ${matchesCreated} new matches, updated ${matchesUpdated}, skipped ${duplicatesSkipped} duplicates. Geocoded ${geocodingResult.geocodedBuyers} buyers and ${geocodingResult.geocodedProperties} properties.`,
      stats: {
        buyersProcessed: buyers.length,
        propertiesProcessed: properties.length,
        matchesCreated,
        matchesUpdated,
        duplicatesSkipped,
        withinRadius,
        geocodedBuyers: geocodingResult.geocodedBuyers,
        geocodedProperties: geocodingResult.geocodedProperties,
        timeMs: totalTime,
      },
    });
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`[Matching] Fatal error after ${elapsed}ms:`, error);
    throw error; // Re-throw to be caught by top-level handler
  }
}

/**
 * Run matching for a single buyer
 */
async function handleRunBuyerMatching(req: VercelRequest, res: VercelResponse, headers: any) {
  const { contactId } = req.query;
  const { minScore = 30 } = req.body || {};

  if (!contactId) {
    return res.status(400).json({ error: 'contactId is required' });
  }

  console.log('[Matching] Running matching for buyer:', contactId);

  // Try to fetch buyers from cache first
  console.log('[Matching] Attempting to fetch buyers from cache...');
  let buyersData = await fetchCachedData('buyers', headers);
  let allBuyers = buyersData?.records || [];

  // Fallback to direct Airtable query if cache unavailable
  if (!buyersData || allBuyers.length === 0) {
    console.log('[Matching] Cache miss - fetching buyer from Airtable...');
    const buyerFormula = encodeURIComponent(`{Contact ID} = "${contactId}"`);
    const buyerRes = await fetch(
      `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Buyers?filterByFormula=${buyerFormula}`,
      { headers }
    );
    if (!buyerRes.ok) throw new Error('Failed to fetch buyer');
    const buyerData = await buyerRes.json();
    allBuyers = buyerData.records || [];
  }

  // Find the specific buyer by contactId
  let buyer = allBuyers.find((b: any) => b.id === contactId || b.fields['Contact ID'] === contactId);

  // If buyer not found in cache, auto-sync the buyers cache and try again
  if (!buyer) {
    console.log('[Matching] Buyer not found in cache - syncing buyers cache...');
    allBuyers = await syncBuyersCache(headers);
    buyer = allBuyers.find((b: any) => b.id === contactId || b.fields['Contact ID'] === contactId);

    if (!buyer) {
      return res.status(404).json({
        error: 'Buyer not found',
        message: 'This buyer was not found even after refreshing the cache. Please ensure the buyer exists in Airtable.',
        synced: true,
      });
    }
    console.log('[Matching] Found buyer after cache sync');
  }

  // Try to fetch properties from cache first
  console.log('[Matching] Attempting to fetch properties from cache...');
  let propertiesData = await fetchCachedData('properties', headers);
  let properties = propertiesData?.records || [];

  // Fallback to direct Airtable query if cache unavailable
  if (!propertiesData || properties.length === 0) {
    console.log('[Matching] Cache miss - fetching properties from Airtable...');
    const propertiesRes = await fetch(`${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Properties`, { headers });
    if (!propertiesRes.ok) throw new Error('Failed to fetch properties');
    const directPropertiesData = await propertiesRes.json();
    properties = directPropertiesData.records || [];
  }

  // Load existing matches for this buyer
  const { matchMap } = await fetchExistingMatches(headers, false);

  const matchesToCreate: any[] = [];
  const matchesToUpdate: any[] = [];
  let withinRadius = 0;

  // Match against all properties
  for (const property of properties) {
    const score = generateMatchScore(buyer, property);

    if (score.score >= minScore) {
      // Build match notes
      let matchNotes = score.reasoning;
      matchNotes += `\n\nHighlights: ${score.highlights.join(', ')}`;
      if (score.concerns && score.concerns.length > 0) {
        matchNotes += `\n\nConcerns: ${score.concerns.join(', ')}`;
      }

      const matchFields: any = {
        'Match Score': score.score,
        'Match Notes': matchNotes,
        'Match Status': 'Active',
        'Is Priority': score.isPriority,
        'Distance': score.distanceMiles,
      };

      const pairKey = `${buyer.id}:${property.id}`;
      const existingMatchId = matchMap.get(pairKey);

      if (existingMatchId) {
        matchesToUpdate.push({ id: existingMatchId, fields: matchFields });
      } else {
        // Linked record fields need Airtable record IDs
        matchFields['Property Code'] = [property.id];
        matchFields['Contact ID'] = [buyer.id];
        // Text fields for GHL identifiers
        matchFields['Contact ID (for GHL)'] = buyer.fields['Contact ID'];
        matchFields['Opportunity ID (for GHL) '] = property.fields['Property Code'];
        matchesToCreate.push({ fields: matchFields });
      }

      if (score.isPriority) {
        withinRadius++;
      }
    }
  }

  // Execute batch operations
  const matchesCreated = await batchCreateMatches(matchesToCreate, headers);
  const matchesUpdated = await batchUpdateMatches(matchesToUpdate, headers);

  // Auto-refresh matches cache if we created or updated any matches
  if (matchesCreated > 0 || matchesUpdated > 0) {
    console.log('[Matching] Auto-refreshing matches cache with new data...');
    try {
      const allMatchesRes = await fetch(
        `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Property-Buyer%20Matches`,
        { headers }
      );

      if (allMatchesRes.ok) {
        const allMatchesData = await allMatchesRes.json();
        const allMatches = allMatchesData.records || [];

        const buyerIndex: Record<string, string[]> = {};
        const propertyIndex: Record<string, string[]> = {};

        allMatches.forEach((r: any) => {
          const buyerRecordId = r.fields['Contact ID']?.[0] || '';
          const propertyRecordId = r.fields['Property Code']?.[0] || '';

          if (buyerRecordId) {
            if (!buyerIndex[buyerRecordId]) buyerIndex[buyerRecordId] = [];
            buyerIndex[buyerRecordId].push(r.id);
          }

          if (propertyRecordId) {
            if (!propertyIndex[propertyRecordId]) propertyIndex[propertyRecordId] = [];
            propertyIndex[propertyRecordId].push(r.id);
          }
        });

        const cacheData = { records: allMatches, buyerIndex, propertyIndex };
        await updateCacheRecord('matches', cacheData, allMatches.length, headers);
        console.log('[Matching] Successfully auto-refreshed matches cache');
      } else {
        await invalidateCache('matches', headers);
      }
    } catch (error) {
      console.error('[Matching] Error auto-refreshing cache:', error);
      await invalidateCache('matches', headers);
    }
  }

  return res.status(200).json({
    success: true,
    message: `Found ${matchesCreated + matchesUpdated} matches for ${buyer.fields['First Name']} ${buyer.fields['Last Name']}`,
    stats: {
      buyersProcessed: 1,
      propertiesProcessed: properties.length,
      matchesCreated,
      matchesUpdated,
      withinRadius,
    },
  });
}

/**
 * Run matching for a single property
 */
async function handleRunPropertyMatching(req: VercelRequest, res: VercelResponse, headers: any) {
  const { propertyCode } = req.query;
  const { minScore = 30 } = req.body || {};

  if (!propertyCode) {
    return res.status(400).json({ error: 'propertyCode is required' });
  }

  console.log('[Matching] Running matching for property:', propertyCode);

  // Try to fetch properties from cache first
  console.log('[Matching] Attempting to fetch properties from cache...');
  let propertiesData = await fetchCachedData('properties', headers);
  let allProperties = propertiesData?.records || [];

  // Fallback to direct Airtable query if cache unavailable
  if (!propertiesData || allProperties.length === 0) {
    console.log('[Matching] Cache miss - fetching property from Airtable...');
    const propertyFormula = encodeURIComponent(`{Property Code} = "${propertyCode}"`);
    const propertyRes = await fetch(
      `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Properties?filterByFormula=${propertyFormula}`,
      { headers }
    );
    if (!propertyRes.ok) throw new Error('Failed to fetch property');
    const propertyData = await propertyRes.json();
    allProperties = propertyData.records || [];
  }

  // Find the specific property by propertyCode
  let property = allProperties.find((p: any) => p.id === propertyCode || p.fields['Property Code'] === propertyCode);

  // If property not found in cache, auto-sync the properties cache and try again
  if (!property) {
    console.log('[Matching] Property not found in cache - syncing properties cache...');
    allProperties = await syncPropertiesCache(headers);
    property = allProperties.find((p: any) => p.id === propertyCode || p.fields['Property Code'] === propertyCode);

    if (!property) {
      return res.status(404).json({
        error: 'Property not found',
        message: 'This property was not found even after refreshing the cache. Please ensure the property exists in Airtable.',
        synced: true,
      });
    }
    console.log('[Matching] Found property after cache sync');
  }

  // Try to fetch buyers from cache first
  console.log('[Matching] Attempting to fetch buyers from cache...');
  let buyersData = await fetchCachedData('buyers', headers);
  let buyers = buyersData?.records || [];

  // Fallback to direct Airtable query if cache unavailable
  if (!buyersData || buyers.length === 0) {
    console.log('[Matching] Cache miss - fetching buyers from Airtable...');
    const buyersRes = await fetch(`${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Buyers`, { headers });
    if (!buyersRes.ok) throw new Error('Failed to fetch buyers');
    const directBuyersData = await buyersRes.json();
    buyers = directBuyersData.records || [];
  }

  // Load existing matches for this property
  const { matchMap } = await fetchExistingMatches(headers, false);

  const matchesToCreate: any[] = [];
  const matchesToUpdate: any[] = [];
  let withinRadius = 0;

  // Match against all buyers
  for (const buyer of buyers) {
    const score = generateMatchScore(buyer, property);

    if (score.score >= minScore) {
      // Build match notes
      let matchNotes = score.reasoning;
      matchNotes += `\n\nHighlights: ${score.highlights.join(', ')}`;
      if (score.concerns && score.concerns.length > 0) {
        matchNotes += `\n\nConcerns: ${score.concerns.join(', ')}`;
      }

      const matchFields: any = {
        'Match Score': score.score,
        'Match Notes': matchNotes,
        'Match Status': 'Active',
        'Is Priority': score.isPriority,
        'Distance': score.distanceMiles,
      };

      const pairKey = `${buyer.id}:${property.id}`;
      const existingMatchId = matchMap.get(pairKey);

      if (existingMatchId) {
        matchesToUpdate.push({ id: existingMatchId, fields: matchFields });
      } else {
        // Linked record fields need Airtable record IDs
        matchFields['Property Code'] = [property.id];
        matchFields['Contact ID'] = [buyer.id];
        // Text fields for GHL identifiers
        matchFields['Contact ID (for GHL)'] = buyer.fields['Contact ID'];
        matchFields['Opportunity ID (for GHL) '] = property.fields['Property Code'];
        matchesToCreate.push({ fields: matchFields });
      }

      if (score.isPriority) {
        withinRadius++;
      }
    }
  }

  // Execute batch operations
  const matchesCreated = await batchCreateMatches(matchesToCreate, headers);
  const matchesUpdated = await batchUpdateMatches(matchesToUpdate, headers);

  // Auto-refresh matches cache if we created or updated any matches
  if (matchesCreated > 0 || matchesUpdated > 0) {
    console.log('[Matching] Auto-refreshing matches cache with new data...');
    try {
      const allMatchesRes = await fetch(
        `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Property-Buyer%20Matches`,
        { headers }
      );

      if (allMatchesRes.ok) {
        const allMatchesData = await allMatchesRes.json();
        const allMatches = allMatchesData.records || [];

        const buyerIndex: Record<string, string[]> = {};
        const propertyIndex: Record<string, string[]> = {};

        allMatches.forEach((r: any) => {
          const buyerRecordId = r.fields['Contact ID']?.[0] || '';
          const propertyRecordId = r.fields['Property Code']?.[0] || '';

          if (buyerRecordId) {
            if (!buyerIndex[buyerRecordId]) buyerIndex[buyerRecordId] = [];
            buyerIndex[buyerRecordId].push(r.id);
          }

          if (propertyRecordId) {
            if (!propertyIndex[propertyRecordId]) propertyIndex[propertyRecordId] = [];
            propertyIndex[propertyRecordId].push(r.id);
          }
        });

        const cacheData = { records: allMatches, buyerIndex, propertyIndex };
        await updateCacheRecord('matches', cacheData, allMatches.length, headers);
        console.log('[Matching] Successfully auto-refreshed matches cache');
      } else {
        await invalidateCache('matches', headers);
      }
    } catch (error) {
      console.error('[Matching] Error auto-refreshing cache:', error);
      await invalidateCache('matches', headers);
    }
  }

  return res.status(200).json({
    success: true,
    message: `Found ${matchesCreated + matchesUpdated} buyer matches for property ${propertyCode}`,
    stats: {
      buyersProcessed: buyers.length,
      propertiesProcessed: 1,
      matchesCreated,
      matchesUpdated,
      withinRadius,
    },
  });
}

/**
 * Debug endpoint to check geocoding configuration
 */
async function handleDebugGeocode(req: VercelRequest, res: VercelResponse, headers: any) {
  const mapboxConfigured = isMapboxConfigured();
  const mapboxTokenLength = process.env.MAPBOX_ACCESS_TOKEN?.length || 0;

  // Test geocoding with a known location
  let geocodeTest = null;
  if (mapboxConfigured) {
    try {
      geocodeTest = await geocode('New Orleans, LA');
    } catch (error: any) {
      geocodeTest = { error: error.message };
    }
  }

  // Check a sample buyer and property for Lat/Lng
  let sampleData = null;
  try {
    const [buyersRes, propertiesRes] = await Promise.all([
      fetch(`${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Buyers?maxRecords=2`, { headers }),
      fetch(`${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Properties?maxRecords=2`, { headers }),
    ]);

    const buyersData = await buyersRes.json();
    const propertiesData = await propertiesRes.json();

    sampleData = {
      buyers: (buyersData.records || []).map((b: any) => ({
        id: b.id,
        name: `${b.fields['First Name']} ${b.fields['Last Name']}`,
        preferredLocation: b.fields['Preferred Location'],
        city: b.fields['City'],
        state: b.fields['State'],
        lat: b.fields['Lat'],
        lng: b.fields['Lng'],
        hasCoordinates: !!(b.fields['Lat'] && b.fields['Lng']),
      })),
      properties: (propertiesData.records || []).map((p: any) => ({
        id: p.id,
        address: p.fields['Address'],
        city: p.fields['City'],
        state: p.fields['State'],
        lat: p.fields['Lat'],
        lng: p.fields['Lng'],
        hasCoordinates: !!(p.fields['Lat'] && p.fields['Lng']),
      })),
    };
  } catch (error: any) {
    sampleData = { error: error.message };
  }

  return res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    configuration: {
      mapboxConfigured,
      mapboxTokenLength,
      mapboxTokenPrefix: process.env.MAPBOX_ACCESS_TOKEN?.substring(0, 10) + '...',
    },
    geocodeTest,
    sampleData,
    diagnosis: !mapboxConfigured
      ? '❌ MAPBOX_ACCESS_TOKEN is not set in Vercel environment variables'
      : geocodeTest && typeof geocodeTest === 'object' && 'error' in geocodeTest
      ? '❌ Mapbox token is invalid or API error'
      : '✅ Geocoding is configured and working',
  });
}

// ============================================================================
// AGGREGATED ENDPOINTS (merged from aggregated.ts)
// ============================================================================

/**
 * Fetch buyers with their matches in an optimized way
 * Solves the N+1 query problem by doing server-side aggregation
 */
async function handleAggregatedBuyers(
  req: VercelRequest,
  res: VercelResponse,
  headers: any
) {
  const startTime = Date.now();

  const {
    limit = '50',
    offset = '',
    matchStatus,
    minScore = '30',
    priorityOnly = 'false',
    matchLimit = '25',
    dateRange = 'all',
  } = req.query;

  const filters = {
    matchStatus: matchStatus as string | undefined,
    minScore: parseInt(minScore as string),
    priorityOnly: priorityOnly === 'true',
    matchLimit: parseInt(matchLimit as string),
    dateRange: dateRange as string,
  };

  const limitNum = parseInt(limit as string);
  const offsetStr = offset as string;

  // Step 1: Fetch buyers (paginated) with caching
  console.log(`[Aggregated] Fetching buyers with limit=${limitNum}, offset=${offsetStr}`);

  const buyersCacheKey = `buyers-${limitNum}-${offsetStr}`;
  const cachedBuyers = aggregatedBuyersCache.get(buyersCacheKey);

  let buyers: any[];
  let buyersData: any;

  if (cachedBuyers && Date.now() - cachedBuyers.timestamp < AGGREGATED_CACHE_TTL) {
    console.log(`[Aggregated] Using cached buyers (age: ${Math.floor((Date.now() - cachedBuyers.timestamp) / 1000)}s)`);
    buyers = cachedBuyers.data;
    buyersData = { records: buyers, offset: undefined };
  } else {
    const buyersUrl = `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Buyers?maxRecords=${limitNum}${offsetStr ? `&offset=${offsetStr}` : ''}`;

    const buyersRes = await fetch(buyersUrl, { headers });
    if (!buyersRes.ok) {
      throw new Error(`Failed to fetch buyers: ${buyersRes.status} ${buyersRes.statusText}`);
    }

    buyersData = await buyersRes.json();
    buyers = buyersData.records || [];

    aggregatedBuyersCache.set(buyersCacheKey, { data: buyers, timestamp: Date.now() });
    console.log(`[Aggregated] Cached buyers data`);
  }

  console.log(`[Aggregated] Fetched ${buyers.length} buyers in ${Date.now() - startTime}ms`);

  if (buyers.length === 0) {
    return res.status(200).json({
      data: [],
      nextOffset: null,
      stats: { buyers: 0, matches: 0, properties: 0, timeMs: Date.now() - startTime },
    });
  }

  // Step 2: Fetch ALL matches for these buyers in ONE call
  const buyerContactIds = buyers.map((b: any) => b.fields['Contact ID']).filter((id: string) => id);
  const matchesFormula = `OR(${buyerContactIds.map((id: string) => `{Contact ID (for GHL)} = "${id}"`).join(',')})`;

  console.log(`[Aggregated] Fetching matches for ${buyerContactIds.length} buyers`);

  const matchesUrl = `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Property-Buyer%20Matches?filterByFormula=${encodeURIComponent(matchesFormula)}`;

  const matchesRes = await fetch(matchesUrl, { headers });
  const matchesData = matchesRes.ok ? await matchesRes.json() : { records: [] };
  const allMatches = matchesData.records || [];

  console.log(`[Aggregated] Fetched ${allMatches.length} matches in ${Date.now() - startTime}ms`);

  // Step 3: Get unique property IDs and batch fetch properties
  const propertyIds = [
    ...new Set(
      allMatches.flatMap((m: any) => m.fields['Property Code'] || [])
    ),
  ];

  let propertiesMap: Record<string, any> = {};

  if (propertyIds.length > 0) {
    console.log(`[Aggregated] Batch fetching ${propertyIds.length} properties`);

    const propertiesFormula = `OR(${(propertyIds as string[]).map((id) => `RECORD_ID()="${id}"`).join(',')})`;
    const propertiesUrl = `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Properties?filterByFormula=${encodeURIComponent(propertiesFormula)}`;

    const propertiesRes = await fetch(propertiesUrl, { headers });
    if (propertiesRes.ok) {
      const propertiesData = await propertiesRes.json();
      propertiesMap = Object.fromEntries(
        (propertiesData.records || []).map((p: any) => [p.id, p])
      );
    }
  }

  console.log(`[Aggregated] Fetched ${Object.keys(propertiesMap).length} properties in ${Date.now() - startTime}ms`);

  // Step 4: Assemble the response with pre-joined data
  const buyersWithMatches = buyers.map((buyer: any) => {
    const buyerContactId = buyer.fields['Contact ID'];

    const buyerMatches = allMatches
      .filter((m: any) => {
        const matchContactId = m.fields['Contact ID (for GHL)'] || '';
        if (matchContactId !== buyerContactId) return false;

        const score = m.fields['Match Score'] || 0;
        if (score < filters.minScore) return false;

        if (filters.matchStatus && m.fields['Match Status'] !== filters.matchStatus) return false;
        if (filters.priorityOnly && !m.fields['Is Priority']) return false;

        if (filters.dateRange && filters.dateRange !== 'all') {
          const createdTime = new Date(m.createdTime);
          const now = new Date();
          const daysAgo = filters.dateRange === '7days' ? 7 : 30;
          const cutoffDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
          if (createdTime < cutoffDate) return false;
        }

        return true;
      })
      .sort((a: any, b: any) => (b.fields['Match Score'] || 0) - (a.fields['Match Score'] || 0))
      .slice(0, filters.matchLimit)
      .map((match: any) => {
        const propertyRecordId = match.fields['Property Code']?.[0];
        const property = propertiesMap[propertyRecordId];

        return {
          id: match.id,
          buyerRecordId: buyer.id,
          propertyRecordId: propertyRecordId || '',
          contactId: buyer.fields['Contact ID'] || '',
          propertyCode: property?.fields['Property Code'] || '',
          score: match.fields['Match Score'] || 0,
          distance: match.fields['Distance'],
          reasoning: match.fields['Match Notes'] || '',
          highlights: [],
          isPriority: match.fields['Is Priority'],
          status: match.fields['Match Status'] || 'Active',
          stage: match.fields['Match Stage'] || null,
          ghlRelationId: match.fields['GHL Relation ID'] || null,
          activities: match.fields['Activities'] || '[]',
          notes: match.fields['Notes'] || '[]',
          property: property ? {
            recordId: property.id,
            propertyCode: property.fields['Property Code'] || '',
            opportunityId: property.fields['Opportunity ID'],
            address: property.fields['Address'] || '',
            city: property.fields['City'] || '',
            state: property.fields['State'],
            zipCode: property.fields['Zip Code'] || property.fields['Zip'] || extractZipFromCity(property.fields['City']),
            price: property.fields['Property Total Price'] || property.fields['Price'],
            beds: property.fields['Beds'] || 0,
            baths: property.fields['Baths'] || 0,
            sqft: property.fields['Sqft'],
            stage: property.fields['Stage'],
            heroImage: property.fields['Hero Image']?.[0]?.url || property.fields['Hero Image'],
            notes: property.fields['Notes'] || property.fields['Description'] || '',
            monthlyPayment: property.fields['Monthly Payment'],
            downPayment: property.fields['Down Payment'],
            images: collectSupportingImages(property.fields),
            propertyType: property.fields['Property Type'],
            condition: property.fields['Property Current Condition'],
          } : null,
        };
      });

    const zipCodesRaw = buyer.fields['Preferred Zip Codes'] || buyer.fields['Zip Codes'] || '';
    const preferredZipCodes = typeof zipCodesRaw === 'string'
      ? zipCodesRaw.split(',').map((z: string) => z.trim()).filter(Boolean)
      : Array.isArray(zipCodesRaw) ? zipCodesRaw : [];

    return {
      contactId: buyer.fields['Contact ID'] || '',
      recordId: buyer.id,
      firstName: buyer.fields['First Name'] || '',
      lastName: buyer.fields['Last Name'] || '',
      email: buyer.fields['Email'] || '',
      phone: buyer.fields['Phone'] || buyer.fields['Mobile'] || buyer.fields['Mobile Phone'] || buyer.fields['Phone Number'] || buyer.fields['Cell Phone'] || buyer.fields['Cell'] || buyer.fields['Primary Phone'] || buyer.fields['phone'] || '',
      monthlyIncome: buyer.fields['Monthly Income'],
      monthlyLiabilities: buyer.fields['Monthly Liabilities'],
      downPayment: buyer.fields['Downpayment'],
      desiredBeds: buyer.fields['No. of Bedrooms'],
      desiredBaths: buyer.fields['No. of Bath'],
      city: buyer.fields['City'],
      location: buyer.fields['Location'],
      preferredLocation: buyer.fields['Preferred Location'] || buyer.fields['Location'],
      preferredZipCodes,
      buyerType: buyer.fields['Buyer Type'],
      qualified: ['Yes', 'yes', 'YES', 'true', true, 1, '1'].includes(buyer.fields['Qualified']),
      language: buyer.fields['Language'] === 'Spanish' ? 'Spanish' : 'English',
      dateAdded: buyer.fields['Date Added'] || buyer.createdTime,
      matches: buyerMatches,
      totalMatches: buyerMatches.length,
    };
  });

  const totalTime = Date.now() - startTime;
  console.log(`[Aggregated] Completed buyers aggregation in ${totalTime}ms`);

  return res.status(200).json({
    data: buyersWithMatches,
    nextOffset: buyersData.offset || null,
    stats: {
      buyers: buyers.length,
      matches: allMatches.length,
      properties: Object.keys(propertiesMap).length,
      timeMs: totalTime,
    },
  });
}

/**
 * Fetch properties with their matches in an optimized way
 */
async function handleAggregatedProperties(
  req: VercelRequest,
  res: VercelResponse,
  headers: any
) {
  const startTime = Date.now();

  const {
    limit = '50',
    offset = '',
    matchStatus,
    minScore = '30',
    priorityOnly = 'false',
    matchLimit = '25',
    dateRange = 'all',
  } = req.query;

  const filters = {
    matchStatus: matchStatus as string | undefined,
    minScore: parseInt(minScore as string),
    priorityOnly: priorityOnly === 'true',
    matchLimit: parseInt(matchLimit as string),
    dateRange: dateRange as string,
  };

  const limitNum = parseInt(limit as string);
  const offsetStr = offset as string;

  // Step 1: Fetch properties (paginated) with caching
  console.log(`[Aggregated] Fetching properties with limit=${limitNum}, offset=${offsetStr}`);

  const propertiesCacheKey = `properties-${limitNum}-${offsetStr}`;
  const cachedProperties = aggregatedPropertiesCache.get(propertiesCacheKey);

  let properties: any[];
  let propertiesData: any;

  if (cachedProperties && Date.now() - cachedProperties.timestamp < AGGREGATED_CACHE_TTL) {
    console.log(`[Aggregated] Using cached properties (age: ${Math.floor((Date.now() - cachedProperties.timestamp) / 1000)}s)`);
    properties = cachedProperties.data;
    propertiesData = { records: properties, offset: undefined };
  } else {
    const propertiesUrl = `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Properties?maxRecords=${limitNum}${offsetStr ? `&offset=${offsetStr}` : ''}`;

    const propertiesRes = await fetch(propertiesUrl, { headers });
    if (!propertiesRes.ok) {
      throw new Error(`Failed to fetch properties: ${propertiesRes.status} ${propertiesRes.statusText}`);
    }

    propertiesData = await propertiesRes.json();
    properties = propertiesData.records || [];

    aggregatedPropertiesCache.set(propertiesCacheKey, { data: properties, timestamp: Date.now() });
    console.log(`[Aggregated] Cached properties data`);
  }

  console.log(`[Aggregated] Fetched ${properties.length} properties in ${Date.now() - startTime}ms`);

  if (properties.length === 0) {
    return res.status(200).json({
      data: [],
      nextOffset: null,
      stats: { properties: 0, matches: 0, buyers: 0, timeMs: Date.now() - startTime },
    });
  }

  // Step 2: Fetch ALL matches for these properties in ONE call
  const propertyCodes = properties.map((p: any) => p.fields['Property Code']).filter((code: string) => code);
  const matchesFormula = `OR(${propertyCodes.map((code: string) => `{Opportunity ID (for GHL) } = "${code}"`).join(',')})`;

  console.log(`[Aggregated] Fetching matches for ${propertyCodes.length} properties`);

  const matchesUrl = `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Property-Buyer%20Matches?filterByFormula=${encodeURIComponent(matchesFormula)}`;

  const matchesRes = await fetch(matchesUrl, { headers });
  const matchesData = matchesRes.ok ? await matchesRes.json() : { records: [] };
  const allMatches = matchesData.records || [];

  console.log(`[Aggregated] Fetched ${allMatches.length} matches in ${Date.now() - startTime}ms`);

  // Step 3: Get unique buyer Contact IDs and batch fetch buyers
  const buyerContactIds = [
    ...new Set(
      allMatches.map((m: any) => m.fields['Contact ID (for GHL)']).filter(Boolean)
    ),
  ];

  let buyersMap: Record<string, any> = {};

  if (buyerContactIds.length > 0) {
    console.log(`[Aggregated] Batch fetching ${buyerContactIds.length} buyers`);

    const buyersFormula = `OR(${(buyerContactIds as string[]).map((id) => `FIND("${id}", {Contact ID})`).join(',')})`;
    const buyersUrl = `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Buyers?filterByFormula=${encodeURIComponent(buyersFormula)}`;

    const buyersRes = await fetch(buyersUrl, { headers });
    if (buyersRes.ok) {
      const buyersData = await buyersRes.json();
      buyersMap = Object.fromEntries(
        (buyersData.records || []).map((b: any) => [b.fields['Contact ID'], b])
      );
    }
  }

  console.log(`[Aggregated] Fetched ${Object.keys(buyersMap).length} buyers in ${Date.now() - startTime}ms`);

  // Step 4: Assemble the response
  const propertiesWithMatches = properties.map((property: any) => {
    const propertyCode = property.fields['Property Code'];

    const propertyMatches = allMatches
      .filter((m: any) => {
        const matchPropertyCode = m.fields['Opportunity ID (for GHL) '] || '';
        if (matchPropertyCode !== propertyCode) return false;

        const score = m.fields['Match Score'] || 0;
        if (score < filters.minScore) return false;

        if (filters.matchStatus && m.fields['Match Status'] !== filters.matchStatus) return false;
        if (filters.priorityOnly && !m.fields['Is Priority']) return false;

        if (filters.dateRange && filters.dateRange !== 'all') {
          const createdTime = new Date(m.createdTime);
          const now = new Date();
          const daysAgo = filters.dateRange === '7days' ? 7 : 30;
          const cutoffDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
          if (createdTime < cutoffDate) return false;
        }

        return true;
      })
      .sort((a: any, b: any) => (b.fields['Match Score'] || 0) - (a.fields['Match Score'] || 0))
      .slice(0, filters.matchLimit)
      .map((match: any) => {
        const buyerContactId = match.fields['Contact ID (for GHL)'] || '';
        const buyer = buyersMap[buyerContactId];

        return {
          id: match.id,
          buyerRecordId: buyer?.id || '',
          propertyRecordId: property.id,
          contactId: buyer?.fields['Contact ID'] || '',
          propertyCode: property.fields['Property Code'] || '',
          score: match.fields['Match Score'] || 0,
          distance: match.fields['Distance'],
          reasoning: match.fields['Match Notes'] || '',
          highlights: [],
          isPriority: match.fields['Is Priority'],
          status: match.fields['Match Status'] || 'Active',
          stage: match.fields['Match Stage'] || null,
          ghlRelationId: match.fields['GHL Relation ID'] || null,
          activities: match.fields['Activities'] || '[]',
          notes: match.fields['Notes'] || '[]',
          buyer: buyer ? {
            contactId: buyer.fields['Contact ID'] || '',
            recordId: buyer.id,
            firstName: buyer.fields['First Name'] || '',
            lastName: buyer.fields['Last Name'] || '',
            email: buyer.fields['Email'] || '',
            phone: buyer.fields['Phone'] || buyer.fields['Mobile'] || buyer.fields['Mobile Phone'] || buyer.fields['Phone Number'] || buyer.fields['Cell Phone'] || buyer.fields['Cell'] || buyer.fields['Primary Phone'] || buyer.fields['phone'] || '',
            monthlyIncome: buyer.fields['Monthly Income'],
            monthlyLiabilities: buyer.fields['Monthly Liabilities'],
            downPayment: buyer.fields['Downpayment'],
            desiredBeds: buyer.fields['No. of Bedrooms'],
            desiredBaths: buyer.fields['No. of Bath'],
            city: buyer.fields['City'],
            location: buyer.fields['Location'],
            buyerType: buyer.fields['Buyer Type'],
            qualified: ['Yes', 'yes', 'YES', 'true', true, 1, '1'].includes(buyer.fields['Qualified']),
            language: buyer.fields['Language'] === 'Spanish' ? 'Spanish' : 'English',
          } : null,
        };
      });

    return {
      recordId: property.id,
      propertyCode: property.fields['Property Code'] || '',
      opportunityId: property.fields['Opportunity ID'],
      address: property.fields['Address'] || '',
      city: property.fields['City'] || '',
      state: property.fields['State'],
      zipCode: property.fields['Zip Code'] || property.fields['Zip'] || extractZipFromCity(property.fields['City']),
      price: property.fields['Property Total Price'] || property.fields['Price'],
      beds: property.fields['Beds'] || 0,
      baths: property.fields['Baths'] || 0,
      sqft: property.fields['Sqft'],
      stage: property.fields['Stage'],
      heroImage: property.fields['Hero Image']?.[0]?.url || property.fields['Hero Image'],
      notes: property.fields['Notes'] || property.fields['Description'] || '',
      propertyLat: property.fields['Lat'],
      propertyLng: property.fields['Lng'],
      monthlyPayment: property.fields['Monthly Payment'],
      downPayment: property.fields['Down Payment'],
      images: collectSupportingImages(property.fields),
      propertyType: property.fields['Property Type'],
      condition: property.fields['Property Current Condition'],
      source: property.fields['Source'],
      zillowUrl: property.fields['Zillow URL'] || property.fields['Zillow Link'],
      daysOnMarket: property.fields['Days on Market'],
      createdAt: property.fields['Created At'] || property.createdTime,
      matches: propertyMatches,
      totalMatches: propertyMatches.length,
    };
  });

  const totalTime = Date.now() - startTime;
  console.log(`[Aggregated] Completed properties aggregation in ${totalTime}ms`);

  return res.status(200).json({
    data: propertiesWithMatches,
    nextOffset: propertiesData.offset || null,
    stats: {
      properties: properties.length,
      matches: allMatches.length,
      buyers: Object.keys(buyersMap).length,
      timeMs: totalTime,
    },
  });
}

// ============================================================================
// CLEAR MATCHES ENDPOINT (merged from clear.ts)
// ============================================================================

/**
 * Clear all matches - deletes all records from Property-Buyer Matches table
 */
async function handleClearMatches(
  _req: VercelRequest,
  res: VercelResponse,
  headers: any
) {
  console.log('[Clear Matches] Starting deletion of all matches...');

  try {
    // Step 1: Fetch all match record IDs
    let allRecordIds: string[] = [];
    let offset: string | undefined;

    do {
      const url = new URL(`${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Property-Buyer%20Matches`);
      url.searchParams.set('pageSize', '100');
      url.searchParams.set('fields[]', 'Match Score');
      if (offset) url.searchParams.set('offset', offset);

      const response = await fetch(url.toString(), { headers });
      if (!response.ok) {
        throw new Error(`Failed to fetch matches: ${response.status}`);
      }

      const data = await response.json();
      const recordIds = (data.records || []).map((r: any) => r.id);
      allRecordIds.push(...recordIds);
      offset = data.offset;

      console.log(`[Clear Matches] Fetched ${recordIds.length} records (total: ${allRecordIds.length})`);
    } while (offset);

    if (allRecordIds.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No matches to delete',
        deletedCount: 0,
      });
    }

    console.log(`[Clear Matches] Total records to delete: ${allRecordIds.length}`);

    // Step 2: Delete in batches of 10 (Airtable limit)
    const BATCH_SIZE = 10;
    let deletedCount = 0;

    for (let i = 0; i < allRecordIds.length; i += BATCH_SIZE) {
      const batch = allRecordIds.slice(i, i + BATCH_SIZE);

      const deleteUrl = new URL(`${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Property-Buyer%20Matches`);
      batch.forEach(id => deleteUrl.searchParams.append('records[]', id));

      const deleteRes = await fetch(deleteUrl.toString(), {
        method: 'DELETE',
        headers,
      });

      if (!deleteRes.ok) {
        const errorText = await deleteRes.text();
        console.error(`[Clear Matches] Delete batch failed:`, errorText);
        throw new Error(`Failed to delete batch: ${deleteRes.status}`);
      }

      deletedCount += batch.length;
      console.log(`[Clear Matches] Deleted ${deletedCount}/${allRecordIds.length} records`);
    }

    console.log(`[Clear Matches] Successfully deleted all ${deletedCount} matches`);

    return res.status(200).json({
      success: true,
      message: `Deleted ${deletedCount} matches`,
      deletedCount,
    });

  } catch (error) {
    console.error('[Clear Matches] Error:', error);
    return res.status(500).json({
      error: 'Failed to clear matches',
      details: String(error),
    });
  }
}

// ============================================================================
// BUYER-PROPERTIES ENDPOINT (Zillow-style property browsing for a buyer)
// ============================================================================

/**
 * Fetch all properties scored for a specific buyer
 * Returns properties split into priority (within 50mi/ZIP) and explore (beyond 50mi)
 */
async function handleBuyerProperties(
  req: VercelRequest,
  res: VercelResponse,
  headers: any
) {
  const startTime = Date.now();
  const { buyerId } = req.query;

  if (!buyerId || typeof buyerId !== 'string') {
    return res.status(400).json({ error: 'buyerId is required' });
  }

  console.log('[Buyer Properties] Fetching all properties for buyer:', buyerId);

  try {
    // Step 1: Fetch buyer from cache or Airtable
    let buyersData = await fetchCachedData('buyers', headers);
    let allBuyers = buyersData?.records || [];

    if (!buyersData || allBuyers.length === 0) {
      console.log('[Buyer Properties] Cache miss - fetching buyers from Airtable...');
      const buyersRes = await fetch(`${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Buyers`, { headers });
      if (!buyersRes.ok) throw new Error('Failed to fetch buyers');
      const directBuyersData = await buyersRes.json();
      allBuyers = directBuyersData.records || [];
    }

    // Find the buyer by record ID
    let buyer = allBuyers.find((b: any) => b.id === buyerId);

    // If buyer not found in cache, auto-sync the buyers cache and try again
    if (!buyer) {
      console.log('[Buyer Properties] Buyer not found in cache - syncing buyers cache...');
      allBuyers = await syncBuyersCache(headers);
      buyer = allBuyers.find((b: any) => b.id === buyerId);

      if (!buyer) {
        return res.status(404).json({
          error: 'Buyer not found',
          message: 'This buyer was not found even after refreshing the cache. Please ensure the buyer exists in Airtable and try running matching.',
          synced: true,
        });
      }
      console.log('[Buyer Properties] Found buyer after cache sync');
    }

    console.log(`[Buyer Properties] Found buyer: ${buyer.fields['First Name']} ${buyer.fields['Last Name']}`);

    // Step 2: Fetch all properties from cache or Airtable
    let propertiesData = await fetchCachedData('properties', headers);
    let properties = propertiesData?.records || [];

    if (!propertiesData || properties.length === 0) {
      console.log('[Buyer Properties] Cache miss - fetching properties from Airtable...');
      const propertiesRes = await fetch(`${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Properties`, { headers });
      if (!propertiesRes.ok) throw new Error('Failed to fetch properties');
      const directPropertiesData = await propertiesRes.json();
      properties = directPropertiesData.records || [];
    }

    // Step 2.5: Fetch existing matches for this buyer to get matchId and currentStage
    let matchesData = await fetchCachedData('matches', headers);
    let allMatches = matchesData?.records || [];

    if (!matchesData || allMatches.length === 0) {
      console.log('[Buyer Properties] Cache miss - fetching matches from Airtable...');
      const matchesRes = await fetch(`${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Property-Buyer%20Matches`, { headers });
      if (matchesRes.ok) {
        const directMatchesData = await matchesRes.json();
        allMatches = directMatchesData.records || [];
      }
    }

    // Create a map of property record ID to match record for this buyer
    const matchesByPropertyId = new Map<string, any>();
    const buyerRecordId = buyer.id;

    for (const match of allMatches) {
      // Contact ID is a linked record array - extract the first element
      const matchBuyerRecordId = match.fields['Contact ID']?.[0];
      if (matchBuyerRecordId === buyerRecordId) {
        // Property Code is a linked record array
        const propertyRecordId = match.fields['Property Code']?.[0];
        if (propertyRecordId) {
          matchesByPropertyId.set(propertyRecordId, match);
        }
      }
    }

    console.log(`[Buyer Properties] Found ${matchesByPropertyId.size} existing matches for buyer`);
    console.log(`[Buyer Properties] Scoring ${properties.length} properties for buyer`);

    // Step 3: Score all properties for this buyer
    const scoredProperties = properties.map((property: any) => {
      const score = generateMatchScore(buyer, property);

      // Look up existing match record for this property
      const existingMatch = matchesByPropertyId.get(property.id);

      return {
        property: {
          recordId: property.id,
          propertyCode: property.fields['Property Code'] || '',
          opportunityId: property.fields['Opportunity ID'],
          address: property.fields['Address'] || '',
          city: property.fields['City'] || '',
          state: property.fields['State'],
          zipCode: property.fields['Zip Code'] || property.fields['ZIP Code'] || extractZipFromCity(property.fields['City']),
          price: property.fields['Property Total Price'] || property.fields['Price'],
          beds: property.fields['Beds'] || 0,
          baths: property.fields['Baths'] || 0,
          sqft: property.fields['Sqft'],
          stage: property.fields['Stage'],
          heroImage: property.fields['Hero Image']?.[0]?.url || property.fields['Hero Image'],
          notes: property.fields['Notes'] || property.fields['Description'] || '',
          propertyLat: property.fields['Lat'],
          propertyLng: property.fields['Lng'],
          monthlyPayment: property.fields['Monthly Payment'],
          downPayment: property.fields['Down Payment'],
          images: collectSupportingImages(property.fields),
          propertyType: property.fields['Property Type'],
          condition: property.fields['Property Current Condition'],
          source: property.fields['Source'],
          zillowUrl: property.fields['Zillow URL'] || property.fields['Zillow Link'],
          daysOnMarket: property.fields['Days on Market'],
          createdAt: property.fields['Created At'] || property.createdTime,
        },
        score: {
          score: score.score,
          locationScore: score.locationScore,
          bedsScore: score.bedsScore,
          bathsScore: score.bathsScore,
          budgetScore: score.budgetScore,
          reasoning: score.reasoning,
          locationReason: score.locationReason,
          highlights: score.highlights,
          concerns: score.concerns || [],
          isPriority: score.isPriority,
          distanceMiles: score.distanceMiles,
        },
        // Include match record info if it exists
        matchId: existingMatch?.id || undefined,
        currentStage: existingMatch?.fields['Match Stage'] || undefined,
        dateSent: existingMatch?.fields['Date Sent'] || undefined,
      };
    });

    // Step 3.5: Filter to only include properties that have match records
    // This ensures that if matches are cleared, no properties are shown
    const matchedPropertiesOnly = scoredProperties.filter((sp: any) => sp.matchId);

    console.log(`[Buyer Properties] Filtered to ${matchedPropertiesOnly.length} properties with match records (out of ${scoredProperties.length} total)`);

    // Step 4: Split into priority and explore, sort by score
    const priorityMatches = matchedPropertiesOnly
      .filter((sp: any) => sp.score.isPriority)
      .sort((a: any, b: any) => b.score.score - a.score.score);

    const exploreMatches = matchedPropertiesOnly
      .filter((sp: any) => !sp.score.isPriority)
      .sort((a: any, b: any) => b.score.score - a.score.score);

    // Step 5: Prepare buyer info for response
    const zipCodesRaw = buyer.fields['Preferred Zip Codes'] || buyer.fields['Zip Codes'] || '';
    const preferredZipCodes = typeof zipCodesRaw === 'string'
      ? zipCodesRaw.split(',').map((z: string) => z.trim()).filter(Boolean)
      : Array.isArray(zipCodesRaw) ? zipCodesRaw : [];

    const buyerInfo = {
      contactId: buyer.fields['Contact ID'] || '',
      recordId: buyer.id,
      firstName: buyer.fields['First Name'] || '',
      lastName: buyer.fields['Last Name'] || '',
      email: buyer.fields['Email'] || '',
      phone: buyer.fields['Phone'] || buyer.fields['Mobile'] || buyer.fields['Mobile Phone'] || buyer.fields['Phone Number'] || buyer.fields['Cell Phone'] || buyer.fields['Cell'] || buyer.fields['Primary Phone'] || buyer.fields['phone'] || '',
      monthlyIncome: buyer.fields['Monthly Income'],
      monthlyLiabilities: buyer.fields['Monthly Liabilities'],
      downPayment: buyer.fields['Downpayment'],
      desiredBeds: buyer.fields['No. of Bedrooms'],
      desiredBaths: buyer.fields['No. of Bath'],
      city: buyer.fields['City'],
      state: buyer.fields['State'],
      location: buyer.fields['Location'],
      preferredLocation: buyer.fields['Preferred Location'] || buyer.fields['Location'],
      preferredZipCodes,
      buyerType: buyer.fields['Buyer Type'],
      qualified: ['Yes', 'yes', 'YES', 'true', true, 1, '1'].includes(buyer.fields['Qualified']),
      language: buyer.fields['Language'] === 'Spanish' ? 'Spanish' as const : 'English' as const,
      lat: buyer.fields['Lat'],
      lng: buyer.fields['Lng'],
      locationLat: buyer.fields['Lat'],
      locationLng: buyer.fields['Lng'],
      locationSource: buyer.fields['Lat'] && buyer.fields['Lng'] ? 'city' as const : undefined,
    };

    const totalTime = Date.now() - startTime;

    console.log(`[Buyer Properties] Completed in ${totalTime}ms - ${priorityMatches.length} priority, ${exploreMatches.length} explore`);

    return res.status(200).json({
      buyer: buyerInfo,
      priorityMatches,
      exploreMatches,
      totalCount: matchedPropertiesOnly.length,
      stats: {
        priorityCount: priorityMatches.length,
        exploreCount: exploreMatches.length,
        timeMs: totalTime,
      },
    });

  } catch (error) {
    console.error('[Buyer Properties] Error:', error);
    throw error;
  }
}

// ============================================================================
// PROPERTY-BUYERS ENDPOINT (All buyers for a property)
// ============================================================================

/**
 * Fetch all buyers scored for a specific property
 * Returns buyers sorted by match score
 */
async function handlePropertyBuyers(
  req: VercelRequest,
  res: VercelResponse,
  headers: any
) {
  const startTime = Date.now();
  const { propertyCode } = req.query;

  if (!propertyCode || typeof propertyCode !== 'string') {
    return res.status(400).json({ error: 'propertyCode is required' });
  }

  console.log('[Property Buyers] Fetching all buyers for property:', propertyCode);

  try {
    // Step 1: Fetch property from cache or Airtable
    let propertiesData = await fetchCachedData('properties', headers);
    let allProperties = propertiesData?.records || [];

    if (!propertiesData || allProperties.length === 0) {
      console.log('[Property Buyers] Cache miss - fetching properties from Airtable...');
      const propertiesRes = await fetch(`${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Properties`, { headers });
      if (!propertiesRes.ok) throw new Error('Failed to fetch properties');
      const directPropertiesData = await propertiesRes.json();
      allProperties = directPropertiesData.records || [];
    }

    // Find the property by record ID or property code
    let property = allProperties.find(
      (p: any) => p.id === propertyCode || p.fields['Property Code'] === propertyCode
    );

    // If property not found in cache, auto-sync the properties cache and try again
    if (!property) {
      console.log('[Property Buyers] Property not found in cache - syncing properties cache...');
      allProperties = await syncPropertiesCache(headers);
      property = allProperties.find(
        (p: any) => p.id === propertyCode || p.fields['Property Code'] === propertyCode
      );

      if (!property) {
        return res.status(404).json({
          error: 'Property not found',
          message: 'This property was not found even after refreshing the cache. Please ensure the property exists in Airtable and try running matching.',
          synced: true,
        });
      }
      console.log('[Property Buyers] Found property after cache sync');
    }

    console.log(`[Property Buyers] Found property: ${property.fields['Address']}`);

    // Step 2: Fetch all buyers from cache or Airtable
    let buyersData = await fetchCachedData('buyers', headers);
    let buyers = buyersData?.records || [];

    if (!buyersData || buyers.length === 0) {
      console.log('[Property Buyers] Cache miss - fetching buyers from Airtable...');
      const buyersRes = await fetch(`${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Buyers`, { headers });
      if (!buyersRes.ok) throw new Error('Failed to fetch buyers');
      const directBuyersData = await buyersRes.json();
      buyers = directBuyersData.records || [];
    }

    // Step 2.5: Fetch existing matches for this property to get matchId
    let matchesData = await fetchCachedData('matches', headers);
    let allMatches = matchesData?.records || [];

    if (!matchesData || allMatches.length === 0) {
      console.log('[Property Buyers] Cache miss - fetching matches from Airtable...');
      const matchesRes = await fetch(`${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Property-Buyer%20Matches`, { headers });
      if (matchesRes.ok) {
        const directMatchesData = await matchesRes.json();
        allMatches = directMatchesData.records || [];
      }
    }

    // Create a map of buyer record ID to match record for this property
    const matchesByBuyerId = new Map<string, any>();
    const propertyRecordId = property.id;

    for (const match of allMatches) {
      // Property Code is a linked record array
      const matchPropertyId = match.fields['Property Code']?.[0];
      if (matchPropertyId === propertyRecordId) {
        // Contact ID is a linked record array
        const buyerRecordId = match.fields['Contact ID']?.[0];
        if (buyerRecordId) {
          matchesByBuyerId.set(buyerRecordId, match);
        }
      }
    }

    console.log(`[Property Buyers] Found ${matchesByBuyerId.size} existing matches for property`);
    console.log(`[Property Buyers] Scoring ${buyers.length} buyers for property`);

    // Step 3: Score all buyers for this property
    const scoredBuyers = buyers.map((buyer: any) => {
      const score = generateMatchScore(buyer, property);

      const zipCodesRaw = buyer.fields['Preferred Zip Codes'] || buyer.fields['Zip Codes'] || '';
      const preferredZipCodes = typeof zipCodesRaw === 'string'
        ? zipCodesRaw.split(',').map((z: string) => z.trim()).filter(Boolean)
        : Array.isArray(zipCodesRaw) ? zipCodesRaw : [];

      // Look up existing match record for this buyer
      const existingMatch = matchesByBuyerId.get(buyer.id);

      return {
        buyer: {
          contactId: buyer.fields['Contact ID'] || '',
          recordId: buyer.id,
          firstName: buyer.fields['First Name'] || '',
          lastName: buyer.fields['Last Name'] || '',
          email: buyer.fields['Email'] || '',
          phone: buyer.fields['Phone'] || buyer.fields['Mobile'] || buyer.fields['Mobile Phone'] || buyer.fields['Phone Number'] || buyer.fields['Cell Phone'] || buyer.fields['Cell'] || buyer.fields['Primary Phone'] || buyer.fields['phone'] || '',
          monthlyIncome: buyer.fields['Monthly Income'],
          monthlyLiabilities: buyer.fields['Monthly Liabilities'],
          downPayment: buyer.fields['Downpayment'],
          desiredBeds: buyer.fields['No. of Bedrooms'],
          desiredBaths: buyer.fields['No. of Bath'],
          city: buyer.fields['City'],
          state: buyer.fields['State'],
          location: buyer.fields['Location'],
          preferredLocation: buyer.fields['Preferred Location'] || buyer.fields['Location'],
          preferredZipCodes,
          buyerType: buyer.fields['Buyer Type'],
          qualified: ['Yes', 'yes', 'YES', 'true', true, 1, '1'].includes(buyer.fields['Qualified']),
          language: buyer.fields['Language'] === 'Spanish' ? 'Spanish' as const : 'English' as const,
          lat: buyer.fields['Lat'],
          lng: buyer.fields['Lng'],
        },
        score: {
          score: score.score,
          locationScore: score.locationScore,
          bedsScore: score.bedsScore,
          bathsScore: score.bathsScore,
          budgetScore: score.budgetScore,
          reasoning: score.reasoning,
          locationReason: score.locationReason,
          highlights: score.highlights,
          concerns: score.concerns || [],
          isPriority: score.isPriority,
          distanceMiles: score.distanceMiles,
        },
        // Include match record info if it exists
        matchId: existingMatch?.id || undefined,
        currentStage: existingMatch?.fields['Match Stage'] || undefined,
        dateSent: existingMatch?.fields['Date Sent'] || undefined,
      };
    });

    // Step 3.5: Filter to only include buyers that have match records
    // This ensures that if matches are cleared, no buyers are shown
    const matchedBuyersOnly = scoredBuyers.filter((sb: any) => sb.matchId);

    console.log(`[Property Buyers] Filtered to ${matchedBuyersOnly.length} buyers with match records (out of ${scoredBuyers.length} total)`);

    // Step 4: Filter by minimum score (e.g., 30) and sort by score descending
    const qualifiedBuyers = matchedBuyersOnly
      .filter((sb: any) => sb.score.score >= 30)
      .sort((a: any, b: any) => b.score.score - a.score.score);

    // Step 5: Prepare property info for response
    const propertyInfo = {
      recordId: property.id,
      propertyCode: property.fields['Property Code'] || '',
      opportunityId: property.fields['Opportunity ID'],
      address: property.fields['Address'] || '',
      city: property.fields['City'] || '',
      state: property.fields['State'],
      zipCode: property.fields['Zip Code'] || property.fields['ZIP Code'] || extractZipFromCity(property.fields['City']),
      price: property.fields['Property Total Price'] || property.fields['Price'],
      beds: property.fields['Beds'] || 0,
      baths: property.fields['Baths'] || 0,
      sqft: property.fields['Sqft'],
      stage: property.fields['Stage'],
      heroImage: property.fields['Hero Image']?.[0]?.url || property.fields['Hero Image'],
      notes: property.fields['Notes'] || property.fields['Description'] || '',
      propertyLat: property.fields['Lat'],
      propertyLng: property.fields['Lng'],
      monthlyPayment: property.fields['Monthly Payment'],
      downPayment: property.fields['Down Payment'],
      images: collectSupportingImages(property.fields),
      propertyType: property.fields['Property Type'],
      condition: property.fields['Property Current Condition'],
      source: property.fields['Source'],
      zillowUrl: property.fields['Zillow URL'] || property.fields['Zillow Link'],
      daysOnMarket: property.fields['Days on Market'],
      createdAt: property.fields['Created At'] || property.createdTime,
    };

    const totalTime = Date.now() - startTime;

    console.log(`[Property Buyers] Completed in ${totalTime}ms - ${qualifiedBuyers.length} qualified buyers`);

    return res.status(200).json({
      property: propertyInfo,
      buyers: qualifiedBuyers,
      totalCount: qualifiedBuyers.length,
      stats: {
        timeMs: totalTime,
      },
    });

  } catch (error) {
    console.error('[Property Buyers] Error:', error);
    throw error;
  }
}

/**
 * Get match statistics for dashboard summary
 * Calculates:
 * - Ready to Send: matches without a stage (not yet sent)
 * - Sent Today: matches sent today (based on Date Sent field)
 * - In Pipeline: matches with any stage set
 */
async function handleMatchStats(
  _req: VercelRequest,
  res: VercelResponse,
  headers: any
): Promise<VercelResponse> {
  try {
    console.log('[Match Stats] Fetching all matches from Airtable...');

    // Fetch all matches from Airtable
    const allMatches: any[] = [];
    let offset: string | undefined;

    do {
      const url = new URL(`${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Property-Buyer%20Matches`);
      url.searchParams.set('pageSize', '100');
      if (offset) url.searchParams.set('offset', offset);

      const response = await fetch(url.toString(), { headers });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Airtable error: ${error.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      allMatches.push(...data.records);
      offset = data.offset;
    } while (offset);

    console.log(`[Match Stats] Fetched ${allMatches.length} total matches`);

    // Calculate stats
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    let readyToSend = 0;
    let sentToday = 0;
    let inPipeline = 0;

    for (const match of allMatches) {
      const stage = match.fields['Match Stage'];
      const dateSent = match.fields['Date Sent'];

      if (!stage) {
        // No stage = ready to send
        readyToSend++;
      } else {
        // Has stage = in pipeline
        inPipeline++;

        // Check if sent today
        if (dateSent) {
          const sentDate = new Date(dateSent);
          if (sentDate >= todayStart && sentDate < todayEnd) {
            sentToday++;
          }
        }
      }
    }

    console.log(`[Match Stats] Ready to Send: ${readyToSend}, Sent Today: ${sentToday}, In Pipeline: ${inPipeline}`);

    return res.status(200).json({
      readyToSend,
      sentToday,
      inPipeline,
      totalMatches: allMatches.length,
    });

  } catch (error) {
    console.error('[Match Stats] Error:', error);
    throw error;
  }
}

// ============ MATCHING PREFERENCES ============

const PREFERENCES_TABLE = 'Matching Preferences';

// Default affordability settings
const DEFAULT_AFFORDABILITY = {
  fixedOtherCosts: 8310,
  fixedLoanFees: 1990,
  downPaymentPercent: 20,
  closingCostPercent: 1,
  pointsPercent: 2,
  pointsFinancedPercent: 80,
  priceBuffer: 0,
  minDownPayment: 10300,
};

// Default match flexibility settings
const DEFAULT_MATCH_FLEXIBILITY = {
  bedroomFlex: 'minus1' as const,
  bathroomFlex: 'minus1' as const,
  budgetFlexPercent: 10 as const,
};

const DEFAULT_PREFERENCES = {
  budgetMultiplier: 20,
  zillowMaxPrice: 275000,
  zillowMinDays: 90,
  zillowKeywords: 'seller finance OR owner finance OR bond for deed',
  affordability: DEFAULT_AFFORDABILITY,
  matchFlexibility: DEFAULT_MATCH_FLEXIBILITY,
};

/**
 * Get matching preferences
 */
async function handleGetPreferences(
  _req: VercelRequest,
  res: VercelResponse,
  headers: any
): Promise<VercelResponse> {
  try {
    console.log('[Matching Preferences] Fetching preferences...');

    const url = `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${encodeURIComponent(PREFERENCES_TABLE)}?maxRecords=1`;

    const response = await fetch(url, { headers });

    if (!response.ok) {
      console.log('[Matching Preferences] Table not found or error, returning defaults');
      return res.status(200).json({ preferences: DEFAULT_PREFERENCES });
    }

    const data = await response.json();

    if (!data.records || data.records.length === 0) {
      console.log('[Matching Preferences] No record found, returning defaults');
      return res.status(200).json({ preferences: DEFAULT_PREFERENCES });
    }

    const record = data.records[0];
    const f = record.fields;

    const preferences = {
      budgetMultiplier: f['Budget Multiplier'] ?? DEFAULT_PREFERENCES.budgetMultiplier,
      zillowMaxPrice: f['Zillow Max Price'] ?? DEFAULT_PREFERENCES.zillowMaxPrice,
      zillowMinDays: f['Zillow Min Days'] ?? DEFAULT_PREFERENCES.zillowMinDays,
      zillowKeywords: f['Zillow Keywords'] ?? DEFAULT_PREFERENCES.zillowKeywords,
      affordability: {
        fixedOtherCosts: f['Fixed Other Costs'] ?? DEFAULT_AFFORDABILITY.fixedOtherCosts,
        fixedLoanFees: f['Fixed Loan Fees'] ?? DEFAULT_AFFORDABILITY.fixedLoanFees,
        downPaymentPercent: f['Down Payment Percent'] ?? DEFAULT_AFFORDABILITY.downPaymentPercent,
        closingCostPercent: f['Closing Cost Percent'] ?? DEFAULT_AFFORDABILITY.closingCostPercent,
        pointsPercent: f['Points Percent'] ?? DEFAULT_AFFORDABILITY.pointsPercent,
        pointsFinancedPercent: f['Points Financed Percent'] ?? DEFAULT_AFFORDABILITY.pointsFinancedPercent,
        priceBuffer: f['Price Buffer'] ?? DEFAULT_AFFORDABILITY.priceBuffer,
        minDownPayment: f['Min Down Payment'] ?? DEFAULT_AFFORDABILITY.minDownPayment,
      },
      matchFlexibility: {
        bedroomFlex: f['Bedroom Flex'] ?? DEFAULT_MATCH_FLEXIBILITY.bedroomFlex,
        bathroomFlex: f['Bathroom Flex'] ?? DEFAULT_MATCH_FLEXIBILITY.bathroomFlex,
        budgetFlexPercent: f['Budget Flex Percent'] ?? DEFAULT_MATCH_FLEXIBILITY.budgetFlexPercent,
      },
    };

    console.log('[Matching Preferences] Returning preferences:', preferences);
    return res.status(200).json({
      preferences,
      recordId: record.id,
    });
  } catch (error) {
    console.error('[Matching Preferences] Get preferences error:', error);
    return res.status(200).json({ preferences: DEFAULT_PREFERENCES });
  }
}

/**
 * Update matching preferences
 */
async function handleUpdatePreferences(
  req: VercelRequest,
  res: VercelResponse,
  headers: any
): Promise<VercelResponse> {
  try {
    const { budgetMultiplier, zillowMaxPrice, zillowMinDays, zillowKeywords, affordability, matchFlexibility } = req.body;

    console.log('[Matching Preferences] Updating preferences:', {
      budgetMultiplier,
      zillowMaxPrice,
      zillowMinDays,
      zillowKeywords,
      affordability,
      matchFlexibility
    });

    // First, check if record exists
    const listUrl = `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${encodeURIComponent(PREFERENCES_TABLE)}?maxRecords=1`;
    const listResponse = await fetch(listUrl, { headers });
    const listData = await listResponse.json();

    // Build fields object, only including provided values
    const fields: Record<string, any> = {};

    // Only include fields that were provided in the request
    if (budgetMultiplier !== undefined) fields['Budget Multiplier'] = budgetMultiplier;
    if (zillowMaxPrice !== undefined) fields['Zillow Max Price'] = zillowMaxPrice;
    if (zillowMinDays !== undefined) fields['Zillow Min Days'] = zillowMinDays;
    if (zillowKeywords !== undefined) fields['Zillow Keywords'] = zillowKeywords;

    // Handle nested affordability settings
    if (affordability !== undefined) {
      if (affordability.fixedOtherCosts !== undefined) fields['Fixed Other Costs'] = affordability.fixedOtherCosts;
      if (affordability.fixedLoanFees !== undefined) fields['Fixed Loan Fees'] = affordability.fixedLoanFees;
      if (affordability.downPaymentPercent !== undefined) fields['Down Payment Percent'] = affordability.downPaymentPercent;
      if (affordability.closingCostPercent !== undefined) fields['Closing Cost Percent'] = affordability.closingCostPercent;
      if (affordability.pointsPercent !== undefined) fields['Points Percent'] = affordability.pointsPercent;
      if (affordability.pointsFinancedPercent !== undefined) fields['Points Financed Percent'] = affordability.pointsFinancedPercent;
      if (affordability.priceBuffer !== undefined) fields['Price Buffer'] = affordability.priceBuffer;
      if (affordability.minDownPayment !== undefined) fields['Min Down Payment'] = affordability.minDownPayment;
    }

    // Handle nested match flexibility settings
    if (matchFlexibility !== undefined) {
      if (matchFlexibility.bedroomFlex !== undefined) fields['Bedroom Flex'] = matchFlexibility.bedroomFlex;
      if (matchFlexibility.bathroomFlex !== undefined) fields['Bathroom Flex'] = matchFlexibility.bathroomFlex;
      if (matchFlexibility.budgetFlexPercent !== undefined) fields['Budget Flex Percent'] = matchFlexibility.budgetFlexPercent;
    }

    let url: string;
    let method: string;
    let body: string;

    if (listData.records && listData.records.length > 0) {
      // Update existing record
      const recordId = listData.records[0].id;
      url = `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${encodeURIComponent(PREFERENCES_TABLE)}/${recordId}`;
      method = 'PATCH';
      body = JSON.stringify({ fields });
      console.log('[Matching Preferences] Updating existing record:', recordId);
    } else {
      // Create new record
      url = `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${encodeURIComponent(PREFERENCES_TABLE)}`;
      method = 'POST';
      body = JSON.stringify({ records: [{ fields }] });
      console.log('[Matching Preferences] Creating new record');
    }

    const response = await fetch(url, {
      method,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body,
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[Matching Preferences] Update error:', error);
      return res.status(response.status).json({
        error: 'Failed to save preferences',
        details: error,
      });
    }

    console.log('[Matching Preferences] Preferences saved successfully');
    return res.status(200).json({
      success: true,
      preferences: { budgetMultiplier, zillowMaxPrice, zillowMinDays, zillowKeywords, affordability, matchFlexibility },
    });
  } catch (error) {
    console.error('[Matching Preferences] Update error:', error);
    throw error;
  }
}

