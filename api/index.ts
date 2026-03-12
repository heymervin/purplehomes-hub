/**
 * Unified API Router
 *
 * Routes requests to appropriate handlers based on ?service= parameter.
 * This consolidates multiple API endpoints into a single serverless function
 * to stay within Vercel's free tier limit.
 *
 * Routes:
 * - ?service=ghl          -> GHL (GoHighLevel CRM)
 * - ?service=matching     -> Property-Buyer matching engine
 * - ?service=airtable     -> Airtable CRUD operations
 * - ?service=cache        -> Cache management
 * - ?service=buyers       -> Buyer management
 * - ?service=calculator   -> Deal calculator
 * - ?service=company-info -> Company info settings
 * - ?service=testimonials -> Testimonials
 *
 * Legacy URL Support (for backward compatibility):
 * - ?resource=...             -> Routes to GHL
 * - ?table=...                -> Routes to Airtable
 * - ?action=run|run-buyer...  -> Routes to Matching
 * - ?cacheKey=...             -> Routes to Cache
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ghlHandler } from '../lib/api-handlers/ghl';
import { matchingHandler } from '../lib/api-handlers/matching';
import { airtableHandler } from '../lib/api-handlers/airtable';
import { cacheHandler } from '../lib/api-handlers/cache';
import { buyersHandler } from '../lib/api-handlers/buyers';
import * as fs from 'fs';
import * as path from 'path';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Detect which service to route to
  const service = detectService(req);

  console.log('[Unified API] Routing to:', service, {
    method: req.method,
    query: req.query,
    timestamp: new Date().toISOString(),
  });

  try {
    switch (service) {
      case 'ghl':
        return await ghlHandler(req, res);

      case 'matching':
        return await matchingHandler(req, res);

      case 'airtable':
        return await airtableHandler(req, res);

      case 'cache':
        return await cacheHandler(req, res);

      case 'buyers':
        return await buyersHandler(req, res);

      case 'calculator':
        return await calculatorHandler(req, res);

      case 'company-info':
        return await companyInfoHandler(req, res);

      case 'testimonials':
        return await testimonialsHandler(req, res);

      default:
        return res.status(400).json({
          error: 'Unknown service',
          message: 'Use ?service=ghl|matching|airtable|cache|buyers|calculator|company-info|testimonials',
          availableServices: ['ghl', 'matching', 'airtable', 'cache', 'buyers', 'calculator', 'company-info', 'testimonials'],
        });
    }
  } catch (error) {
    console.error('[Unified API] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// ============================================================================
// CALCULATOR HANDLER (merged from api/calculator/index.ts)
// ============================================================================

const AIRTABLE_API_KEY_CALC = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID_CALC = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_API_URL_CALC = 'https://api.airtable.com/v0';
const CALCULATIONS_TABLE = 'Deal Calculations';
const DEFAULTS_TABLE = 'Calculator Defaults';

async function fetchWithRetryCalc(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      const response = await fetch(url, options);
      if (response.status === 429 && attempt < maxRetries) {
        lastError = new Error(`Rate limited: ${response.statusText}`);
        continue;
      }
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt === maxRetries) throw error;
    }
  }
  throw lastError || new Error('Failed after retries');
}

function parseJSONCalc(value: unknown, fallback: unknown = {}) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value as string); } catch { return fallback; }
}

function recordToCalculation(record: { id: string; fields: Record<string, unknown> }) {
  const { fields } = record;
  return {
    id: record.id,
    name: fields['Name'] || 'Unnamed Calculation',
    propertyCode: fields['Property Code'],
    contactId: fields['Contact ID'],
    inputs: parseJSONCalc(fields['Inputs'], {}),
    outputs: parseJSONCalc(fields['Outputs'], {}),
    notes: fields['Notes'],
    createdAt: fields['Created At'],
    updatedAt: fields['Updated At'],
  };
}

const CALC_SYSTEM_DEFAULTS = {
  wholesaleDiscount: 70, yourFee: 5000, creditToBuyer: 5000,
  maintenancePercent: 5, propertyMgmtPercent: 10,
  dscrInterestRate: 8, dscrTermYears: 30, dscrBalloonYears: 5, dscrPoints: 2, dscrFees: 1500,
  wrapInterestRate: 9, wrapTermYears: 30, wrapBalloonYears: 5, wrapServiceFee: 35,
  closingCosts: 3000, appraisalCost: 500, llcCost: 200, servicingFee: 100,
};

async function calculatorHandler(req: VercelRequest, res: VercelResponse) {
  if (!AIRTABLE_API_KEY_CALC || !AIRTABLE_BASE_ID_CALC) {
    return res.status(500).json({ error: 'Airtable credentials not configured' });
  }
  const headers = { 'Authorization': `Bearer ${AIRTABLE_API_KEY_CALC}`, 'Content-Type': 'application/json' };
  const { action } = req.query;
  try {
    switch (action) {
      case 'list': {
        const { propertyCode, contactId, limit = '50', offset } = req.query;
        const params = new URLSearchParams();
        params.append('maxRecords', limit as string);
        params.append('sort[0][field]', 'Updated At');
        params.append('sort[0][direction]', 'desc');
        if (offset) params.append('offset', offset as string);
        const filters: string[] = [];
        if (propertyCode) filters.push(`{Property Code} = "${propertyCode}"`);
        if (contactId) filters.push(`{Contact ID} = "${contactId}"`);
        if (filters.length > 0) params.append('filterByFormula', filters.length === 1 ? filters[0] : `AND(${filters.join(', ')})`);
        const url = `${AIRTABLE_API_URL_CALC}/${AIRTABLE_BASE_ID_CALC}/${encodeURIComponent(CALCULATIONS_TABLE)}?${params}`;
        const response = await fetchWithRetryCalc(url, { headers });
        if (!response.ok) { const error = await response.json(); return res.status(response.status).json({ error: 'Failed to fetch calculations', details: error }); }
        const data = await response.json();
        return res.status(200).json({ calculations: data.records.map(recordToCalculation), nextOffset: data.offset });
      }
      case 'get': {
        const { recordId } = req.query;
        if (!recordId) return res.status(400).json({ error: 'recordId is required' });
        const url = `${AIRTABLE_API_URL_CALC}/${AIRTABLE_BASE_ID_CALC}/${encodeURIComponent(CALCULATIONS_TABLE)}/${recordId}`;
        const response = await fetchWithRetryCalc(url, { headers });
        if (!response.ok) { const error = await response.json(); return res.status(response.status).json({ error: 'Failed to fetch calculation', details: error }); }
        return res.status(200).json({ calculation: recordToCalculation(await response.json()) });
      }
      case 'create': {
        if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed. Use POST.' });
        const { name, propertyCode, contactId, inputs, outputs, notes } = req.body;
        if (!inputs) return res.status(400).json({ error: 'inputs is required' });
        const now = new Date().toISOString();
        const fields: Record<string, unknown> = { 'Name': name || inputs.name || 'New Calculation', 'Inputs': JSON.stringify(inputs), 'Outputs': JSON.stringify(outputs || {}), 'Created At': now, 'Updated At': now };
        if (propertyCode || inputs.propertyCode) fields['Property Code'] = propertyCode || inputs.propertyCode;
        if (contactId || inputs.contactId) fields['Contact ID'] = contactId || inputs.contactId;
        if (notes) fields['Notes'] = notes;
        const url = `${AIRTABLE_API_URL_CALC}/${AIRTABLE_BASE_ID_CALC}/${encodeURIComponent(CALCULATIONS_TABLE)}`;
        const response = await fetchWithRetryCalc(url, { method: 'POST', headers, body: JSON.stringify({ fields }) });
        if (!response.ok) { const error = await response.json(); return res.status(response.status).json({ error: 'Failed to create calculation', details: error }); }
        return res.status(201).json({ success: true, calculation: recordToCalculation(await response.json()) });
      }
      case 'update': {
        if (req.method !== 'PUT' && req.method !== 'PATCH' && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed. Use PUT, PATCH, or POST.' });
        const { recordId } = req.query;
        if (!recordId) return res.status(400).json({ error: 'recordId is required' });
        const { name, propertyCode, contactId, inputs, outputs, notes } = req.body;
        const fields: Record<string, unknown> = { 'Updated At': new Date().toISOString() };
        if (name !== undefined) fields['Name'] = name;
        if (inputs !== undefined) fields['Inputs'] = JSON.stringify(inputs);
        if (outputs !== undefined) fields['Outputs'] = JSON.stringify(outputs);
        if (propertyCode !== undefined) fields['Property Code'] = propertyCode;
        if (contactId !== undefined) fields['Contact ID'] = contactId;
        if (notes !== undefined) fields['Notes'] = notes;
        const url = `${AIRTABLE_API_URL_CALC}/${AIRTABLE_BASE_ID_CALC}/${encodeURIComponent(CALCULATIONS_TABLE)}/${recordId}`;
        const response = await fetchWithRetryCalc(url, { method: 'PATCH', headers, body: JSON.stringify({ fields }) });
        if (!response.ok) { const error = await response.json(); return res.status(response.status).json({ error: 'Failed to update calculation', details: error }); }
        return res.status(200).json({ success: true, calculation: recordToCalculation(await response.json()) });
      }
      case 'delete': {
        const { recordId } = req.query;
        if (!recordId) return res.status(400).json({ error: 'recordId is required' });
        const url = `${AIRTABLE_API_URL_CALC}/${AIRTABLE_BASE_ID_CALC}/${encodeURIComponent(CALCULATIONS_TABLE)}/${recordId}`;
        const response = await fetchWithRetryCalc(url, { method: 'DELETE', headers });
        if (!response.ok) { const error = await response.json(); return res.status(response.status).json({ error: 'Failed to delete calculation', details: error }); }
        return res.status(200).json({ success: true, deletedId: req.query.recordId });
      }
      case 'get-defaults': {
        const url = `${AIRTABLE_API_URL_CALC}/${AIRTABLE_BASE_ID_CALC}/${encodeURIComponent(DEFAULTS_TABLE)}?maxRecords=1`;
        try {
          const response = await fetchWithRetryCalc(url, { headers });
          if (!response.ok) return res.status(200).json({ defaults: CALC_SYSTEM_DEFAULTS });
          const data = await response.json();
          if (!data.records || data.records.length === 0) return res.status(200).json({ defaults: CALC_SYSTEM_DEFAULTS });
          const record = data.records[0];
          const defaults = parseJSONCalc(record.fields['Defaults'], CALC_SYSTEM_DEFAULTS);
          return res.status(200).json({ defaults: { ...CALC_SYSTEM_DEFAULTS, ...(defaults as object) }, recordId: record.id });
        } catch { return res.status(200).json({ defaults: CALC_SYSTEM_DEFAULTS }); }
      }
      case 'update-defaults': {
        if (req.method !== 'PUT' && req.method !== 'PATCH' && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
        const newDefaults = req.body;
        const listUrl = `${AIRTABLE_API_URL_CALC}/${AIRTABLE_BASE_ID_CALC}/${encodeURIComponent(DEFAULTS_TABLE)}?maxRecords=1`;
        const listResponse = await fetchWithRetryCalc(listUrl, { headers });
        const listData = await listResponse.json();
        const fields = { 'Defaults': JSON.stringify(newDefaults), 'Updated At': new Date().toISOString() };
        const hasExisting = listData.records && listData.records.length > 0;
        const url = hasExisting ? `${AIRTABLE_API_URL_CALC}/${AIRTABLE_BASE_ID_CALC}/${encodeURIComponent(DEFAULTS_TABLE)}/${listData.records[0].id}` : `${AIRTABLE_API_URL_CALC}/${AIRTABLE_BASE_ID_CALC}/${encodeURIComponent(DEFAULTS_TABLE)}`;
        const method = hasExisting ? 'PATCH' : 'POST';
        const response = await fetchWithRetryCalc(url, { method, headers, body: JSON.stringify({ fields }) });
        if (!response.ok) { const error = await response.json(); return res.status(response.status).json({ error: 'Failed to update defaults', details: error }); }
        return res.status(200).json({ success: true, defaults: newDefaults });
      }
      default:
        return res.status(400).json({ error: 'Unknown action', validActions: ['list', 'get', 'create', 'update', 'delete', 'get-defaults', 'update-defaults'] });
    }
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
  }
}

// ============================================================================
// COMPANY INFO HANDLER (merged from api/company-info/index.ts)
// ============================================================================

interface CompanyInfo {
  phone: string;
  email: string;
  testimonialSpeed: number;
  countdownMode: 'per-visitor' | 'global';
  countdownHours: number;
  countdownDeadline: string | null;
  updatedAt: string;
}

const AIRTABLE_API_KEY_CI = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID_CI = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_API_URL_CI = 'https://api.airtable.com/v0';
const SETTINGS_TABLE_CI = 'Settings';
const IS_VERCEL_CI = process.env.VERCEL === '1' || process.env.VERCEL_ENV !== undefined;
const COMPANY_INFO_FILE = path.resolve(process.cwd(), 'content/company-info.json');

async function loadCompanyInfoFromAirtable(): Promise<CompanyInfo | null> {
  if (!AIRTABLE_API_KEY_CI || !AIRTABLE_BASE_ID_CI) return null;
  try {
    const response = await fetch(`${AIRTABLE_API_URL_CI}/${AIRTABLE_BASE_ID_CI}/${SETTINGS_TABLE_CI}?maxRecords=1`, { headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY_CI}` } });
    if (!response.ok) return null;
    const data = await response.json();
    if (data.records && data.records.length > 0) {
      const record = data.records[0];
      return { phone: record.fields.CompanyPhone || '', email: record.fields.CompanyEmail || '', testimonialSpeed: record.fields.TestimonialSpeed || 25, countdownMode: record.fields.CountdownMode || 'per-visitor', countdownHours: record.fields.CountdownHours || 48, countdownDeadline: record.fields.CountdownDeadline || null, updatedAt: record.fields.LastModified || new Date().toISOString() };
    }
    return null;
  } catch { return null; }
}

async function saveCompanyInfoToAirtable(data: CompanyInfo): Promise<{ success: boolean; error?: string }> {
  if (!AIRTABLE_API_KEY_CI || !AIRTABLE_BASE_ID_CI) return { success: false, error: 'Airtable not configured' };
  try {
    const listResponse = await fetch(`${AIRTABLE_API_URL_CI}/${AIRTABLE_BASE_ID_CI}/${SETTINGS_TABLE_CI}?maxRecords=1`, { headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY_CI}` } });
    const listData = await listResponse.json();
    const existingRecordId = listData.records?.[0]?.id;
    const fields: Record<string, unknown> = { CompanyPhone: data.phone, CompanyEmail: data.email, TestimonialSpeed: data.testimonialSpeed };
    if (data.countdownMode) fields.CountdownMode = data.countdownMode;
    if (data.countdownHours) fields.CountdownHours = data.countdownHours;
    if (data.countdownDeadline) { try { fields.CountdownDeadline = new Date(data.countdownDeadline).toISOString().split('T')[0]; } catch { /* skip */ } }
    const url = existingRecordId ? `${AIRTABLE_API_URL_CI}/${AIRTABLE_BASE_ID_CI}/${SETTINGS_TABLE_CI}/${existingRecordId}` : `${AIRTABLE_API_URL_CI}/${AIRTABLE_BASE_ID_CI}/${SETTINGS_TABLE_CI}`;
    const method = existingRecordId ? 'PATCH' : 'POST';
    const response = await fetch(url, { method, headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY_CI}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ fields }) });
    if (!response.ok) { const errorData = await response.json().catch(() => ({ error: 'Unknown error' })); return { success: false, error: errorData?.error?.message || String(errorData) }; }
    return { success: true };
  } catch (error) { return { success: false, error: String(error) }; }
}

