import { createGoal, deleteGoal, endGoal, setGoalStrava } from "@/app/actions";
import { ActionButton, GoalForm, StravaTypeForm } from "@/components/forms";
import { Card, EmptyState, ProgressBar, SectionTitle } from "@/components/ui";
import { requireMember } from "@/lib/auth";
import { formatDay, formatMonth } from "@/lib/format";
import { getFamilyGoals, getFamilyMembers, type FamilyGoal } from "@/lib/queries";

// Goals: yours first (add, end, delete), then each family member's.
// Progress is this month: check-ins so far / the month's target from the view.
export default async function GoalsPage() {
  const me = await requireMember();
  const [members, goals] = await Promise.all([
    getFamilyMembers(me.family_id),
    getFamilyGoals(me.family_id, me.month),
  ]);
  const myGoals = goals.filter((g) => g.user_id === me.id);
  const others = members.filter((m) => m.id !== me.id);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Goals</h1>
        <p className="mt-1 text-sm text-muted">
          Progress for {formatMonth(me.month)}. Target = times per week × days in the month ÷ 7.
        </p>
      </div>

      <Card>
        <SectionTitle>My goals</SectionTitle>
        {myGoals.length === 0 ? (
          <EmptyState
            title="No goals yet"
            description="Add your first goal below. Your family will see it on the Today page."
          />
        ) : (
          <GoalList goals={myGoals} editable />
        )}
        <div className="mt-5 border-t border-divider pt-4">
          <p className="mb-3 text-sm font-medium">
            Add a goal{" "}
            <span className="font-normal text-muted">
              (counts from the 1st of this month; times per week can&apos;t be changed later)
            </span>
          </p>
          <GoalForm action={createGoal} />
        </div>
      </Card>

      <h2 className="text-lg font-semibold">Family goals</h2>
      {others.length === 0 ? (
        <EmptyState
          title="No one else in the family yet"
          description="Family members are added by the admin (sql/04_add_member.sql)."
        />
      ) : (
        others.map((m) => {
          const theirs = goals.filter((g) => g.user_id === m.id);
          return (
            <Card key={m.id}>
              <SectionTitle>{m.full_name}</SectionTitle>
              {theirs.length === 0 ? (
                <p className="text-sm text-muted">No goals yet.</p>
              ) : (
                <GoalList goals={theirs} />
              )}
            </Card>
          );
        })
      )}
    </div>
  );
}

function GoalList({ goals, editable = false }: { goals: FamilyGoal[]; editable?: boolean }) {
  return (
    <ul className="flex flex-col divide-y divide-divider">
      {goals.map((g) => {
        const p =
          g.month_target && g.month_target > 0 ? (100 * g.month_checkins) / g.month_target : null;
        return (
          <li key={g.id} className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium">
                  {g.title}
                  {g.end_date !== null && (
                    <span className="ml-2 rounded-full bg-neutral-200 px-2 py-0.5 text-xs text-muted">
                      Ended {formatDay(g.end_date)}
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted">
                  {g.category ?? "No category"} · {g.frequency_per_week}×/week
                  {g.unit && ` · ${g.unit}`} · since {formatDay(g.start_date)}
                </p>
              </div>
              {editable &&
                (g.total_checkins === 0 ? (
                  <ActionButton
                    action={deleteGoal.bind(null, g.id)}
                    label="Delete"
                    pendingLabel="Deleting…"
                    confirm="Delete this goal? It has no check-ins yet."
                  />
                ) : (
                  g.end_date === null && (
                    <ActionButton
                      action={endGoal.bind(null, g.id)}
                      label="End goal"
                      pendingLabel="Ending…"
                      confirm="End this goal? It still counts for this month and earlier. To change how often, end it and add a new goal."
                    />
                  )
                ))}
            </div>
            {editable && g.end_date === null && (
              <StravaTypeForm action={setGoalStrava.bind(null, g.id)} value={g.strava_sport_type} />
            )}
            {g.month_target === null ? (
              <p className="text-xs text-muted">Not tracked this month.</p>
            ) : (
              <>
                <ProgressBar value={p} />
                <p className="text-xs text-muted tabular-nums">
                  {g.month_checkins} of {g.month_target} check-ins this month
                </p>
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}
