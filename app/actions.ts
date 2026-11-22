"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/auth";
import { PG_UNIQUE_VIOLATION, pgErrorCode, sql } from "@/lib/db";
import { memberProgress } from "@/lib/queries";
import {
  STRAVA_SPORT_TYPES,
  disconnectStrava as forgetStrava,
  matchGoalToStrava,
  syncStrava,
} from "@/lib/strava";
import { createSupabase } from "@/lib/supabase";

// Every write in the app. Two rules hold for all of them:
//   1. Who you are comes from the login session, never from the form or URL.
//      A Server Action can be called with any arguments, so ids that arrive
//      from the browser are only accepted after SQL checks they're yours.
//   2. Inputs are re-checked here, not just in the form.

export type ActionState = { ok: boolean; message: string } | null;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MONTH_RE = /^\d{4}-\d{2}-01$/;

const SIGNED_OUT: ActionState = { ok: false, message: "Please sign in again." };

// Thrown inside a transaction to roll it back with a message for the user.
class UserError extends Error {}

function text(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function fail(err: unknown): ActionState {
  if (err instanceof UserError) return { ok: false, message: err.message };
  console.error(err);
  return { ok: false, message: "Something went wrong saving that. Please try again." };
}

function refresh() {
  revalidatePath("/", "layout");
}

// ------------------------------------------------------------
// Login
// ------------------------------------------------------------
export async function signIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = text(formData, "email");
  const password = typeof formData.get("password") === "string" ? String(formData.get("password")) : "";
  if (!email || !password) return { ok: false, message: "Enter your email and password." };

  const supabase = await createSupabase();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, message: "Wrong email or password." };
  redirect("/");
}

export async function signOut() {
  const supabase = await createSupabase();
  await supabase.auth.signOut();
  redirect("/login");
}

// ------------------------------------------------------------
// Check-ins (Today page). Rule: only today or yesterday, only your own goals.
// ------------------------------------------------------------
async function checkDay(memberId: string, goalId: string, date: string) {
  const [goal] = await sql<
    { start_date: string; end_date: string | null; paused: boolean; today: string; yesterday: string }[]
  >`
    SELECT g.start_date::text,
           g.end_date::text,
           EXISTS (SELECT 1 FROM public.goal_pauses gp
                   WHERE gp.goal_id = g.id AND gp.resumed_on IS NULL) AS paused,
           (now() AT TIME ZONE p.timezone)::date::text       AS today,
           ((now() AT TIME ZONE p.timezone)::date - 1)::text AS yesterday
    FROM public.goals g
    JOIN public.profiles p ON p.id = g.user_id
    WHERE g.id = ${goalId} AND g.user_id = ${memberId}
  `;
  if (!goal) return "That isn't one of your goals.";
  if (goal.paused) return "That goal is paused. Resume it on the Goals page first.";
  if (date !== goal.today && date !== goal.yesterday) {
    return "You can only check in for today or yesterday.";
  }
  if (date < goal.start_date) return `That goal starts on ${goal.start_date}.`;
  if (goal.end_date !== null && date > goal.end_date) return "That goal has ended.";
  return null;
}

export async function logCheckin(
  goalId: string,
  date: string,
  _prev: ActionState,
  formData?: FormData,
): Promise<ActionState> {
  const me = await getCurrentMember();
  if (!me) return SIGNED_OUT;
  if (!UUID_RE.test(goalId)) return { ok: false, message: "Goal not found." };
  const note = formData ? text(formData, "note") : "";
  if (note.length > 280) return { ok: false, message: "Keep the note under 280 characters." };

  try {
    const problem = await checkDay(me.id, goalId, date);
    if (problem) return { ok: false, message: problem };
    await sql`
      INSERT INTO public.checkins (goal_id, checkin_date, note)
      VALUES (${goalId}, ${date}, ${note || null})
    `;
  } catch (err) {
    if (pgErrorCode(err) === PG_UNIQUE_VIOLATION) {
      return { ok: false, message: "Already checked in for that day." };
    }
    return fail(err);
  }
  refresh();
  return { ok: true, message: "Checked in." };
}

