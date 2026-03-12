# Purple Homes Hub — CLAUDE.md

## Overview

Purple Homes Hub is a comprehensive real estate platform for property marketing and management. It combines property listings, buyer/seller CRM, AI-powered content generation (funnels, social media captions), deal calculators for wrap mortgages and owner financing, and social media automation with template-based image generation. Built for a small real estate team managing property acquisitions, buyer matching, and marketing content at scale.

## Stack

- **Framework**: React 18 + TypeScript, Vite 5
- **Styling**: Tailwind CSS 3 + shadcn/ui (Radix primitives)
- **State**: Zustand (stores), TanStack React Query (server state)
- **Routing**: React Router DOM v6
- **Forms**: React Hook Form + Zod validation
- **Charts**: Recharts
- **Maps**: Mapbox GL
- **AI**: OpenAI (gpt-4o-mini) via server-side API routes
- **Backend**: Vercel Serverless Functions (Express-style handlers in `api/`)
- **Database**: Airtable (primary data store), GoHighLevel CRM (contacts, pipelines, deals)
- **Image Generation**: Imejis API (social media templates)
- **PDF**: jspdf
- **Canvas**: Fabric.js
- **Deployment**: Vercel

## Project Structure

```
src/
  pages/              # 18 route pages (Dashboard, Properties, Matching, SocialMedia, etc.)
  components/
    activity/         # Activity logging UI
    buyers/           # Buyer management
    calculator/       # Deal calculator (wrap mortgages, owner financing)
    contacts/         # Contact management
    dashboard/        # Dashboard widgets
    deals/            # Deal pipeline / kanban
    filters/          # Reusable search & filter components
    kanban/           # Kanban board
    layout/           # App shell, sidebar, header
    listings/         # Public listings + Mapbox integration
    matching/         # Buyer-property matching engine UI
    pipeline/         # Sales pipeline
    properties/       # Property CRUD, funnel content editor
    settings/         # Team management, permissions
    social/           # Social media hub
      create-wizard/  # 5-step creation wizard
      quick-batch/    # Batch posting
      templates/      # Template selector, configurator, preview
      hashtags/       # Hashtag management
    ui/               # shadcn/ui primitives
  services/           # API client modules (airtable, ghl, zillow, imejis, calculator, email, openai)
  store/              # Zustand stores (auth, app, activity, sync)
  hooks/              # Custom hooks (cache, calculator scenarios, dashboard data, HEIC, etc.)
  lib/                # Utilities (templates system, GHL URL helpers, geocoding)
  contexts/           # React contexts (LanguageContext for i18n)
  locales/            # en.ts, es.ts translations
  types/              # TypeScript type definitions (funnel, calculator, matching, buyer, deals, zillow)
  data/               # Static data (ai-funnel-prompt-system.json — 600+ copywriting techniques)
  styles/             # Global styles

api/                  # Vercel serverless functions
  ai/                 # AI caption generation, insights, prompt builder
  auth/               # Login, permissions, session (Airtable-backed)
  calculator/         # Deal calculator API
  company-info/       # Company info from Airtable
  funnel/             # Funnel generation + avatar research learning system
  proxy-image/        # GHL image proxy
  testimonials/       # Testimonials from Airtable
  zillow/             # Zillow search + save integration

lib/                  # Server-side shared libraries
  api-handlers/       # GHL, cache, buyers handlers
  matching/           # Scoring, geocoding, distance calculation, zip matching

scripts/              # Dev/test scripts (stress tests, caption tests, calculator table tests)
content/              # JSON content (testimonials, company-info)
public/
  research/           # Avatar research learning data (avatars/*.json, insights/patterns.json)
  content/properties/ # Stored funnel markdown content
  images/             # Agent photos
docs/                 # Feature-specific documentation
```

## Development

```bash
# Install dependencies
npm install

# Start frontend dev server
npm run dev

# Start local API server (for serverless functions locally)
npm run dev:api

# Start both frontend + API concurrently
npm run dev:all

# Build for production
npm run build

# Build with development mode
npm run build:dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Test with coverage
npm run test:coverage

# Lint
npm run lint

# Type check
npx tsc --noEmit
```

## Current Status

The platform is feature-complete across its core verticals. All major features are built and working: property management, buyer/seller CRM, AI funnel generation with a learning loop, social media automation with 5 template profiles, deal calculator, user/team management with permissions, and activity logging.

