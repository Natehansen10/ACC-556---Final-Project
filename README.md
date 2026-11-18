# Family Health Tracker: ACC 556 final project app

A small web app for the Hansen family, on top of the 3NF schema in the **"ACC556 Final Project"**
Supabase project.

**Why it exists:** my dad had a heart transplant, and his recovery runs on daily habits:
weigh-ins, blood pressure, medications, walks. This app lets the whole family take part.
Everyone sets a health goal, checks in each day, and sees everyone's progress.

**Win condition:** see every family member's check-ins against their calculated monthly target,
ranked by completion rate, and award the month's prize to the top member(s). Ties share the prize.

## The screens

| Screen | What it shows | What you do there |
| --- | --- | --- |
| **Today** (`/`) | Your goals first, then every family member's week, Sunday to Saturday: check = done, faint dot = missed. | Tap one of your goals when it's done (tap again to undo). "Mark yesterday done" and "Add a note" sit under each goal. |
| **Goals** (`/goals`) | Your goals first, then each family member's, with this month's progress. | Add a goal, end one, or delete one that has no check-ins. |
| **Leaderboard** (`/leaderboard`) | The win condition: everyone ranked by completion rate for a month. | A family admin awards the prize once the month is over. |
| **Trends** (`/trends`) | Four reports, each as a chart (hover, tap, or tab to a bar for its numbers and the SQL column behind them), the steps of the query, the table of rows the SQL returned, and the exact SQL that built it: month over month, weekly, streaks, day of week. The month in progress shows "on pace / behind pace". | Pick a report and a person (or everyone). |

Plus **Sign in** (`/login`). There is no public sign-up: the admin creates accounts.

## What's in here

| Path | What it is |
| --- | --- |
| `sql/01_schema.sql` | **Run once.** 6 tables + 1 view (3NF), and the one real family. Drops everything first. |
| `sql/02_remove_demo_data.sql` | One-time cleanup: removes the fictional demo families and logins from earlier versions. Never touches real data. |
| `sql/03_lock_down_api.sql` | Turns off Supabase's public table API. Run after `01`. |
| `sql/04_add_member.sql` | Adds family members (after you create their logins) to The Hansen Family, several at once. |
| `sql/05_verify.sql` | Eight integrity checks. |
| `sql/07_strava.sql` | **Run once.** Adds Strava: `strava_connections`, `strava_activities`, and two columns. Deletes nothing. |
| `sql/08_demo_family.sql` | "The Demo Family": 5 fictional people, their goals, and check-ins up to today, for showing the app without real family data. Safe to re-run (it rebuilds itself and never touches The Hansen Family). |
| `sql/06_showcase_query.sql` | The "SQL I'm proud of", for the video: who is winning the month. A CTE, `LEFT JOIN`, `GROUP BY`, and `RANK()`. Runs as is in the SQL Editor. |
| `proxy.ts` | Runs before every page: refreshes the login cookie, sends signed-out visitors to `/login`. |
| `lib/auth.ts` | Who is logged in → their profile → their family, in one SQL lookup. |
| `lib/queries.ts` | Every read the app makes, as plain SQL. |
| `lib/reports.ts` | The four Trends reports: each is one SQL string, shown on the page and run exactly as shown. |
| `components/charts.tsx` | The Trends charts: plain HTML/CSS bars drawn from each report's rows, no chart library and no browser JavaScript. |
| `lib/strava.ts` | Strava: tokens, sync, and the auto check-in SQL. `app/strava/connect` and `app/strava/callback` handle the Strava sign-in. |
| `app/actions.ts` | Every write: sign in/out, check in/undo, add/end/delete a goal, award a prize. |

## How it fits together

**"Auth tells me who you are, SQL decides what you see."**

1. **Login:** Supabase Auth checks the email and password and puts a session in a cookie. That's
   the only thing Supabase's API is used for.
2. **Who you are:** the login's id is also your `profiles.id`. One SQL query turns it into your
   name, role, and `family_id` (`lib/auth.ts`).
3. **What you see:** every query filters on that `family_id`, and every write checks the row is
   yours. Family and member ids never come from the URL or a form, so you can't see or change
   another family's data by editing a link.
4. **The database:** the Next.js server runs plain SQL (`postgres` library) over Supabase's
   transaction pooler, using `DATABASE_URL`. The browser never talks to the tables, and
   `03_lock_down_api.sql` closes the public table API.

