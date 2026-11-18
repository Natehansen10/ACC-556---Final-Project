import "server-only";
import { connection } from "next/server";
import type postgres from "postgres";
import { sql } from "./db";

// Every read the app makes lives in this file, as plain SQL.
// Dates come back as text (YYYY-MM-DD) and counts as int, so nothing here
// depends on the server's local timezone or on JavaScript's Date parsing.

// Accepts the shared pool or an open transaction, so the same SQL can be
// read on a page and reused inside the prize-award transaction.
export type Db = postgres.Sql | postgres.TransactionSql;

// ------------------------------------------------------------
// Shared building block: one member's progress for one month.
// ------------------------------------------------------------
// For every goal that has a target row that month (the view calculates the
// target), count the check-ins that fall inside the month, then add them up
// per member. LEFT JOIN on checkins keeps goals with zero check-ins in the
// total, so a skipped goal still counts against you.
//
// Used by both the leaderboard and the prize award, so the number you see is
// the number that decides the prize.
export function memberProgress(db: Db, familyId: string, month: string) {
  const q = db as postgres.Sql;
  return q`
    SELECT p.id,
           p.full_name,
           p.role,
           COUNT(gp.goal_id)::int                 AS goals,
           COALESCE(SUM(gp.checkins), 0)::int     AS checkins,
           COALESCE(SUM(gp.target), 0)::int       AS target
    FROM public.profiles p
    LEFT JOIN (
        SELECT g.user_id,
               t.goal_id,
               t.target,
               COUNT(c.id) AS checkins
        FROM public.v_goal_monthly_targets t
        JOIN public.goals g ON g.id = t.goal_id
        LEFT JOIN public.checkins c
               ON c.goal_id = t.goal_id
              AND c.checkin_date >= t.month
              AND c.checkin_date <  (t.month + INTERVAL '1 month')::date
        WHERE t.month = ${month}
        GROUP BY g.user_id, t.goal_id, t.target
    ) gp ON gp.user_id = p.id
    WHERE p.family_id = ${familyId}
    GROUP BY p.id, p.full_name, p.role
  `;
}

// ------------------------------------------------------------
// Navigation data
// ------------------------------------------------------------
// Months in which at least one of this family's goals was running, newest first.
export async function getMonths(familyId: string): Promise<string[]> {
  await connection();
  const rows = await sql<{ month: string }[]>`
    SELECT DISTINCT t.month::text AS month
    FROM public.v_goal_monthly_targets t
    JOIN public.goals g    ON g.id = t.goal_id
    JOIN public.profiles p ON p.id = g.user_id
    WHERE p.family_id = ${familyId}
    ORDER BY month DESC
  `;
  return rows.map((r) => r.month);
}

export type DbStats = { members: number; goals: number; checkins: number };

// Footer proof that the page is live from the database: this family's row counts.
export async function getFamilyStats(familyId: string): Promise<DbStats> {
  await connection();
  const [row] = await sql<DbStats[]>`
    SELECT (SELECT COUNT(*) FROM public.profiles p WHERE p.family_id = ${familyId})::int AS members,
           (SELECT COUNT(*) FROM public.goals g
              JOIN public.profiles p ON p.id = g.user_id
             WHERE p.family_id = ${familyId})::int AS goals,
           (SELECT COUNT(*) FROM public.checkins c
              JOIN public.goals g    ON g.id = c.goal_id
              JOIN public.profiles p ON p.id = g.user_id
             WHERE p.family_id = ${familyId})::int AS checkins
  `;
  return row;
}

// ------------------------------------------------------------
// Leaderboard (the win condition)
// ------------------------------------------------------------
export type LeaderboardRow = {
  id: string;
  full_name: string;
  role: string;
  goals: number;
  checkins: number;
  target: number;
  pct: number | null;
  place: number | null;
  won: boolean;
};

