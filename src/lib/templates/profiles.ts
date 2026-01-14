import type { TemplateProfile } from './types';
import { COMPANY_CONSTANTS } from './constants';

// Re-export TEMPLATE_CATEGORIES for convenience
export { TEMPLATE_CATEGORIES } from './types';

// ============================================
// TEMPLATE PROFILES
// ============================================

export const TEMPLATE_PROFILES: Record<string, TemplateProfile> = {
  // ----------------------------------------
  // 1. JUST LISTED
  // ----------------------------------------
  'just-listed': {
    id: 'just-listed',
    imejisTemplateId: 'QorQjk-HEOq1c9qMKxTN4',

    name: 'Just Listed',
    icon: '🏷️',
    description: 'Announce a new property on the market',
    category: 'property',
    previewImage: '/templates/just-listed-preview.png',

    bestFor: [
      'New listings',
      'Coming soon properties',
      'Fresh on market announcements',
    ],

    fields: {
      logo: {
        imejisFieldId: 'image_comp_1767862580426_lur8im1ah',
        source: 'auto-constant',
        dataType: 'image',
        constantValue: COMPANY_CONSTANTS.logo,
      },
      heroImage: {
        imejisFieldId: 'image_comp_1767862725425_2jgk7k965',
        source: 'auto-property',
        dataType: 'image',
        propertyPath: 'heroImage',
      },
      address: {
        imejisFieldId: 'text_comp_1767864783352_5o7fpiht0',
        source: 'auto-property',
        dataType: 'text',
        propertyPath: 'fullAddress',
        format: 'address',
      },
      downPayment: {
        imejisFieldId: 'text_comp_1767864146031_237ayry70',
        source: 'auto-property',
        dataType: 'text',
        propertyPath: 'downPayment',
        format: 'currency',
      },
      qrCode: {
        imejisFieldId: 'qr_comp_1767863614224_v0podj5uu',
        source: 'auto-generated',
        dataType: 'qr',
        generator: 'qrCodeUrl',
      },
      // Agent fields
      agentName: {
        imejisFieldId: 'text_comp_1767865067140_fhl22vcqp',
        source: 'auto-agent',
        dataType: 'text',
        agentPath: 'name',
      },
      agentPhone: {
        imejisFieldId: 'text_comp_1767865411329_ohv9qfk56',
        source: 'auto-agent',
        dataType: 'text',
        agentPath: 'phone',
      },
      agentEmail: {
        imejisFieldId: 'text_comp_1767865486832_takqrhxf5',
        source: 'auto-agent',
        dataType: 'text',
        agentPath: 'email',
      },
      agentHeadshot: {
        imejisFieldId: 'image_comp_1767864936087_ro6p0rb7m',
        source: 'auto-agent',
        dataType: 'image',
        agentPath: 'headshot',
      },
    },

    userInputFields: [],
    userInputCount: 0,
    requiresProperty: true,
    requiresImages: false,
  },

  // ----------------------------------------
  // 2. JUST SOLD
  // ----------------------------------------
  'just-sold': {
    id: 'just-sold',
    imejisTemplateId: 'w7isPSUMtFuR70J-lTGlG',

    name: 'Just Sold',
    icon: '🎉',
    description: 'Celebrate a successful sale',
    category: 'property',
    previewImage: '/templates/just-sold-preview.png',

    bestFor: [
      'Closed deals',
      'Success celebrations',
      'Social proof',
    ],

    fields: {
      address: {
        imejisFieldId: 'text_comp_1767864783352_5o7fpiht0',
        source: 'auto-property',
        dataType: 'text',
        propertyPath: 'fullAddress',
        format: 'address',
      },
      heroImage: {
        imejisFieldId: 'image_comp_1767862725425_2jgk7k965',
        source: 'auto-property',
        dataType: 'image',
        propertyPath: 'heroImage',
      },
      qrCode: {
        imejisFieldId: 'qr_comp_1767866776342_d5w4goubo',
        source: 'auto-generated',
        dataType: 'qr',
        generator: 'qrCodeUrl',
      },
      // Agent fields
      agentName: {
        imejisFieldId: 'text_comp_1767865067140_fhl22vcqp',
        source: 'auto-agent',
        dataType: 'text',
        agentPath: 'name',
      },
      agentPhone: {
        imejisFieldId: 'text_comp_1767865411329_ohv9qfk56',
        source: 'auto-agent',
        dataType: 'text',
        agentPath: 'phone',
      },
      agentEmail: {
        imejisFieldId: 'text_comp_1767865486832_takqrhxf5',
        source: 'auto-agent',
        dataType: 'text',
        agentPath: 'email',
      },
      agentHeadshot: {
        imejisFieldId: 'image_comp_1767864936087_ro6p0rb7m',
        source: 'auto-agent',
        dataType: 'image',
        agentPath: 'headshot',
      },
    },

    userInputFields: [],
    userInputCount: 0,
    requiresProperty: true,
    requiresImages: true,
  },

  // ----------------------------------------
  // 3. OPEN HOUSE
  // ----------------------------------------
  'open-house': {
    id: 'open-house',
    imejisTemplateId: '_BIRlWG8XKlnJcvU5bl7D',

    name: 'Open House',
    icon: '🚪',
    description: 'Invite people to your open house event',
    category: 'property',
    previewImage: '/templates/open-house-preview.png',

    bestFor: [
      'Open house events',
      'Property showings',
      'Weekend tours',
    ],

    fields: {
      address: {
        imejisFieldId: 'text_comp_1767864783352_5o7fpiht0',
        source: 'auto-property',
        dataType: 'text',
        propertyPath: 'fullAddress',
        format: 'address',
      },
      dateTime: {
        imejisFieldId: 'text_comp_1768034851051_5mwmr3vmx',
        source: 'user-input',
        dataType: 'datetime',
        format: 'datetime',
        inputConfig: {
          label: 'Event Date & Time',
          placeholder: 'Saturday, Jan 15 • 2-4 PM',
          helpText: 'Select the date and time of your open house',
          required: true,
          dateFormat: 'EEEE, MMM d • h-h a',
        },
      },
      heroImage: {
        imejisFieldId: 'image_comp_1767862725425_2jgk7k965',
        source: 'auto-property',
        dataType: 'image',
        propertyPath: 'heroImage',
      },
      supportingImage1: {
        imejisFieldId: 'image_comp_1767867471974_gn3o8p3fm',
        source: 'auto-property',
        dataType: 'image',
        propertyPath: 'images[0]',
        optional: true,
      },
      supportingImage2: {
        imejisFieldId: 'image_comp_1767867669417_9szm28rn4',
        source: 'auto-property',
        dataType: 'image',
        propertyPath: 'images[1]',
        optional: true,
      },
      supportingImage3: {
        imejisFieldId: 'image_comp_1767867660726_xqdwb8i9q',
        source: 'auto-property',
        dataType: 'image',
        propertyPath: 'images[2]',
        optional: true,
      },
      qrCode: {
        imejisFieldId: 'qr_comp_1767866776342_d5w4goubo',
        source: 'auto-generated',
        dataType: 'qr',
        generator: 'qrCodeUrl',
      },
      // Agent fields
      agentName: {
        imejisFieldId: 'text_comp_1767865067140_fhl22vcqp',
        source: 'auto-agent',
        dataType: 'text',
        agentPath: 'name',
      },
      agentPhone: {
        imejisFieldId: 'text_comp_1767865411329_ohv9qfk56',
        source: 'auto-agent',
        dataType: 'text',
        agentPath: 'phone',
      },
      agentEmail: {
        imejisFieldId: 'text_comp_1767865486832_takqrhxf5',
        source: 'auto-agent',
        dataType: 'text',
        agentPath: 'email',
      },
      agentHeadshot: {
        imejisFieldId: 'image_comp_1767864936087_ro6p0rb7m',
        source: 'auto-agent',
        dataType: 'image',
        agentPath: 'headshot',
      },
    },

    userInputFields: ['dateTime'],
    userInputCount: 1,
    requiresProperty: true,
    requiresImages: true,
  },

  // ----------------------------------------
  // 4. PERSONAL VALUE (Tips)
  // ----------------------------------------
  'personal-value': {
    id: 'personal-value',
    imejisTemplateId: 'H-4J7Qo0VFN7W2Gzqh3vT',

    name: 'Value Tips',
    icon: '💡',
    description: 'Share helpful tips and establish expertise',
    category: 'brand',
    previewImage: '/templates/personal-value-preview.png',

    bestFor: [
      'Educational content',
      'Market tips',
      'Buyer/seller advice',
      'Brand building',
    ],

    fields: {
      header: {
        imejisFieldId: 'text_comp_1767862944913_m4kenfjln',
        source: 'user-input',
        dataType: 'text',
        inputConfig: {
          label: 'Main Header',
          placeholder: '3 Tips for First-Time Homebuyers',
          helpText: 'Keep it concise - this is the main title',
          required: true,
          maxLength: 45,
        },
      },
      tip1Image: {
        imejisFieldId: 'image_comp_1767867471974_gn3o8p3fm',
        source: 'user-input',
        dataType: 'image',
        inputConfig: {
          label: 'Tip 1 Image',
          placeholder: 'Paste image URL',
          required: false,
        },
        optional: true,
      },
      tip1Header: {
        imejisFieldId: 'text_comp_1767869478268_ti5gra85n',
        source: 'user-input',
        dataType: 'text',
        inputConfig: {
          label: 'Tip 1 Title',
          placeholder: 'Get Pre-Approved First',
          helpText: 'Short and punchy - max 3-4 words',
          required: true,
          maxLength: 25,
        },
      },
      tip1Body: {
        imejisFieldId: 'text_comp_1767869592381_66ht81t4j',
        source: 'user-input',
        dataType: 'textarea',
        inputConfig: {
          label: 'Tip 1 Description',
          placeholder: 'Know your budget before you start looking...',
          helpText: 'Keep it brief - about 2-3 short sentences',
          required: true,
          maxLength: 120,
          rows: 2,
        },
      },
      tip2Image: {
        imejisFieldId: 'image_comp_1767867669417_9szm28rn4',
        source: 'user-input',
        dataType: 'image',
        inputConfig: {
          label: 'Tip 2 Image',
          placeholder: 'Paste image URL',
          required: false,
        },
        optional: true,
      },
      tip2Header: {
        imejisFieldId: 'text_comp_1767869553326_xi5s99bu4',
        source: 'user-input',
        dataType: 'text',
        inputConfig: {
          label: 'Tip 2 Title',
          placeholder: 'Research the Neighborhood',
          helpText: 'Short and punchy - max 3-4 words',
          required: true,
          maxLength: 25,
        },
      },
      tip2Body: {
        imejisFieldId: 'text_comp_1767869686412_r37d4r3pu',
        source: 'user-input',
        dataType: 'textarea',
        inputConfig: {
          label: 'Tip 2 Description',
          placeholder: 'Visit at different times of day...',
          helpText: 'Keep it brief - about 2-3 short sentences',
          required: true,
          maxLength: 120,
          rows: 2,
        },
      },
      tip3Image: {
        imejisFieldId: 'image_comp_1767867660726_xqdwb8i9q',
        source: 'user-input',
        dataType: 'image',
        inputConfig: {
          label: 'Tip 3 Image',
          placeholder: 'Paste image URL',
          required: false,
        },
        optional: true,
      },
      tip3Header: {
        imejisFieldId: 'text_comp_1767869566697_0vtudc4ul',
        source: 'user-input',
        dataType: 'text',
        inputConfig: {
          label: 'Tip 3 Title',
          placeholder: "Don't Skip the Inspection",
          helpText: 'Short and punchy - max 3-4 words',
          required: true,
          maxLength: 25,
        },
      },
      tip3Body: {
        imejisFieldId: 'text_comp_1767869711808_z9emjheyd',
        source: 'user-input',
        dataType: 'textarea',
        inputConfig: {
          label: 'Tip 3 Description',
          placeholder: 'A home inspection can save you thousands...',
          helpText: 'Keep it brief - about 2-3 short sentences',
          required: true,
          maxLength: 120,
          rows: 2,
        },
      },
      qrCode: {
        imejisFieldId: 'qr_comp_1767866776342_d5w4goubo',
        source: 'auto-constant',
        dataType: 'qr',
        constantValue: COMPANY_CONSTANTS.website,
      },
      // Agent fields
      agentName: {
        imejisFieldId: 'text_comp_1767865067140_fhl22vcqp',
        source: 'auto-agent',
        dataType: 'text',
        agentPath: 'name',
      },
      agentPhone: {
        imejisFieldId: 'text_comp_1767865411329_ohv9qfk56',
        source: 'auto-agent',
        dataType: 'text',
        agentPath: 'phone',
      },
      agentEmail: {
        imejisFieldId: 'text_comp_1767865486832_takqrhxf5',
        source: 'auto-agent',
        dataType: 'text',
        agentPath: 'email',
      },
      agentHeadshot: {
        imejisFieldId: 'image_comp_1767864936087_ro6p0rb7m',
        source: 'auto-agent',
        dataType: 'image',
        agentPath: 'headshot',
      },
    },

    userInputFields: [
      'header',
      'tip1Header', 'tip1Body',
      'tip2Header', 'tip2Body',
      'tip3Header', 'tip3Body',
    ],
    userInputCount: 7,
    requiresProperty: false,
    requiresImages: false,
  },

  // ----------------------------------------
  // 5. SUCCESS STORY
  // ----------------------------------------
  'success-story': {
    id: 'success-story',
    imejisTemplateId: 'IiaGl2SBOiXWiWKYbZ2nN',

    name: 'Success Story',
    icon: '⭐',
    description: 'Client testimonial (manual entry required)',
    category: 'testimonial',
    previewImage: '/templates/success-story-preview.png',

    bestFor: [
      'Client testimonials',
      'Reviews',
      'Social proof',
      'Trust building',
    ],

    fields: {
      backgroundImage: {
        imejisFieldId: 'image_comp_1767862725425_2jgk7k965',
        source: 'user-input',
        dataType: 'image',
        inputConfig: {
          label: 'Background Image',
          placeholder: 'Paste image URL...',
          helpText: 'Choose a background image for this testimonial',
          required: false,
        },
        optional: true,
      },
      testimonial: {
        imejisFieldId: 'text_comp_1767864783352_5o7fpiht0',
        source: 'user-input',
        dataType: 'textarea',
        inputConfig: {
          label: 'Testimonial',
          placeholder: '"Working with Purple Homes was amazing! They found us our dream home in just 2 weeks..."',
          helpText: 'The client\'s testimonial in their own words',
          required: true,
          maxLength: 300,
          rows: 4,
        },
      },
      clientNameLocation: {
        imejisFieldId: 'text_comp_1767868516286_ei1h8tjso',
        source: 'user-input',
        dataType: 'text',
        inputConfig: {
          label: 'Client Name & Location',
          placeholder: 'Sarah M., Phoenix AZ',
          helpText: 'First name and city is usually sufficient',
          required: true,
          maxLength: 50,
        },
      },
      clientImage: {
        imejisFieldId: 'image_comp_1767868583746_4cv72hznl',
        source: 'user-input',
        dataType: 'image',
        inputConfig: {
          label: 'Image of Client',
          placeholder: 'Paste image URL...',
          helpText: 'Photo of the client or property they purchased',
          required: false,
        },
      },
      qrCode: {
        imejisFieldId: 'qr_comp_1767866776342_d5w4goubo',
        source: 'auto-constant',
        dataType: 'qr',
        constantValue: COMPANY_CONSTANTS.website,
      },
    },

    userInputFields: ['backgroundImage', 'testimonial', 'clientNameLocation', 'clientImage'],
    userInputCount: 4,
    requiresProperty: false,
    requiresImages: false,
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get all templates
 */
export function getAllTemplates(): TemplateProfile[] {
  return Object.values(TEMPLATE_PROFILES);
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: TemplateProfile['category']): TemplateProfile[] {
  return Object.values(TEMPLATE_PROFILES).filter(t => t.category === category);
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): TemplateProfile | undefined {
  return TEMPLATE_PROFILES[id];
}

/**
 * Get property-based templates
 */
export function getPropertyTemplates(): TemplateProfile[] {
  return Object.values(TEMPLATE_PROFILES).filter(t => t.requiresProperty);
}

/**
 * Get brand/standalone templates
 */
export function getStandaloneTemplates(): TemplateProfile[] {
  return Object.values(TEMPLATE_PROFILES).filter(t => !t.requiresProperty);
}
