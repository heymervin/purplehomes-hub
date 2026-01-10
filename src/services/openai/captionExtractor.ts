import OpenAI from 'openai';

// Check if API key is available
const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

if (!apiKey) {
  console.warn('VITE_OPENAI_API_KEY not found. AI field extraction will be disabled.');
}

const openai = apiKey ? new OpenAI({
  apiKey,
  dangerouslyAllowBrowser: true, // Note: In production, proxy through backend
}) : null;

/**
 * Extract structured data from caption for Value Tips template
 */
export async function extractValueTips(caption: string): Promise<{
  success: boolean;
  data?: {
    header: string;
    tip1Header: string;
    tip1Body: string;
    tip2Header: string;
    tip2Body: string;
    tip3Header: string;
    tip3Body: string;
  };
  error?: string;
}> {
  if (!openai) {
    return { success: false, error: 'OpenAI API key not configured' };
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an AI that extracts structured data from real estate social media captions.
Extract tips and advice from the caption and format them into a structured format.

Requirements:
- header: Main title (max 45 chars)
- For each of 3 tips:
  - tipXHeader: Tip title (max 25 chars)
  - tipXBody: Tip description (max 120 chars)

If the caption doesn't contain clear tips, generate relevant real estate tips based on the context.`,
        },
        {
          role: 'user',
          content: caption,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'value_tips_extraction',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              header: { type: 'string' },
              tip1Header: { type: 'string' },
              tip1Body: { type: 'string' },
              tip2Header: { type: 'string' },
              tip2Body: { type: 'string' },
              tip3Header: { type: 'string' },
              tip3Body: { type: 'string' },
            },
            required: [
              'header',
              'tip1Header',
              'tip1Body',
              'tip2Header',
              'tip2Body',
              'tip3Header',
              'tip3Body',
            ],
            additionalProperties: false,
          },
        },
      },
    });

    const result = completion.choices[0].message.content;
    if (!result) {
      return { success: false, error: 'No response from OpenAI' };
    }

    const data = JSON.parse(result);

    // Enforce character limits
    data.header = data.header.substring(0, 45);
    data.tip1Header = data.tip1Header.substring(0, 25);
    data.tip1Body = data.tip1Body.substring(0, 120);
    data.tip2Header = data.tip2Header.substring(0, 25);
    data.tip2Body = data.tip2Body.substring(0, 120);
    data.tip3Header = data.tip3Header.substring(0, 25);
    data.tip3Body = data.tip3Body.substring(0, 120);

    return { success: true, data };
  } catch (error) {
    console.error('Error extracting value tips:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Extract event details from caption for Open House template
 */
export async function extractOpenHouseDetails(caption: string): Promise<{
  success: boolean;
  data?: {
    dateTime: string;
  };
  error?: string;
}> {
  if (!openai) {
    return { success: false, error: 'OpenAI API key not configured' };
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an AI that extracts event date and time from real estate social media captions.
Extract the open house date and time and format it as: "Day, Month Date • Time"
Example: "Saturday, Jan 15 • 2-4 PM"

If no date/time is found in the caption, return an empty string for dateTime.`,
        },
        {
          role: 'user',
          content: caption,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'open_house_extraction',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              dateTime: { type: 'string' },
            },
            required: ['dateTime'],
            additionalProperties: false,
          },
        },
      },
    });

    const result = completion.choices[0].message.content;
    if (!result) {
      return { success: false, error: 'No response from OpenAI' };
    }

    const data = JSON.parse(result);
    return { success: true, data };
  } catch (error) {
    console.error('Error extracting open house details:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Main function to extract template fields from caption based on template ID
 */
export async function extractTemplateFieldsFromCaption(
  templateId: string,
  caption: string
): Promise<{
  success: boolean;
  data?: Record<string, string>;
  error?: string;
}> {
  // Skip extraction for success-story template (testimonials are manual only)
  if (templateId === 'success-story') {
    return { success: false, error: 'Testimonials must be entered manually' };
  }

  switch (templateId) {
    case 'personal-value':
      return extractValueTips(caption);
    case 'open-house':
      return extractOpenHouseDetails(caption);
    default:
      // No extraction needed for other templates
      return { success: false, error: 'No extraction available for this template' };
  }
}
