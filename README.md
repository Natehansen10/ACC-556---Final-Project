# Family Health Tracker: ACC 556 final project app

A small web app for the Hansen family, on top of the 3NF schema in the **"ACC556 Final Project"**
Supabase project.

**Why it exists:** my dad had a heart transplant, and his recovery runs on daily habits:
weigh-ins, blood pressure, medications, walks. This app lets the whole family take part.
Everyone sets a health goal, checks in each day, and sees everyone's progress.

**Win condition:** see every family member's check-ins against their calculated monthly target,
ranked by completion rate, and award the month's prize to the top member(s). Ties share the prize.

## The three screens

| Screen | What it shows | What you do there |
| --- | --- | --- |
| **Today** (`/`) | Every family member, every goal, the last 7 days: filled = done. | Tap your own circle for today or yesterday to check in (tap again to undo), or use "Done today" with a note. |
| **Goals** (`/goals`) | Your goals first, then each family member's, with this month's progress. | Add a goal, end one, or delete one that has no check-ins. |
| **Leaderboard** (`/leaderboard`) | The win condition: everyone ranked by completion rate for a month. | A family admin awards the prize once the month is over. |

Plus **Sign in** (`/login`). There is no public sign-up: the admin creates accounts.

## What's in here

| Path | What it is |
| --- | --- |
| `sql/01_schema.sql` | **Run once.** 6 tables + 1 view (3NF), and the one real family. Drops everything first. |
| `sql/02_demo_data.sql` | **Re-run any time.** Reloads the fictional demo families (Parker, Clark, Davis). Never touches real data. |
| `sql/03_lock_down_api.sql` | Turns off Supabase's public table API. Run after `01`. |
| `sql/04_add_member.sql` | Adds one person (after you create their login) to a family. Run once per person. |
| `sql/05_verify.sql` | Eight integrity checks. |
| `sql/06_showcase_query.sql` | The "SQL I'm proud of": completion rate, `RANK()` within family, `LAG()` month over month. |
| `proxy.ts` | Runs before every page: refreshes the login cookie, sends signed-out visitors to `/login`. |
| `lib/auth.ts` | Who is logged in → their profile → their family, in one SQL lookup. |
| `lib/queries.ts` | Every read the app makes, as plain SQL. |
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
| A goal counts for the full month in every month it runs. | One formula, easy to check by hand. |
| A goal with check-ins can be ended, not deleted. A goal with none can be deleted. | History stays; mistakes are easy to undo. |
| Only a family `admin` can award the prize, once the month is over. Ties share it. | `RANK()` gives tied members the same place. |

## One-time setup

### 1. Supabase (project "ACC556 Final Project")

1. **Authentication > Sign In / Providers:** turn **off** "Allow new users to sign up". Keep Email on.
2. **SQL Editor:** run `sql/01_schema.sql`, then `sql/02_demo_data.sql`, then `sql/03_lock_down_api.sql`.
   (`01` wipes everything. After this first time, only re-run `02` to reset the demo.)
3. **Authentication > Users > Add user > Create new user** for each family member, plus one
   `guest` account for the professor. Enter email + password and check **Auto Confirm User**.
4. **SQL Editor:** run `sql/04_add_member.sql` once per person. Edit the email, name, family, and
   role at the top. You = `admin` in The Hansen Family. The guest = `admin` in The Parker Family
   (the demo family, so the professor sees two months of history and can award a prize).

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

## Demo login for the professor

Sign in with the guest account (email and password are in the project writeup). It belongs to the
fictional Parker family, with check-ins since September, so every screen has data. The guest is
that family's admin, so they can add a goal, check in, and award October's prize (the full win
condition). Re-running `sql/02_demo_data.sql` puts everything back.

## Phase 4 video outline (2 to 3 minutes)

Before recording, re-run `sql/02_demo_data.sql` so the demo is clean. Record signed in as the
**guest** (Parker family, two months of history); sign in as yourself at the end to show the real
family.

1. **Open the app** (15s). One sentence on why: Dad's heart transplant, daily recovery habits,
   the family doing it with him. Show the sign-in page, sign in.
2. **Show the database connection** (15s). Point at the live footer count, then show the
   `checkins` table in the Supabase Table Editor.
3. **Win condition** (60 to 90s):
   - Today: every member's last 7 days. Add a goal on Goals, then tap today's circle: the footer
     count goes up by one.
   - Leaderboard: September already has a winner. October: click **Award Oct 2026 prize**; Dana
     Parker wins at 93.5%.
   - Sign out, sign in as yourself: only the real Hansen family is visible.
4. **SQL you're proud of** (30 to 45s). Run `sql/06_showcase_query.sql` in the SQL Editor.
   Explain the CTEs, `RANK()` (ties share a place) and `LAG()` (change from last month).
5. **What's left** (15 to 30s). A month-over-month Trends page, polish, the writeup, and (after
   the class) Strava.

## Known limits (honest list)

- Accounts are created by hand in the Supabase dashboard; there's no invite email or password reset.
- Check-ins record that a habit happened, not a measurement. Weight or blood pressure goes in the
  note for now.
- Prizes are awarded by a button, not automatically on the 1st of the month.
- Only one report beyond the daily view (the leaderboard). The month-over-month query exists in
  SQL but isn't a page yet.
- No route-level loading skeleton. With Next.js 16.2.10, a root `loading.tsx` made Server
  Action responses hang the form on "Saving…" in production builds (reproduced, then removed).

## Later: Strava (after the class)

Strava would need its own API app, a per-person "Connect Strava" login (OAuth), a table for each
person's tokens, and a webhook for new activities. Each activity would check in a matching goal.
Check Strava's API terms first: they limit showing one person's Strava data to other users, so the
safe version marks your own goal "done" without showing the activity itself to the family.
