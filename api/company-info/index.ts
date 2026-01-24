/**
 * Company Info API
 *
 * Stores and retrieves company-wide contact information (phone, email)
 * used across funnel pages and marketing materials.
 *
 * Storage:
 * - Primary: Airtable Settings table
 * - Fallback: content/company-info.json (local dev)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as fs from 'fs';
import * as path from 'path';

interface CompanyInfo {
  phone: string;
  email: string;
  testimonialSpeed: number; // 10-50, default 25
  countdownMode: 'per-visitor' | 'global'; // per-visitor = each visitor gets own timer, global = everyone counts to same deadline
  countdownHours: number; // 24, 48, 72, or 168 (1 week) - used for per-visitor mode
  countdownDeadline: string | null; // ISO date string - used for global mode
  updatedAt: string;
}

// Airtable configuration
const AIRTABLE_API_URL = 'https://api.airtable.com/v0';
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const SETTINGS_TABLE = 'Settings';

// Check if running on Vercel (read-only filesystem)
const IS_VERCEL = process.env.VERCEL === '1' || process.env.VERCEL_ENV !== undefined;

// File path for local storage fallback
const COMPANY_INFO_FILE = path.resolve(process.cwd(), 'content/company-info.json');

// Load from Airtable Settings table
async function loadFromAirtable(): Promise<CompanyInfo | null> {
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    console.log('[Company Info] Airtable not configured');
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
      console.error('[Company Info] Airtable fetch error:', response.status);
      return null;
    }

    const data = await response.json();
    if (data.records && data.records.length > 0) {
      const record = data.records[0];
      return {
        phone: record.fields.CompanyPhone || '',
        email: record.fields.CompanyEmail || '',
        testimonialSpeed: record.fields.TestimonialSpeed || 25,
        countdownMode: record.fields.CountdownMode || 'per-visitor',
        countdownHours: record.fields.CountdownHours || 48,
        countdownDeadline: record.fields.CountdownDeadline || null,
        updatedAt: record.fields.LastModified || new Date().toISOString(),
      };
    }

    return null;
  } catch (error) {
    console.error('[Company Info] Airtable load error:', error);
    return null;
  }
}

// Save to Airtable Settings table
async function saveToAirtable(data: CompanyInfo): Promise<{ success: boolean; error?: string }> {
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    console.log('[Company Info] Airtable not configured');
    return { success: false, error: 'Airtable not configured' };
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

    // Core fields that should always exist
    const fields: Record<string, unknown> = {
      CompanyPhone: data.phone,
      CompanyEmail: data.email,
      TestimonialSpeed: data.testimonialSpeed,
    };

    // Countdown fields - add only if we have values (fields might not exist in Airtable yet)
    // For Single Select fields, we need exact match to Airtable options
    if (data.countdownMode) {
      fields.CountdownMode = data.countdownMode;
    }
    if (data.countdownHours) {
      fields.CountdownHours = data.countdownHours;
    }
    // Only set deadline if it's a valid date
    if (data.countdownDeadline) {
      fields.CountdownDeadline = data.countdownDeadline;
    }

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
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      const errorMsg = errorData?.error?.message || errorData?.error || JSON.stringify(errorData);
      console.error('[Company Info] Airtable save error:', errorMsg);
      return { success: false, error: errorMsg };
    }

    console.log('[Company Info] Saved to Airtable');
    return { success: true };
  } catch (error) {
    console.error('[Company Info] Airtable save error:', error);
    return { success: false, error: String(error) };
  }
}

// Load from local file (fallback)
function loadFromFile(): CompanyInfo | null {
  try {
    if (fs.existsSync(COMPANY_INFO_FILE)) {
      const content = fs.readFileSync(COMPANY_INFO_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.log('[Company Info] File read error:', error);
  }
  return null;
}

// Save to local file
function saveToFile(data: CompanyInfo): boolean {
  if (IS_VERCEL) return false;

  try {
    const contentDir = path.dirname(COMPANY_INFO_FILE);
    if (!fs.existsSync(contentDir)) {
      fs.mkdirSync(contentDir, { recursive: true });
    }
    fs.writeFileSync(COMPANY_INFO_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('[Company Info] File save error:', error);
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
    // GET - Retrieve company info
    if (req.method === 'GET') {
      // Try Airtable first
      let data = await loadFromAirtable();
      let source = 'airtable';

      // Fall back to file
      if (!data) {
        data = loadFromFile();
        source = 'file';
      }

      // Default if nothing found
      if (!data) {
        data = {
          phone: '',
          email: '',
          testimonialSpeed: 25,
          countdownMode: 'per-visitor',
          countdownHours: 48,
          countdownDeadline: null,
          updatedAt: new Date().toISOString(),
        };
        source = 'default';
      }

      return res.status(200).json({
        success: true,
        phone: data.phone,
        email: data.email,
        testimonialSpeed: data.testimonialSpeed ?? 25,
        countdownMode: data.countdownMode ?? 'per-visitor',
        countdownHours: data.countdownHours ?? 48,
        countdownDeadline: data.countdownDeadline ?? null,
        updatedAt: data.updatedAt,
        source,
      });
    }

    // POST - Save company info
    if (req.method === 'POST') {
      const { phone, email, testimonialSpeed, countdownMode, countdownHours, countdownDeadline } = req.body as {
        phone?: string;
        email?: string;
        testimonialSpeed?: number;
        countdownMode?: 'per-visitor' | 'global';
        countdownHours?: number;
        countdownDeadline?: string | null;
      };

      // Validate countdownHours is one of the allowed values
      const validHours = [24, 48, 72, 168];
      const sanitizedCountdownHours = validHours.includes(countdownHours ?? 48) ? (countdownHours ?? 48) : 48;

      // Validate countdownMode
      const validModes = ['per-visitor', 'global'];
      const sanitizedMode = validModes.includes(countdownMode ?? 'per-visitor')
        ? (countdownMode as 'per-visitor' | 'global')
        : 'per-visitor';

      const data: CompanyInfo = {
        phone: phone?.trim() || '',
        email: email?.trim() || '',
        testimonialSpeed: Math.min(50, Math.max(10, testimonialSpeed ?? 25)),
        countdownMode: sanitizedMode,
        countdownHours: sanitizedCountdownHours,
        countdownDeadline: countdownDeadline || null,
        updatedAt: new Date().toISOString(),
      };

      // Try Airtable first
      const airtableResult = await saveToAirtable(data);

      // Also save to file locally
      const savedToFile = saveToFile(data);

      if (airtableResult.success || savedToFile) {
        return res.status(200).json({
          success: true,
          phone: data.phone,
          email: data.email,
          testimonialSpeed: data.testimonialSpeed,
          countdownMode: data.countdownMode,
          countdownHours: data.countdownHours,
          countdownDeadline: data.countdownDeadline,
          updatedAt: data.updatedAt,
          savedTo: airtableResult.success ? 'airtable' : 'file',
        });
      } else {
        return res.status(500).json({
          success: false,
          error: airtableResult.error || 'Failed to save company info. Check Airtable configuration.',
        });
      }
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('[Company Info] API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}