Monthly targets are never stored. A goal has a weekly frequency, a `start_date`, and an `end_date`
(empty while it's running). The view `v_goal_monthly_targets` lists every month each goal was
running and calculates `ROUND(frequency × days_in_month / 7)`.

### The rules (small on purpose)

| Rule | Why |
| --- | --- |
| One family per person (`profiles.family_id` is one foreign key). You only ever see your own family. | Privacy, and a simple model. |
| Check-ins are for today or yesterday only, your own goals only. | Past months stop changing, so an awarded prize matches the board. |
| One check-in per goal per day (`UNIQUE (goal_id, checkin_date)`). | No double counting. |
| A goal's times-per-week can't be edited. To change it, end the goal and add a new one. | Old months keep the frequency they had, with no snapshot table. |
| A goal starts on the 1st of the month it's created in and counts the full month, every month it runs. | One formula, easy to check by hand; the start date matches the target. |
| A goal with check-ins can be ended, not deleted. A goal with none can be deleted. | History stays; mistakes are easy to undo. |
| Only a family `admin` can award the prize, once the month is over. Ties share it. | `RANK()` gives tied members the same place. |

## One-time setup

### 1. Supabase (project "ACC556 Final Project")

1. **Authentication > Sign In / Providers:** turn **off** "Allow new users to sign up". Keep Email on.
2. **SQL Editor:** run `sql/01_schema.sql`, then `sql/03_lock_down_api.sql`. (`01` wipes everything;
   never run it again once the family is using the app.) If the database still has the old demo
   data, run `sql/02_remove_demo_data.sql` once.
3. **Authentication > Users > Add user > Create new user** for each family member. Enter email +
   password and check **Auto Confirm User**. Give each person their password.
4. **SQL Editor:** put everyone's email and first name in `sql/04_add_member.sql` and run it once.
   You = `admin` (can award the prize); everyone else = `member`. Family emails are never committed
   to this repo; keep the filled-in copy to yourself.

### 2. Vercel

Settings > Environment Variables, for Production and Preview (see `.env.example`):

- `DATABASE_URL`: Supabase > Connect > Transaction pooler, with your database password.
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: public by design; they
  only allow sign-in.

Then redeploy.

### 3. Run it on your laptop (Windows PowerShell)

```bash
git clone https://github.com/Natehansen10/ACC-556---Final-Project; cd ACC-556---Final-Project
```

```bash
Copy-Item .env.example .env.local; notepad .env.local
```

```bash
npm install
```

```bash
npm run dev
```

Open http://localhost:3000 and sign in. Checks before you commit: `npm run typecheck` and `npm run lint`.

## Access for the professor

The rubric asks that the professor can use the app without being logged in as me, and without
seeing my family's real data. The plan is **The Demo Family** (`sql/08_demo_family.sql`): five
fictional people with a month and a half of check-ins. Every query filters on the viewer's
`family_id`, so a login in the demo family sees only the demo family.

1. SQL Editor: run `sql/08_demo_family.sql`. Re-run it any time to refresh the dates.
2. When the professor needs access: create their login (Authentication > Users > Add user, Auto
   Confirm), then run Part 2 at the bottom of `08_demo_family.sql` with their email.

## Phase 4 video

The full script, step by step with what to click and what to say, is in
[`docs/VIDEO_SCRIPT.md`](docs/VIDEO_SCRIPT.md). The SQL it runs live is `sql/06_showcase_query.sql`.
What's left after that is in [`docs/ROADMAP.md`](docs/ROADMAP.md).

## Known limits (honest list)

- Accounts are created by hand in the Supabase dashboard; there's no invite email, password reset,
  or change-password page.
- Real data starts in November 2026, so there is no earlier history, and the first prize can be
  awarded on Dec 1.
- The professor's access is not set up yet (see above).
- Check-ins record that a habit happened, not a measurement. Weight or blood pressure goes in the
  note for now.
- Prizes are awarded by a button, not automatically on the 1st of the month.
- Trends reports cover the logged-in person's family only, and "change vs last month" needs two
  months of data (from December on).
- No route-level loading skeleton. With Next.js 16.2.10, a root `loading.tsx` made Server
  Action responses hang the form on "Saving…" in production builds (reproduced, then removed).

## Strava

Each person can connect their own Strava account. Activities then check in matching goals
automatically ("Run" goals count Strava runs, "Daily walk" counts walks).

**How it works**

1. **Connect** (Today page, your card): you approve the app on strava.com. Strava sends back a
   one-time code; the server trades it for tokens and saves them in `strava_connections`.
2. **Sync**: when you open Today (at most every 10 minutes) or tap **Sync now**, the server asks
   Strava for this month's activities and inserts the new ones into `strava_activities`
   (`ON CONFLICT (id) DO NOTHING` on Strava's own activity id, so nothing imports twice).
3. **Auto check-in**: each new activity whose type matches a goal's "Counts from Strava" setting
   becomes that day's check-in, with `checkins.strava_activity_id` pointing at the activity.

**Rules**

| Rule | Why |
| --- | --- |
| Your Strava activities (name, distance, time) are shown only to you. The family sees only the check-in. | Strava's API terms: a person's Strava data may only be shown to that person. |
| `Run` also matches TrailRun and VirtualRun; `Ride` matches VirtualRide, GravelRide, and so on (`sport_type LIKE '%' \|\| goal type`). | Strava has many variants of the same sport. |
| One activity checks in one goal, once (`UNIQUE strava_activity_id`). One check-in per goal per day still holds. | No double counting. |
| Strava can fill in any day this month, not just today or yesterday. | An activity is proof, so a missed day can count. |
| Linking a goal to Strava checks it in for this month's already-imported activities right away. After that, only newly imported activities create check-ins, so undoing one sticks. | Linking works immediately, and you stay in control. |
| Minutes and distance stay in `strava_activities`; they are not copied into `checkins`. | 3NF: they depend on the activity, not the check-in. |

**Setup**

1. Supabase SQL Editor: run `sql/07_strava.sql` once. Do this **before** deploying this version:
   the app reads the new columns.
2. strava.com/settings/api: create an API application.
   - Website: `https://acc556finalproject.vercel.app`
   - Authorization Callback Domain: `acc556finalproject.vercel.app` (use `localhost` when testing locally)
3. Vercel > Settings > Environment Variables: add `STRAVA_CLIENT_ID` (Config) and
   `STRAVA_CLIENT_SECRET` (Secret) for Production, then redeploy. Without them, Strava stays hidden.
4. Check the app's athlete limit on strava.com/settings/api. This app allows 10 athletes, enough
   for the whole family (8). Brand-new Strava apps can start at 1 ("Single Player Mode") until
   Strava raises the limit.

**Known limits**

- At most 10 people can connect (the Strava app's athlete limit).
- Tokens are stored in the database as plain text. The tables are closed to the public API, and only
  the server reads them, but a production app would encrypt them.
- Strava's brand guidelines ask for their official "Connect with Strava" button and a "Powered by
  Strava" mark; this version uses a plain orange button.
