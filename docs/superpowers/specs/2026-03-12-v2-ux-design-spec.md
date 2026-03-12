# Purple Homes Hub V2 — UX/UI Design Specification

**Version**: 2.0  
**Date**: 2026-03-12  
**Status**: Final Draft

---

## 1. Design Tokens

### Color System (CSS Custom Properties)

```css
:root {
  --background: 0 0% 100%;
  --foreground: 240 6% 4%;
  --card: 0 0% 100%;
  --card-foreground: 240 6% 4%;
  --surface: 240 5% 98%;
  --surface-2: 240 5% 96%;
  --primary: 244 57% 51%;          /* #4F46E5 indigo-600 */
  --primary-foreground: 0 0% 100%;
  --secondary: 240 5% 96%;
  --secondary-foreground: 240 4% 16%;
  --muted: 240 5% 96%;
  --muted-foreground: 240 4% 46%;  /* #71717A zinc-500 */
  --accent: 244 57% 51%;
  --accent-foreground: 0 0% 100%;
  --destructive: 0 84% 60%;
  --destructive-foreground: 0 0% 100%;
  --border: 240 6% 90%;            /* #E4E4E7 zinc-200 */
  --input: 240 6% 90%;
  --ring: 244 57% 51%;
  --radius: 0.5rem;
  --radius-sm: 0.375rem;
  --radius-xs: 0.25rem;
  --success: 160 84% 39%;
  --warning: 38 92% 50%;
  --error: 0 84% 60%;
  --info: 217 91% 60%;
  --sidebar-background: 210 40% 98%;
  --sidebar-foreground: 240 6% 4%;
  --sidebar-border: 240 6% 90%;
  --sidebar-primary: 244 57% 51%;
  --sidebar-primary-foreground: 0 0% 100%;
  --sidebar-accent: 240 5% 96%;
  --sidebar-accent-foreground: 240 6% 4%;
}

.dark {
  --background: 240 6% 5%;
  --foreground: 0 0% 98%;
  --card: 240 4% 8%;
  --card-foreground: 0 0% 98%;
  --surface: 240 4% 8%;
  --surface-2: 240 3% 11%;
  --primary: 239 84% 67%;          /* #6366F1 indigo-500 */
  --primary-foreground: 0 0% 100%;
  --secondary: 240 3% 11%;
  --secondary-foreground: 0 0% 98%;
  --muted: 240 3% 11%;
  --muted-foreground: 240 4% 46%;
  --accent: 239 84% 67%;
  --accent-foreground: 0 0% 98%;
  --destructive: 0 84% 60%;
  --destructive-foreground: 0 0% 98%;
  --border: 240 4% 16%;
  --input: 240 4% 16%;
  --ring: 239 84% 67%;
  --sidebar-background: 240 5% 7%;
  --sidebar-foreground: 0 0% 98%;
  --sidebar-border: 240 4% 16%;
  --sidebar-primary: 239 84% 67%;
  --sidebar-accent: 240 3% 11%;
  --sidebar-accent-foreground: 0 0% 98%;
}
```

### Typography Scale

| Token      | Size  | Weight | Use Case              |
|------------|-------|--------|-----------------------|
| display    | 22px  | 600    | Page titles           |
| heading    | 18px  | 600    | Card/section titles   |
| body       | 14px  | 400    | Default content       |
| label      | 13px  | 500    | Nav, form labels      |
| caption    | 12px  | 400    | Timestamps, metadata  |
| stat-value | 28px  | 700    | Big numbers           |

### Spacing

| Token        | Value | Use Case                |
|--------------|-------|-------------------------|
| page-padding | 24px  | Main content inset      |
| section-gap  | 24px  | Between page sections   |
| card-padding | 20px  | Inside cards            |
| card-gap     | 16px  | Between cards in grid   |
| inline-gap   | 8px   | Icon + text pairs       |

### Shadows

- Cards at rest: `shadow-sm` border only
- Cards on hover: `shadow-md`
- Dropdowns/popovers: `shadow-lg`
- Modals: `shadow-xl`

---

## 2. Component Patterns

### Page Shell
```tsx
<div className="space-y-6 p-6">
  <div className="flex items-center justify-between">
    <div>
      <h1 className="text-[22px] font-semibold tracking-tight">{title}</h1>
      <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
    </div>
    <div className="flex items-center gap-2">{actions}</div>
  </div>
  {content}
</div>
```

