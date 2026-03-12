# UI/UX Refactor Implementation Plan — Purple Homes Hub v2

## Summary

Full visual redesign — no logic changes, no backend changes. Pure UI/UX refactor:
- New design tokens (CSS variables, Tailwind config)
- New component visual wrappers on top of existing shadcn/ui primitives
- Restructured page layouts for all 16 pages
- New sidebar with grouped navigation
- Remove all purple-branding.css and luxury-design system classes
- Keep all business logic, hooks, services, stores untouched

---

## Exploration Findings

**Current state of design tokens:**
- `src/index.css` already has solid CSS custom-property architecture (`--primary`, `--background`, `--sidebar-*`, etc.) using HSL values — the variable names are correct, only the HSL values need updating to the zinc/indigo-600 palette.
- `tailwind.config.ts` is already wired to those CSS variables. No new token structure needed — only value changes.
- `src/styles/purple-branding.css` contains two layers: purple gradient classes and a luxury design system — 974 lines total. This entire file can be deleted.

**Purple/luxury class usage:**
- `gradient-text` and `gradient-primary` used in 5 files
- `bg-purple-*`, `text-purple-*`, `border-purple-*` scattered across 134 component files and 13 page files — 922+ total occurrences
- Pure purple-branding.css custom class names appear in very few files — primarily `PublicListings.tsx` and a handful of social/funnel components

---

## Phase 1: Foundation

**Must complete before anything else.**

### 1A — CSS Variables Reset

**File:** `src/index.css`

Replace all HSL values in `:root` and `.dark` blocks:

| Variable | New light value | New dark value |
|---|---|---|
| `--primary` | `239 84% 60%` (indigo-600) | `239 84% 67%` (indigo-500) |
| `--accent` | `239 84% 60%` | `239 84% 67%` |
| `--foreground` | `240 10% 4%` (zinc-950) | `0 0% 98%` |
| `--muted` | `240 5% 96%` (zinc-100) | `240 4% 16%` (zinc-800) |
| `--muted-foreground` | `240 4% 46%` (zinc-500) | `240 4% 46%` |
| `--border` | `240 6% 90%` (zinc-200) | `240 4% 16%` (zinc-800) |
| `--card` | `0 0% 100%` | `240 6% 10%` (zinc-900) |
| `--ring` | `239 84% 60%` | `239 84% 67%` |
| `--radius` | `0.5rem` | `0.5rem` |
| `--sidebar-background` | `240 6% 97%` (zinc-50) | `240 10% 7%` |
| `--sidebar-foreground` | `240 5% 26%` | `240 5% 84%` |
| `--sidebar-border` | `240 6% 90%` | `240 4% 16%` |
| `--sidebar-primary` | `239 84% 60%` | `239 84% 67%` |

Remove `@import './styles/purple-branding.css'` line.

Update `gradient-text` utility to use indigo:
```css
.gradient-text {
  @apply bg-gradient-to-r from-indigo-600 to-indigo-400 bg-clip-text text-transparent;
}
```

**Complexity:** Low

---

### 1B — Tailwind Config Update

**File:** `tailwind.config.ts`

Add explicit zinc and indigo color scales:
```ts
import colors from 'tailwindcss/colors'
// in extend.colors:
zinc: colors.zinc,
indigo: colors.indigo,
```

**Complexity:** Low

---

### 1C — Remove purple-branding.css

**File:** `src/styles/purple-branding.css` — DELETE

Pre-deletion: verify `.reveal` / `.reveal-delay-*` class usage in source. Move `.reveal` animation block to `index.css @layer utilities` if used directly in JSX classNames.

**Complexity:** Low

---

## Phase 2: Shell + Shared Components (parallel)

### 2A — AppSidebar Redesign

**File:** `src/components/layout/AppSidebar.tsx`

1. **Navigation groupings** — replace flat nav array with 5 grouped sections:
   - **PROPERTIES:** Dashboard, Properties, Public Listings
   - **CRM:** Buyers, Contacts, Matching
   - **PIPELINE:** Seller Pipeline, Deal Pipeline
   - **MARKETING:** Social Hub, Documents
   - **SYSTEM:** Settings, Activity Logs

   Section labels: `text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 px-3 py-1`

2. **Active state** — change from `bg-primary/10 text-primary` to `bg-primary/10 text-primary border-l-2 border-primary`

3. **Logo** — replace `gradient-text` wordmark with plain `font-semibold text-foreground tracking-tight`

4. **Bottom bar** — tighten spacing with `space-y-1`

**Complexity:** Medium

---

### 2B — AppLayout Cleanup

**File:** `src/components/layout/AppLayout.tsx`

