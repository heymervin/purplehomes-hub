/**
 * Local API Server for Development
 * This proxies requests to the Vercel serverless functions locally
 */

import * as express from 'express';
import * as cors from 'cors';
import * as dotenv from 'dotenv';
import * as path from 'path';

type Request = express.Request;
type Response = express.Response;

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const app = (express as any).default();
const PORT = 3001;

app.use((cors as any).default());
app.use((express as any).default.json());

// Dynamic import and execute API handlers
async function handleApiRequest(req: Request, res: Response, apiPath: string) {
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

// Unified API handler - routes service-specific paths to the unified router
async function handleUnifiedApi(req: Request, res: Response, service?: string) {
  try {
    const modulePath = path.resolve(process.cwd(), 'api/index.ts');

    // Clear require cache for hot reload
    delete require.cache[require.resolve(modulePath)];

    const handler = await import(modulePath);

    // Vercel-style request/response wrapper with service injected
    const vercelReq = {
      ...req,
      query: {
        ...req.query,
        ...(service && { service }), // Add service param if routing from legacy endpoint
      },
      body: req.body,
      method: req.method,
    };

    await handler.default(vercelReq, res);
  } catch (error) {
    console.error(`Error handling unified API:`, error);
    res.status(500).json({ error: 'Internal server error', details: String(error) });
  }
}

// ============ API Routes ============

// Legacy routes that map to unified API with service parameter
app.all('/api/ghl', (req: Request, res: Response) => handleUnifiedApi(req, res, 'ghl'));
app.all('/api/matching', (req: Request, res: Response) => handleUnifiedApi(req, res, 'matching'));
app.all('/api/airtable', (req: Request, res: Response) => handleUnifiedApi(req, res, 'airtable'));
app.all('/api/cache', (req: Request, res: Response) => handleUnifiedApi(req, res, 'cache'));
app.all('/api/buyers', (req: Request, res: Response) => handleUnifiedApi(req, res, 'buyers'));

// Unified API endpoint (uses ?service= query param)
app.all('/api', (req: Request, res: Response) => handleUnifiedApi(req, res));

// Standalone API modules
app.all('/api/ai', (req: Request, res: Response) => handleApiRequest(req, res, 'ai'));
app.all('/api/zillow', (req: Request, res: Response) => handleApiRequest(req, res, 'zillow'));
app.all('/api/auth', (req: Request, res: Response) => handleApiRequest(req, res, 'auth'));
app.all('/api/calculator', (req: Request, res: Response) => handleApiRequest(req, res, 'calculator'));
app.all('/api/proxy-image', (req: Request, res: Response) => handleApiRequest(req, res, 'proxy-image'));
app.all('/api/funnel', (req: Request, res: Response) => handleApiRequest(req, res, 'funnel'));
app.all('/api/funnel/avatar-research', (req: Request, res: Response) => handleApiRequest(req, res, 'funnel/avatar-research'));
app.all('/api/testimonials', (req: Request, res: Response) => handleApiRequest(req, res, 'testimonials'));
app.all('/api/company-info', (req: Request, res: Response) => handleApiRequest(req, res, 'company-info'));

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Local API Server running at http://localhost:${PORT}`);
  console.log(`\nAvailable endpoints:`);
  console.log(`  - GET/POST /api/ghl       -> Unified API (GHL)`);
  console.log(`  - GET/POST /api/matching  -> Unified API (Matching)`);
  console.log(`  - GET/POST /api/airtable  -> Unified API (Airtable)`);
  console.log(`  - GET/POST /api/cache     -> Unified API (Cache)`);
  console.log(`  - GET/POST /api/buyers    -> Unified API (Buyers)`);
  console.log(`  - GET/POST /api/ai        -> AI (insights, captions)`);
  console.log(`  - GET/POST /api/zillow    -> Zillow operations`);
  console.log(`  - GET/POST /api/auth      -> Authentication`);
  console.log(`  - GET/POST /api/calculator-> Deal calculator`);
  console.log(`  - GET/POST /api/funnel   -> Funnel content (generate, get, save)`);
  console.log(`  - GET     /api/health`);
  console.log(`\nMake sure you have .env with your API keys configured.`);
});
