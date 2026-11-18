-- ACC 556: Family Health Tracker. 08: the demo family (fictional), for showing the app safely.
-- Environment: Supabase project "ACC556 Final Project", SQL Editor.
--
-- What it makes: "The Demo Family", 5 fictional people, 9 goals, and check-ins from the 1st of
-- last month through today, plus last month's prize. Someone signed in to this family sees a
-- full, realistic app, and never sees The Hansen Family: every query in the app filters on the
-- viewer's family_id.
--
-- Safe to run again: Part 0 deletes the old demo family first, then Part 1 rebuilds it with
-- fresh dates (check-ins always run up to "today"). It never touches The Hansen Family.
--
-- Why it writes to auth.users: profiles.id is a foreign key to auth.users(id) (every person is a
-- login). These 5 logins have no password, so nobody can sign in as them. Their emails end in
-- ".invalid", a domain reserved so it can never be a real address.
--
-- Fixed ids, so the script can find its own rows:
--   family   f2000000-0000-4000-8000-000000000001
--   people   d0000000-0000-4000-8000-00000000000N   (N = 1..5)
--   goals    e0000000-0000-4000-8000-0000000000NN

-- ------------------------------------------------------------
-- Part 0: remove the previous demo family (ON DELETE CASCADE does the rest:
-- login -> profile -> goals -> check-ins and prize wins; family -> its prizes)
-- ------------------------------------------------------------
BEGIN;

DELETE FROM auth.users       WHERE id::text LIKE 'd0000000-%';
DELETE FROM public.families  WHERE id = 'f2000000-0000-4000-8000-000000000001';

-- ------------------------------------------------------------
-- Part 1: build it
-- ------------------------------------------------------------
INSERT INTO public.families (id, name) VALUES
    ('f2000000-0000-4000-8000-000000000001', 'The Demo Family');

