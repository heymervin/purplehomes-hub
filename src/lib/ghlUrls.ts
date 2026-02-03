// src/lib/ghlUrls.ts

const DEFAULT_GHL_DOMAIN = 'app.gohighlevel.com';

/**
 * Get the configured GHL domain from localStorage
 */
export function getGhlDomain(): string {
  if (typeof window === 'undefined') return DEFAULT_GHL_DOMAIN;
  return localStorage.getItem('ghl_domain') || DEFAULT_GHL_DOMAIN;
}

/**
 * Get the GHL Location ID from localStorage or environment
 */
export function getGhlLocationId(): string {
  // Check localStorage first (for client-side), then env var
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('ghl_location_id');
    if (stored) return stored;
  }
  return import.meta.env.VITE_GHL_LOCATION_ID || '';
}

/**
 * Build a GHL opportunity URL
 */
export function getGhlOpportunityUrl(opportunityId: string): string {
  const domain = getGhlDomain();
  const locationId = getGhlLocationId();
  return `https://${domain}/v2/location/${locationId}/opportunities/${opportunityId}`;
}

/**
 * Build a GHL contact URL
 */
export function getGhlContactUrl(contactId: string): string {
  const domain = getGhlDomain();
  const locationId = getGhlLocationId();
  return `https://${domain}/v2/location/${locationId}/contacts/${contactId}`;
}

/**
 * Check if a URL is a GHL document URL that requires authentication
 * These URLs don't work directly in browsers - they need to go through our proxy
 */
export function isGhlDocumentUrl(url: string): boolean {
  if (!url) return false;
  return url.includes('services.leadconnectorhq.com/documents/download') ||
         url.includes('/documents/download/');
}

/**
 * Convert a GHL document URL to a proxied URL that will work in browsers
 * This routes the image through our /api/proxy-image endpoint which handles GHL auth
 */
export function getProxiedImageUrl(url: string): string {
  if (!url) return url;

  // Only proxy GHL document URLs
  if (!isGhlDocumentUrl(url)) {
    return url;
  }

  // Route through our image proxy
  return `/api/proxy-image?url=${encodeURIComponent(url)}`;
}

/**
 * Process an array of image URLs, converting any GHL document URLs to proxied URLs
 */
export function proxyGhlImageUrls(urls: string[]): string[] {
  return urls.map(url => getProxiedImageUrl(url));
}
