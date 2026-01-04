import { useQuery } from '@tanstack/react-query';
import { useCustomFields } from '@/services/ghlApi';

// Define expected custom fields for each page/feature
const EXPECTED_CUSTOM_FIELDS = {
  // Property Pipeline (formerly Seller Acquisitions)
  sellerAcquisitions: [
    { fieldKey: 'property_address', name: 'Property Address', type: 'TEXT', required: true, usedIn: ['Properties', 'Social Hub'] },
    { fieldKey: 'property_city', name: 'Property City', type: 'TEXT', required: true, usedIn: ['Properties', 'Social Hub'] },
    { fieldKey: 'property_price', name: 'Property Price', type: 'MONETARY', required: true, usedIn: ['Properties', 'Social Hub'] },
    { fieldKey: 'property_beds', name: 'Beds', type: 'NUMERICAL', required: true, usedIn: ['Properties', 'Social Hub'] },
    { fieldKey: 'property_baths', name: 'Baths', type: 'NUMERICAL', required: true, usedIn: ['Properties', 'Social Hub'] },
    { fieldKey: 'property_sqft', name: 'Square Footage', type: 'NUMERICAL', required: false, usedIn: ['Properties', 'Social Hub'] },
    { fieldKey: 'property_condition', name: 'Property Condition', type: 'TEXT', required: false, usedIn: ['Properties'] },
    { fieldKey: 'property_type', name: 'Property Type', type: 'TEXT', required: false, usedIn: ['Properties'] },
    { fieldKey: 'property_hero_image', name: 'Hero Image URL', type: 'TEXT', required: true, usedIn: ['Properties', 'Social Hub'] },
    { fieldKey: 'property_images', name: 'Additional Images', type: 'TEXT', required: false, usedIn: ['Properties'] },
    { fieldKey: 'property_description', name: 'Description', type: 'LARGE_TEXT', required: false, usedIn: ['Properties', 'Social Hub'] },
    { fieldKey: 'social_status', name: 'Social Media Status', type: 'TEXT', required: true, usedIn: ['Social Hub'] },
    { fieldKey: 'social_caption', name: 'Social Caption', type: 'LARGE_TEXT', required: false, usedIn: ['Social Hub'] },
    { fieldKey: 'branded_image', name: 'Branded Image URL', type: 'TEXT', required: false, usedIn: ['Social Hub'] },
    { fieldKey: 'posted_date', name: 'Posted Date', type: 'TEXT', required: false, usedIn: ['Social Hub'] },
    { fieldKey: 'scheduled_date', name: 'Scheduled Date', type: 'TEXT', required: false, usedIn: ['Social Hub'] },
  ],
  
  // Buyer Acquisitions
  buyerAcquisitions: [
    { fieldKey: 'max_price', name: 'Max Price', type: 'MONETARY', required: false, usedIn: ['Buyer Acquisitions'] },
    { fieldKey: 'preferred_areas', name: 'Preferred Areas', type: 'TEXT', required: false, usedIn: ['Buyer Acquisitions'] },
    { fieldKey: 'buyer_type', name: 'Buyer Type', type: 'TEXT', required: false, usedIn: ['Buyer Acquisitions'] },
  ],
  
  // Deal Acquisitions (Buyers Pipeline)
  dealAcquisitions: [
    { fieldKey: 'deal_type', name: 'Deal Type', type: 'DROPDOWN', required: true, usedIn: ['Buyers Pipeline'] },
    { fieldKey: 'bc_closing_checklist', name: 'B-C Closing Checklist', type: 'CHECKBOX', required: true, usedIn: ['Buyers Pipeline'] },
    { fieldKey: 'post_close_actions_checklist', name: 'POST CLOSE ACTIONS', type: 'CHECKBOX', required: true, usedIn: ['Buyers Pipeline'] },
  ],
  
  // Contacts
  contacts: [
    { fieldKey: 'contact_type', name: 'Contact Type', type: 'TEXT', required: false, usedIn: ['Contacts'] },
    { fieldKey: 'company', name: 'Company', type: 'TEXT', required: false, usedIn: ['Contacts'] },
    { fieldKey: 'zip_codes', name: 'Zip Codes', type: 'TEXT', required: false, usedIn: ['Contacts'] },
    { fieldKey: 'deals_closed', name: 'Deals Closed', type: 'NUMERICAL', required: false, usedIn: ['Contacts'] },
    { fieldKey: 'transaction_value', name: 'Transaction Value', type: 'MONETARY', required: false, usedIn: ['Contacts'] },
    { fieldKey: 'is_favorite', name: 'Is Favorite', type: 'CHECKBOX', required: false, usedIn: ['Contacts'] },
    { fieldKey: 'markets', name: 'Markets', type: 'TEXT', required: false, usedIn: ['Contacts'] },
  ],
};

