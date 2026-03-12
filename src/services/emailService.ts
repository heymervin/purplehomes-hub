import type { Property } from '@/types';
import type { AirtablePropertyMatch } from './airtableApi';
import { generatePropertySlug } from '@/lib/utils/slug';

const API_BASE = '/api/ghl';
const SITE_URL = typeof window !== 'undefined' ? window.location.origin : 'https://purplehomes-hub.vercel.app';

/** Build city string the same way PublicPropertyDetail does, so slugs match */
function buildCityForSlug(p: { city?: string; state?: string; zipCode?: string }): string {
  return `${p.city || ''}${p.state ? `, ${p.state}` : ''}${p.zipCode ? ` ${p.zipCode}` : ''}`;
}

export interface SendPropertyEmailOptions {
  contactId: string;
  contactName: string;
  contactEmail: string;
  properties: Property[];
  subject?: string;
  customMessage?: string;
  agentName?: string;
  agentPhone?: string;
  agentEmail?: string;
  language?: 'English' | 'Spanish';
}

export interface BulkSendOptions {
  contacts: Array<{
    contactId: string;
    contactName: string;
    contactEmail: string;
    properties: Property[];
  }>;
  subject?: string;
  customMessage?: string;
  agentName?: string;
  agentPhone?: string;
  agentEmail?: string;
  useDedicatedHeader?: boolean;
}

/**
 * Send property matches via HighLevel email
 */
