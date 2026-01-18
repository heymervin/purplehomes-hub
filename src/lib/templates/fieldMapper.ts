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
import { isAgentProfileOverrideEnabled } from '@/lib/agentProfileToggle';

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
 * Parse a natural language tip header into topic + title
 * e.g., "Home buyer crucial tips" → { topic: "HOME BUYER", title: "CRUCIAL TIPS" }
 *
 * Parsing logic:
 * - Look for common split points: "tips", "advice", "guide", "strategies", etc.
 * - The part before is the topic, the part including the keyword is the title
 * - If no keyword found, split roughly in half by words
 */
function parseTipHeader(input: string): { topic: string; title: string } {
  if (!input || !input.trim()) {
    return { topic: '', title: '' };
  }

  const trimmed = input.trim();

  // Common title keywords that indicate where to split
  const titleKeywords = [
    'tips', 'tip', 'advice', 'guide', 'strategies', 'strategy',
    'secrets', 'steps', 'ways', 'checklist', 'essentials', 'must-knows',
    'mistakes', 'questions', 'facts', 'myths', 'basics', 'fundamentals'
  ];

  // Try to find a natural split point based on keywords
  const words = trimmed.split(/\s+/);

  for (let i = 0; i < words.length; i++) {
    const word = words[i].toLowerCase().replace(/[^a-z]/g, '');
    if (titleKeywords.includes(word)) {
      // Found a keyword - split here
      // Topic is everything before this word (if there's anything)
      // Title is from this word onwards

      // Look for adjective before the keyword (e.g., "crucial tips", "essential advice")
      let titleStartIndex = i;
      const adjectives = ['crucial', 'essential', 'key', 'important', 'top', 'best', 'quick', 'easy', 'simple', 'smart'];

      if (i > 0) {
        const prevWord = words[i - 1].toLowerCase().replace(/[^a-z]/g, '');
        if (adjectives.includes(prevWord)) {
          titleStartIndex = i - 1;
        }
      }

      if (titleStartIndex > 0) {
        const topic = words.slice(0, titleStartIndex).join(' ').toUpperCase();
        const title = words.slice(titleStartIndex).join(' ').toUpperCase();
        return { topic, title };
      }
    }
  }

  // No keyword found - try splitting by word count
  // If we have 2+ words, first word(s) = topic, last word(s) = title
  if (words.length >= 2) {
    // Simple split: first half topic, second half title
    const midpoint = Math.ceil(words.length / 2);
    const topic = words.slice(0, midpoint).join(' ').toUpperCase();
    const title = words.slice(midpoint).join(' ').toUpperCase();
    return { topic, title };
  }

  // Single word - use as title, leave topic empty
  return { topic: '', title: trimmed.toUpperCase() };
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
        // Check if agent profile override is enabled
        // If disabled, return empty value so Imejis uses template defaults
        if (!isAgentProfileOverrideEnabled()) {
          baseResult.value = '';
          break;
        }

        // Use provided agent or fall back to default agent
        const selectedAgent = agent || getDefaultAgent();
        if (fieldConfig.agentPath && selectedAgent) {
          const agentValue = selectedAgent[fieldConfig.agentPath as keyof TeamAgent];
          if (agentValue) {
            baseResult.value = agentValue;
          } else {
            // Agent field is empty - let Imejis use template defaults
            baseResult.value = '';
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

      case 'derived':
        // Derive value from another field (e.g., tipHeader → tipTopic/tipTitle)
        const sourceFieldKey = fieldConfig.derivedFrom;
        const derivedPart = fieldConfig.derivedPart;

        if (sourceFieldKey && derivedPart) {
          const sourceValue = userInputs[sourceFieldKey] || '';

          if (sourceFieldKey === 'tipHeader') {
            // Parse tip header into topic + title
            const parsed = parseTipHeader(sourceValue);
            baseResult.value = derivedPart === 'topic' ? parsed.topic : parsed.title;
          }
        }
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

    // Skip composite/placeholder fields (they're just for UI, derived fields have the real IDs)
    if (fieldConfig.imejisFieldId === '__composite__') continue;

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
