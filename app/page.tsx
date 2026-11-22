import Link from "next/link";
import { disconnectStrava, logCheckin, syncStravaNow, undoCheckin } from "@/app/actions";
import { ActionButton, CheckRow, NoteCheckinForm } from "@/components/forms";
import {
  Alert,
  Card,
  CheckIcon,
  ChevronIcon,
  EmptyState,
  PageHeader,
  buttonClass,
  summaryClass,
  titleClass,
} from "@/components/ui";
import { requireMember } from "@/lib/auth";
import { formatDay, formatWeekday, weekDays } from "@/lib/format";
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

type Goal = { goal_id: string; title: string; frequency_per_week: number; days: TodayCell[] };

// Today: your goals first (one big button each), then the family's week (Sunday to Saturday).
// You can check in for today or yesterday, on your own goals only.
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
  // This week, Sunday to Saturday. The board query returns the last 7 days, which always
  // covers Sunday through today; later days this week are drawn as empty slots.
  const days = weekDays(me.today);
  const goalsOf = (memberId: string) => groupByGoal(cells.filter((c) => c.member_id === memberId));

  const myGoals = goalsOf(me.id);
  const myActive = myGoals.filter((g) => dayOf(g, me.today)?.counts);
  const myDone = myActive.filter((g) => dayOf(g, me.today)?.done).length;
  const allDone = myActive.length > 0 && myDone === myActive.length;
  const others = members.filter((m) => m.id !== me.id);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Today">{formatDay(me.today)}</PageHeader>

      {notice && <Alert ok={notice.ok}>{notice.text}</Alert>}

      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <h2 className={titleClass}>Your goals</h2>
          {myActive.length > 0 &&
            (allDone ? (
              <p className="inline-flex items-center gap-1.5 rounded-full bg-success-100 px-2.5 py-1 text-sm font-semibold text-success-700">
                <CheckIcon className="h-4 w-4" />
                All done today
              </p>
            ) : (
              <p className="text-sm text-muted tabular-nums">
                {myDone} of {myActive.length} done today
              </p>
            ))}
        </div>

        {myGoals.length === 0 ? (
          <EmptyState
            title="Start with one goal"
            description="Pick one habit, like a daily walk. Then tap it here each day you do it. Your family sees your progress."
            action={
              <Link href="/goals" className={buttonClass}>
                Add your first goal
              </Link>
            }
          />
        ) : (
          <ul className="flex flex-col gap-4">
            {myGoals.map((g) => (
              <li key={g.goal_id}>
                <MyGoal goal={g} days={days} today={me.today} yesterday={me.yesterday} />
              </li>
            ))}
          </ul>
        )}

        {stravaConfigured() && <StravaPanel memberId={me.id} hasGoals={myGoals.length > 0} />}
      </Card>

      {others.length > 0 && (
        <section aria-labelledby="family-heading" className="flex flex-col gap-3">
          <h2 id="family-heading" className={titleClass}>
            Family
          </h2>
          <Card className="!p-0">
            <ul className="divide-y divide-divider">
              {others.map((m) => {
                const goals = goalsOf(m.id);
                const active = goals.filter((g) => dayOf(g, me.today)?.counts);
                const done = active.filter((g) => dayOf(g, me.today)?.done).length;
                return (
                  <li key={m.id} className="p-4 sm:p-5">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                      <h3 className="min-w-0 font-semibold break-words">{m.full_name}</h3>
                      {active.length > 0 ? (
                        <p
                          className={`text-sm tabular-nums ${
                            done === active.length ? "font-medium text-success-700" : "text-muted"
                          }`}
                        >
                          {done === active.length ? "All done today" : `${done} of ${active.length} done today`}
                        </p>
                      ) : (
                        <p className="text-sm text-muted">No goals yet</p>
                      )}
                    </div>
                    {goals.length > 0 && (
                      <ul className="mt-3 flex flex-col gap-3">
                        {goals.map((g) => (
                          <li key={g.goal_id} className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                            <div className="min-w-0">
                              <p className="font-medium text-pretty break-words">{g.title}</p>
                              <p className="text-sm text-muted tabular-nums">{weekLine(g, days)}</p>
                              {dayOf(g, me.today)?.note && (
                                <p className="mt-1 text-sm text-foreground/85 text-pretty">
                                  &ldquo;{dayOf(g, me.today)?.note}&rdquo;
                                </p>
                              )}
                            </div>
                            <DayDots goal={g} days={days} today={me.today} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>
        </section>
      )}
    </div>
  );
}

// One of your goals: the big check-in button, the week at a glance, and the two
// smaller actions (yesterday, note).
function MyGoal({
  goal: g,
  days,
  today,
  yesterday,
}: {
  goal: Goal;
  days: string[];
  today: string;
  yesterday: string;
}) {
  const t = dayOf(g, today);
  const y = dayOf(g, yesterday);

  if (!t?.counts) {
    // Ended (or not started) but still inside the 7-day window: show it read-only.
    return (
      <div className="flex flex-col gap-1.5 rounded-xl border border-dashed border-upcoming px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium">{g.title}</p>
          <p className="text-sm text-muted">Not running today</p>
        </div>
        <DayDots goal={g} days={days} today={today} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <CheckRow
        action={t.done ? undoCheckin.bind(null, g.goal_id, today) : logCheckin.bind(null, g.goal_id, today)}
        done={t.done}
        title={g.title}
        detail={freqLabel(g.frequency_per_week)}
      />
      {t.done && t.note && (
        <p className="px-1 text-sm text-foreground/85 text-pretty">&ldquo;{t.note}&rdquo;</p>
      )}
      <div className="flex flex-wrap items-end gap-x-4 gap-y-1 px-1">
        <DayDots goal={g} days={days} today={today} />
        <p className="pb-0.5 text-sm text-muted tabular-nums">{countLine(g, days)}</p>
      </div>
      <div className="flex flex-wrap items-start gap-x-3">
        {y?.counts && (
          <ActionButton
            action={y.done ? undoCheckin.bind(null, g.goal_id, yesterday) : logCheckin.bind(null, g.goal_id, yesterday)}
            label={y.done ? "Undo yesterday" : "Mark yesterday done"}
            pendingLabel="Saving…"
            variant="quiet"
            align="start"
          />
        )}
        {!t.done && (
          <details className="open:basis-full">
            <summary className={`${summaryClass} px-2`}>
              <ChevronIcon />
              Add a note
            </summary>
            <NoteCheckinForm action={logCheckin.bind(null, g.goal_id, today)} goalTitle={g.title} />
          </details>
        )}
      </div>
    </div>
  );
}

// This week (Sunday to Saturday) for one goal. Done = olive check. Missed = a faint dot.
// Today, not done yet = an open charcoal ring. Later this week = a light dashed ring. Not running = blank.
function DayDots({ goal, days, today }: { goal: Goal; days: string[]; today: string }) {
  return (
    <ol className="flex shrink-0 gap-1 select-none" aria-label={`${goal.title}, this week`}>
      {days.map((day) => {
        const cell = goal.days.find((d) => d.day === day);
        const isToday = day === today;
        const status = day > today
          ? "upcoming"
          : !cell?.counts
          ? "not running"
          : cell.done
            ? "done"
            : isToday
              ? "not done yet"
              : "missed";
        return (
          <li key={day} className="flex w-9 flex-col items-center gap-1">
            <span
              aria-hidden
              className={`text-xs ${isToday ? "font-semibold text-foreground" : "text-muted"}`}
            >
              {isToday ? "Today" : formatWeekday(day)}
            </span>
            <span className="flex h-6 w-6 items-center justify-center" aria-hidden>
              {status === "done" ? (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-success-600 text-white">
                  <CheckIcon className="h-3.5 w-3.5" />
                </span>
              ) : status === "not done yet" ? (
                <span className="h-6 w-6 rounded-full border-2 border-accent-700" />
              ) : status === "missed" ? (
                <span className="h-2 w-2 rounded-full bg-faint" />
              ) : status === "upcoming" ? (
                <span className="h-6 w-6 rounded-full border border-dashed border-upcoming" />
              ) : null}
            </span>
            <span className="sr-only">
              {formatDay(day)}: {status}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function freqLabel(n: number) {
  return n === 7 ? "Every day" : `${n}× a week`;
}

// "3 of 4 this week" (Sunday to Saturday), or "goal met" once it's reached.
function countLine(g: Goal, days: string[]) {
  const done = g.days.filter((d) => days.includes(d.day) && d.done).length;
  const met = done >= g.frequency_per_week;
  return met ? `${done} this week, goal met` : `${done} of ${g.frequency_per_week} this week`;
}

// "4× a week · 3 of 4 this week"
function weekLine(g: Goal, days: string[]) {
  return `${freqLabel(g.frequency_per_week)} · ${countLine(g, days)}`;
}

function dayOf(g: Goal, day: string) {
  return g.days.find((d) => d.day === day);
}

// Rows arrive one per goal per day; fold them into one entry per goal.
function groupByGoal(cells: TodayCell[]) {
  const goals: Goal[] = [];
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

// Your Strava: one line, with your recent activities tucked inside. Only ever rendered on
// your own card: Strava's API terms say a person's activities may only be shown to that person.
async function StravaPanel({ memberId, hasGoals }: { memberId: string; hasGoals: boolean }) {
  const status = await getStravaStatus(memberId);
  if (!status.connected) {
    return (
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-divider pt-4">
        <p className="max-w-md text-sm text-muted text-pretty">
          Use Strava? Connect it and your runs, walks, and rides check in matching goals for you.
        </p>
        {/* A plain link, not a form: the route redirects to strava.com. */}
        <a
          href="/strava/connect"
          className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold transition-colors ${
            hasGoals
              ? "bg-strava text-white hover:bg-strava-ink"
              : "border border-strava/50 text-strava-ink hover:bg-strava/10"
          }`}
        >
          Connect with Strava
        </a>
      </div>
    );
  }
  const activities = await getMyStravaActivities(memberId);
  return (
    <details className="mt-5 border-t border-divider pt-3">
      <summary className={`${summaryClass} w-full !text-foreground`}>
        <ChevronIcon />
        <span className="font-semibold text-strava-ink">Strava</span>
        <span className="font-normal text-muted">
          {status.last_synced ? `synced ${status.last_synced}` : "connected"}
        </span>
      </summary>
      <div className="mt-2 flex flex-col gap-3">
        <p className="text-sm text-muted">Only you see this list. Your family sees only the check-ins.</p>
        {activities.length === 0 ? (
          <p className="text-sm text-muted">No Strava activities this month yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-divider text-sm">
            {activities.map((a) => (
              <li key={a.id} className="flex flex-col gap-0.5 py-2 first:pt-0">
                <span className="font-medium text-pretty break-words">{a.name}</span>
                <span className="text-muted tabular-nums">
                  {formatDay(a.activity_date)} · {stravaTypeLabel(a.sport_type)}
                  {a.distance_km > 0 && ` · ${a.distance_km} km`} · {a.minutes} min
                </span>
                <span className={`text-sm ${a.counted_for ? "text-success-700" : "text-muted"}`}>
                  {a.counted_for ? `Counted for ${a.counted_for}` : "Not linked to a goal"}
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap gap-2">
          <ActionButton action={syncStravaNow} label="Sync now" pendingLabel="Syncing…" showSuccess align="start" />
          <ActionButton
            action={disconnectStrava}
            label="Disconnect"
            pendingLabel="Disconnecting…"
            variant="quiet"
            align="start"
            confirm="Disconnect Strava? Check-ins it already made stay."
          />
        </div>
      </div>
    </details>
  );
}
