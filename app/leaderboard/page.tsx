import Link from "next/link";
import { awardPrize } from "@/app/actions";
import { ActionButton } from "@/components/forms";
import {
  Card,
  CheckIcon,
  EmptyState,
  PageHeader,
  ProgressBar,
  SegmentedNav,
  buttonClass,
} from "@/components/ui";
import { formatMonth, formatShortMonth, pct } from "@/lib/format";
import { requireMember } from "@/lib/auth";
import {
  getGoalBreakdown,
  getLeaderboard,
  getMonths,
  getPrizeStatus,
} from "@/lib/queries";

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const me = await requireMember();
  const family = { id: me.family_id, name: me.family_name };
  const params = await searchParams;
  const months = await getMonths(family.id);

  if (months.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Leaderboard" />
        <EmptyState
          title="No goals yet"
          description="The leaderboard starts once someone in your family adds a goal."
          action={
            <Link href="/goals" className={buttonClass}>
              Add a goal
            </Link>
          }
        />
      </div>
    );
  }

  const month = months.includes(params.month ?? "") ? params.month! : months[0];
  const href = (m: string) => `/leaderboard?month=${m}`;

  const [rows, breakdown, prize] = await Promise.all([
    getLeaderboard(family.id, month),
    getGoalBreakdown(family.id, month),
    getPrizeStatus(family.id, month),
  ]);

  const ranked = rows.filter((r) => r.place !== null);
  const unranked = rows.filter((r) => r.place === null);
  const winners = rows.filter((r) => r.won).map((r) => r.full_name);

  // The month in progress: how far through it we are, for the pace mark.
  const inProgress = month === me.month;
  const [y, mo, d] = me.today.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  const pace = (100 * (d - 1)) / daysInMonth; // complete days only: today isn't over yet

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Leaderboard">
        Everyone&apos;s check-ins against their monthly target. The highest completion rate wins the
        month&apos;s prize, and ties share it.
      </PageHeader>

      {months.length > 1 && (
        <SegmentedNav
          label="Month"
          items={months.map((m) => ({
            href: href(m),
            label: formatShortMonth(m),
            active: m === month,
          }))}
        />
      )}

      <Card>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">{formatMonth(month)}</h2>
            <p className="mt-0.5 text-sm text-muted text-pretty">
              {prize.awarded_at
                ? `Prize awarded ${prize.awarded_at} to ${winners.join(" and ") || "no one"}.`
                : prize.month_has_ended
                  ? "This month is over and the prize hasn't been awarded yet."
                  : inProgress
                    ? `In progress: day ${d} of ${daysInMonth}. The dark mark on each bar is where an on-track rate would be after yesterday.`
                    : "The prize is awarded after the month ends."}
            </p>
          </div>
          {!prize.awarded_at &&
            prize.month_has_ended &&
            ranked.length > 0 &&
            (me.role === "admin" ? (
              <ActionButton
                action={awardPrize.bind(null, month)}
                label={`Award ${formatShortMonth(month)} prize`}
                pendingLabel="Awarding…"
                confirm={`Award the ${formatMonth(month)} prize for ${family.name}?`}
                variant="primary"
                align="start"
              />
            ) : (
              <p className="text-sm text-muted">A family admin can award it.</p>
            ))}
        </div>

        {rows.length === 0 ? (
          <EmptyState
            title="No one in this family yet"
            description="Nate adds family members."
          />
        ) : ranked.length === 0 ? (
          <EmptyState
            title={`No goals tracked in ${formatMonth(month)}`}
            description="Nobody had a target this month. Pick another month, or add a goal."
            action={
              <Link href="/goals" className={buttonClass}>
                Go to Goals
              </Link>
            }
          />
        ) : (
          <ol className="flex flex-col divide-y divide-divider">
            {ranked.map((r) => {
              const goals = breakdown.filter((b) => b.user_id === r.id);
              return (
                <li key={r.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex items-start gap-3">
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums ${
                        r.won
                          ? "bg-success-600 text-white"
                          : r.place === 1
                            ? "bg-success-100 text-success-700"
                            : "bg-neutral-200 text-foreground"
                      }`}
                    >
                      <span className="sr-only">Place </span>
                      {r.place}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 font-semibold">
                          <span className="break-words">{r.full_name}</span>
                          {r.won && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-success-100 px-2 py-0.5 text-xs font-semibold text-success-700">
                              <CheckIcon className="h-3.5 w-3.5" />
                              Prize winner
                            </span>
                          )}
                        </span>
                        <span className="text-sm tabular-nums">
                          <span className="font-semibold">{pct(r.pct)}</span>
                          <span className="text-muted">
                            {" "}
                            · {r.checkins} of {r.target}
                          </span>
                        </span>
                      </div>
                      <div className="mt-2">
                        <ProgressBar
                          value={r.pct}
                          pace={inProgress ? pace : undefined}
                          label={`${r.full_name}, completion`}
                        />
                      </div>
                      <ul className="mt-2 flex flex-col gap-0.5 text-sm text-muted">
                        {goals.map((g) => (
                          <li key={g.title} className="flex justify-between gap-3">
                            <span className="min-w-0 break-words">{g.title}</span>
                            <span className="shrink-0 tabular-nums">
                              {g.checkins} of {g.target}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        {unranked.length > 0 && ranked.length > 0 && (
          <p className="mt-4 border-t border-divider pt-3 text-sm text-muted text-pretty">
            No goals this month: {unranked.map((r) => r.full_name).join(", ")}
          </p>
        )}
      </Card>

    </div>
  );
}