-- Placeholder logins (no password, cannot sign in).
INSERT INTO auth.users (instance_id, id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
                        created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000000', v.id, 'authenticated', 'authenticated', v.email,
       '{}'::jsonb, '{}'::jsonb, now(), now()
FROM (VALUES
        ('d0000000-0000-4000-8000-000000000001'::uuid, 'robert@demo-family.invalid'),
        ('d0000000-0000-4000-8000-000000000002'::uuid, 'linda@demo-family.invalid'),
        ('d0000000-0000-4000-8000-000000000003'::uuid, 'emma@demo-family.invalid'),
        ('d0000000-0000-4000-8000-000000000004'::uuid, 'jake@demo-family.invalid'),
        ('d0000000-0000-4000-8000-000000000005'::uuid, 'sofia@demo-family.invalid')
     ) AS v(id, email);

INSERT INTO public.profiles (id, full_name, family_id, timezone, role) VALUES
    ('d0000000-0000-4000-8000-000000000001', 'Robert', 'f2000000-0000-4000-8000-000000000001', 'America/Denver', 'member'),
    ('d0000000-0000-4000-8000-000000000002', 'Linda',  'f2000000-0000-4000-8000-000000000001', 'America/Denver', 'member'),
    ('d0000000-0000-4000-8000-000000000003', 'Emma',   'f2000000-0000-4000-8000-000000000001', 'America/Denver', 'member'),
    ('d0000000-0000-4000-8000-000000000004', 'Jake',   'f2000000-0000-4000-8000-000000000001', 'America/Denver', 'member'),
    ('d0000000-0000-4000-8000-000000000005', 'Sofia',  'f2000000-0000-4000-8000-000000000001', 'America/Denver', 'member');

-- Goals. Same rules as the real app: a goal starts on the 1st of the month it's created in.
-- m1 = the 1st of last month, m0 = the 1st of this month (in Denver time, like the app).
WITH m AS (
    SELECT date_trunc('month', now() AT TIME ZONE 'America/Denver')::date                        AS m0,
           (date_trunc('month', now() AT TIME ZONE 'America/Denver') - INTERVAL '1 month')::date AS m1
)
INSERT INTO public.goals (id, user_id, title, category, frequency_per_week, unit, start_date, end_date)
SELECT v.id::uuid, v.user_id::uuid, v.title, v.category, v.freq, v.unit,
       CASE v.starts WHEN 'last' THEN m.m1 ELSE m.m0 END,
       CASE WHEN v.ended THEN (m.m0 - 1) END                     -- ended on the last day of last month
FROM m, (VALUES
    -- id                                      person                                  goal                        category       /wk unit       starts  ended
    ('e0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'Daily walk',                'Fitness',     7, 'walks',    'last', false),
    ('e0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001', 'Take meds on time',         'Fitness',     7, NULL,       'last', false),
    ('e0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000001', 'Morning weigh-in',          'Fitness',     7, NULL,       'last', false),
    ('e0000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000002', 'Yoga',                      'Mindfulness', 3, 'sessions', 'last', false),
    ('e0000000-0000-4000-8000-000000000005', 'd0000000-0000-4000-8000-000000000002', 'Read before bed',           'Sleep',       5, NULL,       'last', false),
    ('e0000000-0000-4000-8000-000000000006', 'd0000000-0000-4000-8000-000000000003', 'Run',                       'Fitness',     4, 'runs',     'last', false),
    ('e0000000-0000-4000-8000-000000000007', 'd0000000-0000-4000-8000-000000000004', 'Strength training',         'Fitness',     3, 'sessions', 'this', false),
    ('e0000000-0000-4000-8000-000000000008', 'd0000000-0000-4000-8000-000000000005', 'Meditate',                  'Mindfulness', 5, NULL,       'last', true),
    ('e0000000-0000-4000-8000-000000000009', 'd0000000-0000-4000-8000-000000000005', 'Lights out by 10:30',       'Sleep',       5, NULL,       'this', false)
) AS v(id, user_id, title, category, freq, unit, starts, ended);

-- Check-ins: for each goal, each day it was running up to today, a check-in on roughly
-- (times per week / 7) x that person's follow-through. hashtext() makes the pattern look random
-- but come out the same every run (no random()). One check-in per goal per day, like the app.
INSERT INTO public.checkins (goal_id, checkin_date, note)
SELECT g.id,
       d::date,
       CASE WHEN g.title = 'Morning weigh-in' AND abs(hashtext(g.id::text || d::text || 'n')) % 4 = 0
            THEN 'BP ' || (118 + abs(hashtext(d::text)) % 12) || '/' || (74 + abs(hashtext(d::text || 'd')) % 8)
       END
FROM public.goals g
JOIN (VALUES
        ('d0000000-0000-4000-8000-000000000001'::uuid, 0.95),   -- Robert: very consistent
        ('d0000000-0000-4000-8000-000000000002'::uuid, 0.85),   -- Linda
        ('d0000000-0000-4000-8000-000000000003'::uuid, 0.80),   -- Emma
        ('d0000000-0000-4000-8000-000000000004'::uuid, 0.60),   -- Jake: just started
        ('d0000000-0000-4000-8000-000000000005'::uuid, 0.75)    -- Sofia
     ) AS r(user_id, follow_through) ON r.user_id = g.user_id
CROSS JOIN generate_series(g.start_date,
                           LEAST(COALESCE(g.end_date, (now() AT TIME ZONE 'America/Denver')::date),
                                 (now() AT TIME ZONE 'America/Denver')::date),
                           INTERVAL '1 day') AS d
WHERE abs(hashtext(g.id::text || d::text)) % 1000
      < 1000 * r.follow_through * LEAST(1.0, g.frequency_per_week / 7.0 + 0.05)
  -- Today: only about a third of goals are done, like a real family partway through the day.
  AND (d::date < (now() AT TIME ZONE 'America/Denver')::date
       OR abs(hashtext(g.id::text || 'today')) % 3 = 0);

-- Last month's prize, awarded with the same math as the Leaderboard: check-ins / target across
-- each person's goals, highest rate wins, ties share (RANK() = 1).
WITH m AS (
    SELECT (date_trunc('month', now() AT TIME ZONE 'America/Denver') - INTERVAL '1 month')::date AS m1
),
per_person AS (
    SELECT g.user_id,
           SUM(gt.checkins)::numeric / SUM(gt.target) AS rate
    FROM (SELECT t.goal_id, t.target, COUNT(c.id) AS checkins
          FROM public.v_goal_monthly_targets t
          CROSS JOIN m
          LEFT JOIN public.checkins c
                 ON c.goal_id = t.goal_id
                AND c.checkin_date >= t.month
                AND c.checkin_date <  t.month + INTERVAL '1 month'
          WHERE t.month = m.m1
            AND t.goal_id::text LIKE 'e0000000-%'
          GROUP BY t.goal_id, t.target) gt
    JOIN public.goals g ON g.id = gt.goal_id
    GROUP BY g.user_id
),
prize AS (
    INSERT INTO public.monthly_prizes (family_id, month)
    SELECT 'f2000000-0000-4000-8000-000000000001', m1 FROM m
    RETURNING id
)
INSERT INTO public.monthly_prize_winners (prize_id, user_id)
SELECT prize.id, w.user_id
FROM prize,
     (SELECT user_id, RANK() OVER (ORDER BY rate DESC) AS place FROM per_person) w
WHERE w.place = 1;

COMMIT;

-- Check: the demo family at a glance.
SELECT p.full_name,
       COUNT(DISTINCT g.id) AS goals,
       COUNT(c.id)          AS checkins
FROM public.profiles p
LEFT JOIN public.goals g    ON g.user_id = p.id
LEFT JOIN public.checkins c ON c.goal_id = g.id
WHERE p.family_id = 'f2000000-0000-4000-8000-000000000001'
GROUP BY p.full_name
ORDER BY p.full_name;

-- ------------------------------------------------------------
-- Part 2 (LATER, when the professor needs access). Not run by default.
-- 1. Supabase dashboard: Authentication > Users > Add user > Create new user, with the
--    professor's email and a password. Check "Auto Confirm User".
-- 2. Put that email below, remove the leading "-- " from the 7 lines, and run just those lines.
--    'admin' lets them try the Award prize button. Re-running Part 0/1 later detaches them
--    (their family_id becomes NULL), so run Part 2 again after it.
-- ------------------------------------------------------------
-- INSERT INTO public.profiles (id, full_name, family_id, timezone, role)
-- SELECT u.id, 'Professor', 'f2000000-0000-4000-8000-000000000001', 'America/Denver', 'admin'
-- FROM auth.users u
-- WHERE lower(u.email) = lower('professor@school.edu')    -- EDIT
-- ON CONFLICT (id) DO UPDATE
-- SET family_id = EXCLUDED.family_id,
--     role      = EXCLUDED.role;
