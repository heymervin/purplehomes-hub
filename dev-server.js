/**
 * Local Development API Server
 * Runs the Vercel serverless functions locally on port 3001
 *
 * IMPORTANT: Uses the same handlers as production (lib/api-handlers)
 */

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Register ts-node ONCE at startup with transpileOnly to skip type checking
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    module: 'commonjs',
    esModuleInterop: true,
  }
});

// Register tsconfig-paths to resolve @/ path aliases
require('tsconfig-paths').register({
  baseUrl: '.',
  paths: {
    '@/*': ['./src/*']
  }
});

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// =============================================================================
// CORE HANDLERS - Import from lib/api-handlers (same as production unified router)
// =============================================================================
const { ghlHandler } = require('./lib/api-handlers/ghl.ts');
const { matchingHandler } = require('./lib/api-handlers/matching.ts');
const { airtableHandler } = require('./lib/api-handlers/airtable.ts');
const { cacheHandler } = require('./lib/api-handlers/cache.ts');
const { buyersHandler } = require('./lib/api-handlers/buyers.ts');

// =============================================================================
// STANDALONE HANDLERS - Import from api/* (not in unified router)
// =============================================================================
const zillowHandler = require('./api/zillow/index.ts').default;
const aiHandler = require('./api/ai/index.ts').default;
const proxyImageHandler = require('./api/proxy-image/index.ts').default;

// =============================================================================
// CORE API ROUTES (using lib/api-handlers - matches production)
// =============================================================================

app.all('/api/ghl', async (req, res) => {
  try {
    await ghlHandler(req, res);
  } catch (error) {
    console.error('[API Error] /api/ghl:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

app.all('/api/matching', async (req, res) => {
  try {
    await matchingHandler(req, res);
  } catch (error) {
    console.error('[API Error] /api/matching:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

app.all('/api/airtable', async (req, res) => {
  try {
    await airtableHandler(req, res);
  } catch (error) {
    console.error('[API Error] /api/airtable:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

app.all('/api/cache', async (req, res) => {
  try {
    await cacheHandler(req, res);
  } catch (error) {
    console.error('[API Error] /api/cache:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

app.all('/api/buyers', async (req, res) => {
  try {
    await buyersHandler(req, res);
  } catch (error) {
    console.error('[API Error] /api/buyers:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// =============================================================================
// STANDALONE API ROUTES (separate serverless functions in production)
// =============================================================================

app.all('/api/zillow', async (req, res) => {
  try {
    await zillowHandler(req, res);
  } catch (error) {
    console.error('[API Error] /api/zillow:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// Zillow convenience routes (match vercel.json rewrites)
app.get('/api/zillow/search', async (req, res) => {
  req.query.action = 'search';
  try {
    await zillowHandler(req, res);
  } catch (error) {
    console.error('[API Error] /api/zillow/search:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/properties/save-from-zillow', async (req, res) => {
  req.query.action = 'save';
  try {
    await zillowHandler(req, res);
  } catch (error) {
    console.error('[API Error] /api/properties/save-from-zillow:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/properties/check-zillow', async (req, res) => {
  req.query.action = 'check';
  try {
    await zillowHandler(req, res);
  } catch (error) {
    console.error('[API Error] /api/properties/check-zillow:', error);
    res.status(500).json({ error: error.message });
  }
});

app.all('/api/ai', async (req, res) => {
  try {
    await aiHandler(req, res);
  } catch (error) {
    console.error('[API Error] /api/ai:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// AI convenience routes (match vercel.json rewrites)
app.post('/api/insights', async (req, res) => {
  req.query.action = 'insights';
  try {
    await aiHandler(req, res);
  } catch (error) {
    console.error('[API Error] /api/insights:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/social/generate-caption', async (req, res) => {
  req.query.action = 'caption';
  try {
    await aiHandler(req, res);
  } catch (error) {
    console.error('[API Error] /api/social/generate-caption:', error);
    res.status(500).json({ error: error.message });
  }
});

app.all('/api/proxy-image', async (req, res) => {
  try {
    await proxyImageHandler(req, res);
  } catch (error) {
    console.error('[API Error] /api/proxy-image:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// =============================================================================
// UNIFIED API ROUTE (for testing ?service= routing locally)
// =============================================================================

app.all('/api', async (req, res) => {
  const service = req.query.service;

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
    console.error(`[API Error] /api?service=${service}:`, error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// =============================================================================
// HEALTH CHECK
// =============================================================================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    endpoints: {
      core: ['/api/ghl', '/api/matching', '/api/airtable', '/api/cache', '/api/buyers'],
      standalone: ['/api/zillow', '/api/ai', '/api/proxy-image'],
      unified: '/api?service=<service_name>',
    }
  });
});

// =============================================================================
// START SERVER
// =============================================================================

app.listen(PORT, () => {
  console.log(`\n🚀 Local API Server running at http://localhost:${PORT}`);
  console.log(`\n📡 Core Endpoints (via lib/api-handlers):`);
  console.log(`   - /api/ghl`);
  console.log(`   - /api/matching`);
  console.log(`   - /api/airtable`);
  console.log(`   - /api/cache`);
  console.log(`   - /api/buyers`);
  console.log(`\n🔌 Standalone Endpoints:`);
  console.log(`   - /api/zillow (also: /api/zillow/search, /api/properties/save-from-zillow, /api/properties/check-zillow)`);
  console.log(`   - /api/ai (also: /api/insights, /api/social/generate-caption)`);
  console.log(`   - /api/proxy-image`);
  console.log(`\n🔀 Unified Router:`);
  console.log(`   - /api?service=ghl|matching|airtable|cache|buyers`);
  console.log(`\n❤️  Health Check: /api/health\n`);
});
