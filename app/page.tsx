import Link from "next/link";
import { disconnectStrava, logCheckin, syncStravaNow, undoCheckin } from "@/app/actions";
import { ActionButton, CheckDot, DoneTodayForm } from "@/components/forms";
import { Alert, Card, EmptyState, secondaryButtonClass } from "@/components/ui";
import { requireMember } from "@/lib/auth";
import { formatDay, formatWeekday, lastDays } from "@/lib/format";
import {
  getFamilyMembers,
  getMyStravaActivities,
  getStravaStatus,
  getTodayBoard,
  type TodayCell,
} from "@/lib/queries";
import { stravaConfigured, syncStrava } from "@/lib/strava";
import { stravaTypeLabel } from "@/lib/strava-types";

// Messages after coming back from strava.com (?strava=...).
const STRAVA_NOTICES: Record<string, { ok: boolean; text: string }> = {
  connected: { ok: true, text: "Strava connected. Your activities this month were imported." },
  denied: { ok: false, text: "Strava wasn't connected (access was declined)." },
  "no-activity-access": { ok: false, text: "Strava was connected without activity access. Connect again and allow it." },
  "already-linked": { ok: false, text: "That Strava account is already linked to another family member." },
  expired: { ok: false, text: "That Strava link expired. Try Connect Strava again." },
  failed: { ok: false, text: "Couldn't connect to Strava. Try again in a minute." },
  "not-configured": { ok: false, text: "Strava isn't set up for this app yet (missing API keys)." },
};

