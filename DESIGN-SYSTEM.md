# Purple Homes Design System
## High-Converting Real Estate Funnel Framework

> A comprehensive design hierarchy optimized for real estate lead generation and conversions.

---

## Table of Contents

1. [Brand Identity](#brand-identity)
2. [Color System](#color-system)
3. [Typography Hierarchy](#typography-hierarchy)
4. [Spacing & Layout](#spacing--layout)
5. [Buttons & CTAs](#buttons--ctas)
6. [Cards & Containers](#cards--containers)
7. [Trust Elements](#trust-elements)
8. [Urgency & Scarcity](#urgency--scarcity)
9. [Social Proof](#social-proof)
10. [Form Design](#form-design)
11. [Section Templates](#section-templates)
12. [Mobile Considerations](#mobile-considerations)
13. [Implementation Classes](#implementation-classes)

---

## Brand Identity

### Core Brand Values
- **Trust**: We help families achieve homeownership
- **Expertise**: 15+ years in real estate solutions
- **Accessibility**: Alternative financing for those banks reject
- **Transformation**: From renter to homeowner

### Brand Voice
- Empathetic, not salesy
- Direct, not corporate
- Encouraging, not pushy
- Educational, not condescending

---

## Color System

### Primary Palette

| Role | Color | Hex | HSL | Usage |
|------|-------|-----|-----|-------|
| **Primary** | Purple | `#667eea` | `228, 76%, 66%` | Primary CTAs, headers, brand elements |
| **Primary Dark** | Deep Purple | `#5b21b6` | `262, 67%, 42%` | Hover states, gradients |
| **Primary Light** | Soft Purple | `#a78bfa` | `258, 90%, 76%` | Backgrounds, accents |
| **Secondary** | Royal Purple | `#764ba2` | `274, 37%, 46%` | Gradient endpoints |

### Conversion Colors

| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| **CTA Primary** | Vibrant Orange | `#f97316` | Primary action buttons (high contrast) |
| **CTA Hover** | Deep Orange | `#ea580c` | Button hover states |
| **Success** | Trust Green | `#10b981` | Checkmarks, benefits, approvals |
| **Urgency** | Alert Red | `#ef4444` | Countdown timers, limited availability |
| **Warning** | Attention Amber | `#f59e0b` | Important notices, highlights |

### Neutral Palette

| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| **Text Primary** | Charcoal | `#1f2937` | Headings, body text |
| **Text Secondary** | Slate | `#4b5563` | Subheadings, descriptions |
| **Text Muted** | Gray | `#6b7280` | Captions, helper text |
| **Border** | Light Gray | `#e5e7eb` | Dividers, card borders |
| **Background** | Off-White | `#f9fafb` | Page backgrounds |
| **Surface** | White | `#ffffff` | Cards, modals |

### Gradient Definitions

```css
/* Hero Gradient - Dramatic overlay for images */
--gradient-hero: linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.7) 100%);

/* CTA Gradient - High-converting action areas */
--gradient-cta: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

/* Trust Gradient - Professional sections */
--gradient-trust: linear-gradient(135deg, #1f2937 0%, #374151 100%);

/* Success Gradient - Positive outcomes */
--gradient-success: linear-gradient(135deg, #10b981 0%, #059669 100%);

/* Urgency Gradient - Time-sensitive sections */
--gradient-urgency: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);

/* Gold/Premium Gradient - Financing/Value sections */
--gradient-premium: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
```

---

## Typography Hierarchy

### Font Stack

```css
--font-primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-display: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

### Heading Hierarchy

| Element | Size (Desktop) | Size (Mobile) | Weight | Line Height | Letter Spacing | Color | Usage |
|---------|---------------|---------------|--------|-------------|----------------|-------|-------|
| **H1 - Hero** | 56px (3.5rem) | 36px (2.25rem) | 800 | 1.1 | -0.02em | Primary or White | Main page headline |
| **H2 - Section** | 40px (2.5rem) | 28px (1.75rem) | 700 | 1.2 | -0.01em | Text Primary | Section headers |
| **H3 - Subsection** | 28px (1.75rem) | 22px (1.375rem) | 600 | 1.3 | 0 | Text Primary | Card titles, feature heads |
| **H4 - Card Title** | 22px (1.375rem) | 18px (1.125rem) | 600 | 1.4 | 0 | Text Primary | List headers, small sections |
| **H5 - Label** | 16px (1rem) | 14px (0.875rem) | 600 | 1.5 | 0.05em | Text Secondary | Form labels, badges |
| **H6 - Overline** | 12px (0.75rem) | 11px (0.6875rem) | 700 | 1.5 | 0.1em | Primary | Category labels, pre-headers |

### Body Text

| Element | Size | Weight | Line Height | Color | Usage |
|---------|------|--------|-------------|-------|-------|
| **Body Large** | 20px (1.25rem) | 400 | 1.7 | Text Primary | Hero subtext, intros |
| **Body** | 16px (1rem) | 400 | 1.7 | Text Secondary | Main content |
| **Body Small** | 14px (0.875rem) | 400 | 1.6 | Text Muted | Captions, helper text |
| **Caption** | 12px (0.75rem) | 500 | 1.5 | Text Muted | Timestamps, fine print |

### Special Typography

| Element | Size | Weight | Style | Usage |
|---------|------|--------|-------|-------|
| **Price Display** | 48px (3rem) | 800 | Normal | Property prices |
| **Price Monthly** | 32px (2rem) | 700 | Normal | Monthly payments |
| **Stats Number** | 36px (2.25rem) | 700 | Normal | Social proof numbers |
| **Quote** | 24px (1.5rem) | 500 | Italic | Testimonials |
| **CTA Text** | 18px (1.125rem) | 700 | Uppercase | Button text |
| **Badge** | 11px (0.6875rem) | 700 | Uppercase | Status badges |

---

## Spacing & Layout

### Spacing Scale

```css
--space-xs: 4px;    /* 0.25rem */
--space-sm: 8px;    /* 0.5rem */
--space-md: 16px;   /* 1rem */
--space-lg: 24px;   /* 1.5rem */
--space-xl: 32px;   /* 2rem */
--space-2xl: 48px;  /* 3rem */
--space-3xl: 64px;  /* 4rem */
--space-4xl: 96px;  /* 6rem */
--space-5xl: 128px; /* 8rem */
```

### Section Spacing

| Section Type | Padding (Desktop) | Padding (Mobile) |
|--------------|-------------------|------------------|
| **Hero** | 120px top, 80px bottom | 80px top, 60px bottom |
| **Standard Section** | 80px vertical | 48px vertical |
| **Compact Section** | 48px vertical | 32px vertical |
| **Card Interior** | 32px | 24px |
| **Between Elements** | 24px | 16px |

### Container Widths

| Container | Max Width | Usage |
|-----------|-----------|-------|
| **Full Bleed** | 100% | Hero images, full-width sections |
| **Wide** | 1400px | Standard page content |
| **Content** | 1200px | Text-heavy sections |
| **Narrow** | 800px | Forms, single-column content |
| **Tight** | 600px | Lead capture forms, modals |

---

## Buttons & CTAs

### Primary CTA (Orange - Highest Priority)

```css
.btn-cta-primary {
  background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
  color: white;
  font-size: 18px;
  font-weight: 700;
  padding: 18px 40px;
  border-radius: 8px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  box-shadow: 0 4px 14px rgba(249, 115, 22, 0.4);
  transition: all 0.3s ease;
}

.btn-cta-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(249, 115, 22, 0.5);
}
```

**Usage**: "Get Pre-Qualified Now", "See If You Qualify", "Claim This Home"

### Secondary CTA (Purple - Brand Action)

```css
.btn-cta-secondary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-size: 16px;
  font-weight: 600;
  padding: 14px 32px;
  border-radius: 8px;
  box-shadow: 0 4px 14px rgba(102, 126, 234, 0.3);
}
```

**Usage**: "Schedule a Tour", "Make an Offer", "Learn More"

### Outline Button (Low Priority)

```css
.btn-outline {
  background: transparent;
  color: #667eea;
  font-size: 16px;
  font-weight: 600;
  padding: 14px 32px;
  border: 2px solid #667eea;
  border-radius: 8px;
}
```

**Usage**: "Call Now", "View All Properties", "See More Details"

### Ghost Button (Minimal)

```css
.btn-ghost {
  background: transparent;
  color: #667eea;
  font-size: 14px;
  font-weight: 600;
  padding: 10px 20px;
  text-decoration: underline;
}
```

**Usage**: "Skip", "Maybe Later", "View Terms"

### Button Sizes

| Size | Padding | Font Size | Border Radius |
|------|---------|-----------|---------------|
| **XL** | 20px 48px | 20px | 10px |
| **LG** | 18px 40px | 18px | 8px |
| **MD** | 14px 32px | 16px | 8px |
| **SM** | 10px 24px | 14px | 6px |

### CTA Placement Rules

1. **Above the fold**: At least one CTA visible without scrolling
2. **After every section**: Natural conversion points
3. **Sticky footer**: Mobile CTA always accessible
4. **Exit intent**: Modal with compelling offer
5. **Multiple CTAs**: Vary the copy, not the destination

---

## Cards & Containers

### Standard Card

```css
.card {
  background: white;
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05), 0 10px 20px rgba(0, 0, 0, 0.05);
  border: 1px solid #e5e7eb;
}
```

### Elevated Card (Feature Highlight)

```css
.card-elevated {
  background: white;
  border-radius: 20px;
  padding: 40px;
  box-shadow: 0 20px 40px rgba(102, 126, 234, 0.15);
  border: 2px solid #667eea;
}
```

### Dark Card (Dramatic Sections)

```css
.card-dark {
  background: linear-gradient(135deg, #1f2937 0%, #374151 100%);
  border-radius: 16px;
  padding: 32px;
  color: white;
}
```

### Glass Card (Modern Overlay)

```css
.card-glass {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 32px;
  border: 1px solid rgba(255, 255, 255, 0.5);
}
```

### Section Backgrounds

| Type | Background | Text Color | Usage |
|------|------------|------------|-------|
| **Light** | #f9fafb | Text Primary | Default sections |
| **White** | #ffffff | Text Primary | Alternating sections |
| **Purple Subtle** | #f5f3ff | Text Primary | Feature highlights |
| **Dark** | #1f2937 | White | Trust, testimonials |
| **Gradient Purple** | gradient-cta | White | CTAs, hero |
| **Image Overlay** | gradient-hero over image | White | Hero sections |

---

## Trust Elements

### Trust Badge Design

```css
.trust-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: white;
  border-radius: 100px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.trust-badge-icon {
  width: 24px;
  height: 24px;
  color: #10b981;
}
```

### Trust Bar Layout

```
[BBB A+ Rated] [15+ Years Experience] [500+ Families Helped] [Satisfaction Guaranteed]
```

### Guarantee Box

```css
.guarantee-box {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border-radius: 16px;
  padding: 32px;
  text-align: center;
}

.guarantee-box h3 {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 12px;
}

.guarantee-box .icon {
  width: 64px;
  height: 64px;
  margin-bottom: 16px;
}
```

### Credibility Indicators

- Years in business with icon
- Number of families helped
- Star ratings (display as stars, not text)
- Association logos (BBB, local realtor boards)
- "As Seen In" media logos
- License numbers (small, footer)

---

## Urgency & Scarcity

### Countdown Timer

```css
.countdown {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.countdown-unit {
  background: #ef4444;
  color: white;
  border-radius: 8px;
  padding: 16px;
  min-width: 70px;
  text-align: center;
}

.countdown-number {
  font-size: 32px;
  font-weight: 800;
  line-height: 1;
}

.countdown-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  opacity: 0.8;
}
```

### Urgency Banner

```css
.urgency-banner {
  background: linear-gradient(90deg, #ef4444 0%, #dc2626 100%);
  color: white;
  padding: 12px 24px;
  text-align: center;
  font-weight: 600;
}
```

**Copy Examples:**
- "Only 2 Buyers Can Qualify for This Home"
- "This Price Locked Until [Date]"
- "3 Other Families Viewing This Property"

### Scarcity Indicators

```css
.scarcity-badge {
  background: #fef3c7;
  color: #92400e;
  padding: 8px 16px;
  border-radius: 100px;
  font-size: 13px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.scarcity-badge::before {
  content: "🔥";
}
```

---

## Social Proof

### Testimonial Card (Video)

```css
.testimonial-video {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  aspect-ratio: 16/9;
}

.testimonial-video-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24px;
  background: linear-gradient(transparent, rgba(0,0,0,0.8));
  color: white;
}

.testimonial-name {
  font-size: 18px;
  font-weight: 700;
}

.testimonial-location {
  font-size: 14px;
  opacity: 0.8;
}
```

### Testimonial Card (Quote)

```css
.testimonial-quote {
  background: white;
  border-radius: 16px;
  padding: 32px;
  position: relative;
}

.testimonial-quote::before {
  content: """;
  position: absolute;
  top: -10px;
  left: 20px;
  font-size: 80px;
  color: #667eea;
  opacity: 0.2;
  font-family: Georgia, serif;
}

.testimonial-text {
  font-size: 18px;
  font-style: italic;
  line-height: 1.7;
  color: #374151;
  margin-bottom: 24px;
}

.testimonial-author {
  display: flex;
  align-items: center;
  gap: 16px;
}

.testimonial-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  object-fit: cover;
}
```

### Before/After Transformation

```css
.transformation-card {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  padding: 32px;
  background: white;
  border-radius: 16px;
}

.transformation-before {
  position: relative;
}

.transformation-before::after {
  content: "BEFORE";
  position: absolute;
  top: 12px;
  left: 12px;
  background: #ef4444;
  color: white;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 700;
}

.transformation-after::after {
  content: "AFTER";
  background: #10b981;
}
```

### Stats Bar

```css
.stats-bar {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
  text-align: center;
  padding: 48px;
  background: linear-gradient(135deg, #1f2937 0%, #374151 100%);
  color: white;
  border-radius: 16px;
}

.stat-number {
  font-size: 48px;
  font-weight: 800;
  color: #f97316;
  line-height: 1;
}

.stat-label {
  font-size: 14px;
  font-weight: 500;
  opacity: 0.8;
  margin-top: 8px;
}
```

---

## Form Design

### Lead Capture Form (High-Converting)

```css
.lead-form {
  background: white;
  border-radius: 20px;
  padding: 40px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  max-width: 480px;
}

.lead-form-header {
  text-align: center;
  margin-bottom: 32px;
}

.lead-form-title {
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 8px;
}

.lead-form-subtitle {
  font-size: 16px;
  color: #6b7280;
}
```

### Form Input Styling

```css
.form-input {
  width: 100%;
  padding: 16px 20px;
  font-size: 16px;
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  transition: all 0.2s ease;
}

.form-input:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
  outline: none;
}

.form-input-error {
  border-color: #ef4444;
}

.form-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
}
```

### Form Field Order (Optimal)

1. First Name (easy start)
2. Phone Number (most valuable)
3. Email (secondary)
4. Property Interest / Budget (qualifier)
5. Submit Button

### Form Trust Elements

```css
.form-trust {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 16px;
  font-size: 13px;
  color: #6b7280;
}

.form-trust-icon {
  width: 16px;
  height: 16px;
  color: #10b981;
}
```

**Copy**: "🔒 Your info is secure and never shared"

---

## Section Templates

### Hero Section

```
┌─────────────────────────────────────────────────────────────┐
│  [Full-width property image with gradient overlay]          │
│                                                             │
│     ┌─────────────────────────────────────┐                │
│     │  OVERLINE: Own This Home Today      │                │
│     │                                     │                │
│     │  H1: Stop Renting. Start Owning.   │                │
│     │      Your Dream Home Awaits.       │                │
│     │                                     │                │
│     │  Body: Get qualified in minutes,   │                │
│     │  even if banks have said no.       │                │
│     │                                     │                │
│     │  [Get Pre-Qualified Now - Orange]  │                │
│     │                                     │                │
│     │  [Trust badges row]                │                │
│     └─────────────────────────────────────┘                │
│                                                             │
│  ┌─────────────┐                                           │
│  │ $189,900    │                                           │
│  │ $1,450/mo   │                                           │
│  └─────────────┘                                           │
└─────────────────────────────────────────────────────────────┘
```

### Problem/Agitation Section

```
┌─────────────────────────────────────────────────────────────┐
│  Background: Light gray or subtle pattern                   │
│                                                             │
│  H2: Tired of Throwing Money Away on Rent?                 │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ 😤           │  │ 😰           │  │ 😔           │     │
│  │ Rejected by  │  │ Credit not   │  │ Saving for   │     │
│  │ banks        │  │ perfect      │  │ years with   │     │
│  │              │  │              │  │ no progress  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                             │
│  Body: You work hard. You pay your bills. But the          │
│  traditional path to homeownership isn't working...        │
└─────────────────────────────────────────────────────────────┘
```

### Solution Section

```
┌─────────────────────────────────────────────────────────────┐
│  Background: Purple gradient                                │
│  Text: White                                                │
│                                                             │
│  OVERLINE: There's a Better Way                            │
│                                                             │
│  H2: Rent-to-Own: Your Path to Homeownership               │
│                                                             │
│  [3-column icon + text grid]                               │
│  ✓ No bank required     ✓ Build equity now    ✓ Lock price │
│                                                             │
│  Body: Purple Homes specializes in helping families...     │
│                                                             │
│  [See How It Works - White button]                         │
└─────────────────────────────────────────────────────────────┘
```

### Comparison Table (Rent vs Own)

```
┌─────────────────────────────────────────────────────────────┐
│  H2: Renting vs. Owning With Purple Homes                  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              │  RENTING  │  PURPLE HOMES  │         │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ Monthly payment goes to: │  Landlord  │  YOUR equity │   │
│  │ Build wealth:           │  ❌ No     │  ✅ Yes      │   │
│  │ Tax benefits:           │  ❌ No     │  ✅ Yes      │   │
│  │ Price locked in:        │  ❌ No     │  ✅ Yes      │   │
│  │ Personalize your home:  │  ❌ No     │  ✅ Yes      │   │
│  │ Forced to move:         │  ✅ Yes    │  ❌ No       │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Process Steps

```
┌─────────────────────────────────────────────────────────────┐
│  H2: 3 Simple Steps to Homeownership                       │
│                                                             │
│  ┌─────────┐        ┌─────────┐        ┌─────────┐        │
│  │   01    │  ───►  │   02    │  ───►  │   03    │        │
│  │  📋     │        │  🏠     │        │  🔑     │        │
│  │ Apply   │        │ Choose  │        │ Move    │        │
│  │         │        │ Home    │        │ In!     │        │
│  │ 5 min   │        │ Tour    │        │ 30 days │        │
│  │ online  │        │ options │        │ typical │        │
│  └─────────┘        └─────────┘        └─────────┘        │
│                                                             │
│  [Start Your Application - Orange CTA]                     │
└─────────────────────────────────────────────────────────────┘
```

### FAQ Accordion

```css
.faq-item {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  margin-bottom: 12px;
  overflow: hidden;
}

.faq-question {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  background: white;
  font-size: 17px;
  font-weight: 600;
  color: #1f2937;
  cursor: pointer;
}

.faq-question:hover {
  background: #f9fafb;
}

.faq-answer {
  padding: 0 24px 20px;
  font-size: 15px;
  color: #4b5563;
  line-height: 1.7;
}

.faq-icon {
  transition: transform 0.2s ease;
}

.faq-item[open] .faq-icon {
  transform: rotate(180deg);
}
```

### Final CTA Section

```
┌─────────────────────────────────────────────────────────────┐
│  Background: Dark gradient with subtle pattern              │
│                                                             │
│  H2: Ready to Stop Renting and Start Owning?               │
│                                                             │
│  Body: Join 500+ families who've made the switch.          │
│  Your dream home is waiting.                               │
│                                                             │
│  [Get Pre-Qualified in 5 Minutes - Large Orange CTA]       │
│                                                             │
│  Small: No obligation • Free consultation • Fast response  │
│                                                             │
│  [Or Call Now: (555) 123-4567]                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Mobile Considerations

### Breakpoints

```css
--breakpoint-sm: 640px;
--breakpoint-md: 768px;
--breakpoint-lg: 1024px;
--breakpoint-xl: 1280px;
--breakpoint-2xl: 1400px;
```

### Mobile-First Rules

1. **Touch targets**: Minimum 44px height for buttons
2. **Font sizes**: Never below 14px for body text
3. **Spacing**: Reduce section padding by ~40%
4. **CTAs**: Full-width buttons on mobile
5. **Forms**: Single column, larger inputs
6. **Images**: Aspect ratio preservation, lazy loading
7. **Sticky CTA**: Fixed bottom bar with primary action

### Mobile Typography Scale

| Element | Mobile Size |
|---------|-------------|
| H1 | 32px-36px |
| H2 | 26px-28px |
| H3 | 20px-22px |
| Body | 16px |
| Small | 14px |

### Sticky Mobile CTA

```css
.sticky-cta-mobile {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px;
  background: white;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1);
  z-index: 100;
}

@media (min-width: 768px) {
  .sticky-cta-mobile {
    display: none;
  }
}
```

---

## Implementation Classes

### Tailwind Utility Classes Reference

```html
<!-- Hero Heading -->
<h1 class="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">

<!-- Section Heading -->
<h2 class="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">

<!-- Subsection Heading -->
<h3 class="text-xl md:text-2xl font-semibold text-gray-900">

<!-- Body Large -->
<p class="text-lg md:text-xl text-gray-600 leading-relaxed">

<!-- Body -->
<p class="text-base text-gray-600 leading-relaxed">

<!-- Primary CTA Button -->
<button class="w-full md:w-auto px-10 py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold text-lg uppercase tracking-wide rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200">

<!-- Secondary CTA Button -->
<button class="px-8 py-3.5 bg-gradient-to-r from-purple-500 to-purple-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200">

<!-- Card -->
<div class="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">

<!-- Dark Section -->
<section class="bg-gradient-to-br from-gray-900 to-gray-800 text-white py-20">

<!-- Purple Section -->
<section class="bg-gradient-to-br from-purple-600 to-purple-800 text-white py-16">

<!-- Trust Badge -->
<span class="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm text-sm font-semibold text-gray-700">

<!-- Stats Number -->
<span class="text-4xl md:text-5xl font-extrabold text-orange-500">
```

---

## Quick Reference Card

### Essential Colors
- **Primary CTA**: `#f97316` (Orange)
- **Brand**: `#667eea` (Purple)
- **Trust**: `#10b981` (Green)
- **Urgency**: `#ef4444` (Red)
- **Text**: `#1f2937` (Charcoal)

### Essential Sizes
- **H1**: 56px / 36px mobile
- **H2**: 40px / 28px mobile
- **Body**: 16px
- **Button**: 18px uppercase, 18px padding

### Section Padding
- **Desktop**: 80px vertical
- **Mobile**: 48px vertical

### Border Radius
- **Cards**: 16px
- **Buttons**: 8px
- **Badges**: 100px (pill)

---

## Conversion Optimization Checklist

- [ ] Hero has clear headline + single CTA above fold
- [ ] Trust badges visible in first scroll
- [ ] Price and monthly payment prominently displayed
- [ ] At least 3 CTAs visible before halfway point
- [ ] Social proof with real names and faces
- [ ] FAQ addresses top objections
- [ ] Mobile sticky CTA implemented
- [ ] Form asks for phone number early
- [ ] Urgency element present (timer, scarcity, or limited offer)
- [ ] Page loads in under 3 seconds
- [ ] All images have alt text
- [ ] Contact methods clear (phone, text, form)

---

*Last Updated: January 2025*
*Version: 1.0*
*Purple Homes Design System*
