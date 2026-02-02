import type { Property } from '@/types';
import type { AirtablePropertyMatch } from './airtableApi';
import { generatePropertySlug } from '@/lib/utils/slug';

const API_BASE = '/api/ghl';
const SITE_URL = typeof window !== 'undefined' ? window.location.origin : 'https://purplehomes-hub.vercel.app';

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
    agentName = 'Purple Homes',
    agentPhone = '(555) 123-4567',
    agentEmail = 'info@purplehomes.com',
    language = 'English',
  } = options;

  const isSpanish = language === 'Spanish';

  // Use provided subject or default based on language
  const subject = options.subject || (isSpanish
    ? `Tus Propiedades Encontradas de Purple Homes`
    : `Your Matched Properties from Purple Homes`);

  // Prepare email body based on language
  const emailBody = isSpanish ? `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #9333EA 0%, #7C3AED 100%); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Purple Homes</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Oportunidades de Inversión Inmobiliaria</p>
      </div>

      <div style="padding: 30px; background: #ffffff;">
        <h2 style="color: #1F2937; margin-top: 0;">¡Hola ${contactName}!</h2>

        <p style="color: #4B5563; line-height: 1.6;">
          Hemos encontrado <strong style="color: #9333EA;">${properties.length} propiedad${properties.length > 1 ? 'es' : ''}</strong> que coinciden con tus criterios de inversión.
        </p>

        ${customMessage ? `
          <div style="background: #F3F4F6; padding: 15px; border-left: 4px solid #9333EA; margin: 20px 0;">
            <p style="color: #374151; margin: 0; line-height: 1.6;">${customMessage}</p>
          </div>
        ` : ''}

        <p style="color: #4B5563; line-height: 1.6;">
          A continuación encontrarás toda la información detallada de las propiedades:
        </p>

        <div style="background: #F9FAFB; padding: 20px; border-radius: 8px; margin: 25px 0;">
          <h3 style="color: #1F2937; margin-top: 0; font-size: 16px;">Resumen Rápido de Propiedades:</h3>
          ${properties.slice(0, 3).map((p, i) => `
            <div style="margin: 15px 0; padding: 12px; background: white; border-radius: 6px; border: 1px solid #E5E7EB;">
              <div style="font-weight: bold; color: #9333EA; font-size: 14px;">${i + 1}. ${p.address}</div>
              <div style="color: #374151; margin: 5px 0;">${p.city}${p.state ? `, ${p.state}` : ''}</div>
              <div style="color: #6B7280; font-size: 13px;">
                <strong>$${p.price.toLocaleString()}</strong> • ${p.beds} hab • ${p.baths} baño${p.baths > 1 ? 's' : ''}
                ${p.sqft ? ` • ${p.sqft.toLocaleString()} pies²` : ''}
              </div>
              ${p.downPayment ? `
                <div style="color: #9333EA; font-size: 12px; margin-top: 5px;">
                  Enganche: $${p.downPayment.toLocaleString()}
                  ${p.monthlyPayment ? ` • Mensual: $${p.monthlyPayment.toLocaleString()}` : ''}
                </div>
              ` : ''}
            </div>
          `).join('')}
          ${properties.length > 3 ? `
            <div style="color: #6B7280; font-style: italic; margin-top: 10px; font-size: 13px;">
              + ${properties.length - 3} propiedad${properties.length - 3 === 1 ? '' : 'es'} más
            </div>
          ` : ''}
        </div>

        <p style="color: #4B5563; line-height: 1.6;">
          ¡Estas propiedades se están moviendo rápido! Contáctanos hoy para programar visitas u obtener más información.
        </p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="mailto:${agentEmail}" style="background: #9333EA; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
            Contáctanos Ahora
          </a>
        </div>
      </div>

      <div style="background: #F9FAFB; padding: 25px; text-align: center; border-top: 1px solid #E5E7EB;">
        <p style="margin: 0; color: #6B7280; font-size: 14px;">
          <strong>${agentName}</strong><br/>
          ${agentPhone} • ${agentEmail}
        </p>
        <p style="margin: 15px 0 0 0; color: #9CA3AF; font-size: 12px;">
          Purple Homes - Tu Socio de Inversión Inmobiliaria
        </p>
      </div>
    </div>
  ` : `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #9333EA 0%, #7C3AED 100%); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Purple Homes</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Investment Property Opportunities</p>
      </div>

      <div style="padding: 30px; background: #ffffff;">
        <h2 style="color: #1F2937; margin-top: 0;">Hello ${contactName}!</h2>

        <p style="color: #4B5563; line-height: 1.6;">
          We've found <strong style="color: #9333EA;">${properties.length} property match${properties.length > 1 ? 'es' : ''}</strong> that align with your investment criteria.
        </p>

        ${customMessage ? `
          <div style="background: #F3F4F6; padding: 15px; border-left: 4px solid #9333EA; margin: 20px 0;">
            <p style="color: #374151; margin: 0; line-height: 1.6;">${customMessage}</p>
          </div>
        ` : ''}

        <p style="color: #4B5563; line-height: 1.6;">
          Below you'll find all the detailed property information:
        </p>

        <div style="background: #F9FAFB; padding: 20px; border-radius: 8px; margin: 25px 0;">
          <h3 style="color: #1F2937; margin-top: 0; font-size: 16px;">Quick Property Summary:</h3>
          ${properties.slice(0, 3).map((p, i) => `
            <div style="margin: 15px 0; padding: 12px; background: white; border-radius: 6px; border: 1px solid #E5E7EB;">
              <div style="font-weight: bold; color: #9333EA; font-size: 14px;">${i + 1}. ${p.address}</div>
              <div style="color: #374151; margin: 5px 0;">${p.city}${p.state ? `, ${p.state}` : ''}</div>
              <div style="color: #6B7280; font-size: 13px;">
                <strong>$${p.price.toLocaleString()}</strong> • ${p.beds} bed • ${p.baths} bath
                ${p.sqft ? ` • ${p.sqft.toLocaleString()} sqft` : ''}
              </div>
              ${p.downPayment ? `
                <div style="color: #9333EA; font-size: 12px; margin-top: 5px;">
                  Down Payment: $${p.downPayment.toLocaleString()}
                  ${p.monthlyPayment ? ` • Monthly: $${p.monthlyPayment.toLocaleString()}` : ''}
                </div>
              ` : ''}
            </div>
          `).join('')}
          ${properties.length > 3 ? `
            <div style="color: #6B7280; font-style: italic; margin-top: 10px; font-size: 13px;">
              + ${properties.length - 3} more ${properties.length - 3 === 1 ? 'property' : 'properties'}
            </div>
          ` : ''}
        </div>

        <p style="color: #4B5563; line-height: 1.6;">
          These properties are moving fast! Contact us today to schedule viewings or get more information.
        </p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="mailto:${agentEmail}" style="background: #9333EA; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
            Contact Us Now
          </a>
        </div>
      </div>

      <div style="background: #F9FAFB; padding: 25px; text-align: center; border-top: 1px solid #E5E7EB;">
        <p style="margin: 0; color: #6B7280; font-size: 14px;">
          <strong>${agentName}</strong><br/>
          ${agentPhone} • ${agentEmail}
        </p>
        <p style="margin: 15px 0 0 0; color: #9CA3AF; font-size: 12px;">
          Purple Homes - Your Real Estate Investment Partner
        </p>
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
      to: contactEmail,
      subject,
      html: emailBody,
      // Use dedicated email header if configured
      useDedicatedHeader: true,
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
    const slug = generatePropertySlug(property.address, property.city || '');
    const viewLabel = isSpanish ? 'Ver detalles' : 'View details';
    message += `   🔗 ${viewLabel}: ${SITE_URL}/listing/${slug}\n`;

    message += '\n';
  });

  message += isSpanish
    ? `Responde SI si te interesa para programar una visita! 📱`
    : `Reply YES if interested to schedule a showing! 📱`;

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
