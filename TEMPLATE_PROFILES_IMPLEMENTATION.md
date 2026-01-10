# Template Profiles System - Implementation Summary

## Overview

The Template Profiles system abstracts away complex Imejis field IDs and provides a user-friendly template selection and configuration experience. Users see friendly labels, auto-filled values, and only provide inputs that can't be auto-filled from property data.

## File Structure

```
src/
├── lib/templates/
│   ├── types.ts                    # Type definitions
│   ├── constants.ts                # Company branding constants
│   ├── profiles.ts                 # All 5 template configurations
│   ├── fieldMapper.ts              # Property data → Imejis fields
│   └── index.ts                    # Public exports
├── components/social/templates/
│   ├── TemplateSelector.tsx        # Visual template picker
│   ├── TemplateCard.tsx            # Individual template card
│   ├── TemplateConfigurator.tsx    # Configure + preview
│   ├── TemplatePreview.tsx         # Live preview
│   ├── TemplateFieldInput.tsx      # Dynamic input fields
│   ├── AutoFilledField.tsx         # Shows auto-filled values
│   └── index.ts                    # Public exports
├── components/social/create-wizard/steps/
│   └── ImageStep.tsx               # Updated to use new system
└── services/imejis/
    └── api.ts                      # Added renderImejisTemplate()
```

## The 5 Templates

| Template | User Inputs | Auto-Filled | Category |
|----------|-------------|-------------|----------|
| **Just Listed** | 0 (none!) | logo, address, price, QR | Property |
| **Just Sold** | 0 (none!) | address, hero image, QR | Property |
| **Open House** | 1 (dateTime) | address, images, QR | Property |
| **Personal Value** | 7 (header + 3 tips) | QR code | Brand |
| **Success Story** | 2 (testimonial + name) | QR code | Testimonial |

## Key Features

### 1. Template Profiles (`lib/templates/profiles.ts`)
- Each template configured with field mappings
- Declares which fields are auto-filled vs user input
- Specifies requirements (needs property? needs images?)

### 2. Field Mapper (`lib/templates/fieldMapper.ts`)
- Resolves property data paths (e.g., `images[0]`)
- Formats values (currency, addresses)
- Generates QR codes
- Validates required fields
- Builds Imejis API payload

### 3. Template Selector (`components/social/templates/TemplateSelector.tsx`)
- Shows templates organized by category
- "Auto-fill" badge for 0-input templates
- "X inputs" badge for templates needing data
- Disabled state when requirements not met

### 4. Template Configurator (`components/social/templates/TemplateConfigurator.tsx`)
- Shows auto-filled fields with green checkmarks
- Dynamic input fields for user data
- Live preview updates as you type
- Validation errors display
- Generate button disabled until valid

### 5. Live Preview (`components/social/templates/TemplatePreview.tsx`)
- Different preview for each template type
- Updates in real-time as user types
- Shows placeholder values when empty

## Integration with Wizard

The Template Profiles system integrates seamlessly with the existing 5-step wizard:

1. **Source** - User selects property
2. **Image** ← **NEW** - Template Profiles system
3. **Caption** - AI caption generation
4. **Hashtags** - Hashtag selection
5. **Publish** - Schedule & post

## Usage Flow

### Property Templates (Just Listed, Just Sold, Open House)

```typescript
// User flow:
1. Select property in Step 1
2. Step 2: Choose "Just Listed" template
3. All fields auto-fill from property
4. Click "Generate Image"
5. Done! Move to Caption step
```

### Brand Templates (Personal Value, Success Story)

```typescript
// User flow:
1. Step 2: Choose "Value Tips" template
2. Fill in header + 3 tips (title + body each)
3. See live preview update
4. Click "Generate Image"
5. Done! Move to Caption step
```

## Configuration Required

Update these constants in `lib/templates/constants.ts`:

```typescript
export const COMPANY_CONSTANTS = {
  logo: 'YOUR_LOGO_URL_HERE',
  companyName: 'Purple Homes',
  website: 'YOUR_WEBSITE_HERE',
  phone: 'YOUR_PHONE_HERE',
};

export const QR_CODE_BASE_URL = 'YOUR_LISTING_URL_BASE';
```

## Template Field IDs

All field IDs are correctly mapped from the Imejis templates:

### Just Listed (QorQjk-HEOq1c9qMKxTN4)
- logo: image_comp_1767862580426_lur8im1ah
- address: text_comp_1767864783352_5o7fpiht0
- price: text_comp_1767864146031_237ayry70
- qrCode: qr_comp_1767863614224_v0podj5uu

### Personal Value (H-4J7Qo0VFN7W2Gzqh3vT)
- header: text_comp_1767862944913_m4kenfjln
- tip1-3 images, headers, bodies (11 fields total)
- qrCode: qr_comp_1767866776342_d5w4goubo

### Success Story (IiaGl2SBOiXWiWKYbZ2nN)
- testimonial: text_comp_1767864783352_5o7fpiht0
- clientNameLocation: text_comp_1767868516286_ei1h8tjso
- qrCode: qr_comp_1767866776342_d5w4goubo

### Open House (_BIRlWG8XKlnJcvU5bl7D)
- address: text_comp_1767864783352_5o7fpiht0
- dateTime: text_comp_1768034851051_5mwmr3vmx
- heroImage + 3 supporting images
- qrCode: qr_comp_1767866776342_d5w4goubo

### Just Sold (w7isPSUMtFuR70J-lTGlG)
- address: text_comp_1767864783352_5o7fpiht0
- heroImage: image_comp_1767862725425_2jgk7k965
- qrCode: qr_comp_1767866776342_d5w4goubo

## Benefits

1. **User-Friendly** - No field IDs exposed to users
2. **Smart Auto-Fill** - Reduces data entry
3. **Live Preview** - See before you generate
4. **Validation** - Clear error messages
5. **Extensible** - Easy to add new templates

## Next Steps

1. Update `COMPANY_CONSTANTS` with actual values
2. Add template preview images to `/public/templates/`
3. Test with real property data
4. Consider adding template presets/favorites
