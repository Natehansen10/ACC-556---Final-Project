# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **The Hansen family** (about 8 people, all ages, mostly on phones). Each person has one or more daily health habits. They open the app once or twice a day to check in and to see how everyone else is doing.
- **Dad**, recovering from a heart transplant. His recovery runs on daily habits: meds on time, weigh-ins, blood pressure, walks. The family takes part so he isn't doing it alone. He is the reason the app exists, so the app must work for someone who is not technical and may be tired.
- **The ACC 556 professor and class.** Nate presents the app live in 5 minutes (Nov 30, Dec 2, Dec 7). The professor may point at any screen or query and ask Nate to explain it. Trends and Leaderboard are shown most after Today.

## Product Purpose

Everyone in the family sets a goal, checks in each day, and sees everyone's progress on one family board. Success means people check in daily without being reminded, and Dad feels supported. It is also a database class final project: every number comes from plain SQL the student can explain, though the app itself no longer shows the queries.

## Positioning

A private board for one family, built around one person's recovery. Not a fitness app, not social media: no strangers, no feeds, no streak-shaming.

## Operating Context

- Daily ritual: open on a phone, tap today's circle for each habit, optionally add a note (e.g. "BP 128/82"), glance at the family.
- Check-ins are allowed for today or yesterday only, own goals only.
- Strava can check in matching goals automatically. A person's Strava activity details are shown only to that person (Strava API terms); the family sees only the check-in.
- Monthly prize: the family is ranked by completion rate; a family admin awards the prize after the month ends. Ties share it.
- Live classroom demo on a projector or laptop, plus phones in the family.

## Capabilities and Constraints

- Screens: Sign in, Today, Goals, Leaderboard, Trends, Setup (signed in but not yet added to the family).
- No sign-up. Accounts are created by the admin (Nate).
- Goal frequency can't be edited; end the goal and add a new one. Goals with check-ins can be ended, not deleted.
- Stack: Next.js 16 App Router, React Server Components, Server Actions, Tailwind v4, raw SQL via `postgres`. No chart library, component kit, or animation library: charts are plain HTML/CSS on purpose so they are explainable.
- UI changes must not change SQL, schema, query text, auth, Strava logic, or Server Action behavior.
- Trends keeps the "Show as table" view. SQL and "how this is calculated" notes are not shown in the app.

## Brand Commitments

- Name in the header is the family's name ("The Hansen Family"). Product name: Family Health Tracker.
- Voice: plain, warm, short. Encouraging without hype. No guilt for missed days.

## Evidence on Hand

- Real family data starts November 2026. No earlier history, no testimonials, no metrics to cite. Do not invent any.

## Product Principles

1. **Obvious on first sight.** Someone who has never seen a screen knows what to do without being told.
2. **Checking in is the main event.** It should take one tap and feel good.
3. **Together, not competitive.** The leaderboard motivates; it never shames.
4. **Every number is explainable.** The rows behind a chart are one tap away.
5. **Simple over clever.** Fewer controls, fewer words, no heavy dependencies.

## Accessibility & Inclusion

- WCAG AA contrast, visible keyboard focus, tap targets at least 44px on phones, labels on every input.
- No information by color alone (done/not done uses fill plus a check mark).
- Chart tooltips work on hover and keyboard focus. Respect `prefers-reduced-motion`.
- No horizontal scroll at 390px.
