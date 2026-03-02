/**
 * Buyers API Endpoint
 * CRUD operations for buyer management with dual sync (Airtable + GHL)
 *
 * Route: /api/buyers?action=<action>
 *
 * Actions:
 * - list: List all buyers with match counts
 * - get: Get single buyer by recordId
 * - update: Update buyer in Airtable and optionally sync to GHL
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

const AIRTABLE_API_URL = 'https://api.airtable.com/v0';
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const GHL_API_KEY = process.env.GHL_API_KEY;
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;
const GHL_API_URL = 'https://services.leadconnectorhq.com';

// GHL Custom Field IDs for buyers (from contact Tl962hCGZxcASEBcVEny)
const GHL_BUYER_FIELDS = {
  desiredBeds: 'fjWCPVStqMlJrLqStqsl',
  desiredBaths: 'kHM9cDI6MQ3hJoh0Pf27',
  preferredLocation: 'beRTMaIZDCYfquFH0fE4',
  preferredZipCodes: 'be1MGJlmJ72ZZL4PB3S1', // "none" value in response
  buyerType: '3rhpAE0UxnesZ78gMXZF',
  downPayment: 'sGXl9nnRSjzeYVCxL71r',
  monthlyIncome: 's4dUCp9shZAwSVLoKfXo',
  monthlyLiabilities: 'Ct5FlL46K1Z7ge5LVWZI',
  qualified: 'xf9gFTzt95ZZdwHSUnRG',
  language: 'zFcHDP9DIWfpM1y4s0IG',
  budget: '7P85U1FqHEcPCBHJeuLZ',
};

/**
 * Fetch with automatic retry on rate limit errors (429)
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`[Buyers API] Retry ${attempt}/${maxRetries} after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      const response = await fetch(url, options);

      if (response.status === 429 && attempt < maxRetries) {
        console.warn(`[Buyers API] Rate limited (429), will retry...`);
        lastError = new Error(`Rate limited: ${response.statusText}`);
        continue;
      }

      return response;
    } catch (error) {
      console.error(`[Buyers API] Fetch error on attempt ${attempt + 1}:`, error);
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxRetries) {
        throw error;
      }
    }
  }

  throw lastError || new Error('Failed after retries');
}

export async function buyersHandler(req: VercelRequest, res: VercelResponse) {
  console.log('[Buyers API] Request:', {
    method: req.method,
    action: req.query.action,
    timestamp: new Date().toISOString(),
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

  const airtableHeaders = {
    Authorization: `Bearer ${AIRTABLE_API_KEY}`,
    'Content-Type': 'application/json',
  };

  const ghlHeaders = {
    Authorization: `Bearer ${GHL_API_KEY}`,
    'Content-Type': 'application/json',
    Version: '2021-07-28',
  };

  const { action } = req.query;

  try {
    switch (action) {
      case 'list':
        return handleList(req, res, airtableHeaders);

      case 'get':
        return handleGet(req, res, airtableHeaders);

      case 'update':
        return handleUpdate(req, res, airtableHeaders, ghlHeaders);

      case 'delete':
        if (req.method !== 'DELETE') {
          return res.status(405).json({ error: 'Method not allowed. Use DELETE.' });
        }
        return handleDelete(req, res, airtableHeaders, ghlHeaders);

      case 'delete-bulk':
        if (req.method !== 'DELETE') {
          return res.status(405).json({ error: 'Method not allowed. Use DELETE.' });
        }
        return handleDeleteBulk(req, res, airtableHeaders, ghlHeaders);

      case 'test':
        return res.status(200).json({ success: true, message: 'Buyers API connection OK' });

      default:
        return res.status(400).json({ error: 'Invalid action. Use: list, get, update, delete, delete-bulk' });
    }
  } catch (error) {
    console.error('[Buyers API] Error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}

/**
 * List all buyers with their match counts
 */
