/**
 * Airtable API Handler - Property Matching System
 *
 * This function interfaces with Airtable to:
 * 1. Store buyer criteria and property data
 * 2. Retrieve matched properties for buyers
 * 3. Support bulk operations for sending property PDFs
 *
 * Route: /api/airtable?action=<action>&table=<table>
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_API_URL = 'https://api.airtable.com/v0';

/**
 * Fetch with automatic retry on rate limit errors (429)
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3
): Promise<Response> {
  let lastError: any = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Add exponential backoff delay before retry
      if (attempt > 0) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // 1s, 2s, 4s (max 5s)
        console.log(`[Airtable] Retry ${attempt}/${maxRetries} after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      const response = await fetch(url, options);

      // If rate limited and we have retries left, continue to next attempt
      if (response.status === 429 && attempt < maxRetries) {
        console.warn(`[Airtable] Rate limited (429) on attempt ${attempt + 1}/${maxRetries + 1}, will retry...`);
        lastError = new Error(`Rate limited: ${response.statusText}`);
        continue;
      }

      // Return response (whether success or error)
      return response;
    } catch (error: any) {
      console.error(`[Airtable] Fetch error on attempt ${attempt + 1}:`, error.message);
      lastError = error;

      // If it's the last attempt, throw
      if (attempt === maxRetries) {
        throw error;
      }
    }
  }

  throw lastError || new Error('Failed after retries');
}

export async function airtableHandler(req: VercelRequest, res: VercelResponse) {
  console.log('[Airtable API] Request:', {
    method: req.method,
    action: req.query.action,
    table: req.query.table,
    timestamp: new Date().toISOString(),
  });

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  console.log('[Airtable API] Environment check:', {
    hasApiKey: !!AIRTABLE_API_KEY,
    apiKeyPrefix: AIRTABLE_API_KEY?.substring(0, 8) + '...',
    hasBaseId: !!AIRTABLE_BASE_ID,
    baseId: AIRTABLE_BASE_ID,
  });

  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    console.error('[Airtable API] Missing credentials!', {
      AIRTABLE_API_KEY: !!AIRTABLE_API_KEY,
      AIRTABLE_BASE_ID: !!AIRTABLE_BASE_ID,
    });
    return res.status(500).json({
      error: 'Airtable credentials not configured',
      message: 'Please add AIRTABLE_API_KEY and AIRTABLE_BASE_ID to environment variables',
      missing: {
        apiKey: !AIRTABLE_API_KEY,
        baseId: !AIRTABLE_BASE_ID,
      }
    });
  }

  const headers = {
    'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
    'Content-Type': 'application/json',
  };

  const { action, table } = req.query;

  try {
    switch (action) {
      case 'list-tables':
        // List all tables in the base (for debugging)
        return handleListTables(req, res, headers);

      case 'list-records':
        // List records from a specific table
        return handleListRecords(req, res, headers, table as string);

      case 'get-record':
        // Get a single record by ID from a specific table
        return handleGetRecord(req, res, headers, table as string);

      case 'batch-get':
        // Get multiple records by IDs from a specific table in one call
        return handleBatchGetRecords(req, res, headers, table as string);

      case 'get-buyer-matches':
        // Get property matches for a buyer
        return handleGetBuyerMatches(req, res, headers);

      case 'bulk-matches':
        // Get matches for multiple buyers (for bulk send)
        return handleBulkMatches(req, res, headers);

      case 'test':
        // Test connection
        return res.status(200).json({ success: true, message: 'Airtable connection OK' });

      case 'update-record':
        // Update a single record by ID
        return handleUpdateRecord(req, res, headers, table as string);

      case 'get-record':
        // Get a single record by ID
        return handleGetRecord(req, res, headers, table as string);

      default:
        return res.status(400).json({ error: 'Unknown action', action });
    }
  } catch (error: any) {
    console.error('[Airtable API] Error:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error',
      details: error.response?.data || null,
    });
  }
}

async function handleListTables(req: VercelRequest, res: VercelResponse, headers: any) {
  // Airtable doesn't have an endpoint to list tables directly
  // We'll return the base info instead
  const response = await fetch(`${AIRTABLE_API_URL}/meta/bases/${AIRTABLE_BASE_ID}/tables`, {
    headers,
  });

  if (!response.ok) {
    throw new Error(`Airtable API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return res.status(200).json(data);
}

async function handleListRecords(
  req: VercelRequest,
  res: VercelResponse,
  headers: any,
  tableName: string
) {
  if (!tableName) {
    return res.status(400).json({ error: 'table parameter is required' });
  }

  const { filterByFormula, limit, offset } = req.query;

  // Build query params
  const params = new URLSearchParams();
  if (filterByFormula) params.append('filterByFormula', filterByFormula as string);
  if (limit) params.append('maxRecords', limit as string);
  if (offset) params.append('offset', offset as string);

  const queryString = params.toString();
  const url = `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}${queryString ? `?${queryString}` : ''}`;

  console.log(`[Airtable] Fetching records from table: ${tableName}`, { filterByFormula, limit, offset });

  try {
    const response = await fetchWithRetry(url, { headers });

    console.log(`[Airtable] Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Airtable] Error response:`, errorText);

      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }

      return res.status(response.status).json({
        error: 'Airtable API error',
        status: response.status,
        statusText: response.statusText,
        details: errorData,
        table: tableName,
      });
    }

    const data = await response.json();
    console.log(`[Airtable] Successfully fetched ${data.records?.length || 0} records from ${tableName}`);
    return res.status(200).json(data);
  } catch (error: any) {
    console.error(`[Airtable] Exception in handleListRecords:`, error);
    return res.status(500).json({
      error: 'Failed to fetch records',
      message: error.message,
      table: tableName,
    });
  }
}

async function handleGetRecord(
  req: VercelRequest,
  res: VercelResponse,
  headers: any,
  tableName: string
) {
  const { recordId } = req.query;

  if (!tableName) {
    return res.status(400).json({ error: 'table parameter is required' });
  }

  if (!recordId) {
    return res.status(400).json({ error: 'recordId parameter is required' });
  }

  console.log(`[Airtable] Fetching record ${recordId} from table: ${tableName}`);

  try {
    const response = await fetchWithRetry(
      `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}/${recordId}`,
      { headers }
    );

    console.log(`[Airtable] Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Airtable] Error response:`, errorText);

      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }

      return res.status(response.status).json({
        error: 'Airtable API error',
        status: response.status,
        statusText: response.statusText,
        details: errorData,
        table: tableName,
        recordId,
      });
    }

    const data = await response.json();
    console.log(`[Airtable] Successfully fetched record ${recordId} from ${tableName}`);
    return res.status(200).json({ record: data });
  } catch (error: any) {
    console.error(`[Airtable] Exception in handleGetRecord:`, error);
    return res.status(500).json({
      error: 'Failed to fetch record',
      message: error.message,
      table: tableName,
      recordId,
    });
  }
}

async function handleBatchGetRecords(
  req: VercelRequest,
  res: VercelResponse,
  headers: any,
  tableName: string
) {
  const { ids } = req.query;

  if (!tableName) {
    return res.status(400).json({ error: 'table parameter is required' });
  }

  if (!ids) {
    return res.status(400).json({ error: 'ids parameter is required' });
  }

  const recordIds = (ids as string).split(',').filter(Boolean);

  if (recordIds.length === 0) {
    return res.status(200).json({ records: [] });
  }

  console.log(`[Airtable] Batch fetching ${recordIds.length} records from table: ${tableName}`);

  try {
    // Use filterByFormula to fetch multiple records by ID in one call
    // RECORD_ID() returns the record ID, so we OR them together
    const formula = `OR(${recordIds.map(id => `RECORD_ID()="${id}"`).join(',')})`;

    const response = await fetchWithRetry(
      `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}?filterByFormula=${encodeURIComponent(formula)}`,
      { headers }
    );

    console.log(`[Airtable] Batch response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Airtable] Batch error response:`, errorText);

      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }

      return res.status(response.status).json({
        error: 'Airtable API error',
        status: response.status,
        statusText: response.statusText,
        details: errorData,
        table: tableName,
        requestedIds: recordIds,
      });
    }

    const data = await response.json();
    console.log(`[Airtable] Successfully batch fetched ${data.records?.length || 0} records from ${tableName}`);
    return res.status(200).json(data);
  } catch (error: any) {
    console.error(`[Airtable] Exception in handleBatchGetRecords:`, error);
    return res.status(500).json({
      error: 'Failed to batch fetch records',
      message: error.message,
      table: tableName,
      requestedIds: recordIds,
    });
  }
}

async function handleGetBuyerMatches(req: VercelRequest, res: VercelResponse, headers: any) {
  const { contactId } = req.query;

  if (!contactId) {
    return res.status(400).json({ error: 'contactId is required' });
  }

  try {
    // Step 1: Get the buyer record from Buyers table to get contact info
    const buyerFormula = encodeURIComponent(`{Contact ID} = "${contactId}"`);
    const buyerResponse = await fetchWithRetry(
      `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Buyers?filterByFormula=${buyerFormula}`,
      { headers }
    );

    if (!buyerResponse.ok) {
      throw new Error(`Failed to fetch buyer: ${buyerResponse.status}`);
    }

    const buyerData = await buyerResponse.json();

    if (!buyerData.records || buyerData.records.length === 0) {
      // No buyer found with this contact ID
      return res.status(200).json({ matches: null });
    }

    const buyer = buyerData.records[0];
    const buyerRecordId = buyer.id;

    // Step 2: Get property matches for this buyer from Property-Buyer Matches table
    // The table uses record links, so we need to search by the buyer record ID
    const matchesFormula = encodeURIComponent(`SEARCH("${buyerRecordId}", ARRAYJOIN({Contact ID}))`);
    const matchesResponse = await fetchWithRetry(
      `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Property-Buyer%20Matches?filterByFormula=${matchesFormula}`,
      { headers }
    );

    if (!matchesResponse.ok) {
      throw new Error(`Failed to fetch matches: ${matchesResponse.status}`);
    }

    const matchesData = await matchesResponse.json();

    // Step 3: Get property codes for all matched properties
    const propertyRecordIds = matchesData.records
      .flatMap((record: any) => record.fields['Property Code'] || []);

    if (propertyRecordIds.length === 0) {
      // Buyer exists but has no property matches
      return res.status(200).json({
        matches: {
          id: buyerRecordId,
          contactId: buyer.fields['Contact ID'],
          contactName: `${buyer.fields['First Name'] || ''} ${buyer.fields['Last Name'] || ''}`.trim(),
          contactEmail: buyer.fields['Email'],
          matchedPropertyIds: [],
        }
      });
    }

    // Fetch property details for matched properties (with batching to avoid rate limits)
    const BATCH_SIZE = 3; // Fetch 3 properties at a time
    const properties: any[] = [];

    for (let i = 0; i < propertyRecordIds.length; i += BATCH_SIZE) {
      const batch = propertyRecordIds.slice(i, i + BATCH_SIZE);

      const batchResults = await Promise.all(
        batch.map(async (propRecId: string) => {
          try {
            const response = await fetchWithRetry(
              `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Properties/${propRecId}`,
              { headers }
            );
            if (response.ok) {
              return await response.json();
            }
            return null;
          } catch {
            return null;
          }
        })
      );

      properties.push(...batchResults);

      // Add small delay between batches
      if (i + BATCH_SIZE < propertyRecordIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    const propertyCodes = properties
      .filter(p => p && p.fields)
      .map(p => p.fields['Property Code'] || p.fields['Opportunity ID'])
      .filter(Boolean);

    // Return match data
    return res.status(200).json({
      matches: {
        id: buyerRecordId,
        contactId: buyer.fields['Contact ID'],
        contactName: `${buyer.fields['First Name'] || ''} ${buyer.fields['Last Name'] || ''}`.trim(),
        contactEmail: buyer.fields['Email'],
        matchedPropertyIds: propertyCodes,
      }
    });
  } catch (error: any) {
    console.error('[Airtable] Error in handleGetBuyerMatches:', error);
    throw error;
  }
}

async function handleBulkMatches(req: VercelRequest, res: VercelResponse, headers: any) {
  const { contactIds } = req.body;

  if (!Array.isArray(contactIds) || contactIds.length === 0) {
    return res.status(400).json({ error: 'contactIds array is required' });
  }

  // Build formula to match multiple contact IDs
  const formulas = contactIds.map(id => `{Contact ID} = "${id}"`).join(', ');
  const formula = encodeURIComponent(`OR(${formulas})`);

  const response = await fetch(
    `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Buyer%20Property%20Matches?filterByFormula=${formula}`,
    { headers }
  );

  if (!response.ok) {
    throw new Error(`Airtable API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // Transform to map of contactId -> match data
  const matches: Record<string, any> = {};
  data.records.forEach((record: any) => {
    const contactId = record.fields['Contact ID'];
    matches[contactId] = {
      id: record.id,
      contactId,
      contactName: record.fields['Contact Name'],
      contactEmail: record.fields['Contact Email'],
      matchedPropertyIds: record.fields['Matched Property IDs'] || [],
      lastMatchedDate: record.fields['Last Matched'],
    };
  });

  return res.status(200).json({ matches });
}

async function handleUpdateRecord(
  req: VercelRequest,
  res: VercelResponse,
  headers: any,
  tableName: string
) {
  const { recordId } = req.query;
  const { fields } = req.body;

  if (!tableName) {
    return res.status(400).json({ error: 'table parameter is required' });
  }

  if (!recordId) {
    return res.status(400).json({ error: 'recordId parameter is required' });
  }

  if (!fields || typeof fields !== 'object') {
    return res.status(400).json({ error: 'fields object is required in request body' });
  }

  console.log(`[Airtable] Updating record ${recordId} in table: ${tableName}`, { fields });

  try {
    const response = await fetchWithRetry(
      `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}/${recordId}`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ fields }),
      }
    );

    console.log(`[Airtable] Update response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Airtable] Update error response:`, errorText);

      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }

      return res.status(response.status).json({
        error: 'Airtable API error',
        status: response.status,
        statusText: response.statusText,
        details: errorData,
        table: tableName,
        recordId,
      });
    }

    const data = await response.json();
    console.log(`[Airtable] Successfully updated record ${recordId} in ${tableName}`);
    return res.status(200).json({ record: data });
  } catch (error: any) {
    console.error(`[Airtable] Exception in handleUpdateRecord:`, error);
    return res.status(500).json({
      error: 'Failed to update record',
      message: error.message,
      table: tableName,
      recordId,
    });
  }
}

async function handleGetRecord(
  req: VercelRequest,
  res: VercelResponse,
  headers: any,
  tableName: string
) {
  const { recordId } = req.query;

  if (!tableName) {
    return res.status(400).json({ error: 'table parameter is required' });
  }

  if (!recordId) {
    return res.status(400).json({ error: 'recordId parameter is required' });
  }

  console.log(`[Airtable] Getting record ${recordId} from table: ${tableName}`);

  try {
    const response = await fetchWithRetry(
      `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}/${recordId}`,
      {
        method: 'GET',
        headers,
      }
    );

    console.log(`[Airtable] Get record response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Airtable] Get record error response:`, errorText);

      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }

      return res.status(response.status).json({
        error: 'Airtable API error',
        status: response.status,
        statusText: response.statusText,
        details: errorData,
        table: tableName,
        recordId,
      });
    }

    const data = await response.json();
    console.log(`[Airtable] Successfully got record ${recordId} from ${tableName}`);
    return res.status(200).json({ record: data });
  } catch (error: any) {
    console.error(`[Airtable] Exception in handleGetRecord:`, error);
    return res.status(500).json({
      error: 'Failed to get record',
      message: error.message,
      table: tableName,
      recordId,
    });
  }
}
