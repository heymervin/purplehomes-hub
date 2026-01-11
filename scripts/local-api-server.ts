/**
 * Local API Server for Development
 * This proxies requests to the Vercel serverless functions locally
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Dynamic import and execute API handlers
async function handleApiRequest(req: express.Request, res: express.Response, apiPath: string) {
  try {
    const modulePath = path.resolve(process.cwd(), `api/${apiPath}/index.ts`);

    // Clear require cache for hot reload
    delete require.cache[require.resolve(modulePath)];

    const handler = await import(modulePath);

    // Vercel-style request/response wrapper
    const vercelReq = {
      ...req,
      query: req.query,
      body: req.body,
      method: req.method,
    };

    await handler.default(vercelReq, res);
  } catch (error) {
    console.error(`Error handling ${apiPath}:`, error);
    res.status(500).json({ error: 'Internal server error', details: String(error) });
  }
}

// API Routes
app.all('/api/matching', (req, res) => handleApiRequest(req, res, 'matching'));
app.all('/api/ghl', (req, res) => handleApiRequest(req, res, 'ghl'));
app.all('/api/airtable', (req, res) => handleApiRequest(req, res, 'airtable'));
app.all('/api/cache', (req, res) => handleApiRequest(req, res, 'cache'));
app.all('/api/proxy-image', (req, res) => handleApiRequest(req, res, 'proxy-image'));
app.all('/api/ai', (req, res) => handleApiRequest(req, res, 'ai'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Local API Server running at http://localhost:${PORT}`);
  console.log(`\nAvailable endpoints:`);
  console.log(`  - GET/POST /api/matching`);
  console.log(`  - GET/POST /api/ghl`);
  console.log(`  - GET/POST /api/airtable`);
  console.log(`  - GET/POST /api/cache`);
  console.log(`  - GET/POST /api/ai`);
  console.log(`  - GET     /api/health`);
  console.log(`\nMake sure you have .env.local with your API keys configured.`);
});
