# Phase 4 video script (about 3 minutes)

Record signed in as yourself, on a laptop, browser zoom at 125% so the professor can read it.
**Bold** = what you click. Plain text in quotes = what you say. Say it in your own words; the
numbers on screen will be your family's real ones, not the ones in this script.

## Before you hit record

1. Sign in at https://acc556finalproject.vercel.app and leave **one of your goals unchecked** for today.
2. Open a second tab: Supabase, project "ACC556 Final Project", **Table Editor > checkins**.
   Sort by `created_at`, newest first.
3. Open a third tab: **SQL Editor**, with `sql/06_showcase_query.sql` pasted in. Don't run it yet.
4. Turn off notifications. Close every other tab.

---

## 1. Open the app (about 15 seconds)

**Show the Today page.**

> "This is our Family Health Tracker. My dad had a heart transplant, and his recovery runs on daily
> habits: meds on time, weigh-ins, walks. So everyone in our family sets a health goal and checks
> in each day, and we all see each other's progress. He's not doing it alone."

## 2. Show it's connected to Supabase (about 15 seconds)

**Point at the footer: "Live from Supabase: … check-ins".** Say the number out loud.

> "That count is a live SQL query against our Supabase database, run every time a page loads."

**Switch to the Table Editor tab (checkins).**

> "Every check-in is one row in this checkins table. The app's server runs plain SQL against
> these tables. The browser never touches the database directly."

## 3. The win condition (60 to 90 seconds)

> "My Phase 1 win condition: see every family member's check-ins against their monthly target,
> ranked by completion rate, and award the month's prize to whoever is on top. Ties share it."

**Back to the app, Today page. Tap your unchecked goal.** It turns green with a check.

> "Checking in is one tap. That just inserted a row into checkins…"

**Point at the footer.**

> "…and the count went up by one."

*(Optional, +10 seconds: refresh the Table Editor tab to show the new row at the top.)*

**Tap Leaderboard.**

> "Here's the win condition, live for November. Everyone's completion rate: check-ins divided by
> their target, added up across all their goals. The target isn't stored anywhere. A view
> calculates it: times per week, times the days in the month, divided by seven."

**Point at the dark mark on a bar.**

> "November's still in progress, so this mark shows where an on-track rate would be today."

> "The prize is awarded once the month is over. Ties share a place, and share the prize."

**If you record on or after December 1:** pick **Nov 2026**, tap **Award Nov 2026 prize**, confirm,
and say: "November's over, so I'm awarding the prize now. It's saved in the monthly_prizes table."

**Tap Trends, then open "Show the rows as a table" under the chart.**

> "Trends shows each report as a chart, with the rows behind it one tap away. The SQL itself is in the editor, which I'll show next."

## 4. The SQL I'm proud of (30 to 45 seconds)

**Switch to the SQL Editor tab. Click Run.**

> "This query answers the win condition directly: who's winning November in our family? One row per person:
> check-ins, target, completion rate, and place. It's the same numbers as the Leaderboard."

**Point at the CTE (`WITH goal_totals`).**

> "It was tricky in two places. First, it has to work in two steps. The CTE counts check-ins per
> goal, then the outer query adds each person's goals together. When I tried it in one step, the
> target got repeated on every check-in row, so it was added up again and again and came out many
> times too big."

**Point at `LEFT JOIN public.checkins`.**

> "Second, it's a LEFT JOIN. With a regular JOIN, a goal nobody checked in on just disappears,
> so skipping a goal would make your rate look better. LEFT JOIN keeps it as zero, so it still
> counts against you."

**Point at `WHERE p.family_id = …`.**

> "And it's only my family. Every query in the app filters on the family id, so nobody ever sees
> another family's data."

**Point at the `RANK()` line.**

> "And RANK gives tied people the same place, so a tie shares the prize."

## 5. What's left (15 to 30 seconds)

**Back to the app, Today page.**

> "What's left for Phase 5: First, your access. I'll add a demo family with sample data and a
> login for you, so you can use the whole app without seeing my family's real data. Second, a
> Cheer button, so family members can cheer each other's check-ins. That's one new table. Third,
> letting the app install to a phone's home screen. Then the write-up and the live presentation.
> Honest limits: I create accounts by hand, there's no password reset yet, and things like blood
> pressure are typed into notes instead of stored as numbers. That's what I'd build after the
> class."

---

## If something goes wrong while recording

- **The check-in tap shows an error:** you probably already checked in today. Tap again to undo it,
  then tap once more.
- **The footer count didn't change:** refresh the page.
- **The SQL errors with "there is no parameter $1":** you pasted SQL from the Trends page. Use
  `sql/06_showcase_query.sql`, which has no parameters.
