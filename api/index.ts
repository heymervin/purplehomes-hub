/**
 * Unified API Router
 *
 * Routes requests to appropriate handlers based on ?service= parameter.
 * This consolidates multiple API endpoints into a single serverless function
 * to stay within Vercel's free tier limit.
 *
 * Routes:
 * - ?service=ghl      -> GHL (GoHighLevel CRM)
 * - ?service=matching -> Property-Buyer matching engine
 * - ?service=airtable -> Airtable CRUD operations
 * - ?service=cache    -> Cache management
 * - ?service=buyers   -> Buyer management
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

      default:
        return res.status(400).json({
          error: 'Unknown service',
          message: 'Use ?service=ghl|matching|airtable|cache|buyers',
          availableServices: ['ghl', 'matching', 'airtable', 'cache', 'buyers'],
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
