/**
 * Cache API
 * Consolidated endpoint for cache operations
 *
 * Actions:
 * - action=status (GET) - Get cache status for all caches
 * - action=get (GET) - Get cached data by cacheKey
 * - action=sync (POST) - Sync cache by cacheKey (properties, buyers, matches, or all)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { gzipSync, gunzipSync } from 'zlib';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_API_URL = 'https://api.airtable.com/v0';

// Table names
const CACHE_TABLE = 'System Cache';
const PROPERTIES_TABLE = 'Properties';
const BUYERS_TABLE = 'Buyers';
const MATCHES_TABLE = 'Property-Buyer Matches';

const headers = {
  Authorization: `Bearer ${AIRTABLE_API_KEY}`,
  'Content-Type': 'application/json',
};

export async function cacheHandler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    return res.status(500).json({ error: 'Airtable credentials not configured' });
  }

  const { action, cacheKey } = req.query;

  try {
    // GET CACHE STATUS - Quick check of all caches + source counts
    if (action === 'status' && req.method === 'GET') {
      // Fetch cache metadata (without full data)
      const cacheRes = await fetch(
        `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${encodeURIComponent(CACHE_TABLE)}?fields[]=cache_key&fields[]=record_count&fields[]=source_count&fields[]=last_synced&fields[]=version&fields[]=is_valid`,
        { headers }
      );
      const cacheData = await cacheRes.json();

      // Get current counts from source tables (just counts, not full data)
      const [propertiesCount, buyersCount, matchesCount] = await Promise.all([
        getTableCount(PROPERTIES_TABLE),
        getTableCount(BUYERS_TABLE),
        getTableCount(MATCHES_TABLE),
      ]);

      // Build status response
      const cacheRecords = cacheData.records || [];
      const propertiesMeta = extractCacheMetadata(cacheRecords, 'properties', propertiesCount);
      const buyersMeta = extractCacheMetadata(cacheRecords, 'buyers', buyersCount);
      const matchesMeta = extractCacheMetadata(cacheRecords, 'matches', matchesCount);

      const newPropertiesAvailable = Math.max(0, propertiesCount - propertiesMeta.recordCount);
      const newBuyersAvailable = Math.max(0, buyersCount - buyersMeta.recordCount);
      const isStale = !propertiesMeta.isValid || !buyersMeta.isValid ||
                      newPropertiesAvailable > 0 || newBuyersAvailable > 0;

      const status = {
        properties: propertiesMeta,
        buyers: buyersMeta,
        matches: matchesMeta,
        lastChecked: new Date().toISOString(),
        newPropertiesAvailable,
        newBuyersAvailable,
        isStale,
      };

      return res.status(200).json(status);
    }

    // GET CACHED DATA - Returns full cached dataset
    if (action === 'get' && req.method === 'GET' && cacheKey) {
      const formula = `{cache_key}="${cacheKey}"`;
      const cacheRes = await fetch(
        `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${encodeURIComponent(CACHE_TABLE)}?filterByFormula=${encodeURIComponent(formula)}`,
        { headers }
      );
      const cacheData = await cacheRes.json();
      const record = cacheData.records?.[0];

      if (!record) {
        return res.status(404).json({ error: `Cache not found: ${cacheKey}` });
      }

      // Parse the JSON data field - handle both compressed and uncompressed data
      let parsedData = { records: [] };
      try {
        const isCompressed = record.fields.compressed === true;
        const version = record.fields.version || 1;

        if (isCompressed && version >= 2) {
          // Decompress gzipped base64 data
          const compressedBuffer = Buffer.from(record.fields.data, 'base64');
          const decompressed = gunzipSync(compressedBuffer);
          parsedData = JSON.parse(decompressed.toString());
        } else {
          // Legacy uncompressed data
          parsedData = JSON.parse(record.fields.data || '{"records":[]}');
        }
      } catch (e) {
        console.error('Failed to parse/decompress cache data:', e);
      }

      return res.status(200).json({
        cacheKey: record.fields.cache_key,
        data: parsedData,
        recordCount: record.fields.record_count || 0,
        sourceCount: record.fields.source_count || 0,
        lastSynced: record.fields.last_synced || null,
        version: record.fields.version || 1,
        isValid: record.fields.is_valid || false,
        compressed: record.fields.compressed || false,
        airtableRecordId: record.id,
      });
    }

    // SYNC CACHE - Refresh cache from source tables (merged from sync.ts)
    if (action === 'sync' && req.method === 'POST') {
      const validKeys = ['properties', 'buyers', 'matches', 'all'];

      if (!cacheKey || !validKeys.includes(cacheKey as string)) {
        return res.status(400).json({ error: 'Invalid cacheKey. Use: properties, buyers, matches, or all' });
      }

      const results: Record<string, any> = {};

      if (cacheKey === 'properties' || cacheKey === 'all') {
        results.properties = await syncProperties();
      }

      if (cacheKey === 'buyers' || cacheKey === 'all') {
        results.buyers = await syncBuyers();
      }

      if (cacheKey === 'matches' || cacheKey === 'all') {
        results.matches = await syncMatches();
      }

      return res.status(200).json({
        success: true,
        syncedAt: new Date().toISOString(),
        results,
      });
    }

    return res.status(400).json({ error: 'Invalid action or method' });

  } catch (error) {
    console.error('Cache API error:', error);
    return res.status(500).json({ error: 'Cache operation failed', details: String(error) });
  }
}

async function getTableCount(tableName: string): Promise<number> {
  // Airtable doesn't have a direct count endpoint, so we fetch with minimal fields
  // and use pagination to count. For better performance, consider storing counts separately.
  let count = 0;
  let offset: string | undefined;

  do {
    const url = new URL(`${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}`);
    url.searchParams.set('pageSize', '100');
    url.searchParams.set('fields[]', 'Created'); // Minimal field
    if (offset) url.searchParams.set('offset', offset);

    const response = await fetch(url.toString(), { headers });
    const data = await response.json();

    count += (data.records || []).length;
    offset = data.offset;
  } while (offset);

  return count;
}

function extractCacheMetadata(records: any[], key: string, sourceCount: number) {
  const record = records.find(r => r.fields.cache_key === key);
  return {
    cacheKey: key,
    recordCount: record?.fields.record_count || 0,
    sourceCount: sourceCount,
    lastSynced: record?.fields.last_synced || null,
    version: record?.fields.version || 1,
    isValid: record?.fields.is_valid || false,
  };
}

// ============================================================================
// SYNC FUNCTIONS (merged from sync.ts)
// ============================================================================

async function fetchAllRecords(tableName: string, fields?: string[]): Promise<any[]> {
  const allRecords: any[] = [];
  let offset: string | undefined;

  do {
    const url = new URL(`${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}`);
    url.searchParams.set('pageSize', '100');
    if (fields) {
      fields.forEach(f => url.searchParams.append('fields[]', f));
    }
    if (offset) url.searchParams.set('offset', offset);

    const response = await fetch(url.toString(), { headers });
    const data = await response.json();

    allRecords.push(...(data.records || []));
    offset = data.offset;
  } while (offset);

  return allRecords;
}

async function updateCache(cacheKey: string, data: any, recordCount: number): Promise<void> {
  // First, try to find existing cache record
  const formula = `{cache_key}="${cacheKey}"`;
  const findRes = await fetch(
    `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${encodeURIComponent(CACHE_TABLE)}?filterByFormula=${encodeURIComponent(formula)}&fields[]=cache_key`,
    { headers }
  );
  const findData = await findRes.json();
  const recordId = findData.records?.[0]?.id;

  const jsonData = JSON.stringify(data);
  const originalSize = jsonData.length;
  console.log(`[Sync] Original cache data size for ${cacheKey}: ${originalSize} characters (${(originalSize / 1024).toFixed(2)} KB)`);

  // Compress data using gzip and encode as base64 for storage
  const compressed = gzipSync(jsonData);
  const compressedBase64 = compressed.toString('base64');
  const compressedSize = compressedBase64.length;
  const compressionRatio = ((1 - compressedSize / originalSize) * 100).toFixed(1);

  console.log(`[Sync] Compressed cache data size for ${cacheKey}: ${compressedSize} characters (${(compressedSize / 1024).toFixed(2)} KB) - ${compressionRatio}% size reduction`);

  if (compressedSize > 100000) {
    console.warn(`[Sync] WARNING: Cache data for ${cacheKey} exceeds Airtable's 100KB limit even after compression! Size: ${compressedSize}. Cache will be marked as incomplete.`);
    // Mark cache as invalid if it's too large
    const incompleteCacheFields = {
      cache_key: cacheKey,
      data: JSON.stringify({ records: [], incomplete: true, reason: 'Data exceeds 100KB limit even after compression' }),
      record_count: 0,
      source_count: recordCount,
      last_synced: new Date().toISOString(),
      is_valid: false,
      version: 2, // Version 2 indicates compression support
      compressed: false,
    };

    if (recordId) {
      await fetch(
        `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${encodeURIComponent(CACHE_TABLE)}/${recordId}`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ fields: incompleteCacheFields }),
        }
      );
    }
    return;
  }

  const cacheFields = {
    cache_key: cacheKey,
    data: compressedBase64,
    record_count: recordCount,
    source_count: recordCount,
    last_synced: new Date().toISOString(),
    is_valid: true,
    version: 2, // Version 2 indicates compression
    compressed: true, // Flag to indicate data is compressed
  };

  if (recordId) {
    // Update existing record
    console.log(`[Sync] Updating existing cache record for ${cacheKey} (recordId: ${recordId})`);
    const updateRes = await fetch(
      `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${encodeURIComponent(CACHE_TABLE)}/${recordId}`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          fields: cacheFields,
        }),
      }
    );

    if (!updateRes.ok) {
      const errorText = await updateRes.text();
      console.error(`[Sync] Failed to update cache for ${cacheKey}:`, errorText);
      throw new Error(`Failed to update cache: ${errorText}`);
    }

    const result = await updateRes.json();
    console.log(`[Sync] Successfully updated cache for ${cacheKey}. Record ID: ${result.id}`);
  } else {
    // Create new record
    console.log(`[Sync] Creating new cache record for ${cacheKey}`);
    const createRes = await fetch(
      `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${encodeURIComponent(CACHE_TABLE)}`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          fields: cacheFields,
        }),
      }
    );

    if (!createRes.ok) {
      const errorText = await createRes.text();
      console.error(`[Sync] Failed to create cache for ${cacheKey}:`, errorText);
      throw new Error(`Failed to create cache: ${errorText}`);
    }

    const result = await createRes.json();
    console.log(`[Sync] Successfully created cache for ${cacheKey}. Record ID: ${result.id}`);
  }
}

async function syncProperties() {
  console.log('Syncing properties cache...');

  const records = await fetchAllRecords(PROPERTIES_TABLE);

  // Store the full Airtable record structure with 'fields' property
  const cacheData = {
    records: records,
  };

  await updateCache('properties', cacheData, records.length);

  return { recordCount: records.length };
}

async function syncBuyers() {
  console.log('Syncing buyers cache...');

  const records = await fetchAllRecords(BUYERS_TABLE);

  // Store the full Airtable record structure with 'fields' property
  const cacheData = {
    records: records,
  };

  await updateCache('buyers', cacheData, records.length);

  return { recordCount: records.length };
}

async function syncMatches() {
  console.log('Syncing matches cache...');

  const records = await fetchAllRecords(MATCHES_TABLE);

  // Build indexes for fast lookup
  const buyerIndex: Record<string, string[]> = {};
  const propertyIndex: Record<string, string[]> = {};

  records.forEach(r => {
    const buyerRecordId = r.fields['Contact ID']?.[0] || '';
    const propertyRecordId = r.fields['Property Code']?.[0] || '';

    // Build buyer index
    if (buyerRecordId) {
      if (!buyerIndex[buyerRecordId]) buyerIndex[buyerRecordId] = [];
      buyerIndex[buyerRecordId].push(r.id);
    }

    // Build property index
    if (propertyRecordId) {
      if (!propertyIndex[propertyRecordId]) propertyIndex[propertyRecordId] = [];
      propertyIndex[propertyRecordId].push(r.id);
    }
  });

  // Store the full Airtable record structure with 'fields' property
  const cacheData = {
    records: records,
    buyerIndex,
    propertyIndex,
  };

  await updateCache('matches', cacheData, records.length);

  return { recordCount: records.length };
}
