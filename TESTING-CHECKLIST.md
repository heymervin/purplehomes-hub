# 🧪 Testing Checklist - Avatar Research System Rebuild

**Date**: 2026-01-19
**Features Modified**: Avatar Research Learning System (10 fixes)
**Status**: ⏳ Needs Manual Testing

---

## ✅ Automated Checks (PASSED)

- [x] TypeScript compilation successful
- [x] No type errors
- [x] All imports resolve correctly
- [x] File structure intact

---

## 🔍 Manual Testing Required

### Test Suite 1: Basic Funnel Generation (Critical Path)

#### Test 1.1: Generate Funnel with Avatar Research
**What to Test**: Full funnel generation flow

**Steps**:
1. Open any property → Funnel tab
2. Select buyer segment: "First-Time Buyer"
3. Click "Generate Content"
4. Wait for generation to complete

**Expected Results**:
- [ ] Generation completes successfully (no errors)
- [ ] Funnel content appears (Hook, Problem, Solution, etc.)
- [ ] Console shows: `[Avatar Research] Generating full research for: first-time-buyer`
- [ ] Console shows: `[Avatar Research] Full research saved with ID: [uuid]`
- [ ] Console shows: `[Funnel API] Avatar research saved with ID: [uuid]`

**Files to Check After**:
- [ ] `/public/research/avatars/first-time-buyer.json` has new entry
- [ ] Entry has `research` object (NOT null)
- [ ] Entry has `id`, `createdAt`, `propertyContext`, `research` fields
- [ ] `research.dreams` is an array with items
- [ ] `research.fears` is an array with items
- [ ] `research.objections` is an array with items

**If Failed**:
- Check browser console for errors
- Check `/api/funnel/avatar-research.ts` logs
- Verify OpenAI API key is set

---

#### Test 1.2: Verify Generated Content Quality
**What to Test**: AI prompt enhancements are working

**Steps**:
1. Review generated funnel content
2. Look for quality indicators

**Expected Results**:
- [ ] Hook uses power words (urgency, trust, curiosity words)
- [ ] Copy is punchy/short sentences (staccato style)
- [ ] No weak phrases ("I think", "very", "really", "basically")
- [ ] Specific numbers used (not vague like "affordable")
- [ ] Market sophistication appropriate for segment

**Example Good Hook**:
```
"First-Time Buyers: $0 Bank Approval Required.
Build equity in Austin for $1,450/mo.
Keys in 30 days. No credit rejection."
```

**Example Bad Hook** (should NOT see this):
```
"This is a really great opportunity for first-time buyers.
We think you'll love this affordable home."
```

---

### Test Suite 2: Rating System (Learning Loop)

#### Test 2.1: Rate Avatar Research
**What to Test**: Rating UI and API

**Steps**:
1. After generating funnel, scroll to bottom
2. Find "Rate Avatar Research Effectiveness" section
3. Click on 8 stars (⭐⭐⭐⭐⭐⭐⭐⭐)
4. Wait for success message

**Expected Results**:
- [ ] Success toast appears: "Rated 8/10 - AI will learn from this!"
- [ ] Green checkmark appears
- [ ] No errors in console

**Files to Check After**:
- [ ] Open `/public/research/avatars/first-time-buyer.json`
- [ ] Find the entry with matching ID
- [ ] Entry has `effectiveness: 8`
- [ ] `insights` object is updated
- [ ] `insights.totalRated` increased by 1
- [ ] `insights.avgEffectiveness` is calculated

---

#### Test 2.2: Error Handling for Rating
**What to Test**: Graceful error handling

**Steps**:
1. Turn off internet connection
2. Try to rate (any stars)
3. Observe error message