function loadCompanyInfoFromFile(): CompanyInfo | null {
  try { if (fs.existsSync(COMPANY_INFO_FILE)) return JSON.parse(fs.readFileSync(COMPANY_INFO_FILE, 'utf-8')); } catch { /* ignore */ }
  return null;
}

function saveCompanyInfoToFile(data: CompanyInfo): boolean {
  if (IS_VERCEL_CI) return false;
  try { const dir = path.dirname(COMPANY_INFO_FILE); if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(COMPANY_INFO_FILE, JSON.stringify(data, null, 2), 'utf-8'); return true; } catch { return false; }
}

async function companyInfoHandler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    let data = await loadCompanyInfoFromAirtable();
    let source = 'airtable';
    if (!data) { data = loadCompanyInfoFromFile(); source = 'file'; }
    if (!data) { data = { phone: '', email: '', testimonialSpeed: 25, countdownMode: 'per-visitor', countdownHours: 48, countdownDeadline: null, updatedAt: new Date().toISOString() }; source = 'default'; }
    return res.status(200).json({ success: true, phone: data.phone, email: data.email, testimonialSpeed: data.testimonialSpeed ?? 25, countdownMode: data.countdownMode ?? 'per-visitor', countdownHours: data.countdownHours ?? 48, countdownDeadline: data.countdownDeadline ?? null, updatedAt: data.updatedAt, source });
  }
  if (req.method === 'POST') {
    const { phone, email, testimonialSpeed, countdownMode, countdownHours, countdownDeadline } = req.body as { phone?: string; email?: string; testimonialSpeed?: number; countdownMode?: 'per-visitor' | 'global'; countdownHours?: number; countdownDeadline?: string | null };
    const validHours = [24, 48, 72, 168];
    const sanitizedCountdownHours = validHours.includes(countdownHours ?? 48) ? (countdownHours ?? 48) : 48;
    const validModes = ['per-visitor', 'global'];
    const sanitizedMode = validModes.includes(countdownMode ?? 'per-visitor') ? (countdownMode as 'per-visitor' | 'global') : 'per-visitor';
    const data: CompanyInfo = { phone: phone?.trim() || '', email: email?.trim() || '', testimonialSpeed: Math.min(50, Math.max(10, testimonialSpeed ?? 25)), countdownMode: sanitizedMode, countdownHours: sanitizedCountdownHours, countdownDeadline: countdownDeadline || null, updatedAt: new Date().toISOString() };
    const airtableResult = await saveCompanyInfoToAirtable(data);
    const savedToFile = saveCompanyInfoToFile(data);
    if (airtableResult.success || savedToFile) return res.status(200).json({ success: true, phone: data.phone, email: data.email, testimonialSpeed: data.testimonialSpeed, countdownMode: data.countdownMode, countdownHours: data.countdownHours, countdownDeadline: data.countdownDeadline, updatedAt: data.updatedAt, savedTo: airtableResult.success ? 'airtable' : 'file' });
    return res.status(500).json({ success: false, error: airtableResult.error || 'Failed to save company info.' });
  }
  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

