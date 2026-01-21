/**
 * URL Slug Utilities
 *
 * Generate URL-safe slugs for shareable property links.
 */

/**
 * Generate a URL-safe slug from property address and city
 * Example: "123 Main St" + "Phoenix, AZ 85001" → "123-main-st-phoenix-az-85001"
 */
export function generatePropertySlug(address: string, city: string): string {
  const combined = `${address}-${city}`;
  return combined
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/-+/g, '-')         // Collapse multiple hyphens
    .replace(/^-|-$/g, '');      // Trim leading/trailing hyphens
}

/**
 * Generate the full shareable URL for a property
 */
export function getPropertyShareUrl(address: string, city: string): string {
  const slug = generatePropertySlug(address, city);
  const baseUrl = window.location.origin;
  return `${baseUrl}/listing/${slug}`;
}
