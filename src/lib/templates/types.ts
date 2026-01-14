import type { Property } from '@/types';

// ============================================
// TEMPLATE CATEGORIES
// ============================================

export type TemplateCategory = 'property' | 'brand' | 'testimonial';

export const TEMPLATE_CATEGORIES: Record<TemplateCategory, {
  label: string;
  description: string;
  icon: string;
}> = {
  property: {
    label: 'Property Templates',
    description: 'Showcase your listings',
    icon: '🏠',
  },
  brand: {
    label: 'Brand Templates',
    description: 'Share value and expertise',
    icon: '💡',
  },
  testimonial: {
    label: 'Testimonial Templates',
    description: 'Highlight client success',
    icon: '⭐',
  },
};

// ============================================
// FIELD SOURCE TYPES
// ============================================

export type FieldSourceType =
  | 'auto-property'      // Auto-fill from property data
  | 'auto-constant'      // Auto-fill from constant (logo, etc.)
  | 'auto-generated'     // Auto-generate (QR code URL)
  | 'auto-agent'         // Auto-fill from selected agent
  | 'user-input'         // User must provide
  | 'derived';           // Derived/parsed from another user-input field

export type FieldDataType =
  | 'text'
  | 'textarea'
  | 'image'
  | 'qr'
  | 'datetime'
  | 'currency';

export type FieldFormat =
  | 'none'
  | 'currency'           // $XXX,XXX
  | 'address'            // Full address formatting
  | 'date'               // Jan 15, 2025
  | 'datetime';          // Saturday, Jan 15 • 2-4 PM

// ============================================
// FIELD CONFIGURATION
// ============================================

export interface FieldConfig {
  // Imejis field ID
  imejisFieldId: string;

  // How to get the value
  source: FieldSourceType;

  // Data type
  dataType: FieldDataType;

  // For auto-property: path in property object
  propertyPath?: string;

  // For auto-constant: the constant value
  constantValue?: string;

  // For auto-generated: function name
  generator?: 'qrCodeUrl' | 'listingUrl';

  // For auto-agent: path in agent object (name, phone, email, headshot)
  agentPath?: 'name' | 'phone' | 'email' | 'headshot';

  // For user-input: input configuration
  inputConfig?: UserInputConfig;

  // For derived: which field to derive from and how
  derivedFrom?: string;         // Source field key (e.g., 'tipHeader')
  derivedPart?: 'topic' | 'title';  // Which part to extract

  // Formatting
  format?: FieldFormat;

  // Optional - can be skipped if not available
  optional?: boolean;
}

export interface UserInputConfig {
  label: string;
  placeholder?: string;
  helpText?: string;
  required: boolean;

  // For text/textarea
  maxLength?: number;
  minLength?: number;
  rows?: number;           // For textarea

  // For datetime
  dateFormat?: string;

  // Validation
  validation?: {
    pattern?: string;
    message?: string;
  };
}

// ============================================
// TEMPLATE PROFILE
// ============================================

export interface TemplateProfile {
  // Identifier
  id: string;

  // Imejis template ID
  imejisTemplateId: string;

  // User-facing info
  name: string;
  icon: string;
  description: string;
  category: TemplateCategory;

  // Preview image (static)
  previewImage: string;

  // When to use this template
  bestFor: string[];

  // Field configurations
  fields: Record<string, FieldConfig>;

  // Derived: which fields need user input
  userInputFields: string[];

  // Derived: count of user inputs
  userInputCount: number;

  // Requirements
  requiresProperty: boolean;     // Needs a property selected
  requiresImages: boolean;       // Needs property images

  // Supporting images
  supportingImageCount?: number; // How many supporting images this template uses (0 = none)
}

// ============================================
// TEMPLATE STATE
// ============================================

export interface TemplateState {
  selectedTemplateId: string | null;
  userInputs: Record<string, string>;
  isGenerating: boolean;
  generatedImageUrl: string | null;
  generatedImageBlob: Blob | null;
  error: string | null;
}

// ============================================
// FIELD VALUE (resolved)
// ============================================

export interface ResolvedFieldValue {
  fieldId: string;
  imejisFieldId: string;
  value: string;
  source: FieldSourceType;
  isValid: boolean;
  error?: string;
}

// ============================================
// IMEJIS PAYLOAD
// ============================================

export interface ImejisModification {
  name: string;
  text?: string;
  src?: string;
  data?: string;      // For QR codes
}

export interface ImejisRenderPayload {
  templateId: string;
  modifications: ImejisModification[];
  format?: 'png' | 'jpg' | 'webp';
  quality?: number;
}
