/**
 * Company Info API
 *
 * Stores and retrieves company-wide contact information (phone, email)
 * used across funnel pages and marketing materials.
 *
 * Storage:
 * - Local: Saves to content/company-info.json
 * - Vercel: Falls back to environment variables (COMPANY_PHONE, COMPANY_EMAIL)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as fs from 'fs';
import * as path from 'path';

interface CompanyInfo {
  phone: string;
  email: string;
  updatedAt: string;
}

// Check if running on Vercel (read-only filesystem)
const IS_VERCEL = process.env.VERCEL === '1' || process.env.VERCEL_ENV !== undefined;

// File path for company info storage
const COMPANY_INFO_FILE = path.resolve(process.cwd(), 'content/company-info.json');

// Ensure content directory exists
function ensureContentDir() {
  const contentDir = path.dirname(COMPANY_INFO_FILE);
  if (!fs.existsSync(contentDir)) {
    fs.mkdirSync(contentDir, { recursive: true });
  }
}

// Load company info from file or environment
function loadCompanyInfo(): CompanyInfo {
  // Try file first (works locally and if file was committed)
  try {
    ensureContentDir();
    if (fs.existsSync(COMPANY_INFO_FILE)) {
      const content = fs.readFileSync(COMPANY_INFO_FILE, 'utf-8');
      const data = JSON.parse(content);
      // Return file data if it has values
      if (data.phone || data.email) {
        return data;
      }
    }
  } catch (error) {
    console.log('[Company Info] File read failed, trying env vars:', error);
  }

  // Fall back to environment variables (for Vercel)
  return {
    phone: process.env.COMPANY_PHONE || '',
    email: process.env.COMPANY_EMAIL || '',
    updatedAt: new Date().toISOString(),
  };
}

// Save company info to file
function saveCompanyInfo(data: CompanyInfo): boolean {
  // Can't save on Vercel (read-only filesystem)
  if (IS_VERCEL) {
    console.log('[Company Info] Running on Vercel - cannot save to filesystem');
    return false;
  }

  try {
    ensureContentDir();
    fs.writeFileSync(COMPANY_INFO_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('[Company Info] Error saving:', error);
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
      const data = loadCompanyInfo();
      return res.status(200).json({
        success: true,
        phone: data.phone,
        email: data.email,
        updatedAt: data.updatedAt,
        source: IS_VERCEL ? 'environment' : 'file',
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

      const success = saveCompanyInfo(data);

      if (success) {
        return res.status(200).json({
          success: true,
          phone: data.phone,
          email: data.email,
          updatedAt: data.updatedAt,
        });
      } else if (IS_VERCEL) {
        // On Vercel, explain how to set values
        return res.status(400).json({
          success: false,
          error: 'Cannot save on Vercel. Set COMPANY_PHONE and COMPANY_EMAIL in Vercel environment variables, or save locally and deploy.',
          hint: 'Save settings locally, then push to deploy with the saved values.',
        });
      } else {
        return res.status(500).json({
          success: false,
          error: 'Failed to save company info',
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