async function handleList(
  req: VercelRequest,
  res: VercelResponse,
  headers: Record<string, string>
) {
  try {
    // Fetch all buyers from Airtable
    const buyersUrl = `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Buyers?sort%5B0%5D%5Bfield%5D=First%20Name&sort%5B0%5D%5Bdirection%5D=asc`;
    const buyersRes = await fetchWithRetry(buyersUrl, { headers });

    if (!buyersRes.ok) {
      const error = await buyersRes.text();
      throw new Error(`Failed to fetch buyers: ${buyersRes.status} - ${error}`);
    }

    const buyersData = await buyersRes.json();
    console.log(`[Buyers API] Fetched ${buyersData.records?.length || 0} buyers`);

    // Fetch match counts from Property-Buyer Matches table
    const matchesUrl = `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Property-Buyer%20Matches`;
    const matchesRes = await fetchWithRetry(matchesUrl, { headers });
    const matchesData = matchesRes.ok ? await matchesRes.json() : { records: [] };

    // Count matches per buyer (by Airtable record ID)
    const matchCountByBuyerId: Record<string, number> = {};
    for (const match of matchesData.records || []) {
      // Contact ID in matches table is a linked record array
      const buyerRecordIds = match.fields['Contact ID'];
      if (Array.isArray(buyerRecordIds)) {
        for (const buyerId of buyerRecordIds) {
          matchCountByBuyerId[buyerId] = (matchCountByBuyerId[buyerId] || 0) + 1;
        }
      }
    }

    // Transform to BuyerRecord format
    const buyers = buyersData.records.map((record: any) => {
      const zipCodesRaw = record.fields['Preferred Zip Codes'];
      const preferredZipCodes = typeof zipCodesRaw === 'string'
        ? zipCodesRaw.split(',').map((z: string) => z.trim()).filter(Boolean)
        : Array.isArray(zipCodesRaw) ? zipCodesRaw : [];

      return {
        recordId: record.id,
        contactId: record.fields['Contact ID'] || '',
        firstName: record.fields['First Name'] || '',
        lastName: record.fields['Last Name'] || '',
        email: record.fields['Email'] || '',
        phone: record.fields['Phone'] || record.fields['Mobile'] || '',
        language: record.fields['Language'] === 'Spanish' ? 'Spanish' : 'English',
        desiredBeds: record.fields['No. of Bedrooms'],
        desiredBaths: record.fields['No. of Bath'],
        preferredLocation: record.fields['Preferred Location'] || record.fields['Location'],
        preferredZipCodes,
        city: record.fields['City'],
        state: record.fields['State'],
        buyerType: record.fields['Buyer Type'],
        downPayment: record.fields['Downpayment'],
        monthlyIncome: record.fields['Monthly Income'],
        monthlyLiabilities: record.fields['Monthly Liabilities'],
        qualified: ['Yes', 'yes', 'YES', 'true', true, 1, '1'].includes(record.fields['Qualified']),
        matchCount: matchCountByBuyerId[record.id] || 0,
        dateAdded: record.fields['Date Added'] || record.createdTime,
        lastUpdated: record.fields['Last Updated'],
        lat: record.fields['Lat'],
        lng: record.fields['Lng'],
      };
    });

    return res.status(200).json({
      buyers,
      total: buyers.length,
    });
  } catch (error) {
    console.error('[Buyers API] List error:', error);
    return res.status(500).json({ error: 'Failed to fetch buyers' });
  }
}

/**
 * Get single buyer by recordId
 */