export interface FieldValidationResult {
  fieldKey: string;
  name: string;
  expectedType: string;
  required: boolean;
  usedIn: string[];
  status: 'found' | 'missing' | 'type_mismatch';
  actualType?: string;
  ghlFieldId?: string;
}

export interface ValidationSummary {
  totalRequired: number;
  foundRequired: number;
  missingRequired: number;
  totalOptional: number;
  foundOptional: number;
  missingOptional: number;
  overallStatus: 'complete' | 'partial' | 'critical';
}

export function useCustomFieldValidation(model: 'contact' | 'opportunity' | 'all' = 'all') {
  // Fetch custom fields from GHL
  const { data: customFieldsData, isLoading, error, refetch } = useCustomFields(model);
  
  return useQuery({
    queryKey: ['custom-fields-validation', model, customFieldsData],
    queryFn: () => {
      if (!customFieldsData?.customFields) {
        return {
          validationResults: [],
          summary: {
            totalRequired: 0,
            foundRequired: 0,
            missingRequired: 0,
            totalOptional: 0,
            foundOptional: 0,
            missingOptional: 0,
            overallStatus: 'critical' as const,
          },
          missingRequiredFields: [],
          missingOptionalFields: [],
          foundFields: [],
        };
      }

      const ghlFields = customFieldsData.customFields;
      const expectedFields = getAllExpectedFields(model);
      
      const validationResults: FieldValidationResult[] = expectedFields.map(expected => {
        const ghlField = ghlFields.find(
          f => f.fieldKey === expected.fieldKey || f.name.toLowerCase() === expected.name.toLowerCase()
        );
        
        if (!ghlField) {
          return {
            fieldKey: expected.fieldKey,
            name: expected.name,
            expectedType: expected.type,
            required: expected.required,
            usedIn: expected.usedIn,
            status: 'missing' as const,
          };
        }
        
        // Check if type matches (simplified check)
        const typeMatches = ghlField.dataType?.toUpperCase() === expected.type;
        
        return {
          fieldKey: expected.fieldKey,
          name: expected.name,
          expectedType: expected.type,
          required: expected.required,
          usedIn: expected.usedIn,
          status: typeMatches ? 'found' as const : 'type_mismatch' as const,
          actualType: ghlField.dataType,
          ghlFieldId: ghlField.id,
        };
      });
      
      // Calculate summary
      const requiredFields = validationResults.filter(f => f.required);
      const optionalFields = validationResults.filter(f => !f.required);
      
      const foundRequired = requiredFields.filter(f => f.status === 'found').length;
      const missingRequired = requiredFields.filter(f => f.status === 'missing').length;
      const foundOptional = optionalFields.filter(f => f.status === 'found').length;
      const missingOptional = optionalFields.filter(f => f.status === 'missing').length;
      
      let overallStatus: 'complete' | 'partial' | 'critical';
      if (missingRequired > 0) {
        overallStatus = 'critical';
      } else if (missingOptional > 0) {
        overallStatus = 'partial';
      } else {
        overallStatus = 'complete';
      }
      
      const summary: ValidationSummary = {
        totalRequired: requiredFields.length,
        foundRequired,
        missingRequired,
        totalOptional: optionalFields.length,
        foundOptional,
        missingOptional,
        overallStatus,
      };
      
      const missingRequiredFields = validationResults.filter(f => f.required && f.status === 'missing');
      const missingOptionalFields = validationResults.filter(f => !f.required && f.status === 'missing');
      const foundFields = validationResults.filter(f => f.status === 'found' || f.status === 'type_mismatch');
      
      return {
        validationResults,
        summary,
        missingRequiredFields,
        missingOptionalFields,
        foundFields,
      };
    },
    enabled: !isLoading && !!customFieldsData,
  });
}

function getAllExpectedFields(model: 'contact' | 'opportunity' | 'all') {
  if (model === 'all') {
    return [
      ...EXPECTED_CUSTOM_FIELDS.sellerAcquisitions,
      ...EXPECTED_CUSTOM_FIELDS.buyerAcquisitions,
      ...EXPECTED_CUSTOM_FIELDS.dealAcquisitions,
      ...EXPECTED_CUSTOM_FIELDS.contacts,
    ];
  }
  
  if (model === 'opportunity') {
    return [
      ...EXPECTED_CUSTOM_FIELDS.sellerAcquisitions,
      ...EXPECTED_CUSTOM_FIELDS.buyerAcquisitions,
      ...EXPECTED_CUSTOM_FIELDS.dealAcquisitions,
    ];
  }
  
  // contact
  return EXPECTED_CUSTOM_FIELDS.contacts;
}