import type { Property } from '@/types';
import type { PropertyDetails } from '@/types/matching';

/**
 * Convert PropertyDetails (matching system) to Property (legacy system)
 * for use with existing email/PDF services
 */
export function convertPropertyDetailsToProperty(details: PropertyDetails): Property {
  return {
    id: details.recordId,
    propertyCode: details.propertyCode,
    address: details.address,
    city: details.city,
    price: details.price || 0,
    beds: details.beds,
    baths: details.baths,
    sqft: details.sqft,
    heroImage: details.heroImage || '',
    images: details.heroImage ? [details.heroImage] : [],
    status: 'posted' as const,
    createdAt: new Date().toISOString(),
    // Optional fields from PropertyDetails
    state: details.state,
    zipCode: details.zipCode,
    lat: details.propertyLat,
    lng: details.propertyLng,
    description: details.notes,
    socialMediaPropertyDescription: details.socialMediaPropertyDescription,
    ghlOpportunityId: details.opportunityId,
    // Fields not available in PropertyDetails - use defaults
    condition: undefined,
    propertyType: undefined,
    caption: undefined,
    brandedImage: undefined,
    postedDate: undefined,
    scheduledDate: undefined,
    isDemo: false,
    downPayment: undefined,
    monthlyPayment: undefined,
  };
}
