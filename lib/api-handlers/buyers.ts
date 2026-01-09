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

// GHL Custom Field Keys for buyers (these are field keys, not IDs)
const GHL_BUYER_FIELDS = {
  desiredBeds: 'buyer_bedrooms',
  desiredBaths: 'buyer_bathrooms',
  preferredLocation: 'buyer_location',
  preferredZipCodes: 'buyer_zip_codes',
  buyerType: 'buyer_type',
  downPayment: 'buyer_down_payment',
  monthlyIncome: 'buyer_income',
  monthlyLiabilities: 'buyer_liabilities',
  qualified: 'qualified',
  language: 'language',
  budget: 'buyer_budget',
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

      case 'test':
        return res.status(200).json({ success: true, message: 'Buyers API connection OK' });

      default:
        return res.status(400).json({ error: 'Invalid action. Use: list, get, update' });
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

        // Custom fields
        const customFields: Array<{ key: string; value: any }> = [];

        if (fields.desiredBeds !== undefined) {
          customFields.push({ key: GHL_BUYER_FIELDS.desiredBeds, value: fields.desiredBeds });
        }
        if (fields.desiredBaths !== undefined) {
          customFields.push({ key: GHL_BUYER_FIELDS.desiredBaths, value: fields.desiredBaths });
        }
        if (fields.preferredLocation !== undefined) {
          customFields.push({ key: GHL_BUYER_FIELDS.preferredLocation, value: fields.preferredLocation });
        }
        if (fields.preferredZipCodes !== undefined) {
          customFields.push({ key: GHL_BUYER_FIELDS.preferredZipCodes, value: fields.preferredZipCodes });
        }
        if (fields.buyerType !== undefined) {
          customFields.push({ key: GHL_BUYER_FIELDS.buyerType, value: fields.buyerType });
        }
        if (fields.downPayment !== undefined) {
          customFields.push({ key: GHL_BUYER_FIELDS.downPayment, value: fields.downPayment });
        }
        if (fields.monthlyIncome !== undefined) {
          customFields.push({ key: GHL_BUYER_FIELDS.monthlyIncome, value: fields.monthlyIncome });
        }
        if (fields.monthlyLiabilities !== undefined) {
          customFields.push({ key: GHL_BUYER_FIELDS.monthlyLiabilities, value: fields.monthlyLiabilities });
        }
        if (fields.qualified !== undefined) {
          customFields.push({ key: GHL_BUYER_FIELDS.qualified, value: fields.qualified ? 'Yes' : 'No' });
        }
        if (fields.language !== undefined) {
          customFields.push({ key: GHL_BUYER_FIELDS.language, value: fields.language });
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