// ============================================================================
// TESTIMONIALS HANDLER (merged from api/testimonials/index.ts)
// ============================================================================

interface Testimonial { quote: string; authorName: string; authorTitle?: string; rating?: number; }
interface TestimonialsData { testimonials: Testimonial[]; updatedAt: string; }

const AIRTABLE_API_KEY_TEST = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID_TEST = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_API_URL_TEST = 'https://api.airtable.com/v0';
const SETTINGS_TABLE_TEST = 'Settings';
const IS_VERCEL_TEST = process.env.VERCEL === '1' || process.env.VERCEL_ENV !== undefined;
const TESTIMONIALS_FILE = path.resolve(process.cwd(), 'content/testimonials.json');

async function loadTestimonialsFromAirtable(): Promise<TestimonialsData | null> {
  if (!AIRTABLE_API_KEY_TEST || !AIRTABLE_BASE_ID_TEST) return null;
  try {
    const response = await fetch(`${AIRTABLE_API_URL_TEST}/${AIRTABLE_BASE_ID_TEST}/${SETTINGS_TABLE_TEST}?maxRecords=1`, { headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY_TEST}` } });
    if (!response.ok) return null;
    const data = await response.json();
    if (data.records && data.records.length > 0) {
      const record = data.records[0];
      const testimonialsJson = record.fields.Testimonials;
      if (testimonialsJson) { try { const testimonials = JSON.parse(testimonialsJson); return { testimonials: Array.isArray(testimonials) ? testimonials : [], updatedAt: record.fields.LastModified || new Date().toISOString() }; } catch { /* ignore */ } }
    }
    return null;
  } catch { return null; }
}

async function saveTestimonialsToAirtable(data: TestimonialsData): Promise<boolean> {
  if (!AIRTABLE_API_KEY_TEST || !AIRTABLE_BASE_ID_TEST) return false;
  try {
    const listResponse = await fetch(`${AIRTABLE_API_URL_TEST}/${AIRTABLE_BASE_ID_TEST}/${SETTINGS_TABLE_TEST}?maxRecords=1`, { headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY_TEST}` } });
    const listData = await listResponse.json();
    const existingRecordId = listData.records?.[0]?.id;
    const fields = { Testimonials: JSON.stringify(data.testimonials, null, 2) };
    const url = existingRecordId ? `${AIRTABLE_API_URL_TEST}/${AIRTABLE_BASE_ID_TEST}/${SETTINGS_TABLE_TEST}/${existingRecordId}` : `${AIRTABLE_API_URL_TEST}/${AIRTABLE_BASE_ID_TEST}/${SETTINGS_TABLE_TEST}`;
    const method = existingRecordId ? 'PATCH' : 'POST';
    const response = await fetch(url, { method, headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY_TEST}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ fields }) });
    return response.ok;
  } catch { return false; }
}