async function handleGet(
  req: VercelRequest,
  res: VercelResponse,
  headers: Record<string, string>
) {
  const { recordId } = req.query;

  if (!recordId || typeof recordId !== 'string') {
    return res.status(400).json({ error: 'recordId is required' });
  }

  try {
    const url = `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Buyers/${recordId}`;
    const response = await fetchWithRetry(url, { headers });

    if (!response.ok) {
      if (response.status === 404) {
        return res.status(404).json({ error: 'Buyer not found' });
      }
      const error = await response.text();
      throw new Error(`Failed to fetch buyer: ${response.status} - ${error}`);
    }

    const record = await response.json();

    const zipCodesRaw = record.fields['Preferred Zip Codes'];
    const preferredZipCodes = typeof zipCodesRaw === 'string'
      ? zipCodesRaw.split(',').map((z: string) => z.trim()).filter(Boolean)
      : Array.isArray(zipCodesRaw) ? zipCodesRaw : [];

    const buyer = {
      recordId: record.id,
      contactId: record.fields['Contact ID'] || '',
      firstName: record.fields['First Name'] || '',
      lastName: record.fields['Last Name'] || '',
      email: record.fields['Email'] || '',
      phone: record.fields['Phone'] || record.fields['Mobile'] || '',
      language: record.fields['Language'] === 'Spanish' ? 'Spanish' : 'English',
      desiredBeds: record.fields['No. of Bedrooms'],
      desiredBaths: record.fields['No. of Bath'],
      preferredLocation: record.fields['Preferred Location'] || record.fields['Location'],
      preferredZipCodes,
      city: record.fields['City'],
      state: record.fields['State'],
      buyerType: record.fields['Buyer Type'],
      downPayment: record.fields['Downpayment'],
      monthlyIncome: record.fields['Monthly Income'],
      monthlyLiabilities: record.fields['Monthly Liabilities'],
      qualified: ['Yes', 'yes', 'YES', 'true', true, 1, '1'].includes(record.fields['Qualified']),
      dateAdded: record.fields['Date Added'] || record.createdTime,
      lastUpdated: record.fields['Last Updated'],
      lat: record.fields['Lat'],
      lng: record.fields['Lng'],
    };

    return res.status(200).json({ buyer });
  } catch (error) {
    console.error('[Buyers API] Get error:', error);
    return res.status(500).json({ error: 'Failed to fetch buyer' });
  }
}

/**
 * Update buyer in Airtable and optionally sync to GHL
 */