// Today: every family member, every goal, the last 7 days.
// Your own rows are where you check in (today or yesterday only).
export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ strava?: string }>;
}) {
  const me = await requireMember();
  // Pull new Strava activities first (at most every 10 minutes), so auto check-ins show below.
  // A Strava outage must never break the page, so errors are only logged.
  await syncStrava(me).catch((err) => console.error("Strava sync failed:", err));
  const notice = STRAVA_NOTICES[(await searchParams).strava ?? ""];

  const [members, cells] = await Promise.all([
    getFamilyMembers(me.family_id),
    getTodayBoard(me.family_id, me.today),
  ]);
  const days = lastDays(me.today, 7);

  // Viewer first, then everyone else by name.
  const ordered = [
    ...members.filter((m) => m.id === me.id),
    ...members.filter((m) => m.id !== me.id),
  ];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Today</h1>
        <p className="mt-1 text-sm text-muted">
          {formatDay(me.today)} · {me.family_name}. Tap your own circles for today or
          yesterday to check in; tap again to undo.
        </p>
      </div>

      {notice && <Alert ok={notice.ok}>{notice.text}</Alert>}

      {ordered.map((m) => {
        const mine = m.id === me.id;
        const goals = groupByGoal(cells.filter((c) => c.member_id === m.id));
        const doneToday = goals.filter((g) => g.days.find((d) => d.day === me.today)?.done).length;

        return (
          <Card key={m.id}>
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-base font-semibold">
                {m.full_name}
                {mine && <span className="ml-2 text-sm font-normal text-muted">(you)</span>}
              </h2>
              {goals.length > 0 && (
                <p className="text-sm text-muted tabular-nums">
                  {doneToday} of {goals.length} done today
                </p>
              )}
            </div>

            {goals.length === 0 ? (
              mine ? (
                <EmptyState
                  title="You don't have a goal yet"
                  description="Add one, then check in here each day."
                  action={
                    <Link href="/goals" className={secondaryButtonClass}>
                      Add a goal
                    </Link>
                  }
                />
              ) : (
                <p className="text-sm text-muted">No goals yet.</p>
              )
            ) : (
              <ul className="flex flex-col divide-y divide-divider">
                {goals.map((g) => {
                  const today = g.days.find((d) => d.day === me.today);
                  return (
                    <li key={g.goal_id} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="font-medium">
                          {g.title}{" "}
                          <span className="text-xs font-normal text-muted">
                            {g.frequency_per_week}×/week
                          </span>
                        </p>
                        <ol className="flex gap-1.5" aria-label={`${g.title}, last 7 days`}>
                          {days.map((day) => {
                            const cell = g.days.find((d) => d.day === day);
                            const tappable =
                              mine && cell?.counts && (day === me.today || day === me.yesterday);
                            return (
                              <li key={day} className="flex w-8 flex-col items-center gap-0.5">
                                <span className="text-[10px] uppercase text-muted">
                                  {formatWeekday(day).slice(0, 2)}
                                </span>
                                {tappable && cell ? (
                                  <CheckDot
                                    done={cell.done}
                                    label={`${cell.done ? "Undo" : "Check in"} ${g.title}, ${formatDay(day)}`}
                                    action={
                                      cell.done
                                        ? undoCheckin.bind(null, g.goal_id, day)
                                        : logCheckin.bind(null, g.goal_id, day)
                                    }
                                  />
                                ) : (
                                  <Dot cell={cell} isToday={day === me.today} />
                                )}
                              </li>
                            );
                          })}
                        </ol>
                      </div>
                      {today?.done && today.note && (
                        <p className="mt-1 text-sm text-muted">&ldquo;{today.note}&rdquo;</p>
                      )}
                      {mine && today?.counts && !today.done && (
                        <DoneTodayForm action={logCheckin.bind(null, g.goal_id, me.today)} />
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {mine && stravaConfigured() && <StravaPanel memberId={me.id} />}
          </Card>
        );
      })}

      <p className="text-xs text-muted">
        <span className="mr-1 inline-block h-3 w-3 rounded-full bg-success-500 align-middle" /> done
        <span className="ml-3 mr-1 inline-block h-3 w-3 rounded-full border-2 border-neutral-300 align-middle" /> not done
        <span className="ml-3 mr-1 inline-block w-3 border-t-2 border-neutral-200 align-middle" /> goal not running that day
      </p>
    </div>
  );
}

// A read-only day: filled = done, outline = not done, dash = goal not running.
function Dot({ cell, isToday }: { cell?: TodayCell; isToday: boolean }) {
  if (!cell || !cell.counts) {
    return <span className="flex h-7 w-7 items-center justify-center" aria-label="Not running">
      <span className="w-3 border-t-2 border-neutral-200" />
    </span>;
  }
  return (
    <span
      aria-label={cell.done ? "Done" : isToday ? "Not done yet" : "Not done"}
      className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs ${
        cell.done
          ? "border-success-500 bg-success-500 text-white"
          : "border-neutral-300 bg-white"
      }`}
    >
      {cell.done ? "✓" : ""}
    </span>
  );
}

// Rows arrive one per goal per day; fold them into one entry per goal.
function groupByGoal(cells: TodayCell[]) {
  const goals: { goal_id: string; title: string; frequency_per_week: number; days: TodayCell[] }[] = [];
  for (const c of cells) {
    let g = goals.find((x) => x.goal_id === c.goal_id);
    if (!g) {
      g = { goal_id: c.goal_id, title: c.title, frequency_per_week: c.frequency_per_week, days: [] };
      goals.push(g);
    }
    g.days.push(c);
  }
  return goals;
}

// Your Strava: status, buttons, and your last 5 activities. Only ever rendered on your own card:
// Strava's API terms say a person's activities may only be shown to that person.
async function StravaPanel({ memberId }: { memberId: string }) {
  const status = await getStravaStatus(memberId);
  if (!status.connected) {
    return (
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-divider pt-3">
        <p className="text-sm text-muted">
          Connect Strava and matching activities check in your goals automatically.
        </p>
        {/* A plain link, not a form: the route redirects to strava.com. */}
        <a href="/strava/connect" className="inline-flex items-center rounded-md bg-[#FC4C02] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90">
          Connect with Strava
        </a>
      </div>
    );
  }
  const activities = await getMyStravaActivities(memberId);
  return (
    <div className="mt-4 border-t border-divider pt-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm">
          <span className="font-medium text-[#FC4C02]">Strava</span>
          <span className="text-muted">
            {" "}
            · only you see this list{status.last_synced && ` · synced ${status.last_synced}`}
          </span>
        </p>
        <div className="flex gap-2">
          <ActionButton action={syncStravaNow} label="Sync now" pendingLabel="Syncing…" showSuccess />
          <ActionButton
            action={disconnectStrava}
            label="Disconnect"
            pendingLabel="Disconnecting…"
            confirm="Disconnect Strava? Check-ins it already made stay."
          />
        </div>
      </div>
      {activities.length === 0 ? (
        <p className="mt-2 text-sm text-muted">No Strava activities this month yet.</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-1 text-sm">
          {activities.map((a) => (
            <li key={a.id} className="flex flex-wrap justify-between gap-x-3">
              <span>
                {formatDay(a.activity_date)} · {a.name}{" "}
                <span className="text-muted">
                  ({stravaTypeLabel(a.sport_type)}
                  {a.distance_km > 0 && `, ${a.distance_km} km`}, {a.minutes} min)
                </span>
              </span>
              <span className="text-xs text-muted">
                {a.counted_for ? `Counted for ${a.counted_for}` : "Not matched to a goal"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