function loadTestimonialsFromFile(): TestimonialsData | null {
  try { if (fs.existsSync(TESTIMONIALS_FILE)) return JSON.parse(fs.readFileSync(TESTIMONIALS_FILE, 'utf-8')); } catch { /* ignore */ }
  return null;
}

function saveTestimonialsToFile(data: TestimonialsData): boolean {
  if (IS_VERCEL_TEST) return false;
  try { const dir = path.dirname(TESTIMONIALS_FILE); if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(TESTIMONIALS_FILE, JSON.stringify(data, null, 2), 'utf-8'); return true; } catch { return false; }
}

async function testimonialsHandler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    let data = await loadTestimonialsFromAirtable();
    let source = 'airtable';
    if (!data || data.testimonials.length === 0) { data = loadTestimonialsFromFile(); source = 'file'; }
    if (!data) { data = { testimonials: [], updatedAt: new Date().toISOString() }; source = 'default'; }
    return res.status(200).json({ success: true, testimonials: data.testimonials, updatedAt: data.updatedAt, source });
  }
  if (req.method === 'POST') {
    const { testimonials } = req.body as { testimonials: Testimonial[] };
    if (!Array.isArray(testimonials)) return res.status(400).json({ success: false, error: 'Invalid testimonials format' });
    const validatedTestimonials = testimonials.map((t) => ({ quote: t.quote || '', authorName: t.authorName || '', authorTitle: t.authorTitle || 'Purple Homes Homeowner', rating: Math.min(5, Math.max(1, t.rating || 5)) }));
    const data: TestimonialsData = { testimonials: validatedTestimonials, updatedAt: new Date().toISOString() };
    const savedToAirtable = await saveTestimonialsToAirtable(data);
    const savedToFile = saveTestimonialsToFile(data);
    if (savedToAirtable || savedToFile) return res.status(200).json({ success: true, testimonials: data.testimonials, updatedAt: data.updatedAt, savedTo: savedToAirtable ? 'airtable' : 'file' });
    return res.status(500).json({ success: false, error: 'Failed to save testimonials.' });
  }
  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

