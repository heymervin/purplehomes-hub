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
async function saveToAirtable(data: CompanyInfo): Promise<boolean> {
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    console.log('[Company Info] Airtable not configured');
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
      CompanyPhone: data.phone,
      CompanyEmail: data.email,
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
      console.error('[Company Info] Airtable save error:', errorText);
      return false;
    }

    console.log('[Company Info] Saved to Airtable');
    return true;
  } catch (error) {
    console.error('[Company Info] Airtable save error:', error);
    return false;
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
        data = { phone: '', email: '', updatedAt: new Date().toISOString() };
        source = 'default';
      }

      return res.status(200).json({
        success: true,
        phone: data.phone,
        email: data.email,
        updatedAt: data.updatedAt,
        source,
      });
    }

    // POST - Save company info
    if (req.method === 'POST') {
      const { phone, email } = req.body as { phone?: string; email?: string };

      const data: CompanyInfo = {
        phone: phone?.trim() || '',
        email: email?.trim() || '',
        updatedAt: new Date().toISOString(),
      };

      // Try Airtable first
      const savedToAirtable = await saveToAirtable(data);

      // Also save to file locally
      const savedToFile = saveToFile(data);

      if (savedToAirtable || savedToFile) {
        return res.status(200).json({
          success: true,
          phone: data.phone,
          email: data.email,
          updatedAt: data.updatedAt,
          savedTo: savedToAirtable ? 'airtable' : 'file',
        });
      } else {
        return res.status(500).json({
          success: false,
          error: 'Failed to save company info. Check Airtable configuration.',
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