export async function undoCheckin(
  goalId: string,
  date: string,
  _prev: ActionState,
): Promise<ActionState> {
  const me = await getCurrentMember();
  if (!me) return SIGNED_OUT;
  if (!UUID_RE.test(goalId)) return { ok: false, message: "Goal not found." };

  try {
    const problem = await checkDay(me.id, goalId, date);
    if (problem) return { ok: false, message: problem };
    await sql`
      DELETE FROM public.checkins
      WHERE goal_id = ${goalId} AND checkin_date = ${date}
    `;
  } catch (err) {
    return fail(err);
  }
  refresh();
  return { ok: true, message: "Check-in removed." };
}

// ------------------------------------------------------------
// Goals (Goals page). Only your own.
// ------------------------------------------------------------
export async function createGoal(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await getCurrentMember();
  if (!me) return SIGNED_OUT;

  const title = text(formData, "title");
  const category = text(formData, "category");
  const unit = text(formData, "unit");
  const frequency = Number(text(formData, "frequency_per_week"));
  const strava = stravaType(text(formData, "strava_sport_type"));

  if (title.length < 2 || title.length > 80) {
    return { ok: false, message: "Give the goal a name (2 to 80 characters)." };
  }
  if (category.length > 40 || unit.length > 30) {
    return { ok: false, message: "Category or unit is too long." };
  }
  if (!Number.isInteger(frequency) || frequency < 1 || frequency > 7) {
    return { ok: false, message: "Times per week must be 1 to 7." };
  }
  if (strava === undefined) return { ok: false, message: "Pick a Strava activity type from the list." };

  let matched = 0;
  try {
    // A goal counts the full month it starts in (the target is a full month), so it starts on
    // the 1st of this month in your timezone. Hand check-ins are still today or yesterday only.
    const [goal] = await sql<{ id: string }[]>`
      INSERT INTO public.goals (user_id, title, category, frequency_per_week, unit, start_date, strava_sport_type)
      VALUES (${me.id}, ${title}, ${category || null}, ${frequency}, ${unit || null}, ${me.month}, ${strava})
      RETURNING id
    `;
    if (strava) matched = await matchGoalToStrava(me.id, goal.id);
  } catch (err) {
    return fail(err);
  }
  refresh();
  return {
    ok: true,
    message: matched > 0 ? `Added "${title}" with ${matched} check-in${matched === 1 ? "" : "s"} from Strava.` : `Added "${title}".`,
  };
}

// Ending a goal sets end_date to today. It still counts for this month and
// every earlier month, so history stays the same. Ending is permanent
// (pausing is the one you can undo): to change a goal, end it and add a new one.
export async function endGoal(goalId: string, _prev: ActionState): Promise<ActionState> {
  const me = await getCurrentMember();
  if (!me) return SIGNED_OUT;
  if (!UUID_RE.test(goalId)) return { ok: false, message: "Goal not found." };
  try {
    const rows = await sql`
      UPDATE public.goals
      SET end_date = GREATEST(${me.today}::date, start_date)
      WHERE id = ${goalId}
        AND user_id = ${me.id}
        AND end_date IS NULL
      RETURNING id
    `;
    if (rows.length === 0) return { ok: false, message: "That goal has already ended." };
  } catch (err) {
    return fail(err);
  }
  refresh();
  return { ok: true, message: "Goal ended." };
}

