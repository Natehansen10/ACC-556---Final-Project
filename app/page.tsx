import Link from "next/link";
import { logCheckin, undoCheckin } from "@/app/actions";
import { CheckDot, DoneTodayForm } from "@/components/forms";
import { Card, EmptyState, secondaryButtonClass } from "@/components/ui";
import { requireMember } from "@/lib/auth";
import { formatDay, formatWeekday, lastDays } from "@/lib/format";
import { getFamilyMembers, getTodayBoard, type TodayCell } from "@/lib/queries";

// Today: every family member, every goal, the last 7 days.
// Your own rows are where you check in (today or yesterday only).
export default async function TodayPage() {
  const me = await requireMember();
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
