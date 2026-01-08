/**
 * Buyer Management Types
 * Types and utilities for the Buyer Management feature
 */

export interface BuyerRecord {
  // Identifiers
  recordId: string;           // Airtable record ID
  contactId: string;          // GHL Contact ID

  // Contact Info
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  language: 'English' | 'Spanish';

  // Property Preferences
  desiredBeds?: number;
  desiredBaths?: number;
  preferredLocation?: string;
  preferredZipCodes?: string[];
  city?: string;
  state?: string;
  buyerType?: string;

  // Financial Info
  downPayment?: number;
  monthlyIncome?: number;
  monthlyLiabilities?: number;
  qualified: boolean;

  // Computed/Read-only
  matchCount?: number;
  dateAdded?: string;
  lastUpdated?: string;

  // Geocoded location (read-only)
  lat?: number;
  lng?: number;
}

export interface BuyerFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  language: 'English' | 'Spanish';
  desiredBeds: string;
  desiredBaths: string;
  preferredLocation: string;
  preferredZipCodes: string;
  city: string;
  state: string;
  buyerType: string;
  downPayment: string;
  monthlyIncome: string;
  monthlyLiabilities: string;
  qualified: boolean;
}

export interface BuyerUpdatePayload {
  recordId: string;
  contactId: string;
  fields: Partial<BuyerFormData>;
  syncToGhl?: boolean;
  triggerRematch?: boolean;
}

export interface BuyerListFilters {
  search: string;
  qualified: 'all' | 'yes' | 'no';
  hasCriteria: 'all' | 'complete' | 'incomplete';
}

export const BUYER_TYPE_OPTIONS = [
  { value: 'Owner Occupant', label: 'Owner Occupant' },
  { value: 'Investor', label: 'Investor' },
  { value: 'First Time Buyer', label: 'First Time Buyer' },
  { value: 'Cash Buyer', label: 'Cash Buyer' },
];

export const LANGUAGE_OPTIONS = [
  { value: 'English', label: 'English' },
  { value: 'Spanish', label: 'Spanish' },
];

export const BEDS_OPTIONS = [
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
  { value: '5', label: '5' },
  { value: '6', label: '6' },
  { value: '7', label: '7+' },
];

export const BATHS_OPTIONS = [
  { value: '1', label: '1' },
  { value: '1.5', label: '1.5' },
  { value: '2', label: '2' },
  { value: '2.5', label: '2.5' },
  { value: '3', label: '3' },
  { value: '3.5', label: '3.5' },
  { value: '4', label: '4' },
  { value: '4.5', label: '4.5' },
  { value: '5', label: '5+' },
];

export const STATE_OPTIONS = [
  { value: 'LA', label: 'Louisiana' },
  { value: 'TX', label: 'Texas' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'AL', label: 'Alabama' },
  { value: 'FL', label: 'Florida' },
];

/**
 * Check if buyer has minimum required criteria for matching
 */
export function hasBuyerCriteria(buyer: BuyerRecord): boolean {
  return !!(
    buyer.desiredBeds &&
    buyer.preferredLocation &&
    buyer.downPayment
  );
}

/**
 * Get list of missing criteria fields
 */
export function getMissingCriteria(buyer: BuyerRecord): string[] {
  const missing: string[] = [];
  if (!buyer.desiredBeds) missing.push('Bedrooms');
  if (!buyer.desiredBaths) missing.push('Bathrooms');
  if (!buyer.preferredLocation && !buyer.city) missing.push('Location');
  if (!buyer.downPayment) missing.push('Down Payment');
  if (!buyer.monthlyIncome) missing.push('Monthly Income');
  if (!buyer.monthlyLiabilities) missing.push('Monthly Liabilities');
  return missing;
}

/**
 * Convert BuyerRecord to BuyerFormData for editing
 */
export function buyerToFormData(buyer: BuyerRecord): BuyerFormData {
  return {
    firstName: buyer.firstName || '',
    lastName: buyer.lastName || '',
    email: buyer.email || '',
    phone: buyer.phone || '',
    language: buyer.language || 'English',
    desiredBeds: buyer.desiredBeds?.toString() || '',
    desiredBaths: buyer.desiredBaths?.toString() || '',
    preferredLocation: buyer.preferredLocation || '',
    preferredZipCodes: buyer.preferredZipCodes?.join(', ') || '',
    city: buyer.city || '',
    state: buyer.state || '',
    buyerType: buyer.buyerType || '',
    downPayment: buyer.downPayment ? `$${buyer.downPayment.toLocaleString()}` : '',
    monthlyIncome: buyer.monthlyIncome ? `$${buyer.monthlyIncome.toLocaleString()}` : '',
    monthlyLiabilities: buyer.monthlyLiabilities ? `$${buyer.monthlyLiabilities.toLocaleString()}` : '',
    qualified: buyer.qualified || false,
  };
}

/**
 * Format currency string for display
 */
export function formatCurrency(value: string): string {
  const num = value.replace(/[^0-9]/g, '');
  if (!num) return '';
  return `$${parseInt(num).toLocaleString()}`;
}

/**
 * Parse currency string to number
 */
export function parseCurrency(value: string): number | null {
  const num = parseFloat(value.replace(/[^0-9.]/g, ''));
  return isNaN(num) ? null : num;
}
