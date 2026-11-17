-- ACC 556: Family Health Tracker. 01: schema (6 tables + 1 view) and the one real family.
-- Author: Nate Hansen
-- Environment: Supabase project "ACC556 Final Project" ONLY. Never run this in "ACC556 Class".
--
-- RUN ONCE. This script DROPS every table first, so it deletes ALL data, real family data included.
-- After the first setup, never run it again: the family's real check-ins live in these tables.
--
-- Order: 01_schema.sql -> 03_lock_down_api.sql -> 04_add_member.sql -> 07_strava.sql.
-- (02_remove_demo_data.sql is only for databases that were set up with the old demo data.)
--
-- PHASE 4 CHANGES IN ONE PARAGRAPH
--   goal_monthly_targets is gone. It only stored each goal's weekly frequency per month, and code had
--   to fill it on the first write of every month. Now a goal's frequency can't be edited: to change it,
--   you end the goal and start a new one. So the goal itself keeps the history, and the view
--   v_goal_monthly_targets calculates every month's target straight from goals. is_active became
--   start_date + end_date, because "paused" alone can't say WHEN a goal stopped counting.
--
-- LOGINS
--   auth.users is Supabase's login table (email + password). It is not created here. Each person's
--   profiles row uses the same id as their login, so "who is logged in" -> "which profile" -> "which family".
--   One family per person: profiles.family_id is a single foreign key.
--
-- UUID = a unique ID type. TIMESTAMPTZ = timestamp with time zone. gen_random_uuid() creates a new UUID.

BEGIN;

-- ============================================================
-- 1. DROP (children first, so foreign keys do not block the drops)
-- ============================================================
-- reactions and comments are outside this schema but point at checkins, so they go first.
-- CASCADE = also drop whatever depends on the table (foreign keys, security policies, views).
DROP VIEW IF EXISTS public.v_goal_monthly_targets;
DROP TABLE IF EXISTS public.reactions CASCADE;
DROP TABLE IF EXISTS public.comments CASCADE;
DROP TABLE IF EXISTS public.monthly_prize_winners CASCADE;
DROP TABLE IF EXISTS public.monthly_prizes CASCADE;
DROP TABLE IF EXISTS public.checkins CASCADE;
DROP TABLE IF EXISTS public.goal_monthly_targets CASCADE;   -- Removed in Phase 4; dropped here so old copies go away.
DROP TABLE IF EXISTS public.goals CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.families CASCADE;

-- ============================================================
-- 2. SCHEMA (3NF)
-- ============================================================

CREATE TABLE public.families (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,                      -- Not UNIQUE on purpose: two families can share a name.
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- PHASE 3 CHANGE: deleting the creator no longer blocks.
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    avatar_url TEXT,                         -- Optional.
    family_id UUID REFERENCES public.families(id) ON DELETE SET NULL,  -- PHASE 3 CHANGE: optional, so SET NULL fits.
    timezone TEXT NOT NULL DEFAULT 'America/Denver',
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category TEXT,
    frequency_per_week INTEGER NOT NULL CHECK (frequency_per_week BETWEEN 1 AND 7),
    source TEXT NOT NULL DEFAULT 'custom' CHECK (source IN ('template', 'custom')),
    start_date DATE NOT NULL,                -- PHASE 4 CHANGE: first day the goal counts.
    end_date DATE,                           -- PHASE 4 CHANGE: last day it counts. NULL = still running.
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    unit TEXT,
    CHECK (end_date IS NULL OR end_date >= start_date)
);
-- frequency_per_week is never updated by the app. To change it, end the goal and start a new one.

-- PHASE 3 CHANGE: user_id is gone. It was a transitive dependency (id -> goal_id -> user_id).
-- The owner is found by joining to goals.
CREATE TABLE public.checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
    checkin_date DATE NOT NULL,
    note TEXT,
    duration_minutes INTEGER CHECK (duration_minutes > 0),   -- Optional, but never zero or negative.
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (goal_id, checkin_date)                           -- One check-in per goal per day.
);

-- PHASE 3 CHANGE: split in two. awarded_at depended only on (family, month), not on the winner.
-- One row per family per month here; the winners go in monthly_prize_winners.
CREATE TABLE public.monthly_prizes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    month DATE NOT NULL CHECK (EXTRACT(DAY FROM month) = 1),
    awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (family_id, month)
);

-- Linking table. A tie means two rows for the same prize. Composite primary key = (prize_id, user_id).
CREATE TABLE public.monthly_prize_winners (
    prize_id UUID NOT NULL REFERENCES public.monthly_prizes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    PRIMARY KEY (prize_id, user_id)
);

-- PHASE 4 CHANGE: the view now reads goals directly (no snapshot table).
-- One row per goal per month the goal was running, from its start month through its end month
-- (or the current month if it hasn't ended). Same target rule as Phase 3, in one place:
--   target = ROUND(frequency_per_week * days_in_month / 7)
-- A goal counts for the full month in every month it touches.
CREATE VIEW public.v_goal_monthly_targets AS
SELECT x.goal_id,
       x.month,
       x.frequency_per_week,
       x.days_in_month,
       ROUND(x.frequency_per_week * x.days_in_month / 7.0)::INTEGER AS target
FROM (
    SELECT g.id AS goal_id,
           m.month_start::DATE AS month,
           g.frequency_per_week,
           EXTRACT(DAY FROM m.month_start + INTERVAL '1 month' - INTERVAL '1 day')::INTEGER AS days_in_month
    FROM public.goals g,
         -- generate_series lists the first day of every month from the start month to the end month.
         generate_series(date_trunc('month', g.start_date::TIMESTAMP),
                         date_trunc('month', COALESCE(g.end_date, CURRENT_DATE)::TIMESTAMP),
                         INTERVAL '1 month') AS m(month_start)
) x;

-- ============================================================
-- 3. THE REAL FAMILY
-- ============================================================
-- Fixed id so 04_add_member.sql can point at it.
INSERT INTO public.families (id, name, created_at) VALUES
    ('f0000000-0000-4000-8000-000000000001', 'The Hansen Family', now());

COMMIT;