### Stat Cards (flat, no colored bg)
```tsx
<div className="p-5 rounded-lg border bg-card">
  <div className="flex items-center justify-between">
    <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
    <Icon className="h-4 w-4 text-muted-foreground" />
  </div>
  <p className="text-[28px] font-bold tabular-nums mt-1">{value}</p>
  <div className="flex items-center gap-1 mt-1">
    <TrendingUp className="h-3 w-3 text-emerald-600" />
    <span className="text-xs text-emerald-600">+{trend}%</span>
    <span className="text-xs text-muted-foreground">{trendLabel}</span>
  </div>
</div>
```

No colored icon pill backgrounds. No colored value text. Only trend arrows get color.

### Data Tables
- Header: `text-xs font-medium uppercase tracking-wider text-muted-foreground`, height 40px
- Rows: height 48px, `hover:bg-[hsl(var(--surface))]`
- Border: `border rounded-lg overflow-hidden`, no shadow
- Empty state: See EmptyState pattern

### Kanban
- Column headers: name + count badge, 3px left border in semantic color, no fill
- Cards: `bg-card border rounded-md p-3`, `hover:shadow-sm`
- No image thumbnails in cards
- "Move to..." dropdown for keyboard/mobile

### Filter Bar
```tsx
<div className="flex flex-wrap items-center gap-2">
  <div className="relative flex-1 min-w-[200px]">
    <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    <Input placeholder="Search..." className="h-9 pl-9 text-sm" />
  </div>
  {/* selects: h-9 w-[140px] text-sm */}
  {hasActiveFilters && (
    <button className="text-xs text-muted-foreground hover:text-foreground ml-auto">Clear filters</button>
  )}
</div>
```
No background fill on filter container. Flat inline controls.

### Modal/Dialog
- Widths: `max-w-lg` forms, `max-w-2xl` details, `max-w-4xl` complex
- Radius: 12px, Backdrop: `bg-black/50 backdrop-blur-sm`
- Footer: right-aligned, Cancel=outline, Primary=filled
- No colored modal headers

### Badges (semantic)
| Status    | Classes                                    |
|-----------|--------------------------------------------|
| Active    | `bg-emerald-50 text-emerald-700`           |
| Pending   | `bg-amber-50 text-amber-700`               |
| Inactive  | `bg-zinc-100 text-zinc-500`                |
| Error     | `bg-red-50 text-red-700`                   |
| New       | `bg-indigo-50 text-indigo-700`             |
| Scheduled | `bg-violet-50 text-violet-700`             |

### Empty States
```tsx
<div className="flex flex-col items-center justify-center py-16 text-center">
  <div className="rounded-full bg-muted p-3 mb-3">
    <Icon className="h-6 w-6 text-muted-foreground" />
  </div>
  <h3 className="text-base font-semibold mb-1">{title}</h3>
  <p className="text-sm text-muted-foreground max-w-xs mb-4">{description}</p>
  {action}
</div>
```

### Loading (Skeleton preferred, never page-level spinners)

---

## 3. Navigation Architecture

### Sidebar Groups

| Group      | Items                                          |
|------------|------------------------------------------------|
| OVERVIEW   | Dashboard                                      |
| PROPERTIES | Properties, Matching                           |
| PEOPLE     | Buyers, Contacts                               |
| PIPELINE   | Seller Pipeline, Deal Pipeline                 |
| MARKETING  | Social Hub                                     |
| SYSTEM     | Documents, Activity Logs, Settings             |

### Nav Item Spec
- Active: `bg-primary/10 text-primary font-medium` + 2px left border
- Inactive: `text-muted-foreground hover:bg-muted hover:text-foreground`
- Icon: 16px, always visible in collapsed state
- Section labels: hidden when collapsed, `text-[11px] font-semibold uppercase tracking-wider`

### Sidebar Footer
Theme toggle → User email (truncated) → Sign Out → GHL connection dot

---

## 4. Page-by-Page UX Spec

### Dashboard
- Remove Navigation Cards section (duplicate of sidebar)
- Remove colored stat card variants — all flat neutral
- Remove connection badges from title
- Recent Activity as proper data table

### Properties
- Remove "Airtable"/"Demo Mode" badge from title
- Consistent filter bar pattern
- Property card: remove purple hover, use `hover:shadow-md`

