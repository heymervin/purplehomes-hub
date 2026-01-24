/**
 * Global Testimonials API
 *
 * Stores and retrieves company-wide testimonials that are displayed
 * across all property funnel pages.
 *
 * Storage:
 * - Primary: Airtable Settings table (Testimonials field as JSON)
 * - Fallback: content/testimonials.json (local dev)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as fs from 'fs';
import * as path from 'path';

interface Testimonial {
  quote: string;
  authorName: string;
  authorTitle?: string;
  rating?: number;
}

interface TestimonialsData {
  testimonials: Testimonial[];
  updatedAt: string;
}

// Airtable configuration
const AIRTABLE_API_URL = 'https://api.airtable.com/v0';
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const SETTINGS_TABLE = 'Settings';

// Check if running on Vercel (read-only filesystem)
const IS_VERCEL = process.env.VERCEL === '1' || process.env.VERCEL_ENV !== undefined;

// File path for testimonials storage
const TESTIMONIALS_FILE = path.resolve(process.cwd(), 'content/testimonials.json');

// Load from Airtable Settings table
async function loadFromAirtable(): Promise<TestimonialsData | null> {
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    console.log('[Testimonials] Airtable not configured');
    return null;
  }

  try {
    const response = await fetch(
      `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${SETTINGS_TABLE}?maxRecords=1`,
      {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        },
      }
    );

    if (!response.ok) {
      console.error('[Testimonials] Airtable fetch error:', response.status);
      return null;
    }

    const data = await response.json();
    if (data.records && data.records.length > 0) {
      const record = data.records[0];
      const testimonialsJson = record.fields.Testimonials;

      if (testimonialsJson) {
        try {
          const testimonials = JSON.parse(testimonialsJson);
          return {
            testimonials: Array.isArray(testimonials) ? testimonials : [],
            updatedAt: record.fields.LastModified || new Date().toISOString(),
          };
        } catch {
          console.error('[Testimonials] Failed to parse JSON from Airtable');
        }
      }
    }

    return null;
  } catch (error) {
    console.error('[Testimonials] Airtable load error:', error);
    return null;
  }
}

// Save to Airtable Settings table
async function saveToAirtable(data: TestimonialsData): Promise<boolean> {
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    console.log('[Testimonials] Airtable not configured');
    return false;
  }

  try {
    // First, get the existing record ID (or create one)
    const listResponse = await fetch(
      `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${SETTINGS_TABLE}?maxRecords=1`,
      {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        },
      }
    );

    const listData = await listResponse.json();
    const existingRecordId = listData.records?.[0]?.id;

    const fields = {
      Testimonials: JSON.stringify(data.testimonials, null, 2),
    };

    let response;
    if (existingRecordId) {
      // Update existing record
      response = await fetch(
        `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${SETTINGS_TABLE}/${existingRecordId}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ fields }),
        }
      );
    } else {
      // Create new record
      response = await fetch(
        `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${SETTINGS_TABLE}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ fields }),
        }
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Testimonials] Airtable save error:', errorText);
      return false;
    }

    console.log('[Testimonials] Saved to Airtable');
    return true;
  } catch (error) {
    console.error('[Testimonials] Airtable save error:', error);
    return false;
  }
}

// Load from local file (fallback)
function loadFromFile(): TestimonialsData | null {
  try {
    if (fs.existsSync(TESTIMONIALS_FILE)) {
      const content = fs.readFileSync(TESTIMONIALS_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.log('[Testimonials] File read error:', error);
  }
  return null;
}

// Save to local file
function saveToFile(data: TestimonialsData): boolean {
  if (IS_VERCEL) return false;

  try {
    const contentDir = path.dirname(TESTIMONIALS_FILE);
    if (!fs.existsSync(contentDir)) {
      fs.mkdirSync(contentDir, { recursive: true });
    }
    fs.writeFileSync(TESTIMONIALS_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('[Testimonials] File save error:', error);
    return false;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // GET - Retrieve testimonials
    if (req.method === 'GET') {
      // Try Airtable first
      let data = await loadFromAirtable();
      let source = 'airtable';

      // Fall back to file
      if (!data || data.testimonials.length === 0) {
        data = loadFromFile();
        source = 'file';
      }

      // Default if nothing found
      if (!data) {
        data = { testimonials: [], updatedAt: new Date().toISOString() };
        source = 'default';
      }

      return res.status(200).json({
        success: true,
        testimonials: data.testimonials,
        updatedAt: data.updatedAt,
        source,
      });
    }

    // POST - Save testimonials
    if (req.method === 'POST') {
      const { testimonials } = req.body as { testimonials: Testimonial[] };

      if (!Array.isArray(testimonials)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid testimonials format',
        });
      }

      // Validate testimonials
      const validatedTestimonials = testimonials.map((t) => ({
        quote: t.quote || '',
        authorName: t.authorName || '',
        authorTitle: t.authorTitle || 'Purple Homes Homeowner',
        rating: Math.min(5, Math.max(1, t.rating || 5)),
      }));

      const data: TestimonialsData = {
        testimonials: validatedTestimonials,
        updatedAt: new Date().toISOString(),
      };

      // Try Airtable first
      const savedToAirtable = await saveToAirtable(data);

      // Also save to file locally
      const savedToFile = saveToFile(data);

      if (savedToAirtable || savedToFile) {
        return res.status(200).json({
          success: true,
          testimonials: data.testimonials,
          updatedAt: data.updatedAt,
          savedTo: savedToAirtable ? 'airtable' : 'file',
        });
      } else {
        return res.status(500).json({
          success: false,
          error: 'Failed to save testimonials. Check Airtable configuration.',
        });
      }
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('[Testimonials] API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}
