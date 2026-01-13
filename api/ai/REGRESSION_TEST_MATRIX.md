# Regression Test Matrix - Caption Generation
**Version:** v1.2 Canonical Prompt Templates
**Status:** QA Reference Document
**Purpose:** Internal validation reference for all 16 intents

---

## Test Protocol

For EACH intent:
1. Run happy path input
2. Verify output matches domain rules
3. Verify no crossover language
4. Verify context fields visibly influence output
5. Verify no fallback behavior

---

## PROPERTY DOMAIN (6 intents)

### Intent: `just-listed`

**Happy Path Input:**
```json
{
  "postIntent": "just-listed",
  "property": {
    "address": "1207 Kepler St",
    "city": "Gretna",
    "state": "LA",
    "price": 215000,
    "beds": 3,
    "baths": 2,
    "sqft": 1385
  },
  "tone": "urgent",
  "platform": "instagram"
}
```

**Expected Output Characteristics:**
- Contains address, price, beds/baths/sqft
- Third-person or neutral voice
- No "I", "my", "we"
- No emotional storytelling
- Factual urgency allowed ("won't last", "generating interest")

**Violation Scenario:**
Output contains: "Imagine waking up in this dream home"
Expected: FAIL - `PROPERTY_NO_EMOTIONAL_STORYTELLING`

---

### Intent: `sold`

**Happy Path Input:**
```json
{
  "postIntent": "sold",
  "property": {
    "address": "456 Oak Lane",
    "city": "Metairie",
    "price": 325000,
    "beds": 4,
    "baths": 3,
    "sqft": 2100
  },
  "tone": "professional",
  "platform": "facebook"
}
```

**Expected Output Characteristics:**
- Sold announcement hook
- Property details present
- Market effectiveness signal
- No personal journey language

**Violation Scenario:**
Output contains: "I fell in love with helping this family find their forever home"
Expected: FAIL - `PROPERTY_NO_FIRST_PERSON`, `PROPERTY_NO_EMOTIONAL_STORYTELLING`

---

### Intent: `open-house`

**Happy Path Input:**
```json
{
  "postIntent": "open-house",
  "property": {
    "address": "789 Elm St",
    "city": "Kenner",
    "price": 275000,
    "beds": 3,
    "baths": 2,
    "sqft": 1650
  },
  "context": "Open house date & time: Saturday, Jan 15, 2-4 PM",
  "tone": "friendly",
  "platform": "instagram"
}
```

**Expected Output Characteristics:**
- Date/time prominently featured
- Property facts included
- Attendance CTA
- No identity framing

**Violation Scenario:**
Output contains: "This could be your forever home - come see!"
Expected: FAIL - `PROPERTY_NO_IDENTITY_FRAMING`

---

### Intent: `price-drop`

**Happy Path Input:**
```json
{
  "postIntent": "price-drop",
  "property": {
    "address": "321 Pine Ave",
    "city": "Harvey",
    "price": 189000,
    "beds": 2,
    "baths": 1,
    "sqft": 1100
  },
  "context": "Price drop note: Motivated seller",
  "tone": "urgent",
  "platform": "facebook"
}
```

**Expected Output Characteristics:**
- Price update hook
- New price emphasized
- Urgency note
- No transformation language

**Violation Scenario:**
Output contains: "Picture yourself starting a new chapter here"
Expected: FAIL - `PROPERTY_NO_EMOTIONAL_STORYTELLING`

---

### Intent: `coming-soon`

**Happy Path Input:**
```json
{
  "postIntent": "coming-soon",
  "property": {
    "city": "Marrero",
    "beds": 4,
    "baths": 2,
    "sqft": 1800
  },
  "context": "Teaser: Corner lot with pool",
  "tone": "urgent",
  "platform": "instagram"
}
```

**Expected Output Characteristics:**
- Teaser hook
- Location + key features
- Early-access framing
- No personal reflection

**Violation Scenario:**
Output contains: "I can't wait to share this one with you"
Expected: FAIL - `PROPERTY_NO_FIRST_PERSON`

---

### Intent: `investment`

