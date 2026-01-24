/**
 * Global Testimonials API
 *
 * Stores and retrieves company-wide testimonials that are displayed
 * across all property funnel pages.
 *
 * Storage:
 * - Local: Saves to content/testimonials.json
 * - Vercel: Read-only, file must be committed to git
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

// Check if running on Vercel (read-only filesystem)
const IS_VERCEL = process.env.VERCEL === '1' || process.env.VERCEL_ENV !== undefined;

// File path for testimonials storage
const TESTIMONIALS_FILE = path.resolve(process.cwd(), 'content/testimonials.json');

// Ensure content directory exists
function ensureContentDir() {
  if (IS_VERCEL) return; // Can't create dirs on Vercel
  const contentDir = path.dirname(TESTIMONIALS_FILE);
  if (!fs.existsSync(contentDir)) {
    fs.mkdirSync(contentDir, { recursive: true });
  }
}

// Load testimonials from file
function loadTestimonials(): TestimonialsData {
  try {
    if (fs.existsSync(TESTIMONIALS_FILE)) {
      const content = fs.readFileSync(TESTIMONIALS_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.error('[Testimonials] Error loading:', error);
  }
  return { testimonials: [], updatedAt: new Date().toISOString() };
}

// Save testimonials to file
function saveTestimonials(data: TestimonialsData): boolean {
  // Can't save on Vercel (read-only filesystem)
  if (IS_VERCEL) {
    console.log('[Testimonials] Running on Vercel - cannot save to filesystem');
    return false;
  }

  try {
    ensureContentDir();
    fs.writeFileSync(TESTIMONIALS_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('[Testimonials] Error saving:', error);
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
      const data = loadTestimonials();
      return res.status(200).json({
        success: true,
        testimonials: data.testimonials,
        updatedAt: data.updatedAt,
        source: IS_VERCEL ? 'deployed-file' : 'file',
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

      const success = saveTestimonials(data);

      if (success) {
        return res.status(200).json({
          success: true,
          testimonials: data.testimonials,
          updatedAt: data.updatedAt,
        });
      } else if (IS_VERCEL) {
        // On Vercel, explain how to update
        return res.status(400).json({
          success: false,
          error: 'Cannot save on Vercel. Edit testimonials locally and deploy to update.',
          hint: 'Save changes locally (localhost), then push to deploy.',
        });
      } else {
        return res.status(500).json({
          success: false,
          error: 'Failed to save testimonials',
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
