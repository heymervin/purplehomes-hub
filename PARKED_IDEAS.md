# 🅿️ Parked Ideas - Don't Forget!

## 🎯 The Ultimate Algorithm (Analytics-Driven Learning)

**Status**: Parked - Waiting for foundation audit
**Priority**: High
**Date Parked**: 2026-01-19

### The Idea
Enhance the current "Persist & Grow" avatar research system with **objective behavioral analytics** instead of manual ratings.

### What It Would Track
1. **Time on Page** - How long visitors engage (target: 2-3min+)
2. **Scroll Depth** - How far they read (target: 75%+)
3. **CTA Clicks** - Intent signals (schedule tour, contact, apply)
4. **Form Submissions** - Actual lead conversions
5. **Bounce Rate** - Bad headlines/immediate exits
6. **Video Plays** - Virtual tour engagement
7. **Return Visits** - High buyer interest
8. **HighLevel Integration** - Closed deal tracking (ultimate validation)

### The Algorithm Formula
```javascript
effectivenessScore = weighted_average([
  timeOnPage >= 2min ? 10 : (timeOnPage / 120 * 10),      // 30% weight
  scrollDepth >= 75% ? 10 : (scrollDepth / 75 * 10),      // 20% weight
  ctaClicks > 0 ? 10 : 0,                                  // 25% weight
  formSubmitted ? 10 : 0,                                  // 25% weight
])
```

### Why It's Better Than Manual Rating
- **Objective** - Real behavior vs gut feeling
- **Automatic** - No need to remember to rate
- **Instant** - Learns immediately from traffic
- **Granular** - Section-level insights (which parts work?)
- **A/B Testing** - Auto-detect winning variants
- **Real-Time** - Dashboard shows funnel health live

### Technical Implementation Plan
1. Add analytics tracking to `PublicPropertyDetail.tsx`
2. Track scroll depth, time, clicks via event listeners
3. Create `api/analytics/track.ts` for data collection
4. Auto-calculate engagement scores
5. Auto-rate avatar research based on scores
6. Build performance dashboard
7. Optional: Integrate HighLevel webhook for closed deals

### Reference
- HighLevel Analytics Changelog: https://ideas.gohighlevel.com/changelog/new-analytics-metrics-added
- Conversation context: Session continued 2026-01-19

---

**Next Steps When Ready**:
1. Complete foundation audit
2. Fix any loops/mistakes
3. Optimize copywriting system
4. THEN return to this and build it

---

## 🔀 Funnel A/B Testing UI

**Status**: Parked - Foundation complete, UI nice-to-have
**Priority**: Medium
**Date Parked**: 2026-01-19

### The Idea
Side-by-side comparison view for A/B test variants (hook and CTA already generate variants).

### What It Would Include
- Split-screen preview of Variant A vs Variant B
- Easy swap button to use variant as primary
- Track which variant is "winning" based on ratings
- Visual diff highlighting between variants

### Why Parked
- Current editor already shows variants (hookVariantB, ctaVariantB)
- Copy buttons allow quick extraction for manual testing
- Formula learning system will naturally optimize over time
- Can revisit once analytics ("Ultimate Algorithm") is built

---

## 🎨 Other Future Ideas

(Add more parked ideas below as they come up)