**Happy Path Input:**
```json
{
  "postIntent": "investment",
  "property": {
    "address": "555 Investor Blvd",
    "city": "Westwego",
    "price": 145000,
    "beds": 3,
    "baths": 1,
    "sqft": 1200,
    "arv": 195000,
    "repairCost": 25000
  },
  "context": "Investment angle: Strong rental market",
  "tone": "investor",
  "platform": "facebook"
}
```

**Expected Output Characteristics:**
- Investment framing hook
- Property facts + ARV/repair if available
- Yield/upside note
- No emotional language

**Violation Scenario:**
Output contains: "This is where your family's future begins"
Expected: FAIL - `PROPERTY_NO_IDENTITY_FRAMING`

---

## PERSONAL DOMAIN (4 intents)

### Intent: `life-update`

**Happy Path Input:**
```json
{
  "postIntent": "life-update",
  "context": "Story: Just got back from a week-long vacation with my family. First real break in two years.",
  "tone": "casual",
  "platform": "instagram"
}
```

**Expected Output Characteristics:**
- First-person ("I", "my")
- Conversational hook
- Personal reflection
- No property language

**Violation Scenario:**
Output contains: "Just listed a beautiful 3 bed, 2 bath"
Expected: FAIL - `PERSONAL_NO_PROPERTY_LANGUAGE`

---

### Intent: `milestone`

**Happy Path Input:**
```json
{
  "postIntent": "milestone",
  "context": "Milestone: 5 years in real estate\nWhy it matters: Started with zero experience, now helping families every week",
  "tone": "friendly",
  "platform": "facebook"
}
```

**Expected Output Characteristics:**
- Milestone hook with achievement
- First-person narrative
- Reflection/gratitude
- No listing details

**Violation Scenario:**
Output contains: "Celebrating with this $450,000 sale"
Expected: FAIL - `PERSONAL_NO_PROPERTY_LANGUAGE`

---

### Intent: `lesson-insight`

**Happy Path Input:**
```json
{
  "postIntent": "lesson-insight",
  "context": "Lesson: Saying no is harder than saying yes, but it protects your time\nTakeaway: Boundaries aren't selfish",
  "tone": "professional",
  "platform": "linkedin"
}
```

**Expected Output Characteristics:**
- Lesson hook
- Brief story/context
- Insight explained
- Clear takeaway
- No property mentions

**Violation Scenario:**
Output contains: "DM me to schedule a showing"
Expected: WARNING - `PERSONAL_NO_PROMOTIONAL_LANGUAGE`

---

### Intent: `behind-the-scenes`

**Happy Path Input:**
```json
{
  "postIntent": "behind-the-scenes",
  "context": "BTS: Spent 3 hours prepping listing photos today. Most people don't see this part.",
  "tone": "friendly",
  "platform": "instagram"
}
```

**Expected Output Characteristics:**
- BTS hook
- What's happening behind the scenes
- Why it matters
- First-person voice

**Violation Scenario:**
Output contains: "Just sold this 4 bed, 3 bath for $325,000"
Expected: FAIL - `PERSONAL_NO_PROPERTY_LANGUAGE`

---

## PROFESSIONAL DOMAIN (6 intents)

### Intent: `market-update`

**Happy Path Input:**
```json
{
  "postIntent": "market-update",
  "context": "Headline: Inventory up 12% in Jefferson Parish\nStats: Median DOM now 28 days (was 21)\nWhy it matters: Buyers have more options, less pressure",
  "tone": "professional",
  "platform": "linkedin"
}
```

**Expected Output Characteristics:**
- Market headline hook
- Key stats
- Explanation of impact
- Professional close
- No personal stories

**Violation Scenario:**
Output contains: "My journey in real estate taught me..."
Expected: FAIL - `PROFESSIONAL_NO_PERSONAL_NARRATIVE`

---

### Intent: `buyer-tips`

**Happy Path Input:**
```json
{
  "postIntent": "buyer-tips",
  "context": "Tip title: 3 Things First-Time Buyers Miss\nTip details: 1) Closing costs (2-5% of price), 2) Home inspection importance, 3) Pre-approval vs pre-qualification difference",
  "tone": "friendly",
  "platform": "instagram"
}
```

**Expected Output Characteristics:**
- Tip title hook
- Educational content
- Key point highlighted
- Professional CTA
- No personal vulnerability

