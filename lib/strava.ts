import "server-only";
import type { CurrentMember } from "./auth";
import { sql } from "./db";

// Strava, in three steps:
//   1. Connect: the person approves the app on strava.com (OAuth). We store their tokens in
//      strava_connections (app/strava/connect and app/strava/callback).
//   2. Sync: when they open Today (at most every 10 minutes) or tap "Sync now", the server asks
//      Strava for this month's activities and saves new ones in strava_activities.
//   3. Auto check-in: each NEW activity that matches one of their goals' strava_sport_type becomes
//      a check-in for that goal on that day.
// Only the owner ever sees their activity details (Strava's API terms). The family sees the check-in.

export { STRAVA_SPORT_TYPES } from "./strava-types";

const STRAVA = "https://www.strava.com";
const SYNC_EVERY_MINUTES = 10;

export function stravaConfigured(): boolean {
  return Boolean(process.env.STRAVA_CLIENT_ID && process.env.STRAVA_CLIENT_SECRET);
}

export function stravaAuthorizeUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID ?? "",
    redirect_uri: redirectUri,
    response_type: "code",
    approval_prompt: "auto",
    scope: "activity:read_all",
    state,
  });
  return `${STRAVA}/oauth/authorize?${params}`;
}

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_at: number; // seconds since 1970
  athlete?: { id: number };
};

async function tokenRequest(body: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(`${STRAVA}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      ...body,
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Strava token request failed (${res.status})`);
  return (await res.json()) as TokenResponse;
}

// Step 1: trade the one-time code from the callback for tokens, and save them.
export async function connectStrava(memberId: string, code: string): Promise<void> {
  const t = await tokenRequest({ code, grant_type: "authorization_code" });
  if (!t.athlete) throw new Error("Strava didn't say which athlete this is.");
  await sql`
    INSERT INTO public.strava_connections (profile_id, athlete_id, access_token, refresh_token, expires_at)
    VALUES (${memberId}, ${t.athlete.id}, ${t.access_token}, ${t.refresh_token}, to_timestamp(${t.expires_at}))
    ON CONFLICT (profile_id) DO UPDATE
    SET athlete_id     = EXCLUDED.athlete_id,
        access_token   = EXCLUDED.access_token,
        refresh_token  = EXCLUDED.refresh_token,
        expires_at     = EXCLUDED.expires_at,
        last_synced_at = NULL
  `;
}

type Connection = {
  access_token: string;
  refresh_token: string;
  expired: boolean;
  due: boolean; // last sync was long enough ago
};

async function getConnection(memberId: string): Promise<Connection | null> {
  const [row] = await sql<Connection[]>`
    SELECT access_token,
           refresh_token,
           expires_at < now() + INTERVAL '1 minute' AS expired,
           (last_synced_at IS NULL
            OR last_synced_at < now() - make_interval(mins => ${SYNC_EVERY_MINUTES})) AS due
    FROM public.strava_connections
    WHERE profile_id = ${memberId}
  `;
  return row ?? null;
}

// Access tokens last 6 hours. When one has expired, swap the refresh token for a new pair.
async function freshAccessToken(memberId: string, c: Connection): Promise<string> {
  if (!c.expired) return c.access_token;
  const t = await tokenRequest({ refresh_token: c.refresh_token, grant_type: "refresh_token" });
  await sql`
    UPDATE public.strava_connections
    SET access_token = ${t.access_token},
        refresh_token = ${t.refresh_token},
        expires_at = to_timestamp(${t.expires_at})
    WHERE profile_id = ${memberId}
  `;
  return t.access_token;
}

type StravaActivity = {
  id: number;
  name: string;
  sport_type: string;
  start_date_local: string; // "2026-11-17T06:30:00Z" (local clock time, despite the Z)
  distance: number; // meters
  moving_time: number; // seconds
};

export type SyncResult = { imported: number; checkedIn: number } | null;

