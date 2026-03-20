# purplehomes-hub

Internal property management platform for Purple Homes.

[Live Demo](https://purplehomes-hub.vercel.app)

## Overview

Purple Homes Hub manages property listings, buyer preferences, deal pipelines, and automated buyer-property matching using AI scoring. It integrates with GoHighLevel CRM and Airtable as dual data sources, and serves acquisition, disposition, and operations teams in one platform. Access requires an internal account.

## Features

- Property inventory with multi-source ingestion (Zillow, acquisitions, partners)
- AI-powered buyer-property matching with configurable scoring weights
- Buyer and seller acquisition pipelines with kanban stage management
- Financial calculator supporting PMT, DSCR, and wrap loan scenarios
- Mapbox property visualization with proximity search
- Social media management with scheduling and analytics
- Deal pipeline with stage management and document storage
- Contact directory with activity audit logs
- Multi-language support (English and Spanish)
- Dark mode

## Stack

| Technology | Purpose |
|-----------|---------|
| React 18 + TypeScript | Frontend UI |
| Vite | Build tooling |
| Supabase | Primary database and authentication |
| Airtable | Secondary data source for listings |
| TanStack Query + Zustand | Server state and client state management |
| Mapbox GL | Property map visualization |
| OpenAI | AI buyer-property matching |
| GoHighLevel API | CRM integration |
| jsPDF + Fabric.js | PDF generation |
| Vercel | Hosting |

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
git clone https://github.com/heymervin/purplehomes-hub.git
cd purplehomes-hub
cp .env.example .env.local
npm install
npm run dev
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `AIRTABLE_API_KEY` | Airtable API key |
| `AIRTABLE_BASE_ID` | Airtable base ID for listings |
| `GHL_API_KEY` | GoHighLevel API key |
| `GHL_LOCATION_ID` | GoHighLevel location ID |
| `MAPBOX_ACCESS_TOKEN` | Mapbox public access token |
| `OPENAI_API_KEY` | OpenAI API key for AI matching |
| `RESEND_API_KEY` | Resend API key for email |

## Project Structure

```
src/
├── pages/         # 19 route-level page components
├── components/    # 28 subdirectories of UI components
├── services/      # 20 service files for external integrations
├── lib/           # 28 utility and helper files
├── hooks/         # 19 custom React hooks
├── store/         # Zustand state stores
├── types/         # 14 TypeScript type definition files
└── locales/       # English and Spanish translation files
```