export async function sendPropertyEmail(options: SendPropertyEmailOptions): Promise<{ success: boolean; messageId?: string }> {
  const {
    contactId,
    contactName,
    contactEmail,
    properties,
    customMessage = '',
    agentName = 'Krista',
    agentPhone = '(555) 123-4567',
    agentEmail = 'info@purplehomes.com',
    language = 'English',
  } = options;

  const isSpanish = language === 'Spanish';

  // Use provided subject or default based on language
  const subject = options.subject || (isSpanish
    ? `🏡 Casas que encontramos para ti`
    : `🏡 Homes we found for you`);

  // firstName from contactName (first word)
  const firstName = contactName.split(' ')[0];

  // Prepare email body based on language
  const emailBody = isSpanish ? `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1F2937;">
      <div style="padding: 30px 30px 0 30px;">
        <p style="font-size: 16px; line-height: 1.7; margin: 0 0 16px 0;">Hola ${firstName},</p>

        <p style="font-size: 16px; line-height: 1.7; margin: 0 0 16px 0;">
          Encontramos algunas casas que podrían ser una buena opción basándonos en lo que nos dijiste. Échales un vistazo rápido y dinos si alguna te llama la atención.
        </p>

        ${customMessage ? `
          <p style="font-size: 16px; line-height: 1.7; margin: 0 0 16px 0; font-style: italic; border-left: 3px solid #9333EA; padding-left: 12px; color: #374151;">
            ${customMessage}
          </p>
        ` : ''}

        <p style="font-size: 16px; line-height: 1.7; margin: 0 0 16px 0;">
          Si una te interesa, avísame y coordinamos un momento para que la puedas ver en persona.
        </p>

        <p style="font-size: 16px; line-height: 1.7; margin: 0 0 24px 0;">
          Si ninguna se siente bien, está bien. Solo dinos y ajustamos las opciones para enviarte algo mejor.
        </p>
      </div>

      <div style="padding: 0 30px;">
        ${properties.map((p, i) => {
          const slug = generatePropertySlug(p.address, buildCityForSlug(p));
          const listingUrl = `${SITE_URL}/listing/${slug}`;
          return `
          <div style="margin: 12px 0; padding: 16px; background: #F9FAFB; border-radius: 8px; border: 1px solid #E5E7EB;">
            <div style="font-weight: bold; color: #9333EA; font-size: 15px; margin-bottom: 4px;">${properties.length > 1 ? `${i + 1}. ` : ''}${p.address}</div>
            <div style="color: #6B7280; font-size: 13px; margin-bottom: 6px;">${p.city || ''}${p.state ? `, ${p.state}` : ''}</div>
            <div style="color: #374151; font-size: 13px;">
              ${p.beds ? `${p.beds} hab` : ''}${p.baths ? ` • ${p.baths} baño${p.baths > 1 ? 's' : ''}` : ''}
              ${p.sqft ? ` • ${p.sqft.toLocaleString()} pies²` : ''}
            </div>
            ${(p.downPayment || p.monthlyPayment) ? `
              <div style="color: #9333EA; font-size: 13px; margin-top: 4px;">
                ${p.downPayment ? `Enganche: $${p.downPayment.toLocaleString()}` : ''}
                ${p.monthlyPayment ? ` • $${p.monthlyPayment.toLocaleString()}/mes` : ''}
              </div>
            ` : ''}
            <div style="margin-top: 10px;">
              <a href="${listingUrl}" style="background: #9333EA; color: white; padding: 8px 16px; text-decoration: none; border-radius: 5px; font-size: 13px; font-weight: 600; display: inline-block;">
                Ver Propiedad &rarr;
              </a>
            </div>
          </div>
        `}).join('')}
      </div>

      <div style="padding: 24px 30px 30px 30px;">
        <p style="font-size: 16px; line-height: 1.7; margin: 0 0 4px 0;">Hasta pronto,</p>
        <p style="font-size: 16px; font-weight: bold; margin: 0 0 16px 0;">${agentName}</p>
        <p style="font-size: 13px; color: #6B7280; margin: 0;">${agentPhone} &nbsp;•&nbsp; ${agentEmail}</p>
      </div>
    </div>
  ` : `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1F2937;">
      <div style="padding: 30px 30px 0 30px;">
        <p style="font-size: 16px; line-height: 1.7; margin: 0 0 16px 0;">Hello ${firstName},</p>

        <p style="font-size: 16px; line-height: 1.7; margin: 0 0 16px 0;">
          We found some homes that could be a great fit based on what you told us. Take a quick look below and see if any stand out to you.
        </p>

        ${customMessage ? `
          <p style="font-size: 16px; line-height: 1.7; margin: 0 0 16px 0; font-style: italic; border-left: 3px solid #9333EA; padding-left: 12px; color: #374151;">
            ${customMessage}
          </p>
        ` : ''}

        <p style="font-size: 16px; line-height: 1.7; margin: 0 0 16px 0;">
          If one catches your eye, let me know and we can schedule a time for you to see it in person.
        </p>

        <p style="font-size: 16px; line-height: 1.7; margin: 0 0 24px 0;">
          If none of these feel right, that is completely fine. Just let us know and we will adjust things and send you better options.
        </p>
      </div>

      <div style="padding: 0 30px;">
        ${properties.map((p, i) => {
          const slug = generatePropertySlug(p.address, buildCityForSlug(p));
          const listingUrl = `${SITE_URL}/listing/${slug}`;
          return `
          <div style="margin: 12px 0; padding: 16px; background: #F9FAFB; border-radius: 8px; border: 1px solid #E5E7EB;">
            <div style="font-weight: bold; color: #9333EA; font-size: 15px; margin-bottom: 4px;">${properties.length > 1 ? `${i + 1}. ` : ''}${p.address}</div>
            <div style="color: #6B7280; font-size: 13px; margin-bottom: 6px;">${p.city || ''}${p.state ? `, ${p.state}` : ''}</div>
            <div style="color: #374151; font-size: 13px;">
              ${p.beds ? `${p.beds} bd` : ''}${p.baths ? ` • ${p.baths} ba` : ''}
              ${p.sqft ? ` • ${p.sqft.toLocaleString()} sqft` : ''}
            </div>
            ${(p.downPayment || p.monthlyPayment) ? `
              <div style="color: #9333EA; font-size: 13px; margin-top: 4px;">
                ${p.downPayment ? `$${p.downPayment.toLocaleString()} down` : ''}
                ${p.monthlyPayment ? ` • $${p.monthlyPayment.toLocaleString()}/mo` : ''}
              </div>
            ` : ''}
            <div style="margin-top: 10px;">
              <a href="${listingUrl}" style="background: #9333EA; color: white; padding: 8px 16px; text-decoration: none; border-radius: 5px; font-size: 13px; font-weight: 600; display: inline-block;">
                View Home &rarr;
              </a>
            </div>
          </div>
        `}).join('')}
      </div>

      <div style="padding: 24px 30px 30px 30px;">
        <p style="font-size: 16px; line-height: 1.7; margin: 0 0 4px 0;">Talk soon,</p>
        <p style="font-size: 16px; font-weight: bold; margin: 0 0 16px 0;">${agentName}</p>
        <p style="font-size: 13px; color: #6B7280; margin: 0;">${agentPhone} &nbsp;•&nbsp; ${agentEmail}</p>
      </div>
    </div>
  `;

  // Send via GHL API
  const response = await fetch(`${API_BASE}?resource=messages&action=send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'Email',
      contactId,
      emailTo: contactEmail,
      subject,
      html: emailBody,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Email send failed' }));
    throw new Error(error.message || `Failed to send email: ${response.status}`);
  }

  return response.json();
}

/**
 * Send properties to multiple contacts in bulk
 * Each contact receives their own personalized email with matched properties
 */
export async function bulkSendPropertyEmails(options: BulkSendOptions): Promise<{
  total: number;
  sent: number;
  failed: number;
  results: Array<{ contactId: string; success: boolean; error?: string }>;
}> {
  const {
    contacts,
    subject,
    customMessage,
    agentName,
    agentPhone,
    agentEmail,
    useDedicatedHeader = true,
  } = options;

  const results: Array<{ contactId: string; success: boolean; error?: string }> = [];
  let sent = 0;
  let failed = 0;

  // Process in batches to avoid overwhelming the API
  const BATCH_SIZE = 5;
  const batches: typeof contacts[] = [];

  for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
    batches.push(contacts.slice(i, i + BATCH_SIZE));
  }

  for (const batch of batches) {
    const promises = batch.map(async (contact) => {
      try {
        await sendPropertyEmail({
          contactId: contact.contactId,
          contactName: contact.contactName,
          contactEmail: contact.contactEmail,
          properties: contact.properties,
          subject,
          customMessage,
          agentName,
          agentPhone,
          agentEmail,
        });

        results.push({ contactId: contact.contactId, success: true });
        sent++;
      } catch (error) {
        results.push({
          contactId: contact.contactId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        failed++;
      }
    });

    // Wait for batch to complete before moving to next
    await Promise.all(promises);

    // Small delay between batches to respect rate limits
    if (batches.indexOf(batch) < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return {
    total: contacts.length,
    sent,
    failed,
    results,
  };
}

/**
 * Send properties matched from Airtable data
 */
export async function sendMatchedProperties(params: {
  matches: AirtablePropertyMatch[];
  allProperties: Property[];
  subject?: string;
  customMessage?: string;
  agentName?: string;
  agentPhone?: string;
  agentEmail?: string;
}): Promise<ReturnType<typeof bulkSendPropertyEmails>> {
  const { matches, allProperties, ...emailOptions } = params;

  // Build contact list with their matched properties
  const contacts = matches.map((match) => {
    const matchedProps = allProperties.filter((p) =>
      match.matchedPropertyIds.includes(p.id) || match.matchedPropertyIds.includes(p.ghlOpportunityId || '')
    );

    return {
      contactId: match.contactId,
      contactName: match.contactName,
      contactEmail: match.contactEmail,
      properties: matchedProps,
    };
  }).filter((c) => c.properties.length > 0); // Only send to contacts with matched properties

  return bulkSendPropertyEmails({
    contacts,
    ...emailOptions,
  });
}

/**
 * Format a number in compact form (e.g., 25000 -> 25K, 1500000 -> 1.5M)
 */
function formatCompact(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 1000) return (num / 1000).toFixed(0) + 'K';
  return num.toLocaleString();
}

/**
 * Generate default SMS message for properties
 * Supports English and Spanish based on buyer's language preference
 */
export function generatePropertySMS(
  buyerFirstName: string,
  properties: Property[],
  language: 'English' | 'Spanish' = 'English'
): string {
  const isSpanish = language === 'Spanish';

  let message = isSpanish
    ? `Hola ${buyerFirstName}! 🏠\n\n`
    : `Hi ${buyerFirstName}! 🏠\n\n`;

  if (properties.length === 1) {
    message += isSpanish
      ? `Encontré una propiedad que coincide con lo que estás buscando:\n\n`
      : `I found a property that matches what you're looking for:\n\n`;
  } else {
    message += isSpanish
      ? `Encontré ${properties.length} propiedades que coinciden con lo que estás buscando:\n\n`
      : `I found ${properties.length} properties that match what you're looking for:\n\n`;
  }

  properties.forEach((property, index) => {
    if (properties.length > 1) {
      message += `${index + 1}. `;
    }

    // Build location string with city and state if available
    const location = property.city || property.state
      ? `${property.address}, ${[property.city, property.state].filter(Boolean).join(', ')}`
      : property.address;

    message += `📍 ${location}\n`;

    const details: string[] = [];
    if (property.beds || property.baths) {
      const bedLabel = isSpanish ? 'hab' : 'bd';
      const bathLabel = isSpanish ? 'baño' : 'ba';
      details.push(`${property.beds || '?'}${bedLabel}/${property.baths || '?'}${bathLabel}`);
    }
    if (property.downPayment) {
      const downLabel = isSpanish ? 'enganche' : 'down';
      details.push(`$${formatCompact(property.downPayment)} ${downLabel}`);
    }
    if (property.monthlyPayment) {
      const monthlyLabel = isSpanish ? '/mes' : '/mo';
      details.push(`$${formatCompact(property.monthlyPayment)}${monthlyLabel}`);
    }

    if (details.length > 0) {
      message += `   ${details.join(' • ')}\n`;
    }

    // Add funnel page link
    const slug = generatePropertySlug(property.address, buildCityForSlug(property));
    const viewLabel = isSpanish ? 'Ver' : 'View';
    message += `   🔗 ${viewLabel}: ${SITE_URL}/listing/${slug}\n`;

    message += '\n';
  });

  message += isSpanish
    ? `¡Responde SÍ si te interesa para programar una visita! 📱`
    : `Reply YES if you're interested to schedule a showing! 📱`;

  return message;
}

/**
 * Send property details via SMS using GHL Conversations API
 */
export async function sendPropertySMS(
  buyer: { contactId: string; firstName: string; phone?: string },
  message: string
): Promise<{ success: boolean; messageId?: string }> {
  if (!buyer.phone) {
    throw new Error('Buyer does not have a phone number');
  }

  if (!buyer.contactId) {
    throw new Error('Buyer does not have a contact ID');
  }

  const response = await fetch(`${API_BASE}?resource=messages&action=send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contactId: buyer.contactId,
      type: 'SMS',
      message: message,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'SMS send failed' }));
    throw new Error(error.error || 'Failed to send SMS');
  }

  const result = await response.json();
  return { success: true, messageId: result.messageId };
}