// Steps 2 and 3. Skips quietly when not connected or synced recently (unless force).
export async function syncStrava(me: CurrentMember, force = false): Promise<SyncResult> {
  if (!stravaConfigured()) return null;
  const c = await getConnection(me.id);
  if (!c || (!c.due && !force)) return null;

  const token = await freshAccessToken(me.id, c);

  // This month's activities (Strava counts as proof, so it can fill in missed days this month).
  const after = Math.floor(new Date(`${me.month}T00:00:00Z`).getTime() / 1000) - 14 * 3600;
  const res = await fetch(`${STRAVA}/api/v3/athlete/activities?after=${after}&per_page=100`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Strava activities request failed (${res.status})`);
  const activities = (await res.json()) as StravaActivity[];

  const rows = activities
    .map((a) => ({
      id: a.id,
      profile_id: me.id,
      name: (a.name || a.sport_type).slice(0, 200),
      sport_type: a.sport_type,
      activity_date: a.start_date_local.slice(0, 10),
      distance_m: Math.max(0, Math.round((a.distance ?? 0) * 10) / 10),
      moving_time_s: Math.max(0, Math.round(a.moving_time ?? 0)),
    }))
    .filter((r) => r.activity_date >= me.month);

  let imported = 0;
  let checkedIn = 0;
  await sql.begin(async (tx) => {
    // New activities only. ON CONFLICT skips ones imported before, so an activity is only ever
    // turned into a check-in once; undoing that check-in sticks.
    let inserted: { id: string }[] = [];
    if (rows.length > 0) {
      // tx(rows) expands to (id, profile_id, name, ...) VALUES (...), (...): one row per activity.
      inserted = await tx<{ id: string }[]>`
        INSERT INTO public.strava_activities ${tx(rows)}
        ON CONFLICT (id) DO NOTHING
        RETURNING id
      `;
    }
    imported = inserted.length;

    if (inserted.length > 0) {
      const ids = inserted.map((r) => r.id);
      // Match each new activity to the owner's goals. 'Run' also matches TrailRun and VirtualRun,
      // 'Ride' matches VirtualRide, GravelRide, and so on (they end in the same word).
      // One activity checks in at most one goal (UNIQUE strava_activity_id), and one goal gets at
      // most one check-in per day (UNIQUE goal_id, checkin_date). ON CONFLICT DO NOTHING skips both.
      const created = await tx`
        INSERT INTO public.checkins (goal_id, checkin_date, strava_activity_id)
        SELECT DISTINCT ON (g.id, a.activity_date)
               g.id, a.activity_date, a.id
        FROM public.strava_activities a
        JOIN public.goals g ON g.user_id = a.profile_id
        WHERE a.id IN ${tx(ids)}
          AND g.strava_sport_type IS NOT NULL
          AND (g.strava_sport_type = 'Any' OR a.sport_type LIKE '%' || g.strava_sport_type)
          AND a.activity_date >= g.start_date
          AND (g.end_date IS NULL OR a.activity_date <= g.end_date)
        ORDER BY g.id, a.activity_date, a.id
        ON CONFLICT DO NOTHING
        RETURNING id
      `;
      checkedIn = created.length;
    }

    await tx`
      UPDATE public.strava_connections SET last_synced_at = now() WHERE profile_id = ${me.id}
    `;
  });
  return { imported, checkedIn };
}

// When a goal is linked to Strava (or created already linked), check it in for this month's
// activities that were imported earlier and haven't counted for anything yet.
// Same matching rules as the sync; NOT EXISTS skips activities that already made a check-in.
export async function matchGoalToStrava(memberId: string, goalId: string): Promise<number> {
  const created = await sql`
    INSERT INTO public.checkins (goal_id, checkin_date, strava_activity_id)
    SELECT DISTINCT ON (a.activity_date)
           g.id, a.activity_date, a.id
    FROM public.goals g
    JOIN public.strava_activities a ON a.profile_id = g.user_id
    WHERE g.id = ${goalId}
      AND g.user_id = ${memberId}
      AND g.strava_sport_type IS NOT NULL
      AND (g.strava_sport_type = 'Any' OR a.sport_type LIKE '%' || g.strava_sport_type)
      AND a.activity_date >= g.start_date
      AND (g.end_date IS NULL OR a.activity_date <= g.end_date)
      AND NOT EXISTS (SELECT 1 FROM public.checkins c WHERE c.strava_activity_id = a.id)
    ORDER BY a.activity_date, a.id
    ON CONFLICT DO NOTHING
    RETURNING id
  `;
  return created.length;
}

// Disconnect: tell Strava to revoke access, then forget the tokens and imported activities.
// Check-ins made from Strava stay (their strava_activity_id becomes NULL via ON DELETE SET NULL).
export async function disconnectStrava(memberId: string): Promise<void> {
  const c = await getConnection(memberId);
  if (c) {
    await fetch(`${STRAVA}/oauth/deauthorize`, {
      method: "POST",
      headers: { Authorization: `Bearer ${c.access_token}` },
      cache: "no-store",
    }).catch(() => undefined); // already revoked on Strava's side is fine
  }
  await sql.begin(async (tx) => {
    await tx`DELETE FROM public.strava_activities WHERE profile_id = ${memberId}`;
    await tx`DELETE FROM public.strava_connections WHERE profile_id = ${memberId}`;
  });
}
