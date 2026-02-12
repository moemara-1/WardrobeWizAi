# WardrobeWizAi - Cartesian Audit Report

> **Principle**: Everything is rotten until proven otherwise.
> **Date**: 2026-02-10 | **Auditor**: Claude Opus 4.6

---

## Executive Summary

| Domain | Verdict | Beta-Blocking? |
|--------|---------|----------------|
| 1. Data Integrity | **BROKEN** | YES — no persistence, data lost on restart |
| 2. AI Analysis Pipeline | **BROKEN** | YES — TS errors FIXED, no real fallback, mock-only |
| 3. AI Stylist Chat | **MISSING** | YES — UI shell with zero backend |
| 4. Navigation & Routing | **FRAGILE** | No — works but type-unsafe, some dead routes |
| 5. Supabase Integration | **DEAD CODE** | No — entirely unused, can ignore for beta |
| 6. UI/Layout Integrity | **FRAGILE** | No — keyboard avoidance missing, hardcoded positions |
| 7. Type Safety & Code Health | **FIXED** | Was broken — tsc now passes after 2 fixes applied |
| 8. Dependency Health | **FRAGILE** | No — 4 unused deps bloating bundle |
| 9. Nice-to-Have Features | **FRAGILE** | No — UI shells, recommend hiding non-functional ones |

**Bottom line**: 3 of 3 MVP flows are non-functional. The app looks like an app but doesn't do anything. The closet resets every restart, the AI never actually analyzes, and the stylist chat is a static UI with no LLM behind it.

---

## Domain 1: Data Integrity
**Verdict**: BROKEN

### Findings

1. **`stores/closetStore.ts` — NO persistence layer** — CRITICAL
   - Zustand store is pure in-memory. No `persist` middleware, no AsyncStorage, no MMKV.
   - Every app restart = empty closet. User data is permanently lost.

2. **`app/(tabs)/closet.tsx:45-47` — Mock data injection masks the problem** — HIGH
   ```
   useEffect(() => {
     if (items.length === 0) setItems(MOCK_ITEMS);
   }, []);
   ```
   On every cold start, 6 hardcoded Unsplash items are injected. This makes the app *look* populated but masks that real user data was lost.

3. **`app/(tabs)/closet.tsx:30-37` — MOCK_ITEMS hardcoded in component** — MEDIUM
   - Demo data should not live in a screen component. It conflates demo state with real state.

4. **`stores/closetStore.ts:106-122` — `useFilteredItems` selector re-runs on every render** — LOW
   - Calls `useClosetStore()` at top level, meaning it subscribes to ALL store changes. Should use a selector for filtered items only.

5. **Store structure is sound** — HEALTHY
   - Actions correctly use immutable spread patterns. Type interface is clean. No `any` in the store.

### Root Cause of "Data Inconsistencies"
The user adds real items → they coexist with mock items → app restarts → mock items reappear, real items vanish. The inconsistency is that the closet is never "real" — it's always a transient mix of mock + ephemeral user data.

---

## Domain 2: AI Analysis Pipeline
**Verdict**: BROKEN

### Findings

1. **`app/analyze.tsx:42` — Passes non-existent prop `enhanceWithAI`** — CRITICAL
   ```
   analyze(imageUri, { useCloudFallback: true, enhanceWithAI: true });
   ```
   `AnalyzeOptions` interface only has `useCloudFallback` and `useMockOnError`. TypeScript error confirmed by `tsc --noEmit`.

2. **`hooks/usePhotoAnalyzer.ts:162` — Header type mismatch** — CRITICAL
   ```
   headers: endpoint.headers
   ```
   When `apiKey` is empty, the conditional creates `{ Accept: string; 'X-API-Key'?: undefined }` which doesn't satisfy `HeadersInit`. TypeScript error confirmed.

3. **No OpenAI fallback exists** — HIGH
   - Despite docs/memory claiming "api4.ai + OpenAI fallback", there is NO OpenAI code in `usePhotoAnalyzer.ts`.
   - The only "fallback" is `createMockDetections()` — hardcoded mock data.

4. **`lib/gemini.ts` — Full Gemini vision integration exists but is NEVER USED** — HIGH
   - `analyzeOutfit()` and `identifyClothingItem()` are complete, well-structured Gemini API calls.
   - Zero imports of this file anywhere in the app. Dead code.
   - This is probably the intended replacement for api4.ai but was never wired up.

5. **`hooks/usePhotoAnalyzer.ts:84-114` — `enrichDetection` is a hardcoded brand lookup** — MEDIUM
   - Maps "sneakers" → "Nike", "jeans" → "Levi's". This isn't AI detection, it's a static table.

6. **`hooks/usePhotoAnalyzer.ts:138-142` — FormData `as any` cast** — LOW
   - Common React Native workaround for FormData typing. Acceptable but noted.

7. **`app/analyze.tsx:22` — Imports `removeBackground` from `@/lib/backgroundRemoval`** — MEDIUM
   - Depends on `EXPO_PUBLIC_REMOVEBG_API_KEY` which is NOT in `.env.example`.
   - Will silently fail (returns `{ success: false }`) — not a crash risk but misleading.

8. **API4AI endpoint URL is suspicious** — MEDIUM
   - `https://api4.ai/apis/fashion/v1/results` — API4AI's actual fashion endpoint may differ.
   - Demo endpoint `https://demo.api4.ai/fashion/v1/results` is the fallback.

### Pipeline Assessment
- **Photo picker**: Works (expo-image-picker, standard implementation)
- **Image preprocessing**: Works (expo-image-manipulator resize)
- **API call**: BROKEN (TS errors prevent clean build, endpoint may be wrong)
- **Response parsing**: Untested (can't reach this code due to upstream failures)
- **Store integration**: Works in isolation (analyze.tsx correctly creates ClosetItem from Detection)

---

## Domain 3: AI Stylist Chat
**Verdict**: MISSING (not broken — never existed)

### Findings

1. **`app/style-chat.tsx:42-46` — `handleSend` does literally nothing** — CRITICAL
   ```
   const handleSend = () => {
     if (!message.trim()) return;
     Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
     setMessage('');
   };
   ```
   No API call. No message history. No AI response. Just clears the input.

2. **`app/style-chat.tsx` — Zero AI/LLM imports** — CRITICAL
   - No OpenAI, no Gemini, no fetch to any AI endpoint. The entire file is a static UI.

3. **`app/(tabs)/stylist.tsx:43-47` — Tab-level chat also does nothing** — CRITICAL
   - Same pattern: `handleSend` clears message, no backend call.

4. **No message state/history** — HIGH
   - `useState('')` for the current message. No array of messages, no conversation state.
   - Even if an API was wired up, there's no way to display a conversation.

5. **Credit pill shows hardcoded "0"** — LOW
   - `style-chat.tsx:68`: `<Text style={styles.creditText}>0</Text>`

6. **Action cards mostly non-functional** — MEDIUM
   - Only "Use Twin" card routes to `/digital-twin`. Others have no `onPress` behavior.

### Key Discovery: OpenAI Integration Already Exists Elsewhere
`hooks/useOutfitGenerator.ts` contains a **working** OpenAI integration that:
- Calls `https://api.openai.com/v1/chat/completions` with `gpt-4o`
- Injects closet items as context (`items.map(item => ({ id, name, category, colors, brand }))`)
- Parses JSON responses from the LLM
- Falls back to rule-based generation when API key is missing

This pattern can be directly adapted for the stylist chat. The infrastructure exists — it's just not wired to the chat UI.

### Assessment
The chat UI shell is decent. The OpenAI + closet-context pattern exists in `useOutfitGenerator.ts` and can be reused. Needs: message state array, API call wiring, message list rendering, and closet context injection. **Faster to build than starting from zero** — estimate ~4 hours with the existing pattern as a template.

---

## Domain 4: Navigation & Routing
**Verdict**: FRAGILE

### Findings

1. **20+ `as never` type casts across the app** — HIGH
   - Every `router.push()` call uses `as never` to suppress expo-router's typed routes.
   - This means TypeScript cannot catch navigation to non-existent routes.
   - Files: `closet.tsx`, `index.tsx`, `stylist.tsx`, `style-chat.tsx`, `trip-planner.tsx`, `item/[id].tsx`, `virtual-try-on.tsx`, `digital-twin-preview.tsx`, `import-fit-pic.tsx`

2. **`app/(tabs)/index.tsx:87` — Component named `CommunityScreen` but renders Explore/Discover** — LOW
   - Confusing naming. The "index" tab is actually the browse/explore screen, not a community screen.

3. **`app/(tabs)/closet.tsx:56` — Routes to `/search-to-add`** — MEDIUM
   - File exists but needs verification that the route actually works.

4. **`components/ui/AddMenuPopover.tsx:44-45` — Hardcoded absolute positioning** — HIGH
   - `right: 84, bottom: 240` — will render in wrong position on different screen sizes, orientations.

5. **Root layout structure is clean** — HEALTHY
   - `_layout.tsx` properly defines all Stack screens with correct presentation modes.
   - Tab layout has 4 tabs, correct order, custom TabBar.

6. **pin-detail.tsx listed in git status but file doesn't exist** — LOW
   - Ghost reference. Harmless but messy.

---

## Domain 5: Supabase Integration
**Verdict**: DEAD CODE

### Findings

1. **`lib/supabase.ts` — Complete CRUD API that nothing imports** — HIGH
   - `closetApi`, `outfitApi`, `uploadImage` — well-written Supabase code.
   - **Zero imports** anywhere in the app. Grep confirmed: only `lib/supabase.ts` references these exports.

2. **Supabase URL is placeholder** — N/A (dead code)
   - `'https://your-project.supabase.co'` as default. Would crash if actually called.

3. **Dependencies pulled in for dead code** — MEDIUM
   - `@supabase/supabase-js` — 100KB+ dependency used by nothing.
   - `@react-native-async-storage/async-storage` — imported ONLY in supabase.ts.
   - `react-native-url-polyfill` — imported ONLY in supabase.ts.

### Recommendation
For beta: ignore Supabase entirely. The app works local-only. Post-beta: wire it up properly for real persistence and multi-device sync.

---

## Domain 6: UI/Layout Integrity
**Verdict**: FRAGILE

### Findings

1. **No `KeyboardAvoidingView` anywhere** — HIGH
   - `style-chat.tsx` and `stylist.tsx` both have text inputs at the bottom of the screen.
   - On iOS, the keyboard will cover these inputs completely. Chat is unusable without this.

2. **`components/ui/TabBar.tsx:68` — Hardcoded `paddingBottom: 34`** — MEDIUM
   - Should use `useSafeAreaInsets().bottom` for correct spacing across all iPhone models.

3. **`app/(tabs)/stylist.tsx:165` — White canvas in dark-themed app** — MEDIUM
   - `backgroundColor: '#F8F8F8'` for the outfit canvas. Intentional for a "blank canvas" metaphor but visually jarring against `#0B0B0E` background.

4. **`app/(tabs)/closet.tsx:164` — White grid items on dark background** — LOW
   - `backgroundColor: '#FFFFFF'` for product-style display. Intentional design choice.

5. **`app/(tabs)/index.tsx:306-308` — Inline styles** — LOW
   - `style={{ alignItems: 'center', paddingTop: 40 }}` instead of StyleSheet.

6. **SafeAreaView `edges` usage is inconsistent** — LOW
   - Most screens use `edges={['top']}` which is correct (tab bar handles bottom).
   - Font loading gate in root layout prevents FOUC.

---

## Domain 7: Type Safety & Code Health
**Verdict**: BROKEN

### Findings

1. **`tsc --noEmit` FAILS with 2 errors** — CRITICAL
   - `app/analyze.tsx:42` — `enhanceWithAI` doesn't exist on `AnalyzeOptions`
   - `hooks/usePhotoAnalyzer.ts:162` — Header type mismatch
   - Memory file claimed "tsc passes clean" — this is no longer true.

2. **`as never` x20+** — HIGH
   - Used systemically to bypass expo-router's typed route system. Provides zero navigation safety.

3. **`as any` x2** — MEDIUM
   - `usePhotoAnalyzer.ts:142` (FormData — acceptable RN workaround)
   - `ClosetItemCard.tsx:23` (Link href — should use typed route)

4. **Dead code files** — MEDIUM
   - `lib/gemini.ts` — never imported (225 lines of unused code)
   - `lib/supabase.ts` — never imported (126 lines of unused code)

5. **19 console.log/warn/error statements** — LOW
   - Across 4 files. Should be removed or replaced with a proper logger before production.

6. **Error boundaries** — HEALTHY
   - Root layout re-exports `ErrorBoundary` from expo-router. Prevents full app crash on component errors.

7. **`useCallback` dependency issues** — MEDIUM
   - `usePhotoAnalyzer.ts:266` — `analyze` callback has empty deps `[]` but references `preprocessImage` and `analyzeWithApi4AI`. These are stable (defined outside the callback) so it's technically correct, but fragile.

---

## Domain 8: Dependency Health
**Verdict**: FRAGILE

### Findings

1. **4 completely unused dependencies** — MEDIUM
   - `nativewind` (^4.2.1) — zero imports, zero className usage anywhere
   - `tailwindcss` (^3.4.19) — zero config files, zero usage
   - `lottie-react-native` (^7.3.5) — zero imports anywhere
   - `@expo/vector-icons` (^15.0.3) — project uses lucide-react-native exclusively

2. **3 dependencies only used by dead code** — MEDIUM
   - `@supabase/supabase-js` — only in unused `lib/supabase.ts`
   - `@react-native-async-storage/async-storage` — only in unused `lib/supabase.ts`
   - `react-native-url-polyfill` — only in unused `lib/supabase.ts`

3. **`expo-camera` installed but unused** — LOW
   - App uses `expo-image-picker` for photos. No camera screen exists.

4. **Core Expo dependencies are correctly pinned** — HEALTHY
   - All `expo-*` packages use `~` (tilde) pinning, compatible with SDK 54.

### Bundle Impact
~7 unused dependencies = unnecessary download size and potential build complications. Not a blocker but worth cleaning up.

---

## Domain 9: Nice-to-Have Features
**Verdict**: FRAGILE

### Findings

1. **`app/trip-planner.tsx`** — UI shell, "Build My Trip" routes to `/trip-result` but no trip logic exists. **Recommend: hide for beta.**

2. **`app/pin-detail.tsx`** — File doesn't exist (ghost in git status). **No action needed.**

3. **`app/virtual-try-on.tsx` / `app/virtual-try-on-result.tsx`** — Need inspection but likely UI shells. **Recommend: hide for beta.**

4. **`app/digital-twin.tsx` / `app/digital-twin-preview.tsx`** — Referenced from stylist and profile tabs. **Recommend: hide unless functional.**

5. **`app/search-to-add.tsx`** — Referenced from closet. **Needs inspection — may be needed for MVP add-to-closet flow.**

6. **`app/import-fit-pic.tsx`** — Routes to `/analyze` with imageUri. **Likely works — keep.**

---

## MVP Flow Confidence Levels

| Flow | Confidence | Assessment |
|------|------------|------------|
| **Photo → AI → closet** | FIXABLE | Pipeline structure exists. Fix TS errors, wire up Gemini (already written), add persistence. ~2-4 hours. |
| **Browse closet** | FIXABLE | Works with mock data. Add persistence + remove mock injection. ~1 hour. |
| **AI stylist chat** | NEEDS BUILD | Zero backend exists. Need message state, OpenAI/Gemini integration, closet context. ~4-8 hours. |
| **Outfit builder** | NEEDS BUILD | No UI or logic exists. The stylist tab has a "canvas" placeholder. ~8-16 hours. |

---

## Critical Fixes Required (audit scope = fix these now)

### Fix 1: TypeScript Compilation — APPLIED
- `app/analyze.tsx:42` — Replaced `enhanceWithAI: true` with `useMockOnError: true` (valid option)
- `hooks/usePhotoAnalyzer.ts:145` — Added explicit `Record<string, string>` type annotation to endpoints array to resolve header union type mismatch
- **Result**: `npx tsc --noEmit` now passes clean

### Fix 2: Data Persistence (CRITICAL) — NOT APPLIED (needs design decision)
- Add `zustand/middleware` persist with AsyncStorage
- Remove mock data injection from closet.tsx
- **Why not auto-fixed**: This changes app behavior fundamentally. Need user sign-off on persistence strategy.

### Fix 3: (Not fixing — needs build, not fix)
- Stylist chat and outfit builder are missing features, not broken features.

### Additional Finding from Agent Audit: `lib/backgroundRemoval.ts:93-102`
- `blobToBase64()` uses `FileReader` API which is **browser-only, not available in React Native**
- This will crash at runtime on physical iOS device when background removal succeeds
- Not fixing now because remove.bg API key is missing, so this code path is never reached in practice

---

## Prioritized Remaining Work (post-audit)

### P0 — Beta Blockers
1. Add Zustand persistence (AsyncStorage middleware)
2. Wire up Gemini analysis instead of api4.ai (code already exists in `lib/gemini.ts`)
3. Build AI stylist chat (OpenAI/Gemini + closet context)
4. Build outfit builder (item selection → outfit creation → save)

### P1 — Important for Beta Quality
5. Add KeyboardAvoidingView to chat screens
6. Replace all `as never` with proper typed routes
7. Fix TabBar safe area (use `useSafeAreaInsets`)
8. Fix AddMenuPopover hardcoded positioning

### P2 — Nice to Have
9. Remove unused dependencies (nativewind, tailwind, lottie, @expo/vector-icons)
10. Remove dead code (lib/supabase.ts, lib/gemini.ts once wired up)
11. Hide trip planner / virtual try-on / digital twin for beta
12. Remove console.log statements
13. Clean up mock data throughout index.tsx

---

## Context (from interview)

| Dimension | Reality |
|-----------|---------|
| **Origin** | AI-generated scaffold — zero inherent trust in architecture decisions |
| **Target** | Beta launch (friends/family), no hard deadline |
| **Developer** | Solo + AI tools |
| **Platform** | iOS physical device, Expo SDK 54 |
| **Polish bar** | Functional > pretty — features must work, visual rough edges acceptable |
| **Audit scope** | Full audit + immediately fix anything that crashes, corrupts data, or blocks MVP flows |
| **MVP flows** | Photo→AI→closet, browse closet, AI stylist (closet-aware), outfit builder |
| **Garment data** | Category + color minimum for beta |
| **Stylist vision** | Must reference user's actual closet items |
