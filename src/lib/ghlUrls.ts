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
