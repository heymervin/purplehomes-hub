import { IMEJIS_TEMPLATES } from './templates';
import type { Property } from '@/types';
import type { GenerateImageParams, GenerateImageResult, ImejisTemplate } from './types';
import type { ImejisRenderPayload } from '@/lib/templates/types';

const IMEJIS_API_KEY = import.meta.env.VITE_IMEJIS_API_KEY || 'ysU0Hk6MVBSg6NVLDoPwx';
const IMEJIS_BASE_URL = 'https://render.imejis.io/v1';

/**
 * Generate a branded image using Imejis API
 */
export async function generateImejisImage(params: GenerateImageParams): Promise<GenerateImageResult> {
  const { templateId, property } = params;

  // Find template config
  const template = IMEJIS_TEMPLATES.find(t => t.id === templateId);
  if (!template) {
    return { success: false, error: 'Template not found' };
  }

  // Build request body
  const requestBody = buildImejisRequestBody(template, property);

  try {
    const response = await fetch(`${IMEJIS_BASE_URL}/${template.templateId}`, {
      method: 'POST',
      headers: {
        'dma-api-key': IMEJIS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Imejis API error:', errorText);
      return { success: false, error: `API error: ${response.status}` };
    }

    // Response is binary image data
    const imageBlob = await response.blob();
    const imageUrl = URL.createObjectURL(imageBlob);

    return {
      success: true,
      imageBlob,
      imageUrl,
    };
  } catch (error) {
    console.error('Imejis API error:', error);
    return { success: false, error: 'Failed to generate image' };
  }
}

/**
 * Build the request body for Imejis API
 */
function buildImejisRequestBody(
  template: ImejisTemplate,
  property: Property
): Record<string, unknown> {
  const { fieldMap } = template;
  const body: Record<string, unknown> = {};

  // Map property images
  const images = property.images || [];
  const heroImage = property.heroImage || images[0] || '';

  if (fieldMap.heroImage) {
    body[fieldMap.heroImage] = {
      image: heroImage,
      opacity: 1,
    };
  }

  if (fieldMap.image2 && images[1]) {
    body[fieldMap.image2] = {
      image: images[1],
      opacity: 1,
    };
  }

  if (fieldMap.image3 && images[2]) {
    body[fieldMap.image3] = {
      image: images[2],
      opacity: 1,
    };
  }

  if (fieldMap.image4 && images[3]) {
    body[fieldMap.image4] = {
      image: images[3],
      opacity: 1,
    };
  }

  // Map text fields
  if (fieldMap.header) {
    body[fieldMap.header] = {
      text: template.name.toUpperCase(), // "JUST LISTED", "SOLD", etc.
    };
  }

  if (fieldMap.streetAddress) {
    body[fieldMap.streetAddress] = {
      text: property.address || '',
    };
  }

  if (fieldMap.city) {
    body[fieldMap.city] = {
      text: property.city || '',
    };
  }

  if (fieldMap.stateZip) {
    const state = property.state || '';
    // Note: Property type doesn't have zip, using empty string
    body[fieldMap.stateZip] = {
      text: state.trim(),
    };
  }

  if (fieldMap.bedCount) {
    body[fieldMap.bedCount] = {
      text: property.beds ? `${property.beds} Beds` : '',
    };
  }

  if (fieldMap.bathCount) {
    body[fieldMap.bathCount] = {
      text: property.baths ? `${property.baths} Baths` : '',
    };
  }

  if (fieldMap.sqft) {
    body[fieldMap.sqft] = {
      text: property.sqft ? `${property.sqft.toLocaleString()} SF` : '',
    };
  }

  // Add price if template supports it
  if (fieldMap.price) {
    body[fieldMap.price] = {
      text: property.price
        ? `$${property.price.toLocaleString()}`
        : '',
    };
  }

  return body;
}

/**
 * Render an Imejis template with the new Template Profiles system
 */
export async function renderImejisTemplate(
  payload: ImejisRenderPayload
): Promise<{ success: boolean; imageUrl?: string; imageBlob?: Blob; error?: string }> {
  try {
    // Build request body from modifications
    const requestBody: Record<string, any> = {};

    payload.modifications.forEach(mod => {
      if (mod.text !== undefined) {
        requestBody[mod.name] = { text: mod.text };
      } else if (mod.src !== undefined) {
        requestBody[mod.name] = { image: mod.src, opacity: 1 };
      } else if (mod.data !== undefined) {
        requestBody[mod.name] = { data: mod.data };
      }
    });

    const response = await fetch(`${IMEJIS_BASE_URL}/${payload.templateId}`, {
      method: 'POST',
      headers: {
        'dma-api-key': IMEJIS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Imejis API error:', errorText);
      return {
        success: false,
        error: `Imejis API error: ${response.status}`,
      };
    }

    // Response is binary image data
    const blob = await response.blob();
    const imageUrl = URL.createObjectURL(blob);

    return {
      success: true,
      imageUrl,
      imageBlob: blob,
    };
  } catch (error) {
    console.error('Imejis render error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Cleanup blob URL to prevent memory leaks
 */
export function revokeImageUrl(url: string): void {
  if (url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}