Remove inner `p-6` padding wrapper — pages own their own padding via `PageContainer` (created in 2b-i).

**Complexity:** Low

---

### 2b-i — New Shared Primitives

**File to create:** `src/components/ui/page-container.tsx`

```tsx
export function PageContainer({ children, className }) {
  return <div className={cn("p-6 space-y-6", className)}>{children}</div>;
}

export function PageHeader({ title, description, actions }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
```

**Complexity:** Low

---

### 2b-ii — Badge Variant Additions

**File:** `src/components/ui/badge.tsx`

Add variants: `success`, `warning`, `info` with appropriate zinc/semantic colors.

**Complexity:** Low

---

### 2b-iii — StatWidget Variant Update

**File:** `src/components/dashboard/StatWidget.tsx`

Rename `'purple'` variant to `'primary'`. Update colors from `text-purple-600` → `text-primary`, `bg-purple-100` → `bg-primary/10`.

**Complexity:** Low

---

### 2b-iv — FilterBar Visual Polish

**Files:** `src/components/filters/FilterBar.tsx`, `FilterSelect.tsx`, `QuickSearchInput.tsx`

Replace `text-purple-*` with `text-muted-foreground`. Tighten container padding.

**Complexity:** Low

---

## Phase 3: Pages — 6 Parallel Domains

All domains can run simultaneously after Phases 1 and 2 complete.

---

### Domain A — Core Properties Pages

**Files:**
- `src/pages/Dashboard.tsx` (11 purple matches)
- `src/pages/Properties.tsx` (~3 matches)
- `src/pages/PropertyDetail.tsx` (3 matches)
- `src/components/properties/PropertyCard.tsx`
- `src/components/properties/PropertyDetailModal.tsx`

**Key changes:**
- Replace all `bg-purple-*`/`text-purple-*` → `bg-primary/10`/`text-primary`
- Remove gradient text from price displays → `text-primary font-bold`
- Card hover: `hover:shadow-purple-500/20` → `hover:shadow-md`
- Wrap pages in `<PageContainer>` + `<PageHeader>`

**Complexity:** Medium

---

### Domain B — Pipeline Pages

**Files:**
- `src/pages/SellerAcquisitions.tsx` (1 match)
- `src/pages/DealPipeline.tsx` (0 matches)
- `src/pages/BuyerAcquisitions.tsx` (1 match)
- `src/components/pipeline/UnifiedPipelineBoard.tsx`
- `src/components/deals/Overview/PipelineOverview.tsx`
- `src/components/deals/Overview/MetricCard.tsx`
- `src/components/deals/KanbanView/PipelineBoard.tsx`

**Key changes:**
- Stage dot colors: `bg-purple-500` → `bg-indigo-500`
- Add `PageContainer` / `PageHeader` wrappers

**Complexity:** Low-Medium

---

### Domain C — CRM Pages

**Files:**
- `src/pages/Contacts.tsx` (1 match)
- `src/pages/BuyerManagement.tsx` (1 match)
- `src/pages/Matching.tsx` (2 matches)
- `src/components/matching/BuyerPropertiesView.tsx` (22 matches)
- `src/components/matching/PropertyBuyersView.tsx` (23 matches)
- `src/components/matching/MatchingSummary.tsx` (8 matches)
- `src/components/matching/EnhancedMatchDetailModal.tsx` (16 matches)
- `src/components/matching/AIInsightCard.tsx` (6 matches)
- `src/components/buyers/BuyerManagementCard.tsx`

**Key changes:**
- Score badge pattern: `bg-purple-100 text-purple-700` → `bg-primary/10 text-primary`
- High-score (>=90) badges stay emerald green
- Tab active states → rely on updated Tabs primitive token

**Complexity:** Medium-High

---

### Domain D — Social Media

**Files:**
- `src/pages/SocialMedia.tsx` (3 matches)
- `src/components/social/quick-post/QuickPostFormV2.tsx` (43 matches — highest in any component)
- `src/components/social/quick-post/QuickPostForm.tsx` (32 matches)
- `src/components/social/quick-batch/QuickBatchForm.tsx` (17 matches)
- `src/components/social/quick-batch/BatchPostEditor.tsx` (22 matches)
- `src/components/social/create-wizard/steps/caption-substeps/PostIntentSubstep.tsx` (19 matches)
- `src/components/social/create-wizard/steps/ContentSourceStep.tsx`
- `src/components/social/create-wizard/steps/ImageStep.tsx`
- `src/components/social/create-wizard/components/TemplateSelector.tsx`
- `src/components/social/batch-wizard/steps/BatchHashtagsStep.tsx`