**What's working**: Property CRUD, public listing pages, buyer-property matching, deal pipeline kanban, social media 3-tab hub (Quick Post, Quick Batch, Create wizard), AI caption generation with 600+ copywriting frameworks, funnel generation with avatar research learning system, template auto-fill from property data, authentication with permission-based access, comprehensive activity logs.

**Analytics & Reporting** is the only major epic at 0% — everything else is 85-100% complete.

## What's Left

- **Analytics & Reporting**: Not yet built (0%). The "Ultimate Algorithm" for analytics-driven learning is documented but parked.
- **Template constants**: `src/lib/templates/constants.ts` needs real company branding (logo URL, phone, website). Template preview images needed in `/public/templates/`.
- **Manual testing**: Avatar research learning loop needs end-to-end verification (generate -> rate -> learn cycle).
- **Error boundaries**: No React error boundary components yet.
- **Funnel A/B testing UI**: Backend generates variants but no side-by-side comparison UI exists.
- **Social media calendar view**: Planned for Q2 2026.
- **Bulk property import**: CSV import with field mapping — planned for Q2 2026.
- **Multi-language support**: i18n scaffolding exists (en.ts, es.ts) but funnel/AI generation is English-only.

## Key Patterns

**API architecture**: Vercel serverless functions in `api/` directory. Each route is an Express-style handler. The `vercel.json` rewrites map clean URLs to function endpoints. Local development uses `scripts/local-api-server.ts` via `npm run dev:api`.

**State management**: Zustand stores for client state (auth, app, activity, sync). TanStack React Query for server-state fetching and caching. No Redux.

**Data layer**: Airtable is the primary database accessed via API key from serverless functions. GoHighLevel (GHL) is the CRM for contacts, pipelines, and deals. Both are accessed server-side only — no direct client-side calls to these services.

**Component conventions**: shadcn/ui components in `src/components/ui/`. Feature components organized by domain (matching/, social/, properties/). Pages are thin route wrappers that compose feature components.

**AI content pipeline**: OpenAI calls happen server-side in `api/ai/` and `api/funnel/`. The funnel system has a learning loop: generate content -> user rates it -> insights stored in `public/research/` JSON files -> injected into future prompts. Uses 600+ copywriting frameworks from `src/data/ai-funnel-prompt-system.json`.

**Social media templates**: Template profiles in `src/lib/templates/` abstract away Imejis field IDs from users. Auto-fill maps property data to template fields. Five built-in templates: Just Listed, Just Sold, Open House, Personal Value Tips, Success Story.

**Authentication**: Airtable-backed auth with bcrypt password hashing. Permission-based access control. Session stored client-side with auto-refresh on permission changes.

## Environment

### Client-side (VITE_ prefix, exposed to browser)
```
VITE_OPENAI_API_KEY       # OpenAI API key (also used as fallback)
VITE_IMEJIS_API_KEY       # Imejis image template API
VITE_GHL_LOCATION_ID      # GoHighLevel location ID
VITE_MAPBOX_ACCESS_TOKEN  # Mapbox for property maps
VITE_MAPBOX_TOKEN         # Mapbox (alternate key name)
```

### Server-side (Vercel env vars, not exposed to browser)
```
OPENAI_API_KEY            # OpenAI API key
AIRTABLE_API_KEY          # Airtable personal access token
AIRTABLE_BASE_ID          # Airtable base ID
GHL_API_KEY               # GoHighLevel API key
GHL_LOCATION_ID           # GoHighLevel location ID
GHL_OBJECTS_API_KEY       # GHL objects/custom fields API key
GHL_API_V2                # GHL v2 API key
MAPBOX_ACCESS_TOKEN       # Mapbox geocoding (server-side)
RESEND_API_KEY            # Resend email API
GOOGLE_SHEET_ID           # Google Sheets integration (optional)
GOOGLE_SHEET_CREDENTIALS  # Google Sheets service account (optional)

# Pipeline IDs (have defaults, override if needed)
GHL_SELLER_ACQUISITION_PIPELINE_ID
GHL_BUYER_DISPOSITION_PIPELINE_ID
GHL_DEAL_ACQUISITION_PIPELINE_ID
```

Deployed on Vercel. Set all server-side env vars in the Vercel dashboard. Client-side `VITE_` vars go in `.env` locally.