// RANK() is a window function: it numbers members by completion rate inside
// the family, and gives tied members the same place (two 1st places, then 3rd).
// Members with no target that month get no place instead of a fake 0%.
export async function getLeaderboard(
  familyId: string,
  month: string,
): Promise<LeaderboardRow[]> {
  await connection();
  return sql<LeaderboardRow[]>`
    WITH member_progress AS (${memberProgress(sql, familyId, month)})
    SELECT m.*,
           ROUND(100.0 * m.checkins / NULLIF(m.target, 0), 1)::float8 AS pct,
           (CASE WHEN m.target > 0 THEN
               RANK() OVER (PARTITION BY m.target > 0
                            ORDER BY m.checkins::numeric / NULLIF(m.target, 0) DESC)
            END)::int AS place,
           EXISTS (SELECT 1
                   FROM public.monthly_prize_winners w
                   JOIN public.monthly_prizes pr ON pr.id = w.prize_id
                   WHERE pr.family_id = ${familyId}
                     AND pr.month = ${month}
                     AND w.user_id = m.id) AS won
    FROM member_progress m
    ORDER BY place NULLS LAST, m.full_name
  `;
}

export type GoalBreakdownRow = {
  user_id: string;
  title: string;
  unit: string | null;
  frequency_per_week: number;
  target: number;
  checkins: number;
};

// Per-goal detail under each member on the leaderboard.
export async function getGoalBreakdown(
  familyId: string,
  month: string,
): Promise<GoalBreakdownRow[]> {
  await connection();
  return sql<GoalBreakdownRow[]>`
    SELECT g.user_id,
           g.title,
           g.unit,
           t.frequency_per_week,
           t.target,
           COUNT(c.id)::int AS checkins
    FROM public.v_goal_monthly_targets t
    JOIN public.goals g    ON g.id = t.goal_id
    JOIN public.profiles p ON p.id = g.user_id
    LEFT JOIN public.checkins c
           ON c.goal_id = t.goal_id
          AND c.checkin_date >= t.month
          AND c.checkin_date <  (t.month + INTERVAL '1 month')::date
    WHERE t.month = ${month}
      AND p.family_id = ${familyId}
    GROUP BY g.user_id, g.title, g.unit, t.frequency_per_week, t.target, g.created_at
    ORDER BY g.created_at
  `;
}

export type PrizeStatus = {
  awarded_at: string | null;
  month_has_ended: boolean;
};

export async function getPrizeStatus(
  familyId: string,
  month: string,
): Promise<PrizeStatus> {
  await connection();
  const [row] = await sql<PrizeStatus[]>`
    SELECT (SELECT to_char(pr.awarded_at AT TIME ZONE 'UTC', 'Mon FMDD, YYYY')
            FROM public.monthly_prizes pr
            WHERE pr.family_id = ${familyId} AND pr.month = ${month}) AS awarded_at,
           (${month}::date + INTERVAL '1 month') <= current_date AS month_has_ended
  `;
  return row;
}

// ------------------------------------------------------------
// Family members
// ------------------------------------------------------------
export type FamilyMember = { id: string; full_name: string; role: string };

export async function getFamilyMembers(familyId: string): Promise<FamilyMember[]> {
  await connection();
  return sql<FamilyMember[]>`
    SELECT p.id, p.full_name, p.role
    FROM public.profiles p
    WHERE p.family_id = ${familyId}
    ORDER BY p.full_name
  `;
}

// ------------------------------------------------------------
// Today page: every goal x the last 7 days, done or not
// ------------------------------------------------------------
export type TodayCell = {
  member_id: string;
  goal_id: string;
  title: string;
  frequency_per_week: number;
  day: string;
  counts: boolean; // false = before the goal started or after it ended
  done: boolean;
  note: string | null;
};