async function handleUpdate(
  req: VercelRequest,
  res: VercelResponse,
  airtableHeaders: Record<string, string>,
  ghlHeaders: Record<string, string>
) {
  if (req.method !== 'PUT' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { recordId, contactId, fields, syncToGhl = true } = req.body;

  if (!recordId) {
    return res.status(400).json({ error: 'recordId is required' });
  }

  try {
    // Build Airtable update payload (Last Updated is automated in Airtable)
    const airtableFields: Record<string, any> = {};

    // Map form fields to Airtable columns
    if (fields.firstName !== undefined) airtableFields['First Name'] = fields.firstName;
    if (fields.lastName !== undefined) airtableFields['Last Name'] = fields.lastName;
    if (fields.email !== undefined) airtableFields['Email'] = fields.email;
    if (fields.phone !== undefined) airtableFields['Phone'] = fields.phone;
    if (fields.language !== undefined) airtableFields['Language'] = fields.language;
    if (fields.desiredBeds !== undefined) airtableFields['No. of Bedrooms'] = parseInt(fields.desiredBeds) || null;
    if (fields.desiredBaths !== undefined) airtableFields['No. of Bath'] = parseFloat(fields.desiredBaths) || null;
    if (fields.preferredLocation !== undefined) airtableFields['Preferred Location'] = fields.preferredLocation;
    if (fields.preferredZipCodes !== undefined) airtableFields['Preferred Zip Codes'] = fields.preferredZipCodes;
    if (fields.city !== undefined) airtableFields['City'] = fields.city;
    if (fields.state !== undefined) airtableFields['State'] = fields.state;
    // Note: buyerType is not stored in Airtable, only synced to GHL

    // Parse currency fields
    if (fields.downPayment !== undefined) {
      const parsed = parseFloat(String(fields.downPayment).replace(/[^0-9.]/g, ''));
      airtableFields['Downpayment'] = isNaN(parsed) ? null : parsed;
    }
    if (fields.monthlyIncome !== undefined) {
      const parsed = parseFloat(String(fields.monthlyIncome).replace(/[^0-9.]/g, ''));
      airtableFields['Monthly Income'] = isNaN(parsed) ? null : parsed;
    }
    if (fields.monthlyLiabilities !== undefined) {
      const parsed = parseFloat(String(fields.monthlyLiabilities).replace(/[^0-9.]/g, ''));
      airtableFields['Monthly Liabilities'] = isNaN(parsed) ? null : parsed;
    }

    if (fields.qualified !== undefined) airtableFields['Qualified'] = fields.qualified ? 'Yes' : 'No';

    // Clear geocode if location changed (will be re-geocoded on next match run)
    if (fields.preferredLocation !== undefined || fields.city !== undefined) {
      airtableFields['Lat'] = null;
      airtableFields['Lng'] = null;
    }

    console.log('[Buyers API] Updating Airtable record:', recordId, airtableFields);

    // Update Airtable
    const airtableUrl = `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Buyers/${recordId}`;
    const airtableRes = await fetchWithRetry(airtableUrl, {
      method: 'PATCH',
      headers: airtableHeaders,
      body: JSON.stringify({ fields: airtableFields }),
    });

    if (!airtableRes.ok) {
      const error = await airtableRes.json();
      throw new Error(`Airtable update failed: ${JSON.stringify(error)}`);
    }

    const updatedRecord = await airtableRes.json();
    console.log('[Buyers API] Airtable updated successfully');

    // Sync to GHL if requested and contactId is provided
    let ghlSynced = false;
    if (syncToGhl && contactId && GHL_API_KEY) {
      try {
        const ghlPayload: Record<string, any> = {};

        // Standard contact fields
        if (fields.firstName !== undefined) ghlPayload.firstName = fields.firstName;
        if (fields.lastName !== undefined) ghlPayload.lastName = fields.lastName;
        if (fields.email !== undefined) ghlPayload.email = fields.email;
        if (fields.phone !== undefined) ghlPayload.phone = fields.phone;

        // Custom fields - GHL API expects { id, field_value } format
        const customFields: Array<{ id: string; field_value: any }> = [];

        // These fields are TEXT type in GHL - send as strings
        if (fields.desiredBeds !== undefined && fields.desiredBeds !== '') {
          customFields.push({ id: GHL_BUYER_FIELDS.desiredBeds, field_value: fields.desiredBeds });
        }
        if (fields.desiredBaths !== undefined && fields.desiredBaths !== '') {
          customFields.push({ id: GHL_BUYER_FIELDS.desiredBaths, field_value: fields.desiredBaths });
        }
        if (fields.preferredLocation !== undefined && fields.preferredLocation !== '') {
          customFields.push({ id: GHL_BUYER_FIELDS.preferredLocation, field_value: fields.preferredLocation });
        }
        if (fields.preferredZipCodes !== undefined && fields.preferredZipCodes !== '') {
          customFields.push({ id: GHL_BUYER_FIELDS.preferredZipCodes, field_value: fields.preferredZipCodes });
        }
        if (fields.buyerType !== undefined && fields.buyerType !== '') {
          customFields.push({ id: GHL_BUYER_FIELDS.buyerType, field_value: fields.buyerType });
        }
        // Currency fields are TEXT type - strip formatting and send as string
        if (fields.downPayment !== undefined && fields.downPayment !== '') {
          const parsed = String(fields.downPayment).replace(/[^0-9.]/g, '');
          if (parsed) {
            customFields.push({ id: GHL_BUYER_FIELDS.downPayment, field_value: parsed });
          }
        }
        if (fields.monthlyIncome !== undefined && fields.monthlyIncome !== '') {
          const parsed = String(fields.monthlyIncome).replace(/[^0-9.]/g, '');
          if (parsed) {
            customFields.push({ id: GHL_BUYER_FIELDS.monthlyIncome, field_value: parsed });
          }
        }
        if (fields.monthlyLiabilities !== undefined && fields.monthlyLiabilities !== '') {
          const parsed = String(fields.monthlyLiabilities).replace(/[^0-9.]/g, '');
          if (parsed) {
            customFields.push({ id: GHL_BUYER_FIELDS.monthlyLiabilities, field_value: parsed });
          }
        }
        if (fields.qualified !== undefined) {
          customFields.push({ id: GHL_BUYER_FIELDS.qualified, field_value: fields.qualified ? 'Yes' : 'No' });
        }
        if (fields.language !== undefined && fields.language !== '') {
          customFields.push({ id: GHL_BUYER_FIELDS.language, field_value: fields.language });
        }

        if (customFields.length > 0) {
          ghlPayload.customFields = customFields;
        }

        console.log('[Buyers API] Syncing to GHL contact:', contactId, ghlPayload);

        const ghlUrl = `${GHL_API_URL}/contacts/${contactId}`;
        const ghlRes = await fetchWithRetry(ghlUrl, {
          method: 'PUT',
          headers: ghlHeaders,
          body: JSON.stringify(ghlPayload),
        });

        if (ghlRes.ok) {
          ghlSynced = true;
          console.log('[Buyers API] GHL sync successful');
        } else {
          const ghlError = await ghlRes.text();
          console.warn('[Buyers API] GHL sync failed:', ghlError);
        }
      } catch (ghlError) {
        console.error('[Buyers API] GHL sync error:', ghlError);
        // Don't fail the request if GHL sync fails
      }
    }

    return res.status(200).json({
      success: true,
      buyer: updatedRecord,
      ghlSynced,
    });
  } catch (error) {
    console.error('[Buyers API] Update error:', error);
    return res.status(500).json({
      error: 'Failed to update buyer',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Cascade delete match records for a given buyer record ID.
 * Fetches all matches, filters in code for ones linked to this buyer,
 * then deletes them in batches of 10.
 *
 * Note: SEARCH/ARRAYJOIN formulas don't work reliably on linked record fields
 * in Airtable's filterByFormula, so we filter in code instead.
 */
async function cascadeDeleteBuyerMatches(
  buyerRecordId: string,
  headers: Record<string, string>
): Promise<number> {
  // Fetch all match records with the Contact ID linked field
  let allRecords: any[] = [];
  let offset: string | undefined;

  do {
    const url = new URL(`${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Property-Buyer%20Matches`);
    url.searchParams.set('pageSize', '100');
    url.searchParams.append('fields[]', 'Contact ID');
    if (offset) url.searchParams.set('offset', offset);

    const response = await fetchWithRetry(url.toString(), { headers });
    if (!response.ok) break;

    const data = await response.json();
    allRecords.push(...(data.records || []));
    offset = data.offset;
  } while (offset);

  // Filter in code: linked record fields return arrays of record IDs in the API
  const matchIds = allRecords
    .filter((r: any) => {
      const linkedIds = r.fields['Contact ID'];
      return Array.isArray(linkedIds) && linkedIds.includes(buyerRecordId);
    })
    .map((r: any) => r.id);

  if (matchIds.length === 0) {
    console.log(`[Buyers API] No matches found for buyer ${buyerRecordId}`);
    return 0;
  }

  console.log(`[Buyers API] Cascade deleting ${matchIds.length} matches for buyer ${buyerRecordId}`);

  const BATCH_SIZE = 10;
  let deletedCount = 0;

  for (let i = 0; i < matchIds.length; i += BATCH_SIZE) {
    const batch = matchIds.slice(i, i + BATCH_SIZE);
    const deleteUrl = new URL(`${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Property-Buyer%20Matches`);
    batch.forEach(id => deleteUrl.searchParams.append('records[]', id));

    const deleteRes = await fetchWithRetry(deleteUrl.toString(), {
      method: 'DELETE',
      headers,
    });

    if (!deleteRes.ok) {
      console.error(`[Buyers API] Cascade delete batch failed: ${deleteRes.status}`);
      throw new Error(`Failed to cascade delete matches: ${deleteRes.status}`);
    }

    deletedCount += batch.length;
  }

  return deletedCount;
}

/**
 * Delete a single buyer from Airtable + GHL contact + cascade delete matches
 */
async function handleDelete(
  req: VercelRequest,
  res: VercelResponse,
  airtableHeaders: Record<string, string>,
  ghlHeaders: Record<string, string>
) {
  const { recordId, contactId } = req.body;

  if (!recordId) {
    return res.status(400).json({ error: 'recordId is required' });
  }

  console.log(`[Buyers API] Deleting buyer ${recordId} (contactId: ${contactId}) with cascade...`);

  try {
    // Step 1: Cascade delete related matches
    const matchesDeleted = await cascadeDeleteBuyerMatches(recordId, airtableHeaders);
    console.log(`[Buyers API] Cascade deleted ${matchesDeleted} matches`);

    // Step 2: Delete from Airtable
    const deleteUrl = new URL(`${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Buyers`);
    deleteUrl.searchParams.append('records[]', recordId);

    const deleteRes = await fetchWithRetry(deleteUrl.toString(), {
      method: 'DELETE',
      headers: airtableHeaders,
    });

    if (!deleteRes.ok) {
      const errorText = await deleteRes.text();
      console.error(`[Buyers API] Airtable delete failed:`, errorText);
      throw new Error(`Failed to delete buyer from Airtable: ${deleteRes.status}`);
    }

    console.log(`[Buyers API] Deleted buyer ${recordId} from Airtable`);

    // Step 3: Delete from GHL (non-blocking — if GHL fails, still succeed)
    let ghlDeleted = false;
    if (contactId && GHL_API_KEY) {
      try {
        const ghlRes = await fetchWithRetry(
          `${GHL_API_URL}/contacts/${contactId}`,
          {
            method: 'DELETE',
            headers: ghlHeaders,
          }
        );

        if (ghlRes.ok) {
          ghlDeleted = true;
          console.log(`[Buyers API] Deleted GHL contact ${contactId}`);
        } else {
          console.warn(`[Buyers API] GHL delete failed: ${ghlRes.status}`);
        }
      } catch (ghlError) {
        console.error('[Buyers API] GHL delete error:', ghlError);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Buyer deleted with ${matchesDeleted} related matches removed`,
      matchesDeleted,
      ghlDeleted,
    });
  } catch (error) {
    console.error('[Buyers API] Delete error:', error);
    return res.status(500).json({
      error: 'Failed to delete buyer',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Bulk delete buyers from Airtable + GHL + cascade delete matches
 */
async function handleDeleteBulk(
  req: VercelRequest,
  res: VercelResponse,
  airtableHeaders: Record<string, string>,
  ghlHeaders: Record<string, string>
) {
  const { buyers } = req.body;

  if (!Array.isArray(buyers) || buyers.length === 0) {
    return res.status(400).json({ error: 'buyers array is required (each with recordId and optional contactId)' });
  }

  console.log(`[Buyers API] Bulk deleting ${buyers.length} buyers with cascade...`);

  try {
    let totalMatchesDeleted = 0;
    let ghlDeletedCount = 0;

    // Step 1: Cascade delete matches for each buyer
    for (const buyer of buyers) {
      const matchesDeleted = await cascadeDeleteBuyerMatches(buyer.recordId, airtableHeaders);
      totalMatchesDeleted += matchesDeleted;
    }

    console.log(`[Buyers API] Cascade deleted ${totalMatchesDeleted} total matches`);

    // Step 2: Delete buyers from Airtable in batches of 10
    const recordIds = buyers.map((b: { recordId: string }) => b.recordId);
    const BATCH_SIZE = 10;
    let deletedCount = 0;

    for (let i = 0; i < recordIds.length; i += BATCH_SIZE) {
      const batch = recordIds.slice(i, i + BATCH_SIZE);
      const deleteUrl = new URL(`${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Buyers`);
      batch.forEach((id: string) => deleteUrl.searchParams.append('records[]', id));

      const deleteRes = await fetchWithRetry(deleteUrl.toString(), {
        method: 'DELETE',
        headers: airtableHeaders,
      });

      if (!deleteRes.ok) {
        const errorText = await deleteRes.text();
        console.error(`[Buyers API] Bulk delete batch failed:`, errorText);
        throw new Error(`Failed to delete buyers batch: ${deleteRes.status}`);
      }

      deletedCount += batch.length;
    }

    // Step 3: Delete from GHL (non-blocking)
    if (GHL_API_KEY) {
      for (const buyer of buyers) {
        if (!buyer.contactId) continue;
        try {
          const ghlRes = await fetchWithRetry(
            `${GHL_API_URL}/contacts/${buyer.contactId}`,
            {
              method: 'DELETE',
              headers: ghlHeaders,
            }
          );
          if (ghlRes.ok) ghlDeletedCount++;
        } catch {
          // Non-blocking
        }
      }
    }

    console.log(`[Buyers API] Bulk deleted ${deletedCount} buyers, ${ghlDeletedCount} GHL contacts`);

    return res.status(200).json({
      success: true,
      message: `Deleted ${deletedCount} buyers with ${totalMatchesDeleted} related matches removed`,
      deletedCount,
      matchesDeleted: totalMatchesDeleted,
      ghlDeletedCount,
    });
  } catch (error) {
    console.error('[Buyers API] Bulk delete error:', error);
    return res.status(500).json({
      error: 'Failed to delete buyers',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