/**
 * Detect which service to route to based on query parameters.
 * Supports both explicit ?service= and legacy URL patterns.
 */
function detectService(req: VercelRequest): string | null {
  const { service, resource, table, action, cacheKey } = req.query;

  // Explicit service parameter takes precedence
  if (service && typeof service === 'string') {
    return service;
  }

  // Legacy GHL detection: has resource parameter
  if (resource) {
    return 'ghl';
  }

  // Legacy Airtable detection: has table parameter (without matching actions)
  if (table && !isMatchingAction(action as string)) {
    return 'airtable';
  }

  // Legacy Matching detection: specific action values
  if (isMatchingAction(action as string)) {
    return 'matching';
  }

  // Legacy Cache detection: cache-specific actions with cacheKey
  if (isCacheAction(action as string) || cacheKey) {
    return 'cache';
  }

  // No service detected
  return null;
}

/**
 * Check if action is a matching-specific action
 */
function isMatchingAction(action: string | undefined): boolean {
  if (!action) return false;
  const matchingActions = [
    'run',
    'run-buyer',
    'run-property',
    'health',
    'debug-geocode',
    'aggregated-buyers',
    'aggregated-properties',
    'clear',
    'buyer-properties',
    'property-buyers',
    'match-stats',
    'get-preferences',
    'update-preferences',
  ];
  return matchingActions.includes(action);
}

/**
 * Check if action is a cache-specific action
 */
function isCacheAction(action: string | undefined): boolean {
  if (!action) return false;
  const cacheActions = ['status', 'get', 'sync'];
  return cacheActions.includes(action);
}
