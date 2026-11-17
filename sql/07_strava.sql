-- ACC 556: Family Health Tracker. 07: Strava (run after 01). Adds to the schema; deletes nothing.
-- Safe to re-run: IF NOT EXISTS skips anything that is already there.
-- Author: Nate Hansen
--
-- WHAT IT ADDS
--   strava_connections  one row per person who connected Strava (1-to-1 with profiles).
--                       Holds the tokens the server uses to ask Strava for that person's activities.
--   strava_activities   one row per imported Strava activity (1-to-many: a person has many).
--   goals.strava_sport_type      which Strava activities count for this goal: 'Run', 'Walk', 'Ride',
--                                'Swim', 'Hike', 'WeightTraining', 'Yoga', or 'Any'. NULL = manual only.
--   checkins.strava_activity_id  the activity that created this check-in (NULL = checked in by hand).
--                                UNIQUE: one activity can count for one check-in, never two.
--
-- 3NF NOTE: a Strava check-in does NOT copy the activity's minutes or distance into checkins.
-- Those depend on the activity, so they stay in strava_activities and are read with a JOIN.
--
-- PRIVACY: Strava's API terms say a person's Strava data may only be shown to that person.
-- The app shows activity details (name, distance, time) only to their owner. Family members see
-- only the check-in (the "done" circle), never the activity.

BEGIN;

CREATE TABLE IF NOT EXISTS public.strava_connections (
    profile_id     UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    athlete_id     BIGINT NOT NULL UNIQUE,          -- Strava's id for the person; one Strava account per profile
    access_token   TEXT NOT NULL,                   -- short-lived (6 hours); refreshed with refresh_token
    refresh_token  TEXT NOT NULL,
    expires_at     TIMESTAMPTZ NOT NULL,
    last_synced_at TIMESTAMPTZ,                     -- NULL = never synced
    connected_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.strava_activities (
    id            BIGINT PRIMARY KEY,               -- Strava's own activity id, so re-imports can't duplicate
    profile_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,
    sport_type    TEXT NOT NULL,                    -- e.g. Run, TrailRun, Walk, Ride, VirtualRide, Swim
    activity_date DATE NOT NULL,                    -- the local date it started
    distance_m    NUMERIC(10,1) NOT NULL DEFAULT 0 CHECK (distance_m >= 0),
    moving_time_s INTEGER NOT NULL CHECK (moving_time_s >= 0),
    imported_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.goals
    ADD COLUMN IF NOT EXISTS strava_sport_type TEXT
    CHECK (strava_sport_type IN ('Any', 'Run', 'Walk', 'Ride', 'Swim', 'Hike', 'WeightTraining', 'Yoga'));

ALTER TABLE public.checkins
    ADD COLUMN IF NOT EXISTS strava_activity_id BIGINT UNIQUE
    REFERENCES public.strava_activities(id) ON DELETE SET NULL;

-- Same lock-down as 03_lock_down_api.sql: only the app's server can read these tables.
-- Tokens are secrets, so this matters most here.
ALTER TABLE public.strava_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strava_activities  ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.strava_connections, public.strava_activities FROM anon, authenticated;

COMMIT;

-- Check: the new tables and columns exist.
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (table_name IN ('strava_connections', 'strava_activities')
       OR column_name IN ('strava_sport_type', 'strava_activity_id'))
ORDER BY table_name, ordinal_position;
