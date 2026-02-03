import type { VercelRequest, VercelResponse } from '@vercel/node';

const GHL_API_KEY = process.env.GHL_API_KEY;

/**
 * Check if URL is a GHL document URL that requires authentication
 */
function isGhlDocumentUrl(url: string): boolean {
  return url.includes('services.leadconnectorhq.com/documents/download') ||
         url.includes('/documents/download/');
}

/**
 * Extract document ID from GHL document URL
 * URL format: https://services.leadconnectorhq.com/documents/download/{documentId}
 */
function extractDocumentId(url: string): string | null {
  const match = url.match(/\/documents\/download\/([^/?]+)/);
  return match ? match[1] : null;
}

/**
 * Fetch GHL document using the Files API with authentication
 * GHL Documents API: GET /files/download/{documentId}
 */
async function fetchGhlDocument(documentId: string): Promise<Response> {
  const apiUrl = `https://services.leadconnectorhq.com/files/download/${documentId}`;

  const response = await fetch(apiUrl, {
    headers: {
      'Authorization': `Bearer ${GHL_API_KEY}`,
      'Version': '2021-07-28',
    },
  });

  return response;
}

/**
 * Image proxy to handle CORS issues with external images
 * Also handles GHL document URLs that require authentication
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  // Validate URL is from allowed domains
  const allowedDomains = [
    'services.leadconnectorhq.com',
    'leadconnectorhq.com',
    'storage.googleapis.com',
    'images.unsplash.com',
    'source.unsplash.com',
    'i.imgur.com',
  ];

  try {
    const parsedUrl = new URL(url);
    const isAllowed = allowedDomains.some(domain => parsedUrl.hostname.includes(domain));

    if (!isAllowed) {
      return res.status(403).json({
        error: 'Domain not allowed',
        domain: parsedUrl.hostname,
        allowedDomains,
      });
    }

    let response: Response;

    // Handle GHL document URLs with authentication
    if (isGhlDocumentUrl(url)) {
      if (!GHL_API_KEY) {
        return res.status(500).json({
          error: 'GHL API key not configured',
          hint: 'Set GHL_API_KEY environment variable',
        });
      }

      const documentId = extractDocumentId(url);
      if (!documentId) {
        return res.status(400).json({
          error: 'Invalid GHL document URL',
          url,
        });
      }

      console.log(`[Image Proxy] Fetching GHL document: ${documentId}`);
      response = await fetchGhlDocument(documentId);

      // If Files API fails, try direct fetch with auth header as fallback
      if (!response.ok) {
        console.log(`[Image Proxy] Files API failed (${response.status}), trying direct fetch with auth`);
        response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${GHL_API_KEY}`,
            'Version': '2021-07-28',
            'User-Agent': 'Mozilla/5.0 (compatible; PurpleHomes/1.0)',
          },
        });
      }
    } else {
      // Regular fetch for non-GHL URLs
      response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; PurpleHomes/1.0)',
        },
      });
    }

    if (!response.ok) {
      return res.status(response.status).json({
        error: 'Failed to fetch image',
        status: response.status,
        statusText: response.statusText,
        isGhlDocument: isGhlDocumentUrl(url),
      });
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = await response.arrayBuffer();

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours

    return res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('Image proxy error:', error);
    return res.status(500).json({
      error: 'Failed to proxy image',
      details: String(error),
    });
  }
}
