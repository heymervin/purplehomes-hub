/**
 * Airtable Cache Service for Zillow Searches
 * Uses existing "System Cache" table for 24-hour caching
 */

import type { ZillowListing, ZillowSearchType } from '../types/zillow';

const AIRTABLE_API_URL = 'https://api.airtable.com/v0';
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const CACHE_TABLE = 'System Cache';
const CACHE_TTL_HOURS = 24;

const headers = {
  Authorization: `Bearer ${AIRTABLE_API_KEY}`,
  'Content-Type': 'application/json',
};

/**
 * Generate cache key for Zillow search
 * Format: zillow-{buyerId}-{searchType}
 */
function generateCacheKey(
  buyerRecordId: string,
  searchType: ZillowSearchType
): string {
  const sanitizedType = searchType.toLowerCase().replace(/[^a-z0-9]/g, '-');
  return `zillow-${buyerRecordId}-${sanitizedType}`;
}

/**
 * Check if cached search is still fresh (< 24 hours old)
 */
function isCacheFresh(lastSynced: string): boolean {
  const syncTime = new Date(lastSynced).getTime();
  const now = Date.now();
  const hoursSince = (now - syncTime) / (1000 * 60 * 60);
  return hoursSince < CACHE_TTL_HOURS;
}

/**
 * Get hours since search was performed
 */
export function getSearchAge(lastSynced: string): number {
  const syncTime = new Date(lastSynced).getTime();
  const now = Date.now();
  return Math.floor((now - syncTime) / (1000 * 60 * 60));
}

/**
 * Find cached search in System Cache table
 *
 * @returns Cached search results if found and fresh (< 24 hours), null otherwise
 */
export async function findCachedSearch(
  buyerRecordId: string,
  searchType: ZillowSearchType,
  location: string,
  beds: number | null,
  maxPrice: number | null
): Promise<{ results: ZillowListing[], lastSynced: string, apifyRunId?: string } | null> {
  const cacheKey = generateCacheKey(buyerRecordId, searchType);

  try {
    // Query System Cache for this search
    const formula = encodeURIComponent(`{cache_key} = "${cacheKey}"`);
    const url = `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${encodeURIComponent(CACHE_TABLE)}?filterByFormula=${formula}`;

    const response = await fetch(url, { headers });

    if (!response.ok) {
      console.error('[Cache] Failed to query cache:', response.statusText);
      return null;
    }

    const data = await response.json();

    if (!data.records || data.records.length === 0) {
      console.log('[Cache] No cached search found for:', cacheKey);
      return null;
    }

    const record = data.records[0];
    const lastSynced = record.fields.last_synced;
    const isValid = record.fields.is_valid;

    // Check if cache is valid and fresh
    if (!isValid || !lastSynced || !isCacheFresh(lastSynced)) {
      console.log('[Cache] Found cached search but it is stale:', getSearchAge(lastSynced || ''), 'hours old');
      return null;
    }

    // Parse the cached data
    const cachedData = JSON.parse(record.fields.data || '{}');
    const results = cachedData.results || [];
    const apifyRunId = cachedData.apifyRunId;

    console.log('[Cache] Found fresh cached search:', cacheKey, '(', getSearchAge(lastSynced), 'hours old)');

    return {
      results,
      lastSynced,
      apifyRunId,
    };
  } catch (error) {
    console.error('[Cache] Error querying cache:', error);
    return null;
  }
}

/**
 * Save search results to System Cache table
 * Creates new cache entry or updates existing one
 */
export async function saveCachedSearch(
  buyerRecordId: string,
  searchType: ZillowSearchType,
  location: string,
  beds: number | null,
  maxPrice: number | null,
  results: ZillowListing[],
  apifyRunId?: string
): Promise<void> {
  const cacheKey = generateCacheKey(buyerRecordId, searchType);

  try {
    // Check if record already exists
    const formula = encodeURIComponent(`{cache_key} = "${cacheKey}"`);
    const findUrl = `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${encodeURIComponent(CACHE_TABLE)}?filterByFormula=${formula}&fields[]=cache_key`;

    const findRes = await fetch(findUrl, { headers });
    const findData = await findRes.json();
    const existingRecordId = findData.records?.[0]?.id;

    // Prepare cache data
    const cacheData = {
      results,
      apifyRunId,
      searchType,
      location,
      beds,
      maxPrice,
    };

    const fields = {
      cache_key: cacheKey,
      data: JSON.stringify(cacheData),
      record_count: results.length,
      source_count: results.length,
      last_synced: new Date().toISOString(),
      is_valid: true,
      version: 1,
    };

    const url = existingRecordId
      ? `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${encodeURIComponent(CACHE_TABLE)}/${existingRecordId}`
      : `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${encodeURIComponent(CACHE_TABLE)}`;

    const method = existingRecordId ? 'PATCH' : 'POST';

    const response = await fetch(url, {
      method,
      headers,
      body: JSON.stringify(existingRecordId ? { fields } : { records: [{ fields }] }),
    });

    if (!response.ok) {
      console.error('[Cache] Failed to save cache:', response.statusText);
      return;
    }

    console.log(`[Cache] ${existingRecordId ? 'Updated' : 'Created'} cache entry:`, cacheKey);
  } catch (error) {
    console.error('[Cache] Error saving cache:', error);
  }
}

/**
 * Parse cached results from data field
 * Handles malformed JSON gracefully
 */
export function parseCachedResults(dataString: string): ZillowListing[] {
  try {
    const data = JSON.parse(dataString);
    return data.results || [];
  } catch {
    console.error('[Cache] Failed to parse results');
    return [];
  }
}
