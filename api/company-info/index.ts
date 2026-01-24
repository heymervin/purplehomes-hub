/**
 * Company Info API
 *
 * Stores and retrieves company-wide contact information (phone, email)
 * used across funnel pages and marketing materials.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as fs from 'fs';
import * as path from 'path';

interface CompanyInfo {
  phone: string;
  email: string;
  updatedAt: string;
}

// File path for company info storage
const COMPANY_INFO_FILE = path.resolve(process.cwd(), 'content/company-info.json');

// Ensure content directory exists
function ensureContentDir() {
  const contentDir = path.dirname(COMPANY_INFO_FILE);
  if (!fs.existsSync(contentDir)) {
    fs.mkdirSync(contentDir, { recursive: true });
  }
}

// Load company info from file
function loadCompanyInfo(): CompanyInfo {
  try {
    ensureContentDir();
    if (fs.existsSync(COMPANY_INFO_FILE)) {
      const content = fs.readFileSync(COMPANY_INFO_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.error('Error loading company info:', error);
  }
  return { phone: '', email: '', updatedAt: new Date().toISOString() };
}

// Save company info to file
function saveCompanyInfo(data: CompanyInfo): boolean {
  try {
    ensureContentDir();
    fs.writeFileSync(COMPANY_INFO_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Error saving company info:', error);
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
      } else {
        return res.status(500).json({
          success: false,
          error: 'Failed to save company info',
        });
      }
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('Company Info API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}