// Pausing adds a goal_pauses row starting today. Check-ins are kept. From today the goal is off
// the Today board, Strava stops checking it in, and paused days come out of the month's target
// (the view does that math). Earlier days and months are untouched.
export async function pauseGoal(goalId: string, _prev: ActionState): Promise<ActionState> {
  const me = await getCurrentMember();
  if (!me) return SIGNED_OUT;
  if (!UUID_RE.test(goalId)) return { ok: false, message: "Goal not found." };
  try {
    const rows = await sql`
      INSERT INTO public.goal_pauses (goal_id, paused_on)
      SELECT g.id, GREATEST(${me.today}::date, g.start_date)
      FROM public.goals g
      WHERE g.id = ${goalId}
        AND g.user_id = ${me.id}
        AND g.end_date IS NULL
        AND NOT EXISTS (SELECT 1 FROM public.goal_pauses gp
                        WHERE gp.goal_id = g.id AND gp.resumed_on IS NULL)
      RETURNING id
    `;
    if (rows.length === 0) return { ok: false, message: "That goal is already paused or has ended." };
  } catch (err) {
    if (pgErrorCode(err) === PG_UNIQUE_VIOLATION) {
      return { ok: false, message: "That goal is already paused." };
    }
    return fail(err);
  }
  refresh();
  return { ok: true, message: "Goal paused." };
}

// Resuming closes the open pause: the goal counts again from today. Resuming on the same day
// it was paused removes the pause, as if it never happened.
export async function resumeGoal(goalId: string, _prev: ActionState): Promise<ActionState> {
  const me = await getCurrentMember();
  if (!me) return SIGNED_OUT;
  if (!UUID_RE.test(goalId)) return { ok: false, message: "Goal not found." };
  try {
    const resumed = await sql.begin(async (tx) => {
      const sameDay = await tx`
        DELETE FROM public.goal_pauses gp
        USING public.goals g
        WHERE g.id = gp.goal_id
          AND g.id = ${goalId}
          AND g.user_id = ${me.id}
          AND gp.resumed_on IS NULL
          AND gp.paused_on >= ${me.today}::date
        RETURNING gp.id
      `;
      if (sameDay.length > 0) return true;
      const rows = await tx`
        UPDATE public.goal_pauses gp
        SET resumed_on = ${me.today}::date
        FROM public.goals g
        WHERE g.id = gp.goal_id
          AND g.id = ${goalId}
          AND g.user_id = ${me.id}
          AND gp.resumed_on IS NULL
        RETURNING gp.id
      `;
      return rows.length > 0;
    });
    if (!resumed) return { ok: false, message: "That goal isn't paused." };
  } catch (err) {
    return fail(err);
  }
  refresh();
  return { ok: true, message: "Goal resumed." };
}

// Deleting removes the goal and everything that hangs off it: its check-ins and pauses go with
// it (ON DELETE CASCADE). It can't be undone, and past months are recalculated without it.
// Prizes already awarded stay. To stop a goal but keep its history, pause or end it instead.
export async function deleteGoal(goalId: string, _prev: ActionState): Promise<ActionState> {
  const me = await getCurrentMember();
  if (!me) return SIGNED_OUT;
  if (!UUID_RE.test(goalId)) return { ok: false, message: "Goal not found." };
  try {
    const rows = await sql`
      DELETE FROM public.goals g
      WHERE g.id = ${goalId}
        AND g.user_id = ${me.id}
      RETURNING g.id
    `;
    if (rows.length === 0) return { ok: false, message: "Goal not found." };
  } catch (err) {
    return fail(err);
  }
  refresh();
  return { ok: true, message: "Goal deleted." };
}

// ------------------------------------------------------------
// Strava. Connecting happens in app/strava/connect and app/strava/callback.
// ------------------------------------------------------------
// "" = manual only (NULL); otherwise must be one of the allowed types; undefined = invalid.
function stravaType(value: string): string | null | undefined {
  if (value === "") return null;
  return (STRAVA_SPORT_TYPES as readonly string[]).includes(value) ? value : undefined;
}

