import type { ImejisTemplate } from './types';

export const IMEJIS_TEMPLATES: ImejisTemplate[] = [
  {
    id: 'just-listed',
    templateId: 'QorQjk-HEOq1c9qMKxTN4',
    name: 'Just Listed',
    description: 'Professional listing announcement',
    previewImage: '/templates/just-listed-preview.png',
    category: 'listing',
    fieldMap: {
      logo: "image_comp_1767862580426_lur8im1ah",
      address: "text_comp_1767864783352_5o7fpiht0",
      price: "text_comp_1767864146031_237ayry70",
      qrCode: "qr_comp_1767863614224_v0podj5uu",
    },
  },
  {
    id: 'personal-value',
    templateId: 'H-4J7Qo0VFN7W2Gzqh3vT',
    name: 'Personal Value',
    description: 'Personal branding template',
    previewImage: '/templates/personal-value-preview.png',
    category: 'engagement',
    fieldMap: {
      header: "text_comp_1767862944913_m4kenfjln",
      tip1Image: "image_comp_1767867471974_gn3o8p3fm",
      tip1Header: "text_comp_1767869478268_ti5gra85n",
      tip1Body: "text_comp_1767869592381_66ht81t4j",
      tip2Image: "image_comp_1767867669417_9szm28rn4",
      tip2Header: "text_comp_1767869553326_xi5s99bu4",
      tip2Body: "text_comp_1767869686412_r37d4r3pu",
      tip3Image: "image_comp_1767867660726_xqdwb8i9q",
      tip3Header: "text_comp_1767869566697_0vtudc4ul",
      tip3Body: "text_comp_1767869711808_z9emjheyd",
      qrCode: "qr_comp_1767866776342_d5w4goubo",
    },
  },
  {
    id: 'success-story',
    templateId: 'IiaGl2SBOiXWiWKYbZ2nN',
    name: 'Success Story',
    description: 'Client success story showcase',
    previewImage: '/templates/success-story-preview.png',
    category: 'status',
    fieldMap: {
      testimonial: "text_comp_1767864783352_5o7fpiht0",
      clientNameLocation: "text_comp_1767868516286_ei1h8tjso",
      qrCode: "qr_comp_1767866776342_d5w4goubo",
    },
  },
  {
    id: 'open-house',
    templateId: '_BIRlWG8XKlnJcvU5bl7D',
    name: 'Open House',
    description: 'Open house announcement',
    previewImage: '/templates/open-house-preview.png',
    category: 'listing',
    fieldMap: {
      address: "text_comp_1767864783352_5o7fpiht0",
      dateTime: "text_comp_1768034851051_5mwmr3vmx",
      heroImage: "image_comp_1767862725425_2jgk7k965",
      supportingImage1: "image_comp_1767867471974_gn3o8p3fm",
      supportingImage2: "image_comp_1767867669417_9szm28rn4",
      supportingImage3: "image_comp_1767867660726_xqdwb8i9q",
      qrCode: "qr_comp_1767866776342_d5w4goubo",
    },
  },
  {
    id: 'just-sold',
    templateId: 'w7isPSUMtFuR70J-lTGlG',
    name: 'Just Sold',
    description: 'Sold property announcement',
    previewImage: '/templates/just-sold-preview.png',
    category: 'status',
    fieldMap: {
      address: "text_comp_1767864783352_5o7fpiht0",
      heroImage: "image_comp_1767862725425_2jgk7k965",
      qrCode: "qr_comp_1767866776342_d5w4goubo",
    },
  },
];

export function getTemplateById(id: string): ImejisTemplate | undefined {
  return IMEJIS_TEMPLATES.find(t => t.id === id);
}

export function getTemplatesByCategory(category: ImejisTemplate['category']): ImejisTemplate[] {
  return IMEJIS_TEMPLATES.filter(t => t.category === category);
}
