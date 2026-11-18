-- ACC 556: the query for the Phase 4 video ("one SQL query you're proud of").
-- Who is winning November in our family? Each person's check-ins against their monthly target,
-- ranked. It returns the same numbers as the Leaderboard page.
--
-- Run it in the Supabase SQL Editor as is (no parameters). Change the month on the WHERE line
-- to see another month.
--
-- Why it was tricky:
--   1. Targets are never stored. The view v_goal_monthly_targets calculates them:
--      times per week x days in the month / 7, rounded.
--   2. LEFT JOIN, not JOIN. With a plain JOIN, a goal with zero check-ins disappears, and a
--      person who skipped everything drops off the list. LEFT JOIN keeps it as 0, so skipping
--      still counts against you.
--   3. Two steps. Step 1 counts check-ins per goal; step 2 adds goals up per person. Done in one
--      step, the target repeats on every check-in row and gets added up again and again,
--      so the total comes out many times too big.
--   4. WHERE p.family_id = ... keeps it to one family: the same rule every query in the app follows.
--   5. RANK() gives tied people the same place, so ties share the prize.
--      (If window functions are new to your audience: delete the RANK() line and keep
--      ORDER BY completion_pct DESC. Everything else still works.)

WITH goal_totals AS (
    -- Step 1: one row per goal. Its November target, and how many check-ins it got.
    SELECT p.id AS person_id,
           p.full_name,
           t.goal_id,
           t.target,
           COUNT(c.id) AS checkins
    FROM public.v_goal_monthly_targets t
    JOIN public.goals g    ON g.id = t.goal_id
    JOIN public.profiles p ON p.id = g.user_id
    LEFT JOIN public.checkins c
           ON c.goal_id = t.goal_id
          AND c.checkin_date >= t.month
          AND c.checkin_date <  t.month + INTERVAL '1 month'
    WHERE t.month = DATE '2026-11-01'
      AND p.family_id = 'f0000000-0000-4000-8000-000000000001'   -- The Hansen Family only
    GROUP BY p.id, p.full_name, t.goal_id, t.target
)
-- Step 2: add up each person's goals, then rank everyone by completion rate.
SELECT full_name,
       SUM(checkins) AS checkins,
       SUM(target)   AS target,
       ROUND(100.0 * SUM(checkins) / SUM(target), 1) AS completion_pct,
       RANK() OVER (ORDER BY SUM(checkins) * 1.0 / SUM(target) DESC) AS place
FROM goal_totals
GROUP BY person_id, full_name
ORDER BY completion_pct DESC, full_name;
