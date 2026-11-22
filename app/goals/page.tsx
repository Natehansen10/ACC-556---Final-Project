import { createGoal, deleteGoal, endGoal, setGoalStrava } from "@/app/actions";
import { ActionButton, GoalForm, StravaTypeForm } from "@/components/forms";
import {
  Card,
  ChevronIcon,
  EmptyState,
  PageHeader,
  ProgressBar,
  buttonClass,
  summaryClass,
  titleClass,
} from "@/components/ui";
import { requireMember } from "@/lib/auth";
import { formatDay, formatMonth } from "@/lib/format";
import { getFamilyGoals, getFamilyMembers, getStravaStatus, type FamilyGoal } from "@/lib/queries";
import { stravaConfigured } from "@/lib/strava";
import { stravaTypeLabel } from "@/lib/strava-types";

// Goals: yours first (add, end, delete), then each family member's.
// Progress is this month: check-ins so far / the month's target from the view.
export default async function GoalsPage() {
  const me = await requireMember();
  const [members, goals, strava] = await Promise.all([
    getFamilyMembers(me.family_id),
    getFamilyGoals(me.family_id, me.month),
    stravaConfigured() ? getStravaStatus(me.id) : Promise.resolve({ connected: false, last_synced: null }),
  ]);
  const myGoals = goals.filter((g) => g.user_id === me.id);
  const others = members.filter((m) => m.id !== me.id);

  // Where an on-track goal would be: complete days so far (through yesterday) ÷ days in month.
  const [y, mo, d] = me.today.split("-").map(Number);
  const pace = (100 * (d - 1)) / new Date(Date.UTC(y, mo, 0)).getUTCDate();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Goals">Your progress for {formatMonth(me.month)}.</PageHeader>

      <Card>
        <h2 className={`${titleClass} mb-3`}>Your goals</h2>
        {myGoals.length === 0 ? (
          <EmptyState
            title="No goals yet"
            description="Add your first goal below. You'll check in on it from Today, and your family will see your progress."
          />
        ) : (
          <GoalList goals={myGoals} pace={pace} editable stravaConnected={strava.connected} />
        )}

        <details className="group/add mt-5 border-t border-divider pt-4" open={myGoals.length === 0}>
          <summary className={`${buttonClass} w-full sm:w-auto group-open/add:hidden`}>Add a goal</summary>
          <div className="flex flex-col gap-3">
            <div>
              <h3 className={titleClass}>Add a goal</h3>
              <p className="mt-1 text-sm text-muted text-pretty">
                It counts from the 1st of this month. Times per week can&apos;t be changed later: to change
                it, end the goal and add a new one.
              </p>
            </div>
            <GoalForm action={createGoal} showStrava={strava.connected} />
          </div>
        </details>
      </Card>

      {others.length > 0 && (
        <section aria-labelledby="family-goals" className="flex flex-col gap-3">
          <h2 id="family-goals" className={titleClass}>
            Family
          </h2>
          <Card className="!p-0">
            <ul className="divide-y divide-divider">
              {others.map((m) => {
                const theirs = goals.filter((g) => g.user_id === m.id);
                return (
                  <li key={m.id} className="p-4 sm:p-5">
                    <h3 className="mb-3 font-semibold break-words">{m.full_name}</h3>
                    {theirs.length === 0 ? (
                      <p className="text-sm text-muted">No goals yet.</p>
                    ) : (
                      <GoalList goals={theirs} pace={pace} />
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>
        </section>
      )}

      <p className="text-sm text-muted text-pretty">
        Monthly target = times per week × days in the month ÷ 7, rounded. The dark mark on each bar
        is where an on-track goal would be after yesterday.
      </p>
    </div>
  );
}

function GoalList({
  goals,
  pace,
  editable = false,
  stravaConnected = false,
}: {
  goals: FamilyGoal[];
  pace: number;
  editable?: boolean;
  stravaConnected?: boolean;
}) {
  return (
    <ul className="flex flex-col gap-5">
      {goals.map((g) => {
        const p =
          g.month_target && g.month_target > 0 ? (100 * g.month_checkins) / g.month_target : null;
        const ended = g.end_date !== null;
        return (
          <li key={g.id} className="flex flex-col gap-2">
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-medium">
                <span className="break-words">{g.title}</span>
                {ended && (
                  <span className="rounded-full bg-accent-200 px-2 py-0.5 text-xs font-medium text-muted">
                    Ended {formatDay(g.end_date!)}
                  </span>
                )}
              </p>
              <p className="text-sm text-muted text-pretty">
                {g.frequency_per_week === 7 ? "Every day" : `${g.frequency_per_week}× a week`}
                {g.category && ` · ${g.category}`}
                {g.unit && ` · ${g.unit}`}
                {g.strava_sport_type && ` · counts ${stravaTypeLabel(g.strava_sport_type)} from Strava`}
              </p>
            </div>
            {g.month_target === null ? (
              <p className="text-sm text-muted">Not tracked this month.</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                <ProgressBar value={p} pace={ended ? undefined : pace} label={`${g.title}, this month`} />
                <p className="text-sm text-muted tabular-nums">
                  {g.month_checkins} of {g.month_target} check-ins this month
                  {p !== null && p >= 100 && <span className="font-medium text-success-700"> · target reached</span>}
                </p>
              </div>
            )}
            {editable && (g.total_checkins === 0 || !ended) && (
              <details>
                <summary className={summaryClass}>
                  <ChevronIcon />
                  Change this goal
                </summary>
                <div className="mt-1 flex flex-col gap-4 rounded-lg bg-background p-3">
                  {stravaConnected && !ended && (
                    <StravaTypeForm action={setGoalStrava.bind(null, g.id)} value={g.strava_sport_type} goalId={g.id} />
                  )}
                  {g.total_checkins === 0 ? (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-muted">No check-ins yet, so you can delete it.</p>
                      <ActionButton
                        action={deleteGoal.bind(null, g.id)}
                        label="Delete goal"
                        pendingLabel="Deleting…"
                        align="start"
                        confirm="Delete this goal? It has no check-ins yet."
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-muted text-pretty">
                        Ending keeps its history. It still counts for this month.
                      </p>
                      <ActionButton
                        action={endGoal.bind(null, g.id)}
                        label="End goal"
                        pendingLabel="Ending…"
                        align="start"
                        confirm="End this goal? It still counts for this month and earlier. To change how often, end it and add a new goal."
                      />
                    </div>
                  )}
                </div>
              </details>
            )}
          </li>
        );
      })}
    </ul>
  );
}