**Key changes:**
- Bulk replace: `from-purple-600` → `from-indigo-600`, `text-purple-600` → `text-primary`
- Gradient buttons: replace with `bg-primary text-primary-foreground`
- Do NOT touch any logic — visual class replacement only

**Complexity:** High (volume)

---

### Domain E — Public Pages (Highest Risk)

**Files:**
- `src/pages/PublicPropertyDetail.tsx` (214 matches — VERY HIGH RISK)
- `src/pages/PublicListings.tsx` (51 matches)
- `src/components/listings/PropertyMap.tsx` (9 matches)
- `src/components/listings/MapCoachMarks.tsx`
- `src/components/listings/ExitIntentModal.tsx`
- `src/components/funnel/CTAButton.tsx`
- `src/components/funnel/FunnelSection.tsx`
- `src/components/funnel/HeroSection.tsx`
- `src/components/funnel/TestimonialCard.tsx`
- `src/components/funnel/StatsBar.tsx`
- `src/components/funnel/ProcessSteps.tsx`
- `src/components/funnel/ComparisonTable.tsx`

**Key changes:**
- Dark hero sections: replace hardcoded `from-[#1a0533] via-[#2d1a57]` hex gradients → `from-zinc-950 via-zinc-900 to-zinc-950`
- CTA accent: `bg-purple-600` → `bg-indigo-600`
- `GradientNumber`: `from-white via-purple-200 to-purple-400/50` → `from-white via-indigo-200 to-indigo-400/50`
- Map marker colors: purple hex → `#4f46e5` (indigo-600)
- `section-blend-*` classes (from deleted purple-branding.css): replace with inline Tailwind gradient utilities

**⚠️ WARNING:** `PublicPropertyDetail.tsx` is 700+ lines. Agent must be careful not to break funnel logic. Visual changes only.

**Complexity:** Very High

---

### Domain F — System + Auth Pages

**Files:**
- `src/pages/Settings.tsx` (9 matches)
- `src/pages/Documents.tsx` (0 matches)
- `src/pages/ActivityLogs.tsx` (2 matches)
- `src/pages/Auth.tsx` (1 match)
- `src/pages/NotFound.tsx` (0 matches)
- `src/components/settings/AIPerformance.tsx` (10 matches)
- `src/components/settings/FunnelAnalyticsDashboard.tsx` (7 matches)
- `src/components/activity/ActivityTimeline.tsx`

**Key changes:**
- GHL connection status: `bg-purple-100 text-purple-700` → `bg-primary/10 text-primary`
- Auth page title: remove `gradient-text` or keep (now renders as indigo after 1A)
- Add `PageContainer` / `PageHeader` to all pages
- Chart accent colors: `text-purple-*` → `text-primary`

**Complexity:** Low

---

## Risk Register

| Risk | Severity | Mitigation |
|---|---|---|
| `PublicPropertyDetail.tsx` — 700+ lines, 214 matches, hardcoded hex gradients | HIGH | Dedicated agent. Do not batch with other changes. |
| Deleting `purple-branding.css` — `.reveal` class used by `useScrollReveal.ts` | MEDIUM | Grep `className.*reveal` before deletion. Move `.reveal` to index.css if needed. |
| `QuickPostFormV2.tsx` — 43 matches, complex wizard | MEDIUM-HIGH | Visual-only replacements. Touch no logic. |
| Matching engine components — 22-23 matches each | MEDIUM | Follow badge pattern: `bg-purple-100 text-purple-700` → `bg-primary/10 text-primary`. |

---

## Execution Map

```
Phase 1A → 1B → 1C  (sequential)
     ↓
Phase 2A + 2B + 2b-i + 2b-ii + 2b-iii + 2b-iv  (all parallel)
     ↓
Phase 3: Domains A + B + C + D + E + F  (all parallel)
```

---

## Page Quick Reference

| Page | Purple Matches | Domain | Complexity |
|---|---|---|---|
| Dashboard | 11 | A | Medium |
| Properties | ~3 | A | Low |
| PropertyDetail | 3 | A | Low |
| Buyers | 1 | C | Low |
| Contacts | 1 | C | Low |
| Matching | 2 | C | Low |
| SellerAcquisitions | 1 | B | Low |
| DealPipeline | 0 | B | Low |
| SocialMedia | 3 | D | Low |
| Documents | 0 | F | Low |
| Settings | 9 | F | Low |
| ActivityLogs | 2 | F | Low |
| PublicListings | 51 | E | High |
| PublicPropertyDetail | 214 | E | Very High |
| Auth | 1 | F | Low |
| NotFound | 0 | F | Low |