// Which Strava activities count for one of your goals. Changing it only affects activities
// imported from now on; earlier check-ins stay as they are.
export async function setGoalStrava(
  goalId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await getCurrentMember();
  if (!me) return SIGNED_OUT;
  if (!UUID_RE.test(goalId)) return { ok: false, message: "Goal not found." };
  const strava = stravaType(text(formData, "strava_sport_type"));
  if (strava === undefined) return { ok: false, message: "Pick a Strava activity type from the list." };
  let matched = 0;
  try {
    const rows = await sql`
      UPDATE public.goals
      SET strava_sport_type = ${strava}
      WHERE id = ${goalId} AND user_id = ${me.id}
      RETURNING id
    `;
    if (rows.length === 0) return { ok: false, message: "Goal not found." };
    // Count this month's already-imported activities for this goal right away.
    matched = strava ? await matchGoalToStrava(me.id, goalId) : 0;
  } catch (err) {
    return fail(err);
  }
  refresh();
  if (!strava) return { ok: true, message: "Manual check-ins only." };
  return {
    ok: true,
    message:
      matched > 0
        ? `Saved. ${matched} check-in${matched === 1 ? "" : "s"} added from Strava.`
        : "Saved. New matching activities will check in.",
  };
}

export async function syncStravaNow(_prev: ActionState): Promise<ActionState> {
  const me = await getCurrentMember();
  if (!me) return SIGNED_OUT;
  try {
    const result = await syncStrava(me, true);
    refresh();
    if (!result) return { ok: false, message: "Strava isn't connected." };
    return {
      ok: true,
      message:
        result.imported === 0
          ? "Up to date."
          : `${result.imported} new ${result.imported === 1 ? "activity" : "activities"}, ${result.checkedIn} check-in${result.checkedIn === 1 ? "" : "s"}.`,
    };
  } catch (err) {
    console.error(err);
    return { ok: false, message: "Couldn't reach Strava. Try again in a minute." };
  }
}

export async function disconnectStrava(_prev: ActionState): Promise<ActionState> {
  const me = await getCurrentMember();
  if (!me) return SIGNED_OUT;
  try {
    await forgetStrava(me.id);
  } catch (err) {
    return fail(err);
  }
  refresh();
  return { ok: true, message: "Strava disconnected." };
}

// ------------------------------------------------------------
// Monthly prize (Leaderboard page). Family admins only.
// ------------------------------------------------------------
// Rule: the family member(s) with the highest completion rate win, as long
// as they checked in at least once. A tie means more than one winner row for
// the same prize. Runs in one transaction, so a prize is never saved without
// its winners.
export async function awardPrize(month: string, _prev: ActionState): Promise<ActionState> {
  const me = await getCurrentMember();
  if (!me) return SIGNED_OUT;
  if (me.role !== "admin") return { ok: false, message: "Only a family admin can award the prize." };
  if (!MONTH_RE.test(month)) return { ok: false, message: "Unknown month." };
  const familyId = me.family_id;

  let winners: string[] = [];
  try {
    await sql.begin(async (tx) => {
      const [check] = await tx<{ ended: boolean }[]>`
        SELECT (${month}::date + INTERVAL '1 month') <= current_date AS ended
      `;
      if (!check.ended) throw new UserError("The month isn't over yet.");

      const [prize] = await tx<{ id: string }[]>`
        INSERT INTO public.monthly_prizes (family_id, month)
        VALUES (${familyId}, ${month})
        ON CONFLICT (family_id, month) DO NOTHING
        RETURNING id
      `;
      if (!prize) throw new UserError("This prize was already awarded.");

      const rows = await tx<{ full_name: string }[]>`
        WITH member_progress AS (${memberProgress(tx, familyId, month)}),
        ranked AS (
            SELECT id, full_name,
                   RANK() OVER (ORDER BY checkins::numeric / target DESC) AS place
            FROM member_progress
            WHERE target > 0
              AND checkins > 0   -- a 0% month wins nothing, even if everyone tied at 0
        ),
        inserted AS (
            INSERT INTO public.monthly_prize_winners (prize_id, user_id)
            SELECT ${prize.id}, id FROM ranked WHERE place = 1
            RETURNING user_id
        )
        SELECT r.full_name
        FROM inserted i
        JOIN ranked r ON r.id = i.user_id
        ORDER BY r.full_name
      `;
      if (rows.length === 0) {
        throw new UserError("No one in this family checked in that month, so there is no winner.");
      }
      winners = rows.map((r) => r.full_name);
    });
  } catch (err) {
    return fail(err);
  }
  refresh();
  return { ok: true, message: `Awarded to ${winners.join(" and ")}.` };
}
