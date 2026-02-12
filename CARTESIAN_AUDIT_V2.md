# WardrobeWizAi - Cartesian Audit Spec v2

## Premise
Everything is rotten until proven otherwise. Every feature, every file, every integration is assumed broken/fake/incomplete. The audit must provide evidence to move anything from "rotten" to "verified."

---

## Product Vision (from interview)

### End Goal
**App Store launch** — real users, real downloads, real-world usage patterns. Not a demo.

### Core Loop (must be bulletproof)
**Photo → AI analysis → saved item in closet.** This is the one flow a new user must complete in their first session or they uninstall.

### Feature Set (all shipping)
| Feature | Priority | Status Assumption |
|---------|----------|-------------------|
| Closet (pieces/fits/collections) | P0 | Rotten until verified |
| AI photo analysis pipeline | P0 | Claims "works reliably" — verify |
| Digital twin (FLUX.1-Kontext-dev) | P0 - core differentiator | Recently added — verify |
| Hybrid stylist (chat + outfit canvas) | P0 | Unknown state — discover |
| Supabase auth + cloud sync | P0 | Does NOT exist — gap |
| Trip planner (multi-city, packing + daily outfits) | P1 | Rotten until verified |
| Community tab | P1 | Rotten until verified |
| Discover/browse (affiliate/shopping APIs) | P1 | Currently hardcoded mock — gap |
| Profile (full fashion + social) | P2 (simplify if needed) | Rotten until verified |
| App Store compliance | P0 | Does NOT exist — gap |
| Monetization | Deferred | Flag integration points only |

### Timeline
2-4 weeks aggressive target. Willing to extend timeline. Willing to simplify profile. NOT willing to cut features.

---

## Audit Dimensions

### 1. Core Flow Integrity
Verify the critical path end-to-end:
- Camera/library picker → image selection → remove.bg → DeepInfra vision → DeepInfra text research → review screen → save to closet → item appears in closet tab → persists after app kill

**Evidence required**: Trace every function call in the chain. Identify any mock data, hardcoded responses, or dead code paths. Flag any step that silently fails or swallows errors.

### 2. AI Pipeline Deep Dive
- **remove.bg**: API key valid? Error handling? What happens with bad images (screenshots, non-clothing)?
- **DeepInfra Vision (Llama-3.2-11B-Vision)**: Prompt quality? Response parsing? What if it returns garbage?
- **DeepInfra Text (Llama-3.1-70B-Text)**: What does "research" mean exactly? Is this enriching metadata?
- **Gemini fallback**: Is the fallback actually wired? Under what conditions does it trigger?
- **Latency**: Total wall-clock time for the pipeline. Target: under 10 seconds with engaging progress UX.
- **Manual entry**: Must exist as a parallel path (not just fallback). Does it?

### 3. Digital Twin
- FLUX.1-Kontext-dev integration: Does it actually generate images?
- How is the user's base photo captured/stored?
- Virtual try-on: Can it render an outfit on the twin? What's the quality/latency?
- Error states: What happens when generation fails?

### 4. Hybrid Stylist
Discover current state:
- **Chat**: Does AI respond? What model? Is context maintained? Can it reference closet items?
- **Canvas**: Outfit builder with slots (headwear, top, bottom, shoes, accessories). Can user swipe between closet items per slot?
- **Integration**: When user is happy with canvas selection + optional chat context → AI generates virtual try-on on digital twin. Does this pipeline exist?

### 5. Data Layer
- **Zustand store**: Schema completeness for items, outfits, digital twin, user profile
- **AsyncStorage persistence**: Verified by user, but audit the middleware config
- **Data model**: Can the current schema support all planned features (outfits linked to items, trip plans linked to outfits, community posts)?
- **Migration path**: When Supabase is added, can local data sync cleanly?

### 6. Gaps (confirmed not built)
| Gap | Impact | Effort Estimate Needed |
|-----|--------|----------------------|
| Supabase auth (starting fresh) | Blocking for launch | Yes |
| Supabase database schema + sync | Blocking for launch | Yes |
| Privacy policy + data deletion | Blocking for App Store | Yes |
| Camera permission rationale strings | Blocking for App Store | Yes |
| Offline graceful degradation | Apple may reject without | Yes |
| Discover tab real content (shopping APIs) | Currently fake data | Yes |
| Monetization integration points | Deferred but flag locations | No |

### 7. Architecture & Code Quality
- **Type safety**: Any `as any`, `@ts-ignore`, `@ts-expect-error`?
- **Dead code**: Files/functions/imports that aren't reachable
- **Error handling**: Empty catch blocks, unhandled promise rejections, swallowed errors
- **Navigation**: All routes reachable? Deep linking? Back navigation correct?
- **Performance**: FlatList vs ScrollView for lists, image caching strategy, re-render analysis
- **Scale**: Under 50 items target, but verify no O(n²) patterns in filtering/sorting

### 8. UI/UX Audit
- **Empty states**: What does a new user with zero items see on each tab?
- **Loading states**: Are they engaging or dead spinners?
- **Error states**: Network failures, API errors — does the user see anything helpful?
- **Fonts**: Fraunces + DM Sans consistently applied?
- **Icons**: lucide-react-native everywhere (no @expo/vector-icons leaking in)?
- **Dark theme**: #0B0B0E background consistent, no white flashes, proper contrast ratios?

### 9. Testing
- Discover what test infrastructure exists (if any)
- Flag critical paths that have zero test coverage
- Recommend minimum viable test strategy for launch confidence

### 10. App Store Readiness Checklist
- [ ] Info.plist permission descriptions (camera, photo library, location for trips)
- [ ] Privacy policy URL
- [ ] Data deletion capability
- [ ] App icon + splash screen
- [ ] Screenshots for App Store listing
- [ ] Offline behavior (graceful degradation, not crashes)
- [ ] No placeholder/lorem ipsum content visible to users
- [ ] No API keys hardcoded in source (env vars only)

---

## Error Handling Philosophy
**Manual entry must always be available as a parallel path alongside AI.** If AI fails, the user should already see manual entry — not be blocked, then offered it as a consolation.

## Outfit Creation Flow (detailed)
1. User opens stylist canvas
2. Canvas has slots: headwear, top, bottom, shoes, accessories
3. For each slot, user swipes through their closet items
4. User can type context/preferences in chat bar (optional)
5. When satisfied → AI takes selected items + chat context → generates virtual try-on render on digital twin
6. User can save the outfit

## Trip Planner Flow (detailed)
1. User enters destination(s) — multi-city support with add/remove
2. Enter dates per city
3. AI suggests packing list from closet based on weather/activities
4. User can assign outfits to specific days
5. Result: complete trip wardrobe plan

---

## Audit Output Format
For each dimension, deliver:
1. **Status**: VERIFIED / PARTIALLY WORKING / BROKEN / MISSING
2. **Evidence**: Specific file:line references, error traces, screenshots
3. **Severity**: P0 (blocks launch) / P1 (degrades experience) / P2 (nice to fix)
4. **Remediation**: Specific fix with effort estimate (hours/days)

---

## Success Criteria
The audit is complete when every feature in the Feature Set table has moved from "rotten" to one of: VERIFIED, PARTIALLY WORKING, BROKEN, or MISSING — with evidence for each classification.
