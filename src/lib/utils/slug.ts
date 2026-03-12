/**
 * URL Slug Utilities
 *
 * Generate URL-safe slugs for shareable property links.
 */

const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas',
  CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware',
  FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho',
  IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas',
  KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi',
  MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada',
  NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
  NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma',
  OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah',
  VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia',
  WI: 'Wisconsin', WY: 'Wyoming', DC: 'District of Columbia',
};

/**
 * Generate a URL-safe slug from property address and city.
 * Expands state abbreviations to full names.
 * Example: "2316 Hero Street" + "Gretna, LA 70053" → "2316-hero-street-gretna-louisiana-70053"
 */
export function generatePropertySlug(address: string, city: string): string {
  // Expand 2-letter state abbreviation to full state name: ", LA " → " Louisiana "
  const expandedCity = city.replace(/,?\s*\b([A-Z]{2})\b\s*/g, (match, abbr) => {
    const fullName = STATE_NAMES[abbr as keyof typeof STATE_NAMES];
    return fullName ? ` ${fullName} ` : match;
  });

  const combined = `${address} ${expandedCity}`;
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
