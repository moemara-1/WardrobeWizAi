# App Store Audit – Pre-Release Interview

Please add your answers as comments or inline responses below each question.

---

**1. End goal & timeline**
What's your target release date? And what's the core promise of the app in one sentence (for a new user who's never heard of it)?

> release date is asap and core promise is to be the best AI powered wardrobe management app for fashion lovers

---

**2. Target platforms**
iOS only, or both iOS and Android? What minimum OS versions are you targeting?

> IOS first and maybe android later as it is built with expo

---

**3. Monetization & gating**
Which features are paid-only (e.g., Fit Pic import, Virtual Try-On)? How is paywall enforcement implemented — RevenueCat, Stripe, a custom gate? Should I verify that all paid features are correctly gated?

> no paid features in the first release then it will be a fremium model with a mixture of AI credits and/or subs to allow as much flexibility as possible

---

**4. Auth flows**
What login methods exist (email, Apple, Google)? Has the full sign-up → onboarding → first-use flow been tested end-to-end recently?

> all login methods and yes they have all been tested, not perfect still since they use supabase instead of my personal domain etc and backend too

---

**5. Core user flows to stress-test**
Besides the AI import pipeline we've been fixing, which flows are highest-risk or haven't been tested recently? (e.g., Virtual Try-On, Stylist, Style Chat, Trip Planner, Digital Twin)

> Style chat and Trip planner

---

**6. Data & privacy**
Does the app handle any sensitive user data beyond profile photo / wardrobe images? Is there a Privacy Policy and Terms of Service already linked in the app?

> there is a privacy policy and terms of service that are written in the app yes, not much sensitive user data beyond profile photo wardrobe images, however there would need to be location detection for the weather for example and maybe trip planner

---

**7. Offline & error handling**
Should the app gracefully handle offline states, or is a network connection always assumed? Are there any known "blank screen" or crash edge cases you've seen recently?

> gracefully handle offline states and later saved to account when back online, no known blank screens or crash edge cases

---

**8. Performance benchmarks**
Are there any specific screens or transitions that feel sluggish? What device are you testing on (model + iOS version)?

> nothing I am aware of

---

**9. Out of scope**
Is there anything you explicitly **don't** want touched during this audit (e.g., a screen that's intentionally disabled, a backend function someone else owns)?

> no

---

**10. Definition of "done"**
At the end of the audit, do you want a written report only, or do you also want fixes applied and deployed? And what's the threshold — minor bugs only, or also UX polish and visual inconsistencies?

> everything without breaking anything
