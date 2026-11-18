# What's left

Ranked by what matters most. Effort is a rough guess for one focused session each.

## 1. Before the presentations (Nov 30, Dec 2, Dec 7) and the Dec 9 deadline

| What | Why | Effort | Database impact |
| --- | --- | --- | --- |
| **Professor access: run the demo family, add their login** | The demo family is built (`sql/08_demo_family.sql`). Run it once in the SQL Editor. When the professor needs access, create their login and run Part 2 of that file. | 5 min | Rows only. No schema change. |
| **Check production after the redesign** | Real Strava sync and real check-ins haven't been tested on the new UI. | 10 min | None |
| **Award the November prize live** | The first prize can be awarded Dec 1. A good live moment for the Dec 2 and Dec 7 slots. | 1 min | One row in `monthly_prizes`, one per winner in `monthly_prize_winners`. |
| **Write-up** | Required. Reuse the README's "How it fits together" and "The rules" sections. | 1 to 2 hours | None |
| **Delete merged branches on GitHub** | Housekeeping. `feat/ui-polish`, `feat/week-sun-sat`, `feat/trends-week-sunday`, `feat/trends-weekday-sunday`, `feat/link-card`, `docs/video-script`. | 2 min | None |

## 2. Phase 5: most useful for the family

| What | Why | Effort | Database impact |
| --- | --- | --- | --- |
| **Cheers** | The tagline is "cheer each other on," and there's no way to do it yet. A Cheer button on a family member's done goal, and "Mom cheered you" on your card. Encouragement is the point for Dad. | 2 to 3 hours | New table `cheers (checkin_id, from_user_id, created_at)`, primary key `(checkin_id, from_user_id)` so you can cheer a check-in once. A clean 3NF linking table to show the class. |
| **Install to home screen** | Opens full screen from a phone icon, like an app. Daily use goes up when it's one tap away. The icon already exists. | 30 min | None (one `app/manifest.ts` file) |

## 3. After the class

| What | Why | Effort | Database impact |
| --- | --- | --- | --- |
| **Measurements for Dad** (weight, blood pressure) | Today they're typed into notes, so they can't be charted. A small log gives a trend line, the most useful thing for his recovery. | 4 to 6 hours | New table `measurements (id, user_id, kind, value, value2, measured_on)` plus a check constraint on `kind`. A Trends report with a weekly average. |
| **Password reset** | People can't reset a forgotten password; you do it by hand in Supabase. | 1 hour | None (Supabase Auth's reset email) |
| **Official Strava button and "Powered by Strava" mark** | Strava's brand guidelines ask for them. You download the image files from Strava. | 30 min | None |

## Not doing (and why)

- **Daily reminder notifications.** Needs a service worker, push keys, and a scheduled job. Too
  much moving machinery for 8 people; install-to-home-screen gets most of the benefit.
- **Automatic prize on the 1st.** The button works, and awarding it live is a better moment.
- **Editing a goal's times per week.** "End it and add a new one" is what keeps past months
  correct without a snapshot table.
- **Dark mode, Google sign-in, a chart library.** None of them help the grade or the habits.