**Violation Scenario:**
Output contains: "I was scared when I bought my first home"
Expected: FAIL - `PROFESSIONAL_NO_EMOTIONAL_VULNERABILITY`

---

### Intent: `seller-tips`

**Happy Path Input:**
```json
{
  "postIntent": "seller-tips",
  "context": "Tip title: How to Stage Your Home for Top Dollar\nTip details: Declutter, depersonalize, deep clean, add fresh flowers, open all blinds",
  "tone": "professional",
  "platform": "facebook"
}
```

**Expected Output Characteristics:**
- Tip title hook
- Actionable advice
- Why it matters
- Professional close
- No personal life details

**Violation Scenario:**
Output contains: "When I was growing up, my family..."
Expected: FAIL - `PROFESSIONAL_NO_PERSONAL_NARRATIVE`

---

### Intent: `investment-insight`

**Happy Path Input:**
```json
{
  "postIntent": "investment-insight",
  "context": "Insight: Multi-family properties outperforming single-family in rental yield\nMetric: 7.2% avg cap rate vs 5.1%",
  "tone": "investor",
  "platform": "linkedin"
}
```

**Expected Output Characteristics:**
- Insight hook
- Explanation
- Metric highlight
- Authority close
- No emotional language

**Violation Scenario:**
Output contains: "I cried when I made my first investment"
Expected: FAIL - `PROFESSIONAL_NO_EMOTIONAL_VULNERABILITY`

---

### Intent: `client-success-story`

**Happy Path Input:**
```json
{
  "postIntent": "client-success-story",
  "context": "Challenge: First-time buyers, tight budget, competitive market\nSolution: Off-market lead, fast offer, strong terms\nResult: Closed in 3 weeks, $15K under asking",
  "tone": "friendly",
  "platform": "instagram"
}
```

**Expected Output Characteristics:**
- Challenge → Solution → Result structure
- Client-focused (not agent-focused)
- Soft CTA
- No personal vulnerability

**Violation Scenario:**
Output contains: "This reminded me of my childhood home"
Expected: FAIL - `PROFESSIONAL_NO_PERSONAL_NARRATIVE`

---

### Intent: `community-spotlight`

**Happy Path Input:**
```json
{
  "postIntent": "community-spotlight",
  "context": "Spotlight: Joe's Coffee on Main Street\nDetails: Family-owned since 1985, best beignets in Gretna\nCTA: Go check them out this weekend!",
  "tone": "friendly",
  "platform": "instagram"
}
```

**Expected Output Characteristics:**
- Spotlight hook
- Why they matter
- Community value
- Supportive CTA
- No agent personal stories

**Violation Scenario:**
Output contains: "My kids love going there on weekends"
Expected: FAIL - `PROFESSIONAL_NO_PERSONAL_NARRATIVE`

---

## Validation Rules Summary

| Domain | MUST | MUST NOT |
|--------|------|----------|
| Property | Third-person, factual, property details | First-person, emotional storytelling, identity framing |
| Personal | First-person, reflective, authentic | Property language, prices, promotional CTAs |
| Professional | Educational, authoritative, expert tone | Personal narratives, emotional vulnerability |

---

## Automated Check Patterns

### Property Domain
- `PROPERTY_NO_FIRST_PERSON`: `/\bi\s+(am|was|have|feel|think|believe|love)\b/i`
- `PROPERTY_NO_EMOTIONAL_STORYTELLING`: Contains phrases like "imagine", "dream home", "forever home"
- `PROPERTY_NO_IDENTITY_FRAMING`: Contains phrases like "could be yours", "waiting for you"

### Personal Domain
- `PERSONAL_REQUIRES_FIRST_PERSON`: Must match `/\b(i\s+|i'[a-z]+|my\s+|me\s+)\b/i`
- `PERSONAL_NO_PROPERTY_LANGUAGE`: No beds/baths/sqft/price patterns
- `PERSONAL_NO_PROMOTIONAL_LANGUAGE`: No "DM for details", "schedule a showing"

### Professional Domain
- `PROFESSIONAL_NO_PERSONAL_NARRATIVE`: No "my journey", "my family", "growing up"
- `PROFESSIONAL_NO_EMOTIONAL_VULNERABILITY`: No "I was scared", "I cried", "devastated"

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| Phase 2 | Initial matrix creation | AI System |
