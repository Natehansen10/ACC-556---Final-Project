-- ACC 556: integrity checks. Run any time. Each check should return the expected result.
-- Run them one at a time in the Supabase SQL Editor (it shows only the last result).
--
-- Checks 1 to 4 and 7 to 8 should return 0 rows. Checks 5 and 6 show this month's numbers to eyeball.

-- CHECK 1: Check-ins with no matching goal. Expected: 0 rows.
SELECT c.id
FROM public.checkins c
LEFT JOIN public.goals g ON g.id = c.goal_id
WHERE g.id IS NULL;

-- CHECK 2: Check-ins dated before their goal started. Expected: 0 rows.
SELECT c.id, c.checkin_date, g.start_date
FROM public.checkins c
JOIN public.goals g ON g.id = c.goal_id
WHERE c.checkin_date < g.start_date;

-- CHECK 3: Check-ins dated after their goal ended. Expected: 0 rows.
SELECT c.id, c.checkin_date, g.end_date
FROM public.checkins c
JOIN public.goals g ON g.id = c.goal_id
WHERE c.checkin_date > g.end_date;

-- CHECK 4: Prize winners who are not in the family that was awarded the prize. Expected: 0 rows.
SELECT pr.id AS prize_id, w.user_id
FROM public.monthly_prize_winners w
JOIN public.monthly_prizes pr ON pr.id = w.prize_id
JOIN public.profiles p ON p.id = w.user_id
WHERE p.family_id IS DISTINCT FROM pr.family_id;

-- CHECK 5: This month's target for every running goal, from the view.
-- Eyeball one by hand: target = ROUND(times per week x days in the month / 7).
SELECT p.full_name, g.title, t.month, t.frequency_per_week, t.days_in_month, t.target
FROM public.v_goal_monthly_targets t
JOIN public.goals g    ON g.id = t.goal_id
JOIN public.profiles p ON p.id = g.user_id
WHERE t.month = date_trunc('month', CURRENT_DATE)::date
ORDER BY p.full_name, g.title;

-- CHECK 6: This month's completion rate per family member (the same math as the leaderboard).
SELECT p.full_name,
       SUM(done.checkins) AS checkins,
       SUM(t.target)      AS target,
       ROUND(100.0 * SUM(done.checkins) / SUM(t.target), 1) AS completion_pct
FROM public.profiles p
JOIN public.goals g ON g.user_id = p.id
JOIN public.v_goal_monthly_targets t
  ON t.goal_id = g.id AND t.month = date_trunc('month', CURRENT_DATE)::date
CROSS JOIN LATERAL (
    SELECT COUNT(*) AS checkins
    FROM public.checkins c
    WHERE c.goal_id = g.id
      AND c.checkin_date >= t.month
      AND c.checkin_date <  (t.month + INTERVAL '1 month')::date
) done
GROUP BY p.full_name
ORDER BY completion_pct DESC;

-- CHECK 7: Families other than The Hansen Family and The Demo Family (08_demo_family.sql).
-- Expected: 0 rows.
SELECT f.id, f.name
FROM public.families f
WHERE f.id NOT IN ('f0000000-0000-4000-8000-000000000001',   -- The Hansen Family
                   'f2000000-0000-4000-8000-000000000001');  -- The Demo Family

-- CHECK 8: Logins that have no profile yet (they can sign in but see a "not set up" page).
-- Expected: 0 rows once 04_add_member.sql has been run for everyone.
SELECT u.email, u.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- CHECK 9 (after 07_strava.sql): Strava check-ins whose activity belongs to someone other than the
-- goal's owner. Expected: 0 rows.
SELECT c.id, c.checkin_date
FROM public.checkins c
JOIN public.goals g             ON g.id = c.goal_id
JOIN public.strava_activities a ON a.id = c.strava_activity_id
WHERE a.profile_id <> g.user_id;
