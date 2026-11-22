-- ACC 556: Family Health Tracker. 08: pausing a goal (run after 07). Adds to the schema; deletes nothing.
-- Safe to re-run: IF NOT EXISTS and CREATE OR REPLACE skip or redo what is already there.
-- Author: Nate Hansen
--
-- WHAT IT ADDS
--   goal_pauses   one row per pause (1-to-many: a goal can be paused more than once).
--                 paused_on  = first day the goal does not count.
--                 resumed_on = first day it counts again. NULL = still paused.
--   v_goal_monthly_targets is replaced: paused days come out of the month's target.
--
-- WHY A TABLE AND NOT A COLUMN ON goals
--   A single "paused" flag can't say WHEN the goal was paused, and a single date is lost on resume.
--   Then every old month would be recalculated as if the pause never happened. One row per pause
--   keeps the dates, so past months never change.
--
-- THE TARGET RULE NOW
--   target = ROUND(frequency_per_week * days_not_paused_in_month / 7), at least 1.
--   With no pauses this is the same number as before. A month that is paused from its first day
--   to its last has no row at all, so it is not tracked and does not hurt anyone's rate.
--   Pausing never deletes check-ins.

BEGIN;

CREATE TABLE IF NOT EXISTS public.goal_pauses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
    paused_on DATE NOT NULL,
    resumed_on DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (resumed_on IS NULL OR resumed_on > paused_on)
);

-- A goal can only have one open pause at a time. (A partial unique index: it only looks at open rows.)
CREATE UNIQUE INDEX IF NOT EXISTS goal_pauses_one_open
    ON public.goal_pauses (goal_id) WHERE resumed_on IS NULL;

-- Same columns as before, so everything that reads the view keeps working.
-- paused_days = for each pause that touches the month, the days of overlap, added up.
-- An open pause (resumed_on NULL) runs to 'infinity', so it covers the rest of the month.
CREATE OR REPLACE VIEW public.v_goal_monthly_targets AS
SELECT x.goal_id,
       x.month,
       x.frequency_per_week,
       x.days_in_month,
       GREATEST(ROUND(x.frequency_per_week * (x.days_in_month - x.paused_days) / 7.0), 1)::INTEGER AS target
FROM (
    SELECT g.id AS goal_id,
           m.month_start::DATE AS month,
           g.frequency_per_week,
           EXTRACT(DAY FROM m.month_start + INTERVAL '1 month' - INTERVAL '1 day')::INTEGER AS days_in_month,
           COALESCE((
               SELECT SUM(LEAST(COALESCE(gp.resumed_on, 'infinity'::DATE),
                                (m.month_start + INTERVAL '1 month')::DATE)
                          - GREATEST(gp.paused_on, m.month_start::DATE))
               FROM public.goal_pauses gp
               WHERE gp.goal_id = g.id
                 AND gp.paused_on < (m.month_start + INTERVAL '1 month')::DATE
                 AND COALESCE(gp.resumed_on, 'infinity'::DATE) > m.month_start::DATE
           ), 0)::INTEGER AS paused_days
    FROM public.goals g,
         generate_series(date_trunc('month', g.start_date::TIMESTAMP),
                         date_trunc('month', COALESCE(g.end_date, CURRENT_DATE)::TIMESTAMP),
                         INTERVAL '1 month') AS m(month_start)
) x
WHERE x.paused_days < x.days_in_month;

-- Same lock-down as 03_lock_down_api.sql: only the app's server can read this table.
ALTER TABLE public.goal_pauses ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.goal_pauses, public.v_goal_monthly_targets FROM anon, authenticated;

COMMIT;

-- Check: the table exists and the API can't read it.
SELECT c.relname AS table_name,
       c.relrowsecurity AS rls_enabled,
       has_table_privilege('anon', c.oid, 'SELECT') AS api_can_read
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('goal_pauses', 'v_goal_monthly_targets')
ORDER BY c.relname;