### Property Detail (Internal)
- Keep 2-column layout
- Remove gradient text, purple source badges
- Price: `text-3xl font-bold` is appropriate here (focal point)

### Buyers
- Default: table view desktop, card list mobile
- Remove Users icon from page title
- Stats summary: plain text, not colored numbers

### Contacts
- Consolidate "Sync from GHL" + "Refresh" → single "Sync" button
- Remove unimplemented date range filters
- Smart list tabs: Tabs component (All | Sellers | Buyers | Agents | Wholesalers)

### Matching
- Remove colored header badges — move counts to subtitle text
- Default Button for "Run Matching" (no purple fill)
- Tab triggers: left-aligned, auto-width

### Seller Pipeline
- Remove colored column header fills — left border accent only
- Remove image thumbnails from kanban cards
- Semantic stage colors via left border

### Deal Pipeline
- Keep 3-tab structure (Overview / All Deals / Pipeline Board)
- Apply v2 kanban and table patterns
- "By Buyer" sub-view as text links, not nested TabsList

### Social Hub
- Tab triggers: left-aligned, auto-width
- Calendar: `bg-primary/10 border-primary` for selected day
- No major structural changes

### Documents
- Remove Demo Mode banner — show empty state instead
- Flat stat cards, no colored variants

### Settings
- Keep collapsible sections within tabs
- Apply v2 form field patterns

### Activity Logs
- Uniform `bg-muted rounded-full p-1.5` icon containers (no per-type colors)
- Both timeline + table views kept

### Public Listings (no sidebar)
- Top bar: Logo | Phone | Theme Toggle
- Map markers: indigo (#4f46e5)
- Remove all purple branding

### Public Property Detail (no sidebar)
- Hero: property image + dark overlay + white text
- Replace `from-[#1a0533] via-[#2d1a57]` → `from-zinc-950 via-zinc-900 to-zinc-950`
- CTAs: `bg-primary text-primary-foreground` (no gradients)
- Testimonials: white cards with border, no purple glow
- Remove section-blend wave dividers, use padding-based section breaks

### Auth
- Card: `max-w-sm`, centered
- Title: `text-xl font-bold text-foreground` (no gradient)
- Background: clean `bg-background`

### 404
- "404": `text-6xl font-bold text-muted-foreground`
- Button: `<Button onClick={() => navigate('/')}>Go to Dashboard</Button>`

---

## 5. Top 10 UX Improvements

1. **Remove Dashboard Nav Cards** — duplicates sidebar, violates single navigation surface
2. **Eliminate per-page connection badges** — move to sidebar footer only
3. **Standardize filter pattern** — one FilterBar component for all pages
4. **Flat stat cards** — no color variants, only trend arrows get color
5. **Reduce page title size** — `text-[22px]` not `text-3xl` for admin panels
6. **Remove page entry animations** — `animate-fade-in` hurts perceived performance
7. **Convert Buyers to table view** — text-heavy data scans faster in tables
8. **Consolidate pipeline pages** — Buyer Dispositions as Deal Pipeline sub-tab
9. **Fix mobile touch targets** — minimum 44x44px on all interactive elements
10. **Add keyboard nav to kanban** — "Move to..." dropdown for accessibility

---

## 6. Search-and-Replace Patterns

| Find | Replace |
|------|---------|
| `bg-purple-600 hover:bg-purple-700` | (use default `<Button>`) |
| `bg-purple-100 dark:bg-purple-900/30` | `bg-primary/10` |
| `text-purple-600 dark:text-purple-400` | `text-primary` |
| `border-purple-500/50` | `border-border` |
| `hover:border-purple-500/50` | (remove) |
| `hover:bg-purple-50/50 dark:hover:bg-purple-950/20` | `hover:bg-muted` |
| `gradient-text` | `text-foreground font-bold` |
| `gradient-primary` | `bg-primary` |
| `bg-purple-100 text-purple-700 border-purple-200` | `bg-primary/10 text-primary` |
| `text-3xl font-bold` (page headers only) | `text-[22px] font-semibold tracking-tight` |
| `animate-fade-in` | (remove) |
| `variant="purple"` | `variant="default"` |

## 7. Files to Delete

- `src/styles/purple-branding.css` (974 lines)
- Remove `@import './styles/purple-branding.css'` from `src/index.css`
- Verify `.reveal` class usage before deletion — move to `index.css @layer utilities` if needed
