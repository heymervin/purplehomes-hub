import type { Property } from '@/types';
import type {
  TemplateProfile,
  FieldConfig,
  ResolvedFieldValue,
  ImejisModification,
  ImejisRenderPayload,
} from './types';
import { COMPANY_CONSTANTS, QR_CODE_BASE_URL } from './constants';
import { getDefaultAgent, type TeamAgent } from '@/lib/socialHub/agents';

/**
 * Get nested property value by path
 * e.g., "images[0]" or "address.city"
 */
function getPropertyValue(property: Property, path: string): any {
  if (!path) return undefined;

  // Handle array notation like "images[0]"
  const arrayMatch = path.match(/^(\w+)\[(\d+)\]$/);
  if (arrayMatch) {
    const [, arrayName, indexStr] = arrayMatch;
    const array = (property as any)[arrayName];
    const index = parseInt(indexStr, 10);
    return Array.isArray(array) ? array[index] : undefined;
  }

  // Handle dot notation like "address.city"
  return path.split('.').reduce((obj, key) => obj?.[key], property as any);
}

/**
 * Format value based on format type
 */
function formatValue(value: any, format?: string): string {
  if (value === null || value === undefined) return '';

  switch (format) {
    case 'currency':
      const num = typeof value === 'number' ? value : parseFloat(value);
      return isNaN(num) ? '' : `$${num.toLocaleString()}`;

    case 'address':
      // Already formatted or just return as-is
      return String(value);

    case 'date':
      try {
        return new Date(value).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
      } catch {
        return String(value);
      }

    default:
      return String(value);
  }
}

/**
 * Generate QR code URL for property
 */
function generateQrCodeUrl(property: Property | null): string {
  // Use property's listing URL if available, otherwise generate one
  if (property?.listingUrl) {
    return property.listingUrl;
  }
  if (property?.id) {
    return `${QR_CODE_BASE_URL}${property.id}`;
  }
  return COMPANY_CONSTANTS.website;
}

/**
 * Resolve a single field value
 */
export function resolveFieldValue(
  fieldKey: string,
  fieldConfig: FieldConfig,
  property: Property | null,
  userInputs: Record<string, string>,
  agent?: TeamAgent | null
): ResolvedFieldValue {
  const baseResult: ResolvedFieldValue = {
    fieldId: fieldKey,
    imejisFieldId: fieldConfig.imejisFieldId,
    value: '',
    source: fieldConfig.source,
    isValid: true,
  };

  try {
    switch (fieldConfig.source) {
      case 'auto-constant':
        baseResult.value = fieldConfig.constantValue || '';
        break;

      case 'auto-property':
        if (!property) {
          baseResult.isValid = !fieldConfig.optional;
          baseResult.error = fieldConfig.optional ? undefined : 'No property selected';
          return baseResult;
        }
        const propValue = getPropertyValue(property, fieldConfig.propertyPath || '');
        if (propValue === undefined || propValue === null || propValue === '') {
          baseResult.isValid = !!fieldConfig.optional;
          baseResult.error = fieldConfig.optional ? undefined : `Missing property data: ${fieldConfig.propertyPath}`;
          return baseResult;
        }
        baseResult.value = formatValue(propValue, fieldConfig.format);
        break;

      case 'auto-agent':
        // Use provided agent or fall back to default
        const selectedAgent = agent || getDefaultAgent();
        if (fieldConfig.agentPath && selectedAgent) {
          const agentValue = selectedAgent[fieldConfig.agentPath];
          if (agentValue) {
            baseResult.value = agentValue;
          } else {
            // Agent field is empty (e.g., headshot not set)
            baseResult.isValid = !!fieldConfig.optional;
            baseResult.error = fieldConfig.optional ? undefined : `Missing agent data: ${fieldConfig.agentPath}`;
          }
        }
        break;

      case 'auto-generated':
        if (fieldConfig.generator === 'qrCodeUrl') {
          baseResult.value = generateQrCodeUrl(property);
        } else {
          baseResult.value = COMPANY_CONSTANTS.website;
        }
        break;

      case 'user-input':
        const inputValue = userInputs[fieldKey];
        const isRequired = fieldConfig.inputConfig?.required ?? false;

        if (!inputValue && isRequired) {
          baseResult.isValid = false;
          baseResult.error = `${fieldConfig.inputConfig?.label || fieldKey} is required`;
          return baseResult;
        }
        baseResult.value = inputValue || '';
        break;

      default:
        baseResult.value = '';
    }
  } catch (error) {
    baseResult.isValid = false;
    baseResult.error = `Error resolving field: ${error}`;
  }

  return baseResult;
}

/**
 * Resolve all fields for a template
 */
export function resolveAllFields(
  template: TemplateProfile,
  property: Property | null,
  userInputs: Record<string, string>,
  agent?: TeamAgent | null
): Map<string, ResolvedFieldValue> {
  const resolved = new Map<string, ResolvedFieldValue>();

  for (const [fieldKey, fieldConfig] of Object.entries(template.fields)) {
    resolved.set(fieldKey, resolveFieldValue(fieldKey, fieldConfig, property, userInputs, agent));
  }

  return resolved;
}

/**
 * Check if all required fields are valid
 */
export function areAllFieldsValid(resolvedFields: Map<string, ResolvedFieldValue>): boolean {
  for (const field of resolvedFields.values()) {
    if (!field.isValid) return false;
  }
  return true;
}

/**
 * Get validation errors
 */
export function getValidationErrors(resolvedFields: Map<string, ResolvedFieldValue>): string[] {
  const errors: string[] = [];
  for (const field of resolvedFields.values()) {
    if (!field.isValid && field.error) {
      errors.push(field.error);
    }
  }
  return errors;
}

/**
 * Convert resolved fields to Imejis API payload
 */
export function buildImejisPayload(
  template: TemplateProfile,
  resolvedFields: Map<string, ResolvedFieldValue>
): ImejisRenderPayload {
  const modifications: ImejisModification[] = [];

  for (const [fieldKey, fieldConfig] of Object.entries(template.fields)) {
    const resolved = resolvedFields.get(fieldKey);
    if (!resolved || !resolved.value) continue;

    const modification: ImejisModification = {
      name: fieldConfig.imejisFieldId,
    };

    switch (fieldConfig.dataType) {
      case 'text':
      case 'textarea':
      case 'datetime':
      case 'currency':
        modification.text = resolved.value;
        break;

      case 'image':
        modification.src = resolved.value;
        break;

      case 'qr':
        modification.data = resolved.value;
        break;
    }

    modifications.push(modification);
  }

  return {
    templateId: template.imejisTemplateId,
    modifications,
    format: 'png',
  };
}

/**
 * Helper: Get property's full address
 */
export function getFullAddress(property: Property): string {
  const parts = [
    property.address,
    property.city,
    property.state,
    property.zipCode,
  ].filter(Boolean);

  return parts.join(', ');
}

/**
 * Helper: Prepare property with computed fields
 */
export function preparePropertyForTemplate(property: Property): Property & { fullAddress: string } {
  return {
    ...property,
    fullAddress: getFullAddress(property),
  };
}