// generate_series makes one row per day (6 days ago through today).
// CROSS JOIN pairs every goal with every day; LEFT JOIN checkins marks the
// days that have a check-in. No check-in row = not done that day.
export async function getTodayBoard(familyId: string, today: string): Promise<TodayCell[]> {
  await connection();
  return sql<TodayCell[]>`
    SELECT g.user_id AS member_id,
           g.id      AS goal_id,
           g.title,
           g.frequency_per_week,
           d.day::date::text AS day,
           (d.day::date >= g.start_date
            AND (g.end_date IS NULL OR d.day::date <= g.end_date)) AS counts,
           (c.id IS NOT NULL) AS done,
           c.note
    FROM public.goals g
    JOIN public.profiles p ON p.id = g.user_id
    CROSS JOIN generate_series((${today}::date - 6)::timestamp,
                               ${today}::date::timestamp,
                               INTERVAL '1 day') AS d(day)
    LEFT JOIN public.checkins c
           ON c.goal_id = g.id
          AND c.checkin_date = d.day::date
    WHERE p.family_id = ${familyId}
      AND g.start_date <= ${today}::date
      AND (g.end_date IS NULL OR g.end_date >= ${today}::date - 6)
    ORDER BY g.start_date, g.created_at, d.day
  `;
}

// ------------------------------------------------------------
// Goals page: every goal in the family with this month's progress
// ------------------------------------------------------------
export type FamilyGoal = {
  id: string;
  user_id: string;
  title: string;
  category: string | null;
  unit: string | null;
  frequency_per_week: number;
  start_date: string;
  end_date: string | null;
  month_target: number | null;
  month_checkins: number;
  total_checkins: number;
  strava_sport_type: string | null;
};

export async function getFamilyGoals(familyId: string, month: string): Promise<FamilyGoal[]> {
  await connection();
  return sql<FamilyGoal[]>`
    SELECT g.id,
           g.user_id,
           g.title,
           g.category,
           g.unit,
           g.frequency_per_week,
           g.start_date::text,
           g.end_date::text,
           t.target AS month_target,
           (SELECT COUNT(*) FROM public.checkins c
             WHERE c.goal_id = g.id
               AND c.checkin_date >= ${month}::date
               AND c.checkin_date <  (${month}::date + INTERVAL '1 month')::date
           )::int AS month_checkins,
           (SELECT COUNT(*) FROM public.checkins c WHERE c.goal_id = g.id)::int AS total_checkins,
           g.strava_sport_type
    FROM public.goals g
    JOIN public.profiles p ON p.id = g.user_id
    LEFT JOIN public.v_goal_monthly_targets t
           ON t.goal_id = g.id AND t.month = ${month}
    WHERE p.family_id = ${familyId}
      AND (g.end_date IS NULL OR g.end_date >= ${month}::date)
    ORDER BY (g.end_date IS NULL) DESC, g.start_date, g.created_at
  `;
}

// ------------------------------------------------------------
// Strava (only ever for the logged-in person: Strava's terms say a person's
// activities may only be shown to that person)
// ------------------------------------------------------------
export type StravaStatus = { connected: boolean; last_synced: string | null };

export async function getStravaStatus(memberId: string): Promise<StravaStatus> {
  await connection();
  const [row] = await sql<{ last_synced: string | null }[]>`
    SELECT to_char(last_synced_at AT TIME ZONE p.timezone, 'Mon FMDD, FMHH12:MI AM') AS last_synced
    FROM public.strava_connections s
    JOIN public.profiles p ON p.id = s.profile_id
    WHERE s.profile_id = ${memberId}
  `;
  return row ? { connected: true, last_synced: row.last_synced } : { connected: false, last_synced: null };
}

export type MyStravaActivity = {
  id: string;
  name: string;
  sport_type: string;
  activity_date: string;
  distance_km: number;
  minutes: number;
  counted_for: string | null; // goal title, when it became a check-in
};

export async function getMyStravaActivities(memberId: string, limit = 5): Promise<MyStravaActivity[]> {
  await connection();
  return sql<MyStravaActivity[]>`
    SELECT a.id::text,
           a.name,
           a.sport_type,
           a.activity_date::text,
           ROUND(a.distance_m / 1000.0, 1)::float8 AS distance_km,
           ROUND(a.moving_time_s / 60.0)::int      AS minutes,
           g.title AS counted_for
    FROM public.strava_activities a
    LEFT JOIN public.checkins c ON c.strava_activity_id = a.id
    LEFT JOIN public.goals g    ON g.id = c.goal_id
    WHERE a.profile_id = ${memberId}
    ORDER BY a.activity_date DESC, a.id DESC
    LIMIT ${limit}
  `;
}
