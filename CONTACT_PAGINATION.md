# Contact Pulling with Pagination

This document explains how contact pagination is implemented in the Purple Homes Hub application when fetching contacts from GoHighLevel (GHL).

## Overview

The contact pagination system is located in [lib/api-handlers/ghl.ts](lib/api-handlers/ghl.ts#L126-L293) and handles fetching all contacts from the GHL API with automatic pagination.

## API Endpoint

**Internal Endpoint:** `/api/funnel?resource=contacts`
**Method:** `GET`
**GHL API:** `https://services.leadconnectorhq.com/contacts/`

## How It Works

### 1. Initial Request Setup

```typescript
const requestedLimit = query.limit ? parseInt(query.limit as string) : 10000;
let allContacts: any[] = [];
let pageCount = 0;
const maxPages = 100;
```

- **Default Limit:** 10,000 contacts (can be overridden with `?limit=X`)
- **Max Pages:** Safety limit of 100 pages to prevent infinite loops
- **Page Size:** 100 contacts per page (GHL's maximum)

### 2. Pagination Loop

The system uses a **cursor-based pagination** approach with `nextPageUrl`:

```typescript
let currentUrl = `${GHL_API_URL}/contacts/?locationId=${GHL_LOCATION_ID}&limit=100`;

while (pageCount < maxPages && allContacts.length < requestedLimit) {
  // Fetch current page
  const response = await fetch(currentUrl, { method: 'GET', headers });
  const data = await response.json();
  const contacts = data.contacts || [];

  // Accumulate contacts
  allContacts = allContacts.concat(contacts);
  pageCount++;

  // Get next page URL from response metadata
  if (data.meta?.nextPageUrl) {
    currentUrl = data.meta.nextPageUrl;
  } else {
    break; // No more pages
  }
}
```

### 3. Stopping Conditions

Pagination stops when any of these conditions are met:

1. **No more data:** `contacts.length === 0`
2. **No next page URL:** `!data.meta?.nextPageUrl`
3. **Reached requested limit:** `allContacts.length >= requestedLimit`
4. **Max pages reached:** `pageCount >= maxPages` (100 pages)
5. **Error occurred:** Request fails after first page

### 4. Error Handling

The system has robust error handling:

- **First page failure:** Returns error immediately (500 status)
- **Subsequent page failure:** Returns partial results collected so far
- **Graceful degradation:** If mid-pagination fails, you still get what was fetched

```typescript
if (pageCount === 0) {
  // First page failed - abort
  return res.status(response.status).json({ error: '...' });
} else {
  // Later page failed - return what we have
  console.warn(`Page ${pageCount + 1} failed, returning ${allContacts.length} contacts`);
  break;
}
```

### 5. Final Response

After pagination completes:

```typescript
// Trim to requested limit if we got more
if (allContacts.length > requestedLimit) {
  allContacts = allContacts.slice(0, requestedLimit);
}

return res.status(200).json({
  contacts: allContacts,
  meta: { total: allContacts.length, pages: pageCount }
});
```

## Authentication

Uses GHL API key from environment variables:

```typescript
const headers = {
  'Authorization': `Bearer ${GHL_API_KEY}`,
  'Content-Type': 'application/json',
  'Version': '2021-07-28',
};
```

## Logging

Comprehensive logging at each step:

```
[CONTACTS] Starting pagination fetch
[CONTACTS] 📄 Fetching page 1/100
[CONTACTS] ✅ Page 1 success: contactsReceived: 100, totalSoFar: 100
[CONTACTS] Next page URL: https://...
[CONTACTS] 📄 Fetching page 2/100
...
[CONTACTS] ✅✅✅ PAGINATION COMPLETE: totalContacts: 523, pagesProcessed: 6
```

## Example Usage

### Fetch All Contacts (up to default 10,000)
```
GET /api/funnel?resource=contacts
```

### Fetch Limited Contacts
```
GET /api/funnel?resource=contacts&limit=500
```

### Fetch Single Contact by ID
```
GET /api/funnel?resource=contacts&id=CONTACT_ID
```

## Response Format

```json
{
  "contacts": [
    {
      "id": "...",
      "email": "...",
      "firstName": "...",
      "lastName": "...",
      // ... other contact fields
    }
  ],
  "meta": {
    "total": 523,
    "pages": 6
  }
}
```

## Key Features

✅ **Automatic pagination** - Fetches all pages automatically
✅ **Cursor-based** - Uses GHL's `nextPageUrl` for reliable pagination
✅ **Configurable limits** - Control how many contacts to fetch
✅ **Safety limits** - Max 100 pages to prevent runaway requests
✅ **Error resilient** - Returns partial results on mid-pagination failures
✅ **Detailed logging** - Full visibility into the pagination process
✅ **GHL API compliant** - Uses official API patterns and limits

## Performance Considerations

- **Rate Limits:** GHL has API rate limits - be mindful when fetching large datasets
- **Page Size:** Fixed at 100 (GHL maximum) - cannot be increased
- **Total Time:** For 1,000 contacts = ~10 API calls = ~5-15 seconds depending on GHL response times
- **Memory:** All contacts loaded into memory - 10,000 contact limit helps prevent excessive memory usage

## Related Files

- [lib/api-handlers/ghl.ts](lib/api-handlers/ghl.ts) - Main pagination implementation
- [src/pages/Contacts.tsx](src/pages/Contacts.tsx) - Frontend that consumes this API
- [api/funnel/index.ts](api/funnel/index.ts) - API route that uses this handler