**Expected Results**:
- [ ] Toast shows: "Network error. Check your connection and try again."
- [ ] No generic "Failed to submit rating" message
- [ ] Stars remain unselected (rating didn't go through)

**Steps for 404 Test**:
1. Manually edit funnel content's `avatarResearchId` to invalid UUID
2. Try to rate
3. Observe error message

**Expected Results**:
- [ ] Toast shows: "Research entry not found. It may have been deleted."

---

### Test Suite 3: Learning Injection (The Key Fix!)

#### Test 3.1: First Generation (No Learning Yet)
**What to Test**: System works with 0 rated entries

**Steps**:
1. Delete all entries from `/public/research/avatars/first-time-buyer.json` (set `entries: []`)
2. Generate funnel for first-time buyer
3. Check console logs

**Expected Results**:
- [ ] Generation succeeds
- [ ] Console does NOT show "Injecting X learned insights"
- [ ] Funnel still generates properly (uses base techniques)

---

#### Test 3.2: Generate After Rating 3+ Entries
**What to Test**: Learning actually kicks in!

**Steps**:
1. Generate 3 funnels for "First-Time Buyer" segment
2. Rate all 3 with 7+ stars (e.g., 8, 9, 7)
3. Wait for ratings to save
4. Generate 4th funnel for same segment
5. **Watch console carefully**

**Expected Results**:
- [ ] Console shows: `[Avatar Research] Injecting X learned insights for first-time-buyer`
- [ ] X should be the number of rated entries (3 in this case)
- [ ] Generation completes successfully
- [ ] Generated content quality should be noticeably better (uses learned patterns)

**Deep Verification**:
- [ ] Open browser DevTools → Network tab
- [ ] Filter for `funnel` API calls
- [ ] Check Request Payload for the AI prompt
- [ ] Prompt should include section: "🧠 LEARNED INSIGHTS (From High-Performing Past Funnels)"
- [ ] This section should list top dreams, fears, hooks from past entries

---

#### Test 3.3: Insights Calculation with Null Safety
**What to Test**: System handles null research entries gracefully

**Steps**:
1. Manually edit `/public/research/avatars/first-time-buyer.json`
2. Add an entry with `research: null`
3. Add an entry with `research: { dreams: [], fears: [] }` (empty arrays)
4. Generate a new funnel
5. Check console

**Expected Results**:
- [ ] Console shows warning: `[Avatar Research] Entry [id] has null research, skipping insights calculation`
- [ ] No crashes or errors
- [ ] Insights still calculate from valid entries

---

### Test Suite 4: Multiple Buyer Segments

#### Test 4.1: Different Segments Get Different Insights
**What to Test**: Segments are isolated

**Steps**:
1. Generate funnel for "First-Time Buyer" → Rate 9/10
2. Generate funnel for "Investor" → Rate 8/10
3. Check JSON files

**Expected Results**:
- [ ] `/public/research/avatars/first-time-buyer.json` has 1 entry
- [ ] `/public/research/avatars/investor.json` has 1 entry
- [ ] They are completely separate
- [ ] Insights for each segment are different

---

#### Test 4.2: Market Sophistication Detection
**What to Test**: AI adjusts copy complexity by segment

**Steps**:
1. Generate funnel for "First-Time Buyer"
2. Generate funnel for "Investor"
3. Compare the language/complexity

**Expected Results**:
- [ ] First-Time Buyer: Simpler, benefit-focused ("Own for less than rent")
- [ ] Investor: More sophisticated, ROI-focused ("12% cash-on-cash return")
- [ ] Investor copy mentions mechanisms ("Our Triple-Match System")

---

### Test Suite 5: UI/UX Verification

#### Test 5.1: Funnel Tab UI Intact
**What to Test**: All UI elements still work

**Steps**:
1. Open property → Funnel tab
2. Verify all sections present

**Expected Results**:
- [ ] Generate Content button exists and works
- [ ] Buyer Segment selector shows 6 options
- [ ] Optional sections present (Location, Qualifier, Pricing, Virtual Tour, FAQ)
- [ ] Rating section appears after generation
- [ ] 10 stars are clickable
- [ ] Save Changes button works

---

#### Test 5.2: Rating UI Display
**What to Test**: Rating section renders correctly

**Steps**:
1. Generate funnel
2. Scroll to "Rate Avatar Research Effectiveness"
3. Inspect the UI

**Expected Results**:
- [ ] Card has amber/orange background
- [ ] Title: "Rate Avatar Research Effectiveness"
- [ ] Description explains 1-10 scale
- [ ] 10 star icons visible
- [ ] Stars are clickable
- [ ] Hover effect works
- [ ] After rating, green checkmark appears
- [ ] Success message shows for 3 seconds

---

### Test Suite 6: Optional Funnel Sections

#### Test 6.1: Optional Sections Generate
**What to Test**: Optional sections still work after our changes

**Steps**:
1. Fill in optional inputs:
   - Nearby Places: "Starbucks, HEB, Zilker Park"
   - Virtual Tour URL: "https://youtube.com/watch?v=test"
   - Payment Notes: "No bank needed!"
2. Generate funnel

**Expected Results**:
- [ ] Location & Nearby section appears (blue card)
- [ ] Virtual Tour section appears (red card)
- [ ] Pricing Options section appears (green card)
- [ ] FAQ section appears (amber card)
- [ ] All sections have content

---

### Test Suite 7: Error Scenarios

#### Test 7.1: OpenAI API Failure
**What to Test**: Graceful degradation

**Steps**:
1. Temporarily set invalid OpenAI API key
2. Try to generate funnel

**Expected Results**:
- [ ] Error message appears (not silent failure)
- [ ] User is informed API failed
- [ ] No partial/corrupted content saved
- [ ] Can try again after fixing

---

#### Test 7.2: File System Errors
**What to Test**: Handle corrupted JSON files

**Steps**:
1. Manually corrupt `/public/research/avatars/first-time-buyer.json` (add invalid JSON)
2. Try to generate funnel

**Expected Results**:
- [ ] Console shows warning about corrupted file
- [ ] Generation still succeeds (creates new file)
- [ ] Or shows clear error to user

---

### Test Suite 8: Data Persistence

#### Test 8.1: Refresh Browser
**What to Test**: Data survives page reload

**Steps**:
1. Generate funnel and rate it
2. Refresh browser (F5)
3. Check if rating persisted

**Expected Results**:
- [ ] Rating still shows as completed
- [ ] JSON file still has the entry
- [ ] Can't rate again (already rated)

---

#### Test 8.2: Multiple Properties
**What to Test**: Avatar research links correctly to properties

**Steps**:
1. Generate funnel for Property A (first-time buyer)
2. Generate funnel for Property B (first-time buyer)
3. Check JSON file

**Expected Results**:
- [ ] 2 separate entries in `first-time-buyer.json`
- [ ] Each has different `propertyContext` (different cities/prices)
- [ ] Each has unique ID
- [ ] Can rate each independently

---

## 🔧 Files to Verify After Tests

### Critical Files Modified Today:

| File | What to Check |
|------|---------------|
| `api/funnel/index.ts` | Lines 498-534 (avatar research generation) |
| `api/funnel/index.ts` | Lines 406-413 (insights injection) |
| `api/funnel/index.ts` | Lines 174-218 (helper functions) |
| `api/funnel/avatar-research.ts` | Lines 666-726 (export functions) |
| `api/funnel/avatar-research.ts` | Lines 170-206 (null safety) |
| `src/components/properties/FunnelContentEditor.tsx` | Lines 197-226 (error handling) |

### Data Files to Check:

| File | Expected State |
|------|----------------|
| `/public/research/avatars/first-time-buyer.json` | Has entries with full research data |
| `/public/research/avatars/credit-challenged.json` | Empty or has entries |
| `/public/research/avatars/investor.json` | Empty or has entries |

---

## 🚨 Known Issues to Watch For

### Issue 1: Avatar Research ID Not Linking
**Symptom**: Rating section doesn't appear
**Cause**: `avatarResearchId` not saved to funnel content
**Fix**: Check lines 571-584 in `api/funnel/index.ts`

### Issue 2: Null Research Entries
**Symptom**: Insights calculation fails/crashes
**Cause**: Old stub entries with `research: null`
**Fix**: Null safety checks at line 171-174 should handle this

### Issue 3: Learning Not Injecting
**Symptom**: Console doesn't show "Injecting X learned insights"
**Cause**: `getLearnedInsightsForPrompt()` not being called
**Fix**: Check lines 406-413 in `api/funnel/index.ts`

---

## 📋 Quick Test Summary

**Minimum Tests Before Calling It Done**:
1. [ ] Generate 1 funnel → Success
2. [ ] Verify avatar research saved with full data (not null)
3. [ ] Rate it → Success
4. [ ] Generate 2 more → Rate both
5. [ ] Generate 4th → See "Injecting X learned insights" in console
6. [ ] Verify quality improvement in content

**Time Estimate**: 30-45 minutes of focused testing

---

## ✅ Sign-Off Criteria

Mark as COMPLETE when:
- [ ] All Test Suite 1 tests pass (Basic Generation)
- [ ] All Test Suite 2 tests pass (Rating)
- [ ] All Test Suite 3 tests pass (Learning Injection) ← **MOST CRITICAL**
- [ ] No console errors during normal flow
- [ ] Data persists correctly in JSON files
- [ ] UI works smoothly (no broken buttons/inputs)

---

**Next Steps After Testing**:
1. Document any bugs found
2. Fix critical bugs
3. Move to Phase 1 of Dashboard (Settings tab)
4. Test dashboard thoroughly
5. Move to Phase 2 (Funnel tab insights widget)

---

**Status**: ⏳ Ready for manual testing
**Tester**: [Your Name]
**Date Started**: ___________
**Date Completed**: ___________
