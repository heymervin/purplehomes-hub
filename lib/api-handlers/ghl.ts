/**
 * Unified GHL API - Single Vercel Serverless Function
 * 
 * Consolidates all GHL API calls into one function to stay within Vercel's
 * free tier limit of 12 serverless functions.
 * 
 * Route via query param: /api/ghl?resource=contacts&action=list
 * 
 * Supported Resources:
 * - contacts: CRUD operations for contacts
 * - opportunities: CRUD operations for opportunities (properties)
 * - social: Social planner (accounts, posts, categories, tags, statistics)
 * - media: Media file management
 * - custom-fields: Location custom fields
 * - custom-values: Location custom values
 * - tags: Location tags management
 * - calendars: Calendar management (calendars, groups, events, resources)
 * - forms: Forms listing
 * - documents: Document templates and contracts
 * - messages: Email/SMS messaging
 * - ai-caption: AI-powered caption generation
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as FormData from 'form-data';

const GHL_API_URL = 'https://services.leadconnectorhq.com';
const GHL_API_KEY = process.env.GHL_API_KEY;
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Separate API key for Custom Objects & Associations API
// These endpoints require a different API key with object/association scopes
const GHL_OBJECTS_API_KEY = process.env.GHL_OBJECTS_API_KEY;

// Separate API key for sending emails (v2 API key with conversations.message.write scope)
const GHL_API_V2 = process.env.GHL_API_V2;

// Pipeline IDs
const SELLER_ACQUISITION_PIPELINE_ID = process.env.GHL_SELLER_ACQUISITION_PIPELINE_ID || 'U4FANAMaB1gGddRaaD9x'; // Acquisition Seller pipeline
const BUYER_DISPOSITION_PIPELINE_ID = process.env.GHL_BUYER_DISPOSITION_PIPELINE_ID || 'cThFQOW6nkVKVxbBrDAV';
const DEAL_ACQUISITION_PIPELINE_ID = process.env.GHL_DEAL_ACQUISITION_PIPELINE_ID || '2NeLTlKaeMyWOnLXdTCS';

// Google Sheets Auth Configuration
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const GOOGLE_SHEET_CREDENTIALS = process.env.GOOGLE_SHEET_CREDENTIALS;

export async function ghlHandler(req: VercelRequest, res: VercelResponse) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('[GHL API] Request received:', {
    method: req.method,
    resource: req.query.resource,
    action: req.query.action,
    id: req.query.id,
    hasBody: !!req.body,
    timestamp: new Date().toISOString()
  });
  
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-GHL-API-Key, X-GHL-Location-ID');

  if (req.method === 'OPTIONS') {
    console.log('[GHL API] OPTIONS request - returning CORS headers');
    return res.status(200).end();
  }

  console.log('[GHL API] Environment check:', {
    GHL_API_KEY_exists: !!GHL_API_KEY,
    GHL_API_KEY_length: GHL_API_KEY?.length,
    GHL_API_KEY_prefix: GHL_API_KEY?.substring(0, 15) + '...',
    GHL_API_V2_exists: !!GHL_API_V2,
    GHL_API_V2_prefix: GHL_API_V2 ? GHL_API_V2.substring(0, 15) + '...' : 'not set',
    GHL_OBJECTS_API_KEY_exists: !!GHL_OBJECTS_API_KEY,
    GHL_OBJECTS_API_KEY_prefix: GHL_OBJECTS_API_KEY?.substring(0, 15) + '...',
    GHL_LOCATION_ID_exists: !!GHL_LOCATION_ID,
    GHL_LOCATION_ID: GHL_LOCATION_ID,
    OPENAI_API_KEY_exists: !!OPENAI_API_KEY,
    GOOGLE_SHEET_ID_exists: !!GOOGLE_SHEET_ID,
    SELLER_PIPELINE: SELLER_ACQUISITION_PIPELINE_ID,
    BUYER_PIPELINE: BUYER_DISPOSITION_PIPELINE_ID,
    DEAL_PIPELINE: DEAL_ACQUISITION_PIPELINE_ID
  });

  if (!GHL_API_KEY || !GHL_LOCATION_ID) {
    console.error('[GHL API] ❌ MISSING CREDENTIALS');
    return res.status(500).json({ 
      error: 'GHL API credentials not configured',
      message: 'Please add GHL_API_KEY and GHL_LOCATION_ID to Vercel environment variables',
      missing: {
        GHL_API_KEY: !GHL_API_KEY,
        GHL_LOCATION_ID: !GHL_LOCATION_ID
      }
    });
  }

  console.log('[GHL API] ✅ Credentials loaded successfully');

  const headers = {
    'Authorization': `Bearer ${GHL_API_KEY}`,
    'Content-Type': 'application/json',
    'Version': '2021-07-28',
  };

  // Separate headers for Custom Objects & Associations API
  const objectsHeaders = {
    'Authorization': `Bearer ${GHL_OBJECTS_API_KEY}`,
    'Content-Type': 'application/json',
    'Version': '2021-07-28',
  };

  console.log('[GHL API] Headers prepared:', {
    Authorization: 'Bearer ' + (GHL_API_KEY?.substring(0, 15) || 'NOT_SET') + '...',
    ObjectsAuth: 'Bearer ' + (GHL_OBJECTS_API_KEY?.substring(0, 15) || 'NOT_SET') + '...',
    ContentType: headers['Content-Type'],
    Version: headers['Version']
  });

  try {
    const { method, query, body } = req;
    const resource = query.resource as string;
    const action = query.action as string;
    const id = query.id as string;

    // ============ CONTACTS ============
    // Scopes: contacts.readonly, contacts.write
    if (resource === 'contacts') {
      console.log('[CONTACTS] Handling contacts resource');
      
      if (method === 'GET') {
        console.log('[CONTACTS] GET request');
        
        // Get single contact by ID
        if (id) {
          console.log('[CONTACTS] Fetching single contact:', id);
          try {
            const fetchUrl = `${GHL_API_URL}/contacts/${id}`;
            console.log('[CONTACTS] Request URL:', fetchUrl);
            
            const response = await fetch(fetchUrl, { headers });
            console.log('[CONTACTS] Response status:', response.status, response.statusText);
            
            const data = await response.json();
            console.log('[CONTACTS] Response data:', JSON.stringify(data).substring(0, 200) + '...');
            
            if (!response.ok) {
              console.error('[CONTACTS] ❌ Error fetching contact:', data);
            } else {
              console.log('[CONTACTS] ✅ Contact fetched successfully');
            }
            
            return res.status(response.ok ? 200 : response.status).json(data);
          } catch (error) {
            console.error('[CONTACTS] ❌ Exception fetching contact:', error);
            return res.status(500).json({ 
              error: 'Failed to fetch contact',
              details: error instanceof Error ? error.message : String(error)
            });
          }
        }
        
        // Use simple GET /contacts/ endpoint with pagination to fetch ALL contacts
        const requestedLimit = query.limit ? parseInt(query.limit as string) : 10000;
        
        let allContacts: any[] = [];
        let pageCount = 0;
        const maxPages = 100;
        
        console.log('[CONTACTS] Starting pagination fetch:', {
          requestedLimit,
          maxPages,
          ghlApiUrl: GHL_API_URL,
          locationId: GHL_LOCATION_ID
        });
        
        // Build initial request URL with limit of 100 per page (GHL max)
        let currentUrl = `${GHL_API_URL}/contacts/?locationId=${GHL_LOCATION_ID}&limit=100`;
        console.log('[CONTACTS] Initial URL:', currentUrl);
        
        // Paginate through all contacts
        while (pageCount < maxPages && allContacts.length < requestedLimit) {
          console.log(`[CONTACTS] 📄 Fetching page ${pageCount + 1}/${maxPages}`);
          console.log(`[CONTACTS] Current URL: ${currentUrl}`);
          
          try {
            const response = await fetch(currentUrl, { method: 'GET', headers });
            console.log(`[CONTACTS] Page ${pageCount + 1} response:`, {
              status: response.status,
              statusText: response.statusText,
              ok: response.ok,
              headers: {
                contentType: response.headers.get('content-type'),
                contentLength: response.headers.get('content-length')
              }
            });
            
            if (!response.ok) {
              const errorText = await response.text();
              console.error(`[CONTACTS] ❌ Page ${pageCount + 1} failed:`, {
                status: response.status,
                statusText: response.statusText,
                errorBody: errorText
              });
              
              let errorData;
              try {
                errorData = JSON.parse(errorText);
              } catch {
                errorData = { message: errorText };
              }
              
              // If first page fails, return error
              if (pageCount === 0) {
                console.error('[CONTACTS] ❌ First page failed, aborting');
                return res.status(response.status).json({
                  error: 'Failed to fetch contacts from GHL',
                  details: errorData,
                  ghlStatus: response.status,
                  ghlStatusText: response.statusText
                });
              }
              
              // Otherwise, return what we have
              console.warn(`[CONTACTS] ⚠️ Page ${pageCount + 1} failed, returning ${allContacts.length} contacts collected so far`);
              break;
            }
            
            const data = await response.json();
            const contacts = data.contacts || [];
            
            console.log(`[CONTACTS] ✅ Page ${pageCount + 1} success:`, {
              contactsReceived: contacts.length,
              totalSoFar: allContacts.length + contacts.length,
              hasNextPage: !!data.meta?.nextPageUrl,
              metaInfo: data.meta
            });
            
            if (contacts.length === 0) {
              console.log('[CONTACTS] No more contacts, stopping pagination');
              break;
            }
            
            allContacts = allContacts.concat(contacts);
            pageCount++;
            
            // Check for next page URL in meta
            if (data.meta?.nextPageUrl) {
              currentUrl = data.meta.nextPageUrl;
              console.log(`[CONTACTS] Next page URL: ${currentUrl}`);
            } else {
              console.log('[CONTACTS] No nextPageUrl in meta, stopping pagination');
              break;
            }
            
            // Stop if we've reached requested limit
            if (allContacts.length >= requestedLimit) {
              console.log(`[CONTACTS] Reached requested limit (${requestedLimit}), stopping`);
              break;
            }
          } catch (error) {
            console.error(`[CONTACTS] ❌ Exception on page ${pageCount + 1}:`, {
              error: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined
            });
            
            if (pageCount === 0) {
              return res.status(500).json({
                error: 'Exception while fetching contacts',
                details: error instanceof Error ? error.message : String(error)
              });
            }
            break;
          }
        }
        
        // Trim to requested limit if needed
        if (allContacts.length > requestedLimit) {
          console.log(`[CONTACTS] Trimming from ${allContacts.length} to ${requestedLimit}`);
          allContacts = allContacts.slice(0, requestedLimit);
        }
        
        console.log('[CONTACTS] ✅✅✅ PAGINATION COMPLETE:', {
          totalContacts: allContacts.length,
          pagesProcessed: pageCount,
          requestedLimit
        });
        
        return res.status(200).json({ 
          contacts: allContacts,
          meta: { total: allContacts.length, pages: pageCount }
        });
      }
      
      if (method === 'POST') {
        console.log('[CONTACTS] POST - Creating contact');
        try {
          const payload = { ...body, locationId: GHL_LOCATION_ID };
          console.log('[CONTACTS] Create payload:', JSON.stringify(payload).substring(0, 200));
          
          const response = await fetch(`${GHL_API_URL}/contacts/`, {
            method: 'POST', headers, body: JSON.stringify(payload)
          });
          console.log('[CONTACTS] Create response:', response.status, response.statusText);
          
          const data = await response.json();
          if (!response.ok) {
            console.error('[CONTACTS] ❌ Create failed:', data);
          }
          
          return res.status(response.ok ? 201 : response.status).json(data);
        } catch (error) {
          console.error('[CONTACTS] ❌ Exception creating contact:', error);
          return res.status(500).json({ error: 'Exception creating contact', details: String(error) });
        }
      }
      
      if (method === 'PUT' && id) {
        console.log('[CONTACTS] PUT - Updating contact:', id);
        try {
          const response = await fetch(`${GHL_API_URL}/contacts/${id}`, {
            method: 'PUT', headers, body: JSON.stringify(body)
          });
          console.log('[CONTACTS] Update response:', response.status);
          
          const data = await response.json();
          if (!response.ok) {
            console.error('[CONTACTS] ❌ Update failed:', data);
          }
          
          return res.status(response.ok ? 200 : response.status).json(data);
        } catch (error) {
          console.error('[CONTACTS] ❌ Exception updating contact:', error);
          return res.status(500).json({ error: 'Exception updating contact', details: String(error) });
        }
      }
      
      if (method === 'DELETE' && id) {
        console.log('[CONTACTS] DELETE - Deleting contact:', id);
        try {
          const response = await fetch(`${GHL_API_URL}/contacts/${id}`, { method: 'DELETE', headers });
          console.log('[CONTACTS] Delete response:', response.status);
          
          if (!response.ok) {
            const error = await response.text();
            console.error('[CONTACTS] ❌ Delete failed:', error);
          }
          
          return res.status(response.ok ? 204 : response.status).end();
        } catch (error) {
          console.error('[CONTACTS] ❌ Exception deleting contact:', error);
          return res.status(500).json({ error: 'Exception deleting contact', details: String(error) });
        }
      }
    }

    // ============ OPPORTUNITIES (Properties) ============
if (resource === 'opportunities') {
  let pipelineId = query.pipeline as string;
  if (!pipelineId) {
    const pipelineType = query.pipelineType as string;
    switch (pipelineType) {
      case 'buyer-acquisition':
        pipelineId = BUYER_DISPOSITION_PIPELINE_ID;
        break;
      case 'buyer-disposition':
        pipelineId = BUYER_DISPOSITION_PIPELINE_ID;
        break;
      case 'deal-acquisition':
        pipelineId = DEAL_ACQUISITION_PIPELINE_ID;
        break;
      case 'seller-acquisition':
      default:
        pipelineId = SELLER_ACQUISITION_PIPELINE_ID;
        break;
    }
  }

  if (method === 'GET') {
    if (id) {
      const response = await fetch(`${GHL_API_URL}/opportunities/${id}`, { headers });
      return res.status(response.ok ? 200 : response.status).json(await response.json());
    }

    const limit = parseInt((query.limit as string) || '100', 10);
    let allOpportunities: any[] = [];
    let page = 1;
    let hasMore = true;

    // Check if contactId filter is provided - use GET search with query params
    const contactIdFilter = query.contactId as string;

    while (hasMore) {
      // Build query parameters for the search endpoint (GET request)
      const searchParams = new URLSearchParams();
      searchParams.set('location_id', GHL_LOCATION_ID as string);
      searchParams.set('limit', String(limit));
      searchParams.set('page', String(page));

      // Add optional filters
      if (pipelineId) searchParams.set('pipeline_id', pipelineId);
      if (query.status) searchParams.set('status', query.status as string);
      if (query.stageId) searchParams.set('pipeline_stage_id', query.stageId as string);
      if (contactIdFilter) searchParams.set('contact_id', contactIdFilter);

      const response = await fetch(
        `${GHL_API_URL}/opportunities/search?${searchParams.toString()}`,
        { method: 'GET', headers }
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        return res.status(response.status).json(errorData);
      }
      
      const data = await response.json();
      const opportunities = data.opportunities || [];
      allOpportunities = allOpportunities.concat(opportunities);
      
      if (opportunities.length < limit) {
        hasMore = false;
      } else if (page >= 50) {
        hasMore = false;
      } else {
        page++;
      }
    }
    
    console.log('[OPPORTUNITIES] Pre-filter:', {
      totalOpportunities: allOpportunities.length,
      requestedPipelineId: pipelineId,
    });
    
    if (pipelineId) {
      allOpportunities = allOpportunities.filter(
        (opp: any) => opp.pipelineId === pipelineId
      );
      console.log('[OPPORTUNITIES] Post-filter:', {
        filteredCount: allOpportunities.length,
        pipelineId
      });
    }
    
    // ✅ FETCH FULL CONTACT DETAILS FOR EACH OPPORTUNITY (with rate limiting)
    console.log('[OPPORTUNITIES] Fetching contact details for', allOpportunities.length, 'opportunities');

    // Process in batches to avoid rate limiting
    const BATCH_SIZE = 5; // Process 5 contacts at a time
    const DELAY_BETWEEN_BATCHES = 200; // 200ms delay between batches

    const opportunitiesWithContacts: any[] = [];

    for (let i = 0; i < allOpportunities.length; i += BATCH_SIZE) {
      const batch = allOpportunities.slice(i, i + BATCH_SIZE);

      const batchResults = await Promise.all(
        batch.map(async (opp) => {
          if (!opp.contactId) return opp;

          try {
            const contactResponse = await fetch(
              `${GHL_API_URL}/contacts/${opp.contactId}`,
              { headers }
            );

            if (contactResponse.ok) {
              const contactData = await contactResponse.json();
              const contact = contactData.contact;
              // Build name from firstName + lastName if name is not available
              const contactName = contact.name ||
                [contact.firstName, contact.lastName].filter(Boolean).join(' ') ||
                contact.email ||
                'Unknown';
              return {
                ...opp,
                contact: {
                  id: contact.id,
                  name: contactName,
                  firstName: contact.firstName,
                  lastName: contact.lastName,
                  email: contact.email,
                  phone: contact.phone,
                  customFields: contact.customFields || [],
                }
              };
            } else if (contactResponse.status === 429) {
              console.warn('[OPPORTUNITIES] Rate limited on contact fetch, skipping for now...');
              // If rate limited, return without contact details
              return opp;
            }
          } catch (err) {
            console.error('[OPPORTUNITIES] Failed to fetch contact:', opp.contactId, err);
          }

          return opp;
        })
      );

      opportunitiesWithContacts.push(...batchResults);

      // Add delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < allOpportunities.length) {
        console.log(`[OPPORTUNITIES] Processed batch ${Math.floor(i/BATCH_SIZE) + 1}, waiting ${DELAY_BETWEEN_BATCHES}ms...`);
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }

    console.log('[OPPORTUNITIES] ✅ Contacts fetched! Sample:', {
      opportunityId: opportunitiesWithContacts[0]?.id,
      contactId: opportunitiesWithContacts[0]?.contact?.id,
      hasCustomFields: !!opportunitiesWithContacts[0]?.contact?.customFields,
      customFieldsCount: opportunitiesWithContacts[0]?.contact?.customFields?.length,
      totalProcessed: opportunitiesWithContacts.length
    });
    
    return res.status(200).json({ 
      opportunities: opportunitiesWithContacts,
      count: opportunitiesWithContacts.length,
      pipelineId
    });
  }
      
      if (method === 'POST') {
        const payload = { ...body, locationId: GHL_LOCATION_ID, pipelineId };
        const response = await fetch(`${GHL_API_URL}/opportunities`, {
          method: 'POST', headers, body: JSON.stringify(payload)
        });
        return res.status(response.ok ? 201 : response.status).json(await response.json());
      }
      
      if (method === 'PUT' && id) {
        console.log('[OPPORTUNITIES] PUT - Updating opportunity:', id);
        console.log('[OPPORTUNITIES] PUT - Request body:', JSON.stringify(body).substring(0, 500));

        // Remove 'id' from body since it's already in the URL - GHL API doesn't accept id in body
        const { id: _id, ...bodyWithoutId } = body;

        // Transform customFields from object to array format if needed
        let payload = bodyWithoutId;
        if (bodyWithoutId.customFields && !Array.isArray(bodyWithoutId.customFields)) {
          // Convert { fieldId: value } to [{ id: fieldId, key: fieldId, field_value: value }]
          // GHL API expects 'id', 'key', and 'field_value' properties for custom field updates
          payload = {
            ...bodyWithoutId,
            customFields: Object.entries(bodyWithoutId.customFields).map(([fieldId, value]) => ({
              id: fieldId,
              key: fieldId,
              field_value: value
            }))
          };
        }

        console.log('[OPPORTUNITIES] PUT - Transformed payload:', JSON.stringify(payload).substring(0, 500));

        const response = await fetch(`${GHL_API_URL}/opportunities/${id}`, {
          method: 'PUT', headers, body: JSON.stringify(payload)
        });

        const responseData = await response.json();
        console.log('[OPPORTUNITIES] PUT - Response:', response.status, response.ok ? 'OK' : 'FAILED');
        console.log('[OPPORTUNITIES] PUT - Full response data:', JSON.stringify(responseData).substring(0, 1000));
        if (!response.ok) {
          console.error('[OPPORTUNITIES] PUT - Error response:', JSON.stringify(responseData));
        }

        return res.status(response.ok ? 200 : response.status).json(responseData);
      }
      
      if (method === 'DELETE' && id) {
        const response = await fetch(`${GHL_API_URL}/opportunities/${id}`, { method: 'DELETE', headers });
        return res.status(response.ok ? 204 : response.status).end();
      }
    }

    // ============ PIPELINES ============
    // Get all pipelines with their stages
    if (resource === 'pipelines') {
      if (method === 'GET') {
        const response = await fetch(
          `${GHL_API_URL}/opportunities/pipelines?locationId=${GHL_LOCATION_ID}`, 
          { headers }
        );
        return res.status(response.ok ? 200 : response.status).json(await response.json());
      }
    }

    // ============ TAGS ============
    // Scopes: locations/tags.readonly, locations/tags.write
    if (resource === 'tags') {
      if (method === 'GET') {
        const response = await fetch(
          `${GHL_API_URL}/locations/${GHL_LOCATION_ID}/tags`, { headers }
        );
        return res.status(response.ok ? 200 : response.status).json(await response.json());
      }
      
      if (method === 'POST') {
        const response = await fetch(
          `${GHL_API_URL}/locations/${GHL_LOCATION_ID}/tags`,
          { method: 'POST', headers, body: JSON.stringify(body) }
        );
        return res.status(response.ok ? 201 : response.status).json(await response.json());
      }
      
      if (method === 'PUT' && id) {
        const response = await fetch(
          `${GHL_API_URL}/locations/${GHL_LOCATION_ID}/tags/${id}`,
          { method: 'PUT', headers, body: JSON.stringify(body) }
        );
        return res.status(response.ok ? 200 : response.status).json(await response.json());
      }
      
      if (method === 'DELETE' && id) {
        const response = await fetch(
          `${GHL_API_URL}/locations/${GHL_LOCATION_ID}/tags/${id}`,
          { method: 'DELETE', headers }
        );
        return res.status(response.ok ? 204 : response.status).end();
      }
    }

    // ============ CUSTOM FIELDS ============
    // Scopes: locations/customFields.readonly, locations/customFields.write
    if (resource === 'custom-fields') {
      if (method === 'GET') {
        const model = (query.model as string) || 'opportunity';
        const params = model !== 'all' ? `?model=${model}` : '';
        
        const response = await fetch(
          `${GHL_API_URL}/locations/${GHL_LOCATION_ID}/customFields${params}`, { headers }
        );
        return res.status(response.ok ? 200 : response.status).json(await response.json());
      }
      
      if (method === 'POST') {
        const response = await fetch(
          `${GHL_API_URL}/locations/${GHL_LOCATION_ID}/customFields`,
          { method: 'POST', headers, body: JSON.stringify(body) }
        );
        return res.status(response.ok ? 201 : response.status).json(await response.json());
      }
      
      if (method === 'PUT' && id) {
        const response = await fetch(
          `${GHL_API_URL}/locations/${GHL_LOCATION_ID}/customFields/${id}`,
          { method: 'PUT', headers, body: JSON.stringify(body) }
        );
        return res.status(response.ok ? 200 : response.status).json(await response.json());
      }
      
      if (method === 'DELETE' && id) {
        const response = await fetch(
          `${GHL_API_URL}/locations/${GHL_LOCATION_ID}/customFields/${id}`,
          { method: 'DELETE', headers }
        );
        return res.status(response.ok ? 204 : response.status).end();
      }
    }

    // ============ CUSTOM VALUES ============
    // Scopes: locations/customValues.readonly, locations/customValues.write
    if (resource === 'custom-values') {
      if (method === 'GET') {
        const response = await fetch(
          `${GHL_API_URL}/locations/${GHL_LOCATION_ID}/customValues`, { headers }
        );
        return res.status(response.ok ? 200 : response.status).json(await response.json());
      }
      
      if (method === 'POST') {
        const response = await fetch(
          `${GHL_API_URL}/locations/${GHL_LOCATION_ID}/customValues`,
          { method: 'POST', headers, body: JSON.stringify(body) }
        );
        return res.status(response.ok ? 201 : response.status).json(await response.json());
      }
      
      if (method === 'PUT' && id) {
        const response = await fetch(
          `${GHL_API_URL}/locations/${GHL_LOCATION_ID}/customValues/${id}`,
          { method: 'PUT', headers, body: JSON.stringify(body) }
        );
        return res.status(response.ok ? 200 : response.status).json(await response.json());
      }
      
      if (method === 'DELETE' && id) {
        const response = await fetch(
          `${GHL_API_URL}/locations/${GHL_LOCATION_ID}/customValues/${id}`,
          { method: 'DELETE', headers }
        );
        return res.status(response.ok ? 204 : response.status).end();
      }
    }

    // ============ CALENDARS ============
    // Scopes: calendars.readonly, calendars.write, calendars/groups, calendars/events, calendars/resources
    if (resource === 'calendars') {
      // Calendar Resources
      if (action === 'resources') {
        if (method === 'GET') {
          const response = await fetch(
            `${GHL_API_URL}/calendars/resources?locationId=${GHL_LOCATION_ID}`, { headers }
          );
          return res.status(response.ok ? 200 : response.status).json(await response.json());
        }
        if (method === 'POST') {
          const response = await fetch(
            `${GHL_API_URL}/calendars/resources`,
            { method: 'POST', headers, body: JSON.stringify({ ...body, locationId: GHL_LOCATION_ID }) }
          );
          return res.status(response.ok ? 201 : response.status).json(await response.json());
        }
        if (method === 'PUT' && id) {
          const response = await fetch(
            `${GHL_API_URL}/calendars/resources/${id}`,
            { method: 'PUT', headers, body: JSON.stringify(body) }
          );
          return res.status(response.ok ? 200 : response.status).json(await response.json());
        }
        if (method === 'DELETE' && id) {
          const response = await fetch(
            `${GHL_API_URL}/calendars/resources/${id}`,
            { method: 'DELETE', headers }
          );
          return res.status(response.ok ? 204 : response.status).end();
        }
      }
      
      // Calendar Groups
      if (action === 'groups') {
        if (method === 'GET') {
          const response = await fetch(
            `${GHL_API_URL}/calendars/groups?locationId=${GHL_LOCATION_ID}`, { headers }
          );
          return res.status(response.ok ? 200 : response.status).json(await response.json());
        }
        if (method === 'POST') {
          const response = await fetch(
            `${GHL_API_URL}/calendars/groups`,
            { method: 'POST', headers, body: JSON.stringify({ ...body, locationId: GHL_LOCATION_ID }) }
          );
          return res.status(response.ok ? 201 : response.status).json(await response.json());
        }
        if (method === 'PUT' && id) {
          const response = await fetch(
            `${GHL_API_URL}/calendars/groups/${id}`,
            { method: 'PUT', headers, body: JSON.stringify(body) }
          );
          return res.status(response.ok ? 200 : response.status).json(await response.json());
        }
        if (method === 'DELETE' && id) {
          const response = await fetch(
            `${GHL_API_URL}/calendars/groups/${id}`,
            { method: 'DELETE', headers }
          );
          return res.status(response.ok ? 204 : response.status).end();
        }
      }
      
      // Calendar Events
      if (action === 'events') {
        if (method === 'GET') {
          const params = new URLSearchParams({ locationId: GHL_LOCATION_ID });
          if (query.calendarId) params.append('calendarId', query.calendarId as string);
          if (query.startTime) params.append('startTime', query.startTime as string);
          if (query.endTime) params.append('endTime', query.endTime as string);
          
          const response = await fetch(
            `${GHL_API_URL}/calendars/events?${params}`, { headers }
          );
          return res.status(response.ok ? 200 : response.status).json(await response.json());
        }
        if (method === 'POST') {
          const response = await fetch(
            `${GHL_API_URL}/calendars/events`,
            { method: 'POST', headers, body: JSON.stringify({ ...body, locationId: GHL_LOCATION_ID }) }
          );
          return res.status(response.ok ? 201 : response.status).json(await response.json());
        }
        if (method === 'PUT' && id) {
          const response = await fetch(
            `${GHL_API_URL}/calendars/events/${id}`,
            { method: 'PUT', headers, body: JSON.stringify(body) }
          );
          return res.status(response.ok ? 200 : response.status).json(await response.json());
        }
        if (method === 'DELETE' && id) {
          const response = await fetch(
            `${GHL_API_URL}/calendars/events/${id}`,
            { method: 'DELETE', headers }
          );
          return res.status(response.ok ? 204 : response.status).end();
        }
      }
      
      // Base Calendars
      if (!action || action === 'list') {
        if (method === 'GET') {
          if (id) {
            const response = await fetch(`${GHL_API_URL}/calendars/${id}`, { headers });
            return res.status(response.ok ? 200 : response.status).json(await response.json());
          }
          const response = await fetch(
            `${GHL_API_URL}/calendars?locationId=${GHL_LOCATION_ID}`, { headers }
          );
          return res.status(response.ok ? 200 : response.status).json(await response.json());
        }
        if (method === 'POST') {
          const response = await fetch(
            `${GHL_API_URL}/calendars`,
            { method: 'POST', headers, body: JSON.stringify({ ...body, locationId: GHL_LOCATION_ID }) }
          );
          return res.status(response.ok ? 201 : response.status).json(await response.json());
        }
        if (method === 'PUT' && id) {
          const response = await fetch(
            `${GHL_API_URL}/calendars/${id}`,
            { method: 'PUT', headers, body: JSON.stringify(body) }
          );
          return res.status(response.ok ? 200 : response.status).json(await response.json());
        }
        if (method === 'DELETE' && id) {
          const response = await fetch(
            `${GHL_API_URL}/calendars/${id}`,
            { method: 'DELETE', headers }
          );
          return res.status(response.ok ? 204 : response.status).end();
        }
      }
    }

    // ============ FORMS ============
    // Scopes: forms.readonly, forms.write
    // Note: GHL doesn't have a public API for form submissions
    // Instead, we create a contact with the form data which achieves the same result
    if (resource === 'forms') {
      // Submit form - Creates a contact with the form data
      if (method === 'POST' && action === 'submit' && id) {
        console.log('[FORMS] Submitting form:', id, 'Body:', JSON.stringify(body));
        
        // Map form fields to contact fields
        const contactData: any = {
          locationId: GHL_LOCATION_ID,
          source: `Form: ${id}`, // Track which form it came from
        };
        
        // Standard field mappings
        if (body.first_name) contactData.firstName = body.first_name;
        if (body.last_name) contactData.lastName = body.last_name;
        if (body.email) contactData.email = body.email;
        if (body.phone) contactData.phone = body.phone;
        if (body.address) contactData.address1 = body.address;
        if (body.city) contactData.city = body.city;
        if (body.state) contactData.state = body.state;
        if (body.postal_code || body.zip) contactData.postalCode = body.postal_code || body.zip;
        
        // Store additional form data in customFields or tags
        const customFields: Array<{ key: string; field_value: string }> = [];
        const tags: string[] = [];

        // Add "website app" tag for all form submissions (indicates source)
        tags.push('website app'); // GHL Tag ID: 2GVgv9cfpX0AVP5SRpdt

        // Add "offer made" tag when offer is submitted (triggers workflow)
        if (body.offer_amount) {
          tags.push('offer made'); // GHL Tag ID: AvpDImBY9o6NZam9VCrq
          // Workflow ID: 46fa1e6c-601e-4d65-a85e-32adae4158ac
        }
        
        // Add property info as custom fields
        if (body.property_address) {
          customFields.push({ key: 'property_address', field_value: body.property_address });
        }
        if (body.property_city) {
          customFields.push({ key: 'property_city', field_value: body.property_city });
        }
        if (body.property_price) {
          customFields.push({ key: 'property_price', field_value: body.property_price });
        }
        if (body.offer_amount) {
          customFields.push({ key: 'offer_amount', field_value: body.offer_amount });
        }
        if (body.listing_message || body.message) {
          // Use 'message' as the custom field key to match GHL_CUSTOM_FIELDS_SETUP.md
          // This is accessible as {{contact.message}} in GHL workflows
          customFields.push({ key: 'message', field_value: body.listing_message || body.message });
        }
        
        if (tags.length > 0) contactData.tags = tags;
        if (customFields.length > 0) contactData.customFields = customFields;
        
        console.log('[FORMS] Creating contact with data:', JSON.stringify(contactData));
        
        try {
          // Create the contact
          const response = await fetch(`${GHL_API_URL}/contacts/`, {
            method: 'POST',
            headers,
            body: JSON.stringify(contactData)
          });
          
          const responseText = await response.text();
          console.log('[FORMS] Contact creation response:', response.status, responseText.substring(0, 500));
          
          let data;
          try {
            data = JSON.parse(responseText);
          } catch {
            data = { message: responseText };
          }
          
          if (!response.ok) {
            console.error('[FORMS] ❌ Contact creation failed:', data);
            return res.status(response.status).json({
              success: false,
              error: 'Failed to submit form',
              details: data
            });
          }
          
          console.log('[FORMS] ✅ Contact created successfully:', data.contact?.id || data.id);
          return res.status(200).json({
            success: true,
            message: 'Form submitted successfully',
            contactId: data.contact?.id || data.id,
            contact: data.contact || data
          });
        } catch (error) {
          console.error('[FORMS] ❌ Exception:', error);
          return res.status(500).json({
            success: false,
            error: 'Failed to submit form',
            details: error instanceof Error ? error.message : String(error)
          });
        }
      }
      
      if (method === 'GET') {
        if (id) {
          const response = await fetch(`${GHL_API_URL}/forms/${id}`, { headers });
          return res.status(response.ok ? 200 : response.status).json(await response.json());
        }
        
        const params = new URLSearchParams({ locationId: GHL_LOCATION_ID });
        if (query.limit) params.append('limit', query.limit as string);
        if (query.skip) params.append('skip', query.skip as string);
        
        const response = await fetch(`${GHL_API_URL}/forms?${params}`, { headers });
        return res.status(response.ok ? 200 : response.status).json(await response.json());
      }
    }

    // ============ SOCIAL PLANNER ============
    // Scopes: socialplanner/account, socialplanner/post, socialplanner/category, socialplanner/tag, socialplanner/statistics
    if (resource === 'social') {
      // Social Accounts
      if (action === 'accounts') {
        if (method === 'GET') {
          const response = await fetch(
            `${GHL_API_URL}/social-media-posting/${GHL_LOCATION_ID}/accounts`, { headers }
          );
          const data = await response.json();
          console.log('[SOCIAL ACCOUNTS] Raw response:', JSON.stringify(data, null, 2));
          // GHL returns { results: { accounts: [...] } }, normalize to { accounts: [...] }
          const accounts = data.results?.accounts || data.accounts || [];
          // Add isActive field based on isExpired and deleted status
          const normalizedAccounts = accounts.map((acc: Record<string, unknown>) => ({
            ...acc,
            isActive: !acc.isExpired && !acc.deleted,
            accountName: acc.name || acc.accountName,
          }));
          console.log('[SOCIAL ACCOUNTS] Normalized accounts:', JSON.stringify(normalizedAccounts.map((a: Record<string, unknown>) => ({ id: a.id, profileId: a.profileId, name: a.name, platform: a.platform })), null, 2));
          return res.status(response.ok ? 200 : response.status).json({ accounts: normalizedAccounts });
        }
        if (method === 'DELETE' && id) {
          const response = await fetch(
            `${GHL_API_URL}/social-media-posting/${GHL_LOCATION_ID}/accounts/${id}`,
            { method: 'DELETE', headers }
          );
          return res.status(response.ok ? 204 : response.status).end();
        }
      }
      
      // Social Posts
      // GHL API uses POST /posts/list to get posts (not GET /posts)
      if (action === 'posts') {
        if (method === 'GET') {
          // Build request body for POST /posts/list endpoint
          // Note: GHL doesn't support status filter in body, we filter on our side
          const listBody: Record<string, unknown> = {};
          if (query.limit) listBody.limit = parseInt(query.limit as string, 10);
          if (query.skip) listBody.skip = parseInt(query.skip as string, 10);

          const response = await fetch(
            `${GHL_API_URL}/social-media-posting/${GHL_LOCATION_ID}/posts/list`,
            {
              method: 'POST',
              headers: { ...headers, 'Content-Type': 'application/json' },
              body: JSON.stringify(listBody)
            }
          );
          const data = await response.json();
          // Normalize response and filter by status if requested
          let posts = data.results?.posts || data.posts || [];
          if (query.status) {
            posts = posts.filter((p: Record<string, unknown>) => p.status === query.status);
          }
          return res.status(response.ok ? 200 : response.status).json({ posts });
        }

        if (method === 'POST') {
          // GHL API requires type, userId, and media fields
          // Normalize media type to image/jpeg (GHL prefers this for publishing)
          const normalizedMedia = body.media?.map((m: { url: string; type?: string }) => ({
            url: m.url,
            type: m.type === 'image/png' ? 'image/jpeg' : (m.type || 'image/jpeg'),
          })) || [];

          const postBody = {
            ...body,
            type: body.type || 'post',  // Default to 'post' if not specified
            userId: GHL_LOCATION_ID,     // Required by GHL API
            media: normalizedMedia,      // Required: must be array (can be empty)
          };
          console.log('[SOCIAL POSTS] Creating post with body:', JSON.stringify(postBody, null, 2));
          const response = await fetch(
            `${GHL_API_URL}/social-media-posting/${GHL_LOCATION_ID}/posts`,
            { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(postBody) }
          );
          const responseData = await response.json();
          console.log('[SOCIAL POSTS] Response status:', response.status, response.ok ? 'OK' : 'FAILED');
          console.log('[SOCIAL POSTS] Response data:', JSON.stringify(responseData, null, 2));
          if (!response.ok) {
            console.error('[SOCIAL POSTS] Error creating post:', responseData);
          }
          return res.status(response.ok ? 201 : response.status).json(responseData);
        }
        
        if (method === 'PUT' && id) {
          const response = await fetch(
            `${GHL_API_URL}/social-media-posting/${GHL_LOCATION_ID}/posts/${id}`,
            { method: 'PUT', headers, body: JSON.stringify(body) }
          );
          return res.status(response.ok ? 200 : response.status).json(await response.json());
        }
        
        if (method === 'DELETE' && id) {
          const response = await fetch(
            `${GHL_API_URL}/social-media-posting/${GHL_LOCATION_ID}/posts/${id}`,
            { method: 'DELETE', headers }
          );
          return res.status(response.ok ? 204 : response.status).end();
        }
      }
      
      // Social Categories
      if (action === 'categories') {
        if (method === 'GET') {
          const response = await fetch(
            `${GHL_API_URL}/social-media-posting/${GHL_LOCATION_ID}/categories`, { headers }
          );
          return res.status(response.ok ? 200 : response.status).json(await response.json());
        }
      }
      
      // Social Tags
      if (action === 'tags') {
        if (method === 'GET') {
          const response = await fetch(
            `${GHL_API_URL}/social-media-posting/${GHL_LOCATION_ID}/tags`, { headers }
          );
          return res.status(response.ok ? 200 : response.status).json(await response.json());
        }
      }
      
      // Social Statistics - POST request with accountIds in body
      // GHL API: POST /social-media-posting/{locationId}/statistics
      // Body: { accountIds: string[], fromDate?: string, toDate?: string }
      // Returns: Analytics data for last 7 days with comparison to previous 7 days
      if (action === 'statistics') {
        if (method === 'POST') {
          // Validate request body
          const { accountIds, fromDate, toDate } = body || {};

          if (!accountIds || !Array.isArray(accountIds) || accountIds.length === 0) {
            return res.status(400).json({
              error: 'accountIds array is required',
              message: 'Please provide at least one account ID to fetch statistics'
            });
          }

          if (accountIds.length > 100) {
            return res.status(400).json({
              error: 'Too many accounts',
              message: 'Maximum 100 accounts per request'
            });
          }

          // GHL API uses 'profileIds' - these should be profileId values from /accounts endpoint
          // Valid platforms: facebook, instagram, linkedin, google, pinterest, youtube, tiktok, threads, bluesky
          const requestBody: Record<string, unknown> = {
            profileIds: accountIds,
            platforms: ['facebook', 'instagram', 'linkedin', 'google', 'pinterest', 'youtube', 'tiktok', 'threads', 'bluesky']
          };

          const response = await fetch(
            `${GHL_API_URL}/social-media-posting/statistics?locationId=${GHL_LOCATION_ID}`,
            {
              method: 'POST',
              headers: {
                ...headers,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Version': '2021-07-28'
              },
              body: JSON.stringify(requestBody)
            }
          );

          const data = await response.json();

          // Transform GHL response to match our interface
          const results = data.results || {};
          const totals = results.totals || {};
          const breakdowns = results.breakdowns || {};

          const transformedResponse = {
            kpis: {
              posts: { value: totals.posts || 0, change: parseFloat(breakdowns.posts?.totalChange) || 0 },
              likes: { value: totals.likes || 0, change: 0 },
              comments: { value: totals.comments || 0, change: 0 },
              followers: { value: totals.followers || 0, change: 0 },
              impressions: { value: totals.impressions || 0, change: parseFloat(breakdowns.impressions?.totalChange) || 0 },
              reach: { value: breakdowns.reach?.total || 0, change: parseFloat(breakdowns.reach?.totalChange) || 0 },
              engagement: { value: 0, change: 0 },
            },
            platformBreakdown: {
              facebook: {
                posts: breakdowns.posts?.platforms?.facebook?.value || 0,
                postsChange: breakdowns.posts?.platforms?.facebook?.change || 0,
                likes: breakdowns.engagement?.facebook?.likes || 0,
                likesChange: 0,
                comments: breakdowns.engagement?.facebook?.comments || 0,
                commentsChange: 0,
                followers: results.platformTotals?.followers?.facebook?.total || 0,
                followersChange: 0,
                impressions: breakdowns.impressions?.platforms?.facebook?.value || 0,
                impressionsChange: parseFloat(breakdowns.impressions?.platforms?.facebook?.change) || 0,
                reach: breakdowns.reach?.platforms?.facebook?.value || 0,
                reachChange: parseFloat(breakdowns.reach?.platforms?.facebook?.change) || 0,
                engagement: (breakdowns.engagement?.facebook?.likes || 0) + (breakdowns.engagement?.facebook?.comments || 0) + (breakdowns.engagement?.facebook?.shares || 0),
                engagementChange: breakdowns.engagement?.facebook?.change || 0,
              },
            },
            weeklyData: results.dayRange?.map((day: string, i: number) => ({
              date: day,
              posts: results.postPerformance?.posts?.facebook?.[i] || 0,
              engagement: results.postPerformance?.likes?.[i] || 0,
              impressions: results.postPerformance?.impressions?.[i] || 0,
            })) || [],
            rawData: data, // Include raw data for debugging
          };

          return res.status(response.ok ? 200 : response.status).json(transformedResponse);
        }

        // Keep GET for backwards compatibility (will return error from GHL)
        if (method === 'GET') {
          return res.status(400).json({
            error: 'Method not allowed',
            message: 'Statistics endpoint requires POST with accountIds in body'
          });
        }
      }
    }

    // ============ MEDIA ============
    // Scopes: medias.readonly, medias.write
    if (resource === 'media') {
      if (method === 'GET') {
        if (id) {
          const response = await fetch(`${GHL_API_URL}/medias/${id}`, { headers });
          return res.status(response.ok ? 200 : response.status).json(await response.json());
        }
        
        const params = new URLSearchParams({ altId: GHL_LOCATION_ID, altType: 'location' });
        if (query.folderId) params.append('parentId', query.folderId as string);
        if (query.limit) params.append('limit', query.limit as string);
        
        const response = await fetch(`${GHL_API_URL}/medias/files?${params}`, { headers });
        return res.status(response.ok ? 200 : response.status).json(await response.json());
      }
      
      if (method === 'POST' && action === 'upload') {
        // If fileUrl is provided, use the hosted upload method
        if (body.fileUrl) {
          const payload = {
            altId: GHL_LOCATION_ID,
            altType: 'location',
            name: body.name,
            hosted: true,
            fileUrl: body.fileUrl
          };
          const response = await fetch(`${GHL_API_URL}/medias/upload-file`, {
            method: 'POST', headers, body: JSON.stringify(payload)
          });
          return res.status(response.ok ? 201 : response.status).json(await response.json());
        }

        // If base64 data is provided, upload using multipart form-data
        if (body.base64Data) {
          console.log('[MEDIA] Uploading base64 image to GHL media library');

          // Decode base64 to buffer
          const base64Content = body.base64Data.replace(/^data:image\/\w+;base64,/, '');
          const fileBuffer = Buffer.from(base64Content, 'base64');
          console.log('[MEDIA] File buffer size:', fileBuffer.length, 'bytes');

          // Create form data for multipart upload
          const form = new FormData();
          form.append('file', fileBuffer, {
            filename: body.name || `image-${Date.now()}.png`,
            contentType: body.contentType || 'image/png'
          });
          form.append('hosted', 'false');
          form.append('name', body.name || `image-${Date.now()}.png`);

          const formBuffer = form.getBuffer();
          const response = await fetch(
            `${GHL_API_URL}/medias/upload-file?altId=${GHL_LOCATION_ID}&altType=location`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${GHL_API_KEY}`,
                'Version': '2021-07-28',
                ...form.getHeaders()
              },
              body: new Uint8Array(formBuffer)
            }
          );

          const responseText = await response.text();
          console.log('[MEDIA] Upload response:', response.status, responseText.substring(0, 500));

          let data;
          try {
            data = responseText ? JSON.parse(responseText) : {};
          } catch {
            data = { message: responseText };
          }

          if (!response.ok) {
            console.error('[MEDIA] Upload failed:', data);
            return res.status(response.status).json(data);
          }

          return res.status(201).json(data);
        }

        // Fallback for old method (won't work for actual file uploads)
        const payload = {
          altId: GHL_LOCATION_ID,
          altType: 'location',
          name: body.name,
          file: body.file
        };
        const response = await fetch(`${GHL_API_URL}/medias/upload-file`, {
          method: 'POST', headers, body: JSON.stringify(payload)
        });
        return res.status(response.ok ? 201 : response.status).json(await response.json());
      }
      
      if (method === 'DELETE' && id) {
        const response = await fetch(
          `${GHL_API_URL}/medias/${id}?altId=${GHL_LOCATION_ID}&altType=location`,
          { method: 'DELETE', headers }
        );
        return res.status(response.ok ? 204 : response.status).end();
      }

      // Get folders list
      if (method === 'GET' && action === 'folders') {
        console.log('[MEDIA] Fetching folders');
        const params = new URLSearchParams({
          altId: GHL_LOCATION_ID as string,
          altType: 'location',
          type: 'folder'
        });
        if (query.parentId) params.append('parentId', query.parentId as string);

        const response = await fetch(`${GHL_API_URL}/medias/files?${params}`, { headers });
        const data = await response.json();
        console.log('[MEDIA] Folders response:', response.status, data);
        return res.status(response.ok ? 200 : response.status).json(data);
      }

      // Create folder
      if (method === 'POST' && action === 'create-folder') {
        console.log('[MEDIA] Creating folder:', body.name);
        const payload = {
          altId: GHL_LOCATION_ID,
          altType: 'location',
          name: body.name,
          parentId: body.parentId || null
        };
        const response = await fetch(`${GHL_API_URL}/medias/`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });
        const data = await response.json();
        console.log('[MEDIA] Create folder response:', response.status, data);
        return res.status(response.ok ? 201 : response.status).json(data);
      }

      // Move file to folder (update file's parentId)
      if (method === 'PUT' && action === 'move') {
        console.log('[MEDIA] Moving file:', id, 'to folder:', body.folderId);
        const payload = {
          altId: GHL_LOCATION_ID,
          altType: 'location',
          parentId: body.folderId || null // null to move to root
        };
        const response = await fetch(`${GHL_API_URL}/medias/${id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(payload)
        });
        const data = await response.json();
        console.log('[MEDIA] Move file response:', response.status, data);
        return res.status(response.ok ? 200 : response.status).json(data);
      }
    }

    // ============ DOCUMENTS & CONTRACTS ============
    // Scopes: documents_contracts_template/list.readonly, documents_contracts_template/sendLink.write
    // Scopes: documents_contracts/list.readonly, documents_contracts/sendLink.write
    // Base path: /proposals
    if (resource === 'documents') {
      console.log('[DOCUMENTS] Handling documents resource:', { action, method, id });
      
      // Document Templates
      if (action === 'templates') {
        if (method === 'GET') {
          console.log('[DOCUMENTS] Fetching templates');
          const params = new URLSearchParams({ locationId: GHL_LOCATION_ID });
          if (query.limit) params.append('limit', query.limit as string);
          if (query.skip) params.append('skip', query.skip as string);
          
          // GHL API path: /proposals/templates
          const url = `${GHL_API_URL}/proposals/templates?${params}`;
          console.log('[DOCUMENTS] Templates URL:', url);
          
          const response = await fetch(url, { headers });
          
          // Check if response has content before parsing
          const text = await response.text();
          console.log('[DOCUMENTS] Templates response text length:', text.length);
          
          let data;
          try {
            if (text) {
              const parsed = JSON.parse(text);
              console.log('[DOCUMENTS] Raw templates response:', JSON.stringify(parsed).substring(0, 500));
              // GHL returns { data: [...], total: X } or { templates: [...] }
              data = {
                templates: parsed.data || parsed.templates || [],
                total: parsed.total || parsed.data?.length || parsed.templates?.length || 0,
                traceId: parsed.traceId
              };
            } else {
              data = { templates: [], total: 0 };
            }
          } catch (e) {
            console.error('[DOCUMENTS] Failed to parse response:', text.substring(0, 200));
            data = { templates: [], total: 0 };
          }
          
          console.log('[DOCUMENTS] Templates response:', {
            status: response.status,
            ok: response.ok,
            hasTemplates: !!data.templates,
            count: data.templates?.length,
            total: data.total
          });
          
          return res.status(response.ok ? 200 : response.status).json(data);
        }
        
        // Send template link
        if (method === 'POST' && id) {
          console.log('[DOCUMENTS] Sending template:', id);
          const response = await fetch(
            `${GHL_API_URL}/proposals/templates/${id}/send`,
            { method: 'POST', headers, body: JSON.stringify({ ...body, locationId: GHL_LOCATION_ID }) }
          );
          const text = await response.text();
          const data = text ? JSON.parse(text) : {};
          console.log('[DOCUMENTS] Send template response:', response.status, response.ok);
          return res.status(response.ok ? 200 : response.status).json(data);
        }
      }
      
      // Document Contracts (sent documents)
      if (action === 'contracts') {
        if (method === 'GET') {
          console.log('[DOCUMENTS] Fetching contracts/documents');
          const params = new URLSearchParams({ locationId: GHL_LOCATION_ID });
          if (query.contactId) params.append('contactId', query.contactId as string);
          if (query.limit) params.append('limit', query.limit as string);
          if (query.skip) params.append('skip', query.skip as string);
          if (query.status) params.append('status', query.status as string);
          if (query.query) params.append('query', query.query as string);
          
          const url = `${GHL_API_URL}/proposals/document?${params}`;
          console.log('[DOCUMENTS] Contracts URL:', url);
          
          const response = await fetch(url, { headers });
          
          // Check if response has content before parsing
          const text = await response.text();
          console.log('[DOCUMENTS] Contracts response text length:', text.length);
          
          let data;
          try {
            if (text) {
              const parsed = JSON.parse(text);
              console.log('[DOCUMENTS] Raw GHL response:', JSON.stringify(parsed).substring(0, 500));
              // GHL returns { data: [...], total: X } or { documents: [...] }
              data = {
                documents: parsed.data || parsed.documents || [],
                total: parsed.total || parsed.data?.length || parsed.documents?.length || 0,
                traceId: parsed.traceId
              };
            } else {
              data = { documents: [], total: 0 };
            }
          } catch (e) {
            console.error('[DOCUMENTS] Failed to parse response:', text.substring(0, 200));
            data = { documents: [], total: 0 };
          }
          
          console.log('[DOCUMENTS] Contracts response:', {
            status: response.status,
            ok: response.ok,
            hasDocuments: !!data.documents,
            count: data.documents?.length,
            total: data.total
          });
          
          return res.status(response.ok ? 200 : response.status).json(data);
        }
        
        // Send document link
        if (method === 'POST' && id) {
          console.log('[DOCUMENTS] Sending document:', id);
          const response = await fetch(
            `${GHL_API_URL}/proposals/documents/${id}/send`,
            { method: 'POST', headers, body: JSON.stringify(body) }
          );
          const text = await response.text();
          const data = text ? JSON.parse(text) : {};
          console.log('[DOCUMENTS] Send document response:', response.status, response.ok);
          return res.status(response.ok ? 200 : response.status).json(data);
        }
      }
      
      // Legacy documents endpoint (backward compatibility)
      if (!action) {
        if (method === 'GET') {
          const params = new URLSearchParams({ locationId: GHL_LOCATION_ID });
          const response = await fetch(`${GHL_API_URL}/proposals/documents?${params}`, { headers });
          const text = await response.text();
          const data = text ? JSON.parse(text) : { documents: [] };
          return res.status(response.ok ? 200 : response.status).json(data);
        }
        
        if (method === 'POST') {
          if (id) {
            // Send document
            const response = await fetch(`${GHL_API_URL}/proposals/documents/${id}/send`, {
              method: 'POST', headers, body: JSON.stringify(body)
            });
            const text = await response.text();
            const data = text ? JSON.parse(text) : {};
            return res.status(response.ok ? 200 : response.status).json(data);
          }
          
          const response = await fetch(`${GHL_API_URL}/proposals/documents`, {
            method: 'POST', headers, body: JSON.stringify({ ...body, locationId: GHL_LOCATION_ID })
          });
          const text = await response.text();
          const data = text ? JSON.parse(text) : {};
          return res.status(response.ok ? 201 : response.status).json(data);
        }
      }
    }

    // ============ MESSAGES ============
    // For sending emails and SMS via Conversations API
    // Docs: https://marketplace.gohighlevel.com/docs/ghl/conversations/send-a-new-message
    if (resource === 'messages') {
      // Send email or SMS with optional attachments
      if (method === 'POST' && action === 'send') {
        const {
          type,
          contactId,
          message,
          html,
          subject,
          attachments,
          emailFrom,
          emailCc,
          emailBcc,
          emailTo,
          emailReplyMode,
          appointmentId,
          replyMessageId,
          templateId,
          threadId,
          scheduledTimestamp,
          conversationProviderId,
          fromNumber,
          toNumber,
          mentions
        } = body;

        console.log('[MESSAGES] Sending message:', {
          type: type || 'Email',
          contactId,
          hasMessage: !!message,
          hasHtml: !!html,
          hasAttachments: !!attachments,
          attachmentCount: attachments?.length
        });

        if (!contactId) {
          return res.status(400).json({ error: 'contactId is required' });
        }

        if (!message && !html) {
          return res.status(400).json({ error: 'message or html content is required' });
        }

        // Build message payload for Conversations API
        // Schema: https://marketplace.gohighlevel.com/docs/ghl/conversations/send-a-new-message
        const messagePayload: any = {
          type: type || 'Email', // 'Email', 'SMS', 'WhatsApp', etc.
          contactId,
        };

        // Add message content (html takes priority for emails)
        if (html) {
          messagePayload.html = html;
        }
        if (message) {
          messagePayload.message = message;
        }

        // Email-specific fields
        if (subject) messagePayload.subject = subject;
        if (emailFrom) messagePayload.emailFrom = emailFrom;
        if (emailTo) messagePayload.emailTo = emailTo;
        if (emailCc && Array.isArray(emailCc)) messagePayload.emailCc = emailCc;
        if (emailBcc && Array.isArray(emailBcc)) messagePayload.emailBcc = emailBcc;
        if (emailReplyMode) messagePayload.emailReplyMode = emailReplyMode; // 'reply_all' or 'reply'

        // Add attachments if provided (array of URLs from upload endpoint)
        if (attachments && Array.isArray(attachments) && attachments.length > 0) {
          messagePayload.attachments = attachments;
        }

        // Optional fields
        if (appointmentId) messagePayload.appointmentId = appointmentId;
        if (replyMessageId) messagePayload.replyMessageId = replyMessageId;
        if (templateId) messagePayload.templateId = templateId;
        if (threadId) messagePayload.threadId = threadId;
        if (scheduledTimestamp) messagePayload.scheduledTimestamp = scheduledTimestamp;
        if (conversationProviderId) messagePayload.conversationProviderId = conversationProviderId;
        if (fromNumber) messagePayload.fromNumber = fromNumber;
        if (toNumber) messagePayload.toNumber = toNumber;
        if (mentions && Array.isArray(mentions)) messagePayload.mentions = mentions;

        console.log('[MESSAGES] Payload:', JSON.stringify(messagePayload).substring(0, 300));

        // Use GHL_API_V2 for sending messages if available (has conversations.message.write scope)
        const messageApiKey = GHL_API_V2 || GHL_API_KEY;
        const messageHeaders = {
          'Authorization': `Bearer ${messageApiKey}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28',
        };
        console.log('[MESSAGES] Using API key:', GHL_API_V2 ? 'GHL_API_V2' : 'GHL_API_KEY');

        try {
          const response = await fetch(`${GHL_API_URL}/conversations/messages`, {
            method: 'POST',
            headers: messageHeaders,
            body: JSON.stringify(messagePayload)
          });

          const responseText = await response.text();
          console.log('[MESSAGES] Response:', response.status, responseText.substring(0, 200));

          let data;
          try {
            data = responseText ? JSON.parse(responseText) : {};
          } catch {
            data = { message: responseText };
          }

          if (!response.ok) {
            console.error('[MESSAGES] ❌ Send failed:', data);
            return res.status(response.status).json({
              error: 'Failed to send message',
              details: data
            });
          }

          console.log('[MESSAGES] ✅ Message sent successfully');
          return res.status(200).json({
            success: true,
            message: 'Message sent successfully',
            data
          });
        } catch (error) {
          console.error('[MESSAGES] ❌ Exception:', error);
          return res.status(500).json({
            error: 'Failed to send message',
            details: error instanceof Error ? error.message : String(error)
          });
        }
      }

      // Upload file attachment to get URL for use in messages
      // Endpoint: POST /conversations/messages/upload
      // Docs: https://marketplace.gohighlevel.com/docs/ghl/conversations/upload-file-attachments
      // Supported: JPG, JPEG, PNG, MP4, MPEG, ZIP, RAR, PDF, DOC, DOCX, TXT, MP3, WAV
      if (method === 'POST' && action === 'upload') {
        console.log('[MESSAGES] Uploading attachment');

        // File can be provided as base64 or buffer
        const { fileData, fileName, fileType } = body;

        if (!fileData) {
          return res.status(400).json({ error: 'fileData is required (base64 or buffer)' });
        }

        try {
          // Convert base64 to buffer if needed
          let fileBuffer: Buffer;
          if (typeof fileData === 'string') {
            // Remove data URL prefix if present (e.g., "data:application/pdf;base64,")
            const base64Data = fileData.replace(/^data:[^;]+;base64,/, '');
            fileBuffer = Buffer.from(base64Data, 'base64');
          } else {
            fileBuffer = Buffer.from(fileData);
          }

          console.log('[MESSAGES] File buffer size:', fileBuffer.length, 'bytes');

          // Create form data for multipart upload
          const form = new FormData();
          form.append('fileAttachment', fileBuffer, {
            filename: fileName || 'attachment.pdf',
            contentType: fileType || 'application/pdf'
          });

          console.log('[MESSAGES] Uploading to GHL...');

          // Use GHL_API_V2 for uploads if available (same as send)
          const uploadApiKey = GHL_API_V2 || GHL_API_KEY;
          console.log('[MESSAGES] Upload using API key:', GHL_API_V2 ? 'GHL_API_V2' : 'GHL_API_KEY');

          // Convert form-data stream to buffer for fetch API compatibility
          const formBuffer = form.getBuffer();

          const response = await fetch(`${GHL_API_URL}/conversations/messages/upload`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${uploadApiKey}`,
              'Version': '2021-07-28',
              ...form.getHeaders()
            },
            body: new Uint8Array(formBuffer)
          });

          const responseText = await response.text();
          console.log('[MESSAGES] Upload response:', response.status, responseText.substring(0, 300));

          let data;
          try {
            data = responseText ? JSON.parse(responseText) : {};
          } catch {
            data = { message: responseText };
          }

          if (!response.ok) {
            console.error('[MESSAGES] ❌ Upload failed:', data);
            return res.status(response.status).json({
              error: 'Failed to upload attachment',
              details: data
            });
          }

          console.log('[MESSAGES] ✅ Attachment uploaded successfully');
          return res.status(200).json({
            success: true,
            urls: data.urls || data.url || data,
            data
          });
        } catch (error) {
          console.error('[MESSAGES] ❌ Upload exception:', error);
          return res.status(500).json({
            error: 'Failed to upload attachment',
            details: error instanceof Error ? error.message : String(error)
          });
        }
      }

      // Get conversation messages
      if (method === 'GET' && id) {
        const response = await fetch(`${GHL_API_URL}/conversations/${id}/messages`, { headers });
        return res.status(response.ok ? 200 : response.status).json(await response.json());
      }
    }

    // ============ LOCATION INFO ============
    // Scopes: locations.readonly
    if (resource === 'location') {
      if (method === 'GET') {
        const response = await fetch(
          `${GHL_API_URL}/locations/${GHL_LOCATION_ID}`, { headers }
        );
        return res.status(response.ok ? 200 : response.status).json(await response.json());
      }
    }

    // ============ ASSOCIATIONS & CUSTOM OBJECTS ============
    // Scopes: objects/associations.readonly, objects/relations.write
    // Used for buyer-property matching with many-to-many relationships
    // NOTE: Uses objectsHeaders with GHL_OBJECTS_API_KEY
    if (resource === 'associations') {
      if (method === 'GET') {
        // GET /associations/ - Fetch all associations and labels for the location
        console.log('[ASSOCIATIONS] Fetching associations for location:', GHL_LOCATION_ID);
        console.log('[ASSOCIATIONS] Using Objects API Key:', GHL_OBJECTS_API_KEY?.substring(0, 15) + '...');
        const response = await fetch(
          `${GHL_API_URL}/associations/?locationId=${GHL_LOCATION_ID}`,
          { headers: objectsHeaders }
        );
        const data = await response.json();
        console.log('[ASSOCIATIONS] Response:', response.status, JSON.stringify(data).substring(0, 500));
        return res.status(response.ok ? 200 : response.status).json(data);
      }

      // POST /associations/relations - Create a relation between records using association ID
      // Used for creating buyer-property relations with specific stage associations
      if (method === 'POST' && action === 'relations') {
        console.log('[ASSOCIATIONS] Creating relation:', body);
        console.log('[ASSOCIATIONS] Using Objects API Key:', GHL_OBJECTS_API_KEY?.substring(0, 15) + '...');

        const { associationId, firstRecordId, secondRecordId } = body;

        if (!associationId || !firstRecordId || !secondRecordId) {
          return res.status(400).json({
            error: 'Missing required fields',
            required: ['associationId', 'firstRecordId', 'secondRecordId'],
          });
        }

        const response = await fetch(
          `${GHL_API_URL}/associations/relations`,
          {
            method: 'POST',
            headers: objectsHeaders,
            body: JSON.stringify({
              locationId: GHL_LOCATION_ID,
              associationId,
              firstRecordId,
              secondRecordId,
            }),
          }
        );

        const data = await response.json();
        console.log('[ASSOCIATIONS] Create relation response:', response.status, JSON.stringify(data).substring(0, 500));
        return res.status(response.ok ? 201 : response.status).json(data);
      }

      // DELETE /associations/relations/:relationId - Delete a relation by ID
      // Used for removing previous stage association when changing stages
      if (method === 'DELETE' && action === 'relations' && id) {
        console.log('[ASSOCIATIONS] Deleting relation:', id);
        console.log('[ASSOCIATIONS] Using Objects API Key:', GHL_OBJECTS_API_KEY?.substring(0, 15) + '...');
        console.log('[ASSOCIATIONS] Location ID:', GHL_LOCATION_ID);

        // Include locationId as query parameter for authorization
        const deleteUrl = `${GHL_API_URL}/associations/relations/${id}?locationId=${GHL_LOCATION_ID}`;
        console.log('[ASSOCIATIONS] Delete URL:', deleteUrl);

        const response = await fetch(
          deleteUrl,
          {
            method: 'DELETE',
            headers: objectsHeaders,
          }
        );

        console.log('[ASSOCIATIONS] Delete response status:', response.status);

        if (response.ok || response.status === 204) {
          console.log('[ASSOCIATIONS] Relation deleted successfully');
          return res.status(204).end();
        }

        const data = await response.json().catch(() => ({}));
        console.error('[ASSOCIATIONS] Delete relation failed:', response.status, data);
        return res.status(response.status).json(data);
      }
    }

    // NOTE: Uses objectsHeaders with GHL_OBJECTS_API_KEY for all objects operations
    if (resource === 'objects') {
      const objectKey = query.objectKey as string; // e.g., 'opportunity', 'contact', 'custom_objects.properties'

      if (!objectKey) {
        return res.status(400).json({ error: 'objectKey query parameter is required' });
      }

      console.log('[OBJECTS] Using Objects API Key:', GHL_OBJECTS_API_KEY?.substring(0, 15) + '...');

      // POST /objects/:objectKey/records/search - Search for records in a custom object
      // Used for finding Property Custom Object records by address or opportunity_id
      if (method === 'POST' && action === 'records-search') {
        console.log('[OBJECTS] Searching records for:', objectKey, body);

        const searchBody: Record<string, any> = {
          locationId: GHL_LOCATION_ID,
          page: body.page || 1,
          pageLimit: body.pageLimit || 20,
        };

        // Add query string search if provided
        if (body.query) {
          searchBody.query = body.query;
        }

        // Add filters if provided (for exact match search like opportunity_id)
        if (body.filters && Array.isArray(body.filters)) {
          searchBody.filters = body.filters;
        }

        const response = await fetch(
          `${GHL_API_URL}/objects/${objectKey}/records/search`,
          {
            method: 'POST',
            headers: objectsHeaders,
            body: JSON.stringify(searchBody),
          }
        );

        const data = await response.json();
        console.log('[OBJECTS] Records search response:', response.status, JSON.stringify(data).substring(0, 500));
        return res.status(response.ok ? 200 : response.status).json(data);
      }

      // GET /objects/:objectKey/relations - Get relations for an object
      if (method === 'GET' && action === 'relations') {
        const recordId = query.recordId as string;
        const params = new URLSearchParams();
        params.set('locationId', GHL_LOCATION_ID!);
        if (recordId) params.set('recordId', recordId);

        console.log('[OBJECTS] Fetching relations for:', objectKey, recordId || 'all');
        const response = await fetch(
          `${GHL_API_URL}/objects/${objectKey}/relations?${params}`,
          { headers: objectsHeaders }
        );
        const data = await response.json();
        console.log('[OBJECTS] Relations response:', response.status);
        return res.status(response.ok ? 200 : response.status).json(data);
      }

      // POST /objects/:objectKey/relations - Create a relation
      if (method === 'POST' && action === 'relations') {
        console.log('[OBJECTS] Creating relation for:', objectKey, body);
        const response = await fetch(
          `${GHL_API_URL}/objects/${objectKey}/relations`,
          {
            method: 'POST',
            headers: objectsHeaders,
            body: JSON.stringify({
              ...body,
              locationId: GHL_LOCATION_ID
            })
          }
        );
        const data = await response.json();
        console.log('[OBJECTS] Create relation response:', response.status, data);
        return res.status(response.ok ? 201 : response.status).json(data);
      }

      // PUT /objects/:objectKey/relations/:relationId - Update relation label
      if (method === 'PUT' && action === 'relations' && id) {
        console.log('[OBJECTS] Updating relation:', objectKey, id, body);
        const response = await fetch(
          `${GHL_API_URL}/objects/${objectKey}/relations/${id}`,
          {
            method: 'PUT',
            headers: objectsHeaders,
            body: JSON.stringify(body)
          }
        );
        const data = await response.json();
        console.log('[OBJECTS] Update relation response:', response.status, data);
        return res.status(response.ok ? 200 : response.status).json(data);
      }

      // DELETE /objects/:objectKey/relations/:relationId - Delete relation
      if (method === 'DELETE' && action === 'relations' && id) {
        console.log('[OBJECTS] Deleting relation:', objectKey, id);
        const response = await fetch(
          `${GHL_API_URL}/objects/${objectKey}/relations/${id}`,
          { method: 'DELETE', headers: objectsHeaders }
        );
        if (response.ok) {
          return res.status(204).end();
        }
        const data = await response.json();
        return res.status(response.status).json(data);
      }
    }

    // ============ AI CAPTION GENERATION ============
    if (resource === 'ai-caption') {
      if (method === 'POST') {
        if (!OPENAI_API_KEY) {
          return res.status(500).json({ error: 'OpenAI API key not configured' });
        }

        // Support both old (style) and new (tone) parameter names
        const { property, platform, style, tone, context, templateType, postIntent } = body;
        const effectiveTone = tone || style || 'professional';
        const effectiveIntent = postIntent || templateType || 'just-listed';

        // ===== WORLD-CLASS COPYWRITING SYSTEM =====

        const systemPrompt = `You are the lead copywriter for Purple Homes, a real estate brand.

===== PRIORITY ORDER =====

#1 PRIORITY: TONE (The voice/style - must match EXACTLY)
- PROFESSIONAL = formal, data-focused, no drama, clean
- CASUAL = texting a friend, slang ok, fun, relaxed
- URGENT = time-sensitive facts, action-oriented, direct
- FRIENDLY = warm, neighborly, lifestyle-focused, inviting
- LUXURY = understated elegance, sophisticated, refined
- INVESTOR = numbers-first, analytical, ROI-focused

#2 PRIORITY: HOOKS (Scroll-stopping openers)
Every caption opens with a hook that grabs attention:
- Bold statement: "This one won't last the weekend."
- Scene-setting: "6 AM. Coffee in hand. This view."
- Question: "What's your non-negotiable in a home?"
- Observation: "The backyard sold them before they saw the kitchen."

#3 PRIORITY: STACCATO RHYTHM (Punchy, scannable)
- Short sentences. Then longer ones for flow.
- Lots of line breaks.
- Easy to scan on mobile.

===== PURPLE HOMES BRAND =====
- Confident but not arrogant
- Specific, never generic
- Always end with "Purple Homes 💜"

===== AVOID =====
- "This stunning home..." (boring opener)
- "Don't miss out!" / "Act fast!" (desperate)
- Copy-pasting context verbatim
- Wall of text
- More than 2-3 emojis

GOLDEN RULE: Each tone should sound COMPLETELY DIFFERENT.`;

        // Tone instructions - VERY DIFFERENT styles for each tone
        const toneInstructions: Record<string, string> = {
          professional: `
TONE: PROFESSIONAL (Polished & Authoritative)
Write like a top-producing agent presenting to serious buyers.
- Confident, factual, market-savvy
- Focus on VALUE and INVESTMENT potential
- Clean, structured format
- NO dramatic language, NO poetry, NO lifestyle fluff
- Example: "New to market: 2,000 SF single-family in prime SF location. 2BR/5BA, move-in ready. Asking $800K. Strong comparables support pricing. Contact for showing."`,

          casual: `
TONE: CASUAL (Texting a Friend)
Write like you're sending a text to a friend about a cool place you found.
- Use "you", contractions, casual phrases
- Can use "lol", "honestly", "lowkey", "ngl"
- Short sentences, conversational
- Light, fun energy - NOT dramatic or poetic
- Example: "ok wait you HAVE to see this place 😍 mountain views, fully furnished, and honestly? way nicer than it looks in photos. 800k for SF is kinda wild. lmk if you wanna check it out!"`,

          urgent: `
TONE: URGENT (Time-Sensitive Reality)
Create real urgency through facts, not hype.
- Lead with timing/scarcity facts
- "Just listed", "Open house this weekend only"
- Direct, action-oriented
- NO poetic descriptions - just urgency
- Example: "Just hit the market this morning. 3 showings already scheduled. SF mountain views, fully furnished, $800K. Open house Saturday only. Book your slot now."`,

          friendly: `
TONE: FRIENDLY (Warm & Neighborly)
Write like a friendly neighbor recommending their favorite spot.
- Warm, welcoming, community-focused
- Talk about the LIFESTYLE, not just features
- Paint a picture of daily life there
- Use "imagine", "picture this"
- Example: "Picture this: Sunday morning, coffee in hand, watching the fog roll over the city from YOUR living room. This place just feels like home. 2 beds, mountain views, and a kitchen made for hosting friends. Want to come see it?"`,

          luxury: `
TONE: LUXURY (Understated Elegance)
Write for discerning buyers who appreciate subtlety.
- Less is more - let quality speak
- Sophisticated vocabulary
- NO exclamation points, NO hype
- Refined, exclusive, curated
- Example: "A residence of distinction. Perched above the city, this fully furnished sanctuary offers 2,000 square feet of refined living. For those who appreciate the exceptional. Private viewings by appointment."`,

          investor: `
TONE: INVESTOR (Numbers-First Analysis)
Write for analytical buyers who care about ROI.
- Lead with numbers: price, sqft, $/sqft
- Mention potential: rental income, appreciation, ARV
- Business-like, analytical
- NO emotional language - just data
- Example: "Investment analysis: $800K / 2,000 SF = $400/SF. SF mountain location. 2BR/5BA. Furnished turnkey rental potential. Comparable sales trending +8% YoY. Serious inquiries only."`,
        };

        // Platform instructions
        const platformInstructions: Record<string, string> = {
          facebook: `
FACEBOOK:
- 100-200 words. Story-driven.
- Hook → Story → Facts → CTA → Purple Homes 💜
- 2 emojis max. No hashtags in body.`,
          instagram: `
INSTAGRAM:
- 80-150 words. Punchy. Scannable.
- First line = HOOK (before "...more")
- Lots of line breaks. Visual rhythm.
- 2-3 emojis. Hashtags at END only.`,
          linkedin: `
LINKEDIN:
- 100-180 words. Professional but human.
- Market insight angle works well.
- 1 emoji max. Minimal hashtags.
- End with question or clear CTA.`,
        };

        // Post Intent instructions - What type of announcement is this?
        const intentInstructions: Record<string, string> = {
          'just-listed': `
POST INTENT: JUST LISTED
This is a NEW LISTING announcement. Your caption MUST:
- Make it clear this property JUST hit the market
- Create "first to know" energy
- Include phrases like: "just listed", "new to market", "just hit the market"
- Build excitement about the opportunity to see it first
- Invite engagement (tours, showings, questions)`,

          'sold': `
POST INTENT: SOLD
This is a SOLD/CLOSED celebration. Your caption MUST:
- Celebrate the successful sale
- Subtly demonstrate your effectiveness as an agent
- Include phrases like: "SOLD", "closed", "new owners", "keys handed over"
- Invite others who want similar results to reach out`,

          'under-contract': `
POST INTENT: UNDER CONTRACT
This is an UNDER CONTRACT announcement. Your caption MUST:
- Create FOMO without being obnoxious
- Make it clear the property is no longer available
- Include phrases like: "under contract", "pending", "accepted offer"
- Invite buyers who missed out to reach out for similar properties`,

          'price-reduced': `
POST INTENT: PRICE REDUCED
This is a PRICE REDUCTION announcement. Your caption MUST:
- Frame as opportunity, NOT desperation
- Emphasize the value is still there at a better price
- Include phrases like: "price reduced", "new price", "now asking"
- Create urgency around the new price point
- NEVER say "price slashed" or sound desperate`,

          'open-house': `
POST INTENT: OPEN HOUSE
This is an OPEN HOUSE invitation. Your caption MUST:
- Clearly mention it's an open house event
- Make it feel like an event worth attending
- Include phrases like: "open house", "come see", "tour", "showing"
- Paint a picture of what visitors will experience`,

          'coming-soon': `
POST INTENT: COMING SOON
This is a COMING SOON teaser. Your caption MUST:
- Build anticipation and curiosity
- Reveal just enough to intrigue
- Include phrases like: "coming soon", "sneak peek", "stay tuned", "hitting the market"
- Encourage people to follow for updates
- Create exclusivity ("be the first to know")`,

          'investment': `
POST INTENT: INVESTMENT OPPORTUNITY
This is an INVESTMENT OPPORTUNITY post. Your caption MUST:
- Lead with numbers that matter (price, ARV, potential profit, cap rate)
- Speak to investor mindset
- Include phrases like: "investment opportunity", "ROI", "cash flow", "ARV"
- Be specific with projections and numbers
- Appeal to analytical decision-makers`,

          'market-update': `
POST INTENT: MARKET UPDATE
This is a MARKET UPDATE/INSIGHT post. Your caption MUST:
- Position you as a local market expert
- Share genuine, useful insight
- Connect market data to buyer/seller decisions
- Be educational without being boring
- End with how you can help people navigate the market`,

          'general': `
POST INTENT: GENERAL POST
This is a general engagement post. Your caption should:
- Be engaging and valuable to your audience
- Reflect your brand voice
- Include a clear purpose (inform, entertain, engage)
- End with appropriate engagement or CTA`,
        };

        // Build property details
        let propertyDetails = '';
        if (property) {
          propertyDetails = `
PROPERTY DATA:
- Address: ${property.address || 'Not provided'}
- City: ${property.city || 'Not provided'}
- State: ${property.state || 'Not provided'}
- Price: ${property.price ? `$${property.price.toLocaleString()}` : 'Not provided'}
- Bedrooms: ${property.beds || 'Not provided'}
- Bathrooms: ${property.baths || 'Not provided'}
- Square Feet: ${property.sqft ? property.sqft.toLocaleString() : 'Not provided'}
- Property Type: ${property.propertyType || 'Not provided'}
- Condition: ${property.condition || 'Not provided'}
${property.description ? `- Description: ${property.description}` : ''}`;
        }

        // Context section - CRITICAL: tell AI not to copy-paste
        const contextSection = context
          ? `\nADDITIONAL CONTEXT (use to inform your writing, do NOT copy verbatim):\n${context}`
          : '';

        const userPrompt = `Write a Purple Homes ${platform?.toUpperCase() || 'FACEBOOK'} caption.

${propertyDetails}
${contextSection}

═══════════════════════════════════════════════════════════════
POST INTENT: ${effectiveIntent.toUpperCase()}
${intentInstructions[effectiveIntent] || intentInstructions['just-listed']}
═══════════════════════════════════════════════════════════════

═══════════════════════════════════════════════════════════════
TONE: ${effectiveTone.toUpperCase()}
${toneInstructions[effectiveTone] || toneInstructions.professional}
═══════════════════════════════════════════════════════════════

${platformInstructions[platform] || platformInstructions.facebook}

CRITICAL INSTRUCTIONS:
1. Your caption MUST clearly serve the POST INTENT above
2. Your caption MUST use the TONE's voice/style above
3. Both POST INTENT and TONE must be present and work together
4. Weave in property details naturally — never copy-paste
5. End with "Purple Homes 💜"

Write the caption now. Output ONLY the caption.`;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            max_tokens: 500,
            temperature: 0.8,
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          console.error('OpenAI API error:', error);
          return res.status(response.status).json({ error: 'Failed to generate caption' });
        }

        const data = await response.json();
        const caption = data.choices?.[0]?.message?.content?.trim() || '';

        return res.status(200).json({ caption, platform, tone: effectiveTone });
      }
    }

    // ============ ENHANCE CAPTION WITH CONTEXT ============
    if (resource === 'enhance-caption') {
      if (method === 'POST') {
        if (!OPENAI_API_KEY) {
          return res.status(500).json({ error: 'OpenAI API key not configured' });
        }

        const { captions, context, property } = body;

        if (!captions || !context) {
          return res.status(400).json({ error: 'Captions and context required' });
        }

        const systemPrompt = `You are a world-class real estate copywriter for Purple Homes. Your job is to enhance existing caption templates by naturally weaving in additional context provided by the agent.

RULES:
1. Keep the template's structure and style intact
2. WEAVE the context details naturally into the existing copy - don't just append them
3. Replace generic phrases with specific details from the context
4. The result should read like one cohesive piece, not template + context bolted together
5. Keep Purple Homes branding where it exists
6. Don't add new sections - integrate into existing flow

Example of BAD (just appending):
"Beautiful home in the city... Purple Homes | Your Partner

built on a mountain with great views"

Example of GOOD (woven in):
"This mountain-top retreat offers views you'll never tire of... Purple Homes | Your Partner"`;

        const enhancedCaptions: Record<string, string> = {};

        // Enhance each platform's caption
        for (const platform of ['facebook', 'instagram', 'linkedin']) {
          if (!captions[platform]) continue;

          const userPrompt = `Enhance this ${platform.toUpperCase()} caption by naturally weaving in the context. Keep the template structure but integrate the unique selling points.

ORIGINAL CAPTION:
${captions[platform]}

CONTEXT TO WEAVE IN (do NOT copy-paste, integrate naturally):
${context}

${property?.description ? `PROPERTY DESCRIPTION: ${property.description}` : ''}

Output ONLY the enhanced caption, nothing else.`;

          try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: 'gpt-4o',
                messages: [
                  { role: 'system', content: systemPrompt },
                  { role: 'user', content: userPrompt }
                ],
                max_tokens: 500,
                temperature: 0.7,
              }),
            });

            if (response.ok) {
              const data = await response.json();
              enhancedCaptions[platform] = data.choices?.[0]?.message?.content?.trim() || captions[platform];
            } else {
              enhancedCaptions[platform] = captions[platform];
            }
          } catch (error) {
            console.error(`Failed to enhance ${platform} caption:`, error);
            enhancedCaptions[platform] = captions[platform];
          }
        }

        return res.status(200).json({ captions: enhancedCaptions });
      }
    }

    // ============ AUTH (Google Sheets) ============
    if (resource === 'auth') {
      if (action === 'login' && method === 'POST') {
        const { email, password } = body;
        
        if (!email || !password) {
          return res.status(400).json({ error: 'Email and password required' });
        }

        if (!GOOGLE_SHEET_ID || !GOOGLE_SHEET_CREDENTIALS) {
          return res.status(500).json({ error: 'Google Sheets not configured' });
        }

        try {
          // Parse credentials
          const credentials = JSON.parse(GOOGLE_SHEET_CREDENTIALS);
          
          // Create JWT for Google Sheets API
          const jwt = await createGoogleJWT(credentials);
          const accessToken = await getGoogleAccessToken(jwt, credentials);
          
          // Fetch users from Google Sheet
          const sheetResponse = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEET_ID}/values/Users!A:D`,
            {
              headers: { 'Authorization': `Bearer ${accessToken}` }
            }
          );
          
          if (!sheetResponse.ok) {
            const errorData = await sheetResponse.json();
            console.error('Google Sheets error:', errorData);
            return res.status(500).json({ error: 'Failed to fetch users from sheet', details: errorData });
          }
          
          const sheetData = await sheetResponse.json();
          const rows = sheetData.values || [];
          
          // Skip header row, find matching user
          // Expected columns: Email, Password, Name, Role
          for (let i = 1; i < rows.length; i++) {
            const [userEmail, userPassword, userName, userRole] = rows[i];
            if (userEmail?.toLowerCase() === email.toLowerCase() && userPassword === password) {
              return res.status(200).json({
                authenticated: true,
                user: {
                  email: userEmail,
                  name: userName || userEmail.split('@')[0],
                  role: userRole || 'user'
                }
              });
            }
          }
          
          return res.status(401).json({ authenticated: false, error: 'Invalid email or password' });
        } catch (error) {
          console.error('Auth error:', error);
          return res.status(500).json({ error: 'Authentication failed', details: error instanceof Error ? error.message : 'Unknown error' });
        }
      }
    }

    // ============ NOTIFICATIONS ============
    if (resource === 'notifications') {
      const RESEND_API_KEY = process.env.RESEND_API_KEY;
      
      if (action === 'connection-failure' && method === 'POST') {
        const { email, failedSince, message } = body;
        
        if (!email) {
          return res.status(400).json({ error: 'Email is required' });
        }
        
        if (!RESEND_API_KEY) {
          console.log('RESEND_API_KEY not configured, skipping email notification');
          return res.status(200).json({ 
            success: false, 
            message: 'Email notifications not configured (RESEND_API_KEY missing)' 
          });
        }
        
        try {
          const emailResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'PropertyPro <onboarding@resend.dev>',
              to: [email],
              subject: '⚠️ GHL Connection Alert - PropertyPro',
              html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h1 style="color: #ef4444; margin-bottom: 20px;">⚠️ Connection Alert</h1>
                  <p style="font-size: 16px; color: #374151; margin-bottom: 16px;">
                    The connection to HighLevel (GHL) has been down for more than 5 minutes.
                  </p>
                  <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
                    <p style="margin: 0; color: #991b1b;">
                      <strong>Failed Since:</strong> ${new Date(failedSince).toLocaleString()}
                    </p>
                    ${message ? `<p style="margin: 8px 0 0; color: #991b1b;">${message}</p>` : ''}
                  </div>
                  <p style="font-size: 14px; color: #6b7280;">
                    Please check your GHL API configuration and ensure your credentials are valid.
                  </p>
                  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
                  <p style="font-size: 12px; color: #9ca3af;">
                    This is an automated alert from PropertyPro. 
                    Go to Settings → Connection Status to view details.
                  </p>
                </div>
              `,
            }),
          });
          
          if (!emailResponse.ok) {
            const error = await emailResponse.json();
            console.error('Failed to send notification email:', error);
            return res.status(500).json({ error: 'Failed to send email', details: error });
          }
          
          const result = await emailResponse.json();
          return res.status(200).json({ success: true, emailId: result.id });
        } catch (error) {
          console.error('Error sending notification:', error);
          return res.status(500).json({ 
            error: 'Failed to send notification',
            message: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    }

    // ============ CONTACT NOTES ============
    // Scopes: contacts.write
    // Add notes to a contact
    if (resource === 'notes') {
      if (method === 'POST') {
        const { contactId, body: noteBody } = body;

        if (!contactId) {
          return res.status(400).json({ error: 'contactId is required' });
        }

        if (!noteBody) {
          return res.status(400).json({ error: 'body (note content) is required' });
        }

        console.log('[NOTES] Creating note for contact:', contactId);
        console.log('[NOTES] Note body:', noteBody.substring(0, 100) + '...');

        try {
          const response = await fetch(
            `${GHL_API_URL}/contacts/${contactId}/notes`,
            {
              method: 'POST',
              headers,
              body: JSON.stringify({
                body: noteBody,
              }),
            }
          );

          const data = await response.json();
          console.log('[NOTES] Response:', response.status, JSON.stringify(data).substring(0, 200));

          if (!response.ok) {
            console.error('[NOTES] ❌ Failed to create note:', data);
            return res.status(response.status).json({
              error: 'Failed to create note',
              details: data
            });
          }

          console.log('[NOTES] ✅ Note created successfully');
          return res.status(201).json({
            success: true,
            note: data
          });
        } catch (error) {
          console.error('[NOTES] ❌ Exception:', error);
          return res.status(500).json({
            error: 'Failed to create note',
            details: error instanceof Error ? error.message : String(error)
          });
        }
      }

      // GET notes for a contact
      if (method === 'GET' && id) {
        console.log('[NOTES] Fetching notes for contact:', id);

        try {
          const response = await fetch(
            `${GHL_API_URL}/contacts/${id}/notes`,
            { headers }
          );

          const data = await response.json();
          console.log('[NOTES] Response:', response.status);

          if (!response.ok) {
            console.error('[NOTES] ❌ Failed to fetch notes:', data);
            return res.status(response.status).json({
              error: 'Failed to fetch notes',
              details: data
            });
          }

          return res.status(200).json(data);
        } catch (error) {
          console.error('[NOTES] ❌ Exception:', error);
          return res.status(500).json({
            error: 'Failed to fetch notes',
            details: error instanceof Error ? error.message : String(error)
          });
        }
      }
    }

    console.log('[GHL API] ⚠️ No handler found for resource/action:', { resource, action, method });
    return res.status(400).json({ error: 'Invalid resource or action', resource, action, method });

  } catch (error) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('[GHL API] ❌❌❌ UNHANDLED EXCEPTION ❌❌❌');
    console.error('[GHL API] Error type:', error?.constructor?.name);
    console.error('[GHL API] Error message:', error instanceof Error ? error.message : String(error));
    console.error('[GHL API] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('[GHL API] Request info:', {
      method: req.method,
      resource: req.query.resource,
      action: req.query.action,
      id: req.query.id
    });
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      type: error?.constructor?.name,
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}

// Helper functions for Google Sheets auth
async function createGoogleJWT(credentials: any): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const encode = (obj: any) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const signInput = `${encode(header)}.${encode(claim)}`;
  
  // Use Node.js crypto for signing
  const crypto = await import('crypto');
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signInput);
  const signature = sign.sign(credentials.private_key, 'base64url');
  
  return `${signInput}.${signature}`;
}

async function getGoogleAccessToken(jwt: string, credentials: any): Promise<string> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  
  const data = await response.json();
  return data.access_token;
}