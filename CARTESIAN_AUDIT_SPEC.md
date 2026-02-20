# WardrobeWizAi — Cartesian Audit Spec
> Assume everything is rotten until proven otherwise.
> Target: Production-ready for real users.
> Date: 2026-02-20

---

## Audit Philosophy

Everything in this codebase is **guilty until proven innocent**. Each area below must be
verified against actual running code — not memory, not assumptions, not what the last
audit report said. The output of this audit is:

1. **Working code changes** — actual fixes committed
2. **Prioritized issue list** — severity + effort ranked
3. **Architecture verdicts** — clear decisions, no "we'll figure it out later"
4. **Feature specs** — what Community and Trip Planner actually need to be

---

## Priority Zero: The Core Flow

**Add item to closet** is the single flow that must be airtight. Everything else is
secondary. A real user who installs this app and can't add a piece of clothing is
a lost user. Audit this first and fix it completely before touching anything else.

### What "airtight" means:
- Photo taken or selected from library
- Background removed (remove.bg)
- AI vision analysis runs (DeepInfra primary, Gemini fallback)
- User reviews extracted metadata (name, category, color, brand, tags)
- Item saved to **Supabase** (not AsyncStorage, not Zustand local state)
- Item appears in the closet immediately after save
- If user reinstalls app and logs back in, the item is still there

---

## Area 1: Data Architecture

### Verdict (already decided)
**Supabase = source of truth. Zustand = read cache only.**

### Current State (suspected)
- Dual-write exists: items saved to both Zustand/AsyncStorage AND Supabase
- Conflicts not handled
- No clear owner for reads (some screens may read from Zustand, others from Supabase)

### Audit Tasks
- [ ] Trace every `set()` in `closetStore.ts` — does each write also call Supabase?
- [ ] Trace every component that reads from the store — is it reading stale local data?
- [ ] Verify Supabase tables exist for: `items`, `outfits`, `collections`
- [ ] Verify RLS policies are set (users can only read/write their own data)
- [ ] Verify image uploads go to Supabase Storage (not base64 blobs in Zustand)
- [ ] Verify that on app load, data is fetched from Supabase into Zustand cache

### Remediation
- Zustand store becomes a **mirror** of Supabase state
- All mutations: write to Supabase first, then update local cache on success
- On app launch: fetch user's items/outfits from Supabase, hydrate store
- Remove AsyncStorage persistence for items/outfits (only auth session persists locally)

---

## Area 2: Auth

### Current State (suspected)
- Supabase Auth is configured
- Sign up likely works
- Post-signup flow **never tested**: session persistence across restarts, data tied to account, logout

### Audit Tasks
- [ ] Test: Sign up → close app → reopen → are you still logged in?
- [ ] Test: Sign up on device A → does the user's closet appear on device B after login?
- [ ] Test: Log out → log back in → is data intact?
- [ ] Verify Supabase RLS: Can user A read user B's items? (should be impossible)
- [ ] Verify: Is `user_id` attached to every item/outfit write?
- [ ] Check: What happens if the user opens the app while not logged in? Is there a proper auth gate or does it crash?
- [ ] Check: Token refresh — does the session survive after 1 hour? 24 hours?

### Remediation
- Auth gate on app entry: unauthenticated users see login/signup, nothing else
- Session must persist across restarts (Supabase handles this natively — verify it's wired)
- Every DB write must include `user_id` from active session

---

## Area 3: AI Pipeline & Cost Controls

### Current State
- DeepInfra (Llama-3.2-11B-Vision + Llama-3.1-70B-Text) is primary
- Gemini is fallback
- Remove.bg for background removal
- End-to-end flow has been tested
- **API costs are completely uncontrolled**

### Audit Tasks
- [ ] Is there any rate limiting per user? (e.g., max 10 items/day for free tier)
- [ ] Is there any error handling when DeepInfra returns a 429 or 500?
- [ ] What happens when remove.bg fails? Does the flow continue with original photo?
- [ ] What happens when AI vision returns garbage metadata? Is there validation before save?
- [ ] Are API keys exposed in client-side code (should be `EXPO_PUBLIC_` prefixed or server-side)?
- [ ] Is there any cost telemetry or logging to know how much is being spent?

### Remediation
- Add per-user rate limiting (client-side guard: e.g., max N AI analyses per day, stored in Supabase)
- All AI calls must have timeout + retry logic (1 retry max, then graceful failure with user message)
- Remove.bg failure → skip bg removal, continue with original (with user notice)
- Validate AI output before presenting to user (required fields: name, category at minimum)
- Never expose raw API keys. DeepInfra + remove.bg calls should route through Supabase Edge Functions if keys must stay server-side

---

## Area 4: Community Feature

### Current State
- UI exists
- **No real data source** — likely showing mock data or empty

### What it needs to be
A real social feed where users can optionally share outfits/looks from their closet.

### Spec
- Users can share an outfit from their closet to the community feed
- Feed shows posts from all users (public posts only)
- Each post: outfit photo, user handle, optional caption, like count
- Users can like posts (optimistic update, persisted to Supabase)
- Users can tap a post to see item details (which pieces make up the look)
- **No comments in v1** (keep scope tight)
- Privacy: sharing is opt-in, default is private closet

### Supabase Tables Needed
- `community_posts`: id, user_id, outfit_id, caption, created_at, is_public
- `post_likes`: id, post_id, user_id, created_at

### Audit Tasks
- [ ] Does any community data write to Supabase currently?
- [ ] Is there any real feed query, or is everything hardcoded?
- [ ] Is the "Add Piece" shortcut in Community actually wired to the camera/photo picker?

---

## Area 5: Trip Planner

### Current State
- UI exists with multi-city support
- **Not functional** — unclear what it actually does

### What it needs to be
A packing list generator: user inputs a trip (destinations, dates, activities), AI suggests
what to pack from their existing closet.

### Spec
- User creates a trip: name, destinations (multi-city), date range, activity types (beach, business, casual, formal)
- AI analyzes user's closet + trip context → suggests a packing list
- Packing list groups items by day or category
- User can swap items, remove suggestions, or add manual items
- Trip is saved to Supabase and accessible across devices
- AI call happens once at trip creation (not on every interaction)

### Supabase Tables Needed
- `trips`: id, user_id, name, destinations (jsonb), date_range (jsonb), activity_types (array), created_at
- `trip_items`: id, trip_id, item_id, day (nullable), is_packed (bool)

### Audit Tasks
- [ ] What does the current Trip Planner UI actually render?
- [ ] Does the AI call exist at all, or is the packing list hardcoded?
- [ ] Does any trip data persist anywhere?

---

## Area 6: Error States

### Current State
**Missing across the app.** API failures silently fail or show raw error dumps.

### Required Error States (every screen)
- Network request fails → user-visible message + retry option
- AI analysis fails → "Analysis failed. Try again." + option to enter metadata manually
- Image upload fails → "Upload failed. Check connection." + retry
- Empty closet → onboarding nudge ("Add your first piece →")
- Empty outfits → "Create your first outfit →"
- Empty community feed → "Be the first to share a look →"
- Auth failure → redirect to login with clear message

### Audit Tasks
- [ ] Search for every `.catch` and `try/catch` block — does each one show a user message?
- [ ] Search for every Supabase query — is there error handling on each?
- [ ] Check: Does the add-item flow have a manual entry fallback if AI fails?

---

## Area 7: Navigation Smoothness

### Current State
- Navigation described as "not ideal" and "not smooth"
- Needs code-level audit to diagnose

### Audit Tasks
- [ ] Check: Back navigation from `item/[id].tsx` — does the stack pop correctly?
- [ ] Check: Analyze modal (`analyze.tsx`) — does it dismiss cleanly after save?
- [ ] Check: Are there any `router.replace()` calls that should be `router.back()`?
- [ ] Check: Tab bar state after modal dismiss — does it reflect the right active tab?
- [ ] Check: Bottom sheets (if any) — do they have proper backdrop dismiss handling?
- [ ] Check: Are there any screens with no back button in a push context?
- [ ] Run on a physical device — look for 300ms+ tap delays, missing haptic feedback, abrupt transitions

---

## Area 8: StyleAI / Canvas

### Current State
- Canvas is non-tappable (per last audit)
- Chat interface exists
- Actual functionality unclear

### Audit Tasks
- [ ] Does the StyleAI chat actually call an AI model?
- [ ] Does the AI have access to the user's actual closet data when making suggestions?
- [ ] Does the canvas display anything real, or is it a static mockup?
- [ ] What happens when you send a message? Is there a response?

---

## Prioritized Issue List (Initial, Pre-Code-Audit)

| Priority | Area | Issue | Effort |
|----------|------|-------|--------|
| P0 | Data | Dual-write mess, Zustand vs Supabase ownership unclear | High |
| P0 | Auth | Post-signup session persistence untested | Medium |
| P0 | Auth | Data not tied to user accounts (suspected) | High |
| P1 | AI | Zero cost controls, no rate limiting | Medium |
| P1 | AI | No graceful fallback on API failure | Medium |
| P1 | Error States | Silent failures everywhere | High |
| P1 | Community | No real data source | High |
| P1 | Trip Planner | Not functional | High |
| P2 | Navigation | "Not smooth" — needs physical device audit | Unknown |
| P2 | StyleAI | Actual functionality unclear | Unknown |
| P3 | UI | Empty states missing for new users | Medium |

---

## What This Audit Will NOT Touch

- Visual design / styling (dark theme, colors, typography) — declared working
- The AI pipeline's analysis quality — that's a model tuning problem, not a code problem
- Performance optimization — premature until correctness is established
- Expo/RN upgrade — no dependency changes unless a specific bug requires it

---

## Definition of Done

The audit is complete when:
1. `npx tsc --noEmit` passes clean
2. `npx expo export --platform web` succeeds
3. A real user can: sign up → add an item → log out → log back in → see their item
4. Community feed shows real Supabase data
5. Trip Planner creates and persists a real trip
6. Every API call has error handling that surfaces a message to the user
7. AI calls have rate limiting that prevents unbounded cost
