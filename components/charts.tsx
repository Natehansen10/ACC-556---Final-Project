import type { ReactNode } from "react";

// Trends charts. Plain HTML/CSS bars drawn on the server from the rows the report's SQL returned:
// no chart library and no browser JavaScript. Every mark is focusable; hover or keyboard focus
// shows a tooltip. The same numbers are always in the table under the chart.
//
// Colors are CSS variables from app/globals.css (--viz-*). Text never uses the series color.

type Row = Record<string, unknown>;

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));
const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));

// Round a scale's top up to a clean number (5, 10, 25, ...) so gridlines land on round values.
function niceMax(value: number, min: number): number {
  const v = Math.max(value, min, 1);
  const steps = [1, 2, 4, 5, 10, 20, 25, 50, 100, 125, 150, 200, 250, 500];
  return steps.find((s) => s >= v) ?? Math.ceil(v / 100) * 100;
}

// Tooltips on the first and last columns open inward so they never run off the screen.
function edge(i: number, n: number): "left" | "center" | "right" {
  if (i < 2) return "left";
  if (i >= n - 2) return "right";
  return "center";
}

// A focusable hit area with a tooltip. The value leads; the detail follows.
function Tip({
  value,
  detail,
  align = "center",
  className = "",
  children,
}: {
  value: string;
  detail: string;
  align?: "center" | "left" | "right";
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      tabIndex={0}
      aria-label={`${value}, ${detail}`}
      className={`group relative rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-accent-600 ${className}`}
    >
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute bottom-full z-20 mb-1.5 hidden w-max max-w-[15rem] rounded-md bg-neutral-900 px-2 py-1 text-xs text-white shadow-md group-hover:block group-focus:block ${
          align === "left" ? "left-0" : align === "right" ? "right-0" : "left-1/2 -translate-x-1/2"
        }`}
      >
        <span className="font-semibold">{value}</span>
        <span className="text-white/75"> · {detail}</span>
      </span>
    </div>
  );
}

function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted" aria-label="Legend">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: i.color }} />
          {i.label}
        </li>
      ))}
    </ul>
  );
}

// ------------------------------------------------------------
// Month over month: one row per person, one bar per month (last 3), 0..max% axis.
// ------------------------------------------------------------
const MONTH_COLORS = ["var(--viz-month-1)", "var(--viz-month-2)", "var(--viz-month-3)"];

export function MonthBars({ rows }: { rows: Row[] }) {
  // Rows arrive newest month first; keep the last three months, oldest -> newest.
  const allMonths = [...new Set(rows.map((r) => str(r.month_label)))];
  const months = allMonths.slice(0, 3).reverse();
  const newest = months[months.length - 1];
  const colors = MONTH_COLORS.slice(MONTH_COLORS.length - months.length);
  // People in the newest month's ranking order, then anyone without a newest-month row.
  const people = [
    ...new Set([
      ...rows.filter((r) => str(r.month_label) === newest).map((r) => str(r.member)),
      ...rows.map((r) => str(r.member)),
    ]),
  ];
  const find = (person: string, month: string) =>
    rows.find((r) => str(r.member) === person && str(r.month_label) === month);
  const top = niceMax(Math.max(...rows.map((r) => num(r.completion_pct) ?? 0)), 100);
  const ticks = [0, top / 4, top / 2, (3 * top) / 4, top];
  const x = (v: number) => `${(Math.max(0, v) / top) * 100}%`;

  return (
    <div>
      <Legend items={months.map((m, i) => ({ label: m, color: colors[i] }))} />
      <div className="flex flex-col">
        {people.map((person) => {
          const latest = find(person, newest);
          const latestPct = num(latest?.completion_pct);
          const change = num(latest?.change_vs_last_month);
          return (
            <div key={person} className="grid grid-cols-[5.5rem_1fr] items-center gap-3 py-1.5">
              <span className="truncate text-sm">{person}</span>
              <div className="relative">
                <Grid ticks={ticks} x={x} highlight={100} />
                <div className="relative flex flex-col gap-0.5">
                  {months.map((m, i) => {
                    const r = find(person, m);
                    const pct = num(r?.completion_pct);
                    return (
                      <div key={m} className="flex h-2.5 items-center">
                        {pct === null ? (
                          <span className="h-full" />
                        ) : (
                          <Tip
                            align="left"
                            value={`${pct.toFixed(1)}%`}
                            detail={`${person}, ${m}: ${num(r?.checkins)} of ${num(r?.target)} check-ins`}
                            className="flex h-full w-full items-center py-[1px]"
                          >
                            <span
                              className="block h-2 rounded-r"
                              style={{ width: `max(${x(pct)}, 2px)`, background: colors[i], minWidth: 2 }}
                            />
                          </Tip>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Selective label: the newest month's rate and its change, under the bars. */}
              <span />
              <p className="-mt-1 text-xs text-muted tabular-nums">
                {latestPct === null ? `No goals in ${newest}` : `${latestPct.toFixed(1)}% in ${newest}`}
                {change !== null && (
                  <span className={change > 0 ? "text-success-700" : change < 0 ? "text-red-700" : ""}>
                    {` · ${change > 0 ? "+" : change < 0 ? "−" : ""}${Math.abs(change).toFixed(1)} pts`}
                  </span>
                )}
              </p>
            </div>
          );
        })}
      </div>
      <Axis ticks={ticks} x={x} format={(t) => `${Math.round(t)}%`} />
    </div>
  );
}

// Vertical hairline gridlines behind horizontal bars. The 100% line is a shade darker.
function Grid({ ticks, x, highlight }: { ticks: number[]; x: (v: number) => string; highlight?: number }) {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {ticks.map((t) => (
        <span
          key={t}
          className="absolute inset-y-[-4px] w-px"
          style={{
            left: x(t),
            background: t === highlight ? "var(--viz-ink)" : "var(--viz-grid)",
            opacity: t === highlight ? 0.35 : 1,
          }}
        />
      ))}
    </div>
  );
}

function Axis({ ticks, x, format }: { ticks: number[]; x: (v: number) => string; format: (t: number) => string }) {
  return (
    <div className="grid grid-cols-[5.5rem_1fr] gap-3" aria-hidden>
      <span />
      <div className="relative h-5 text-[11px] text-muted tabular-nums">
        {ticks.map((t, i) => (
          <span
            key={t}
            className={`absolute top-1 ${i === 0 ? "" : i === ticks.length - 1 ? "-translate-x-full" : "-translate-x-1/2"}`}
            style={{ left: x(t) }}
          >
            {format(t)}
          </span>
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Weekly: small multiples, one mini column chart per person, all on the same scale.
// A dark tick on each column marks that week's goal.
// ------------------------------------------------------------
export function WeeklyMultiples({ rows }: { rows: Row[] }) {
  const people = [...new Set(rows.map((r) => str(r.member)))].sort();
  const top = niceMax(
    Math.max(...rows.map((r) => Math.max(num(r.checkins) ?? 0, num(r.weekly_goal) ?? 0))),
    5,
  );
  const PLOT = 112; // px
  const h = (v: number) => (Math.max(0, v) / top) * PLOT;

  return (
    <div>
      <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted" aria-label="Legend">
        <li className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "var(--viz-1)" }} />
          Check-ins that week
        </li>
        <li className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-3.5" style={{ background: "var(--viz-ink)" }} />
          Weekly goal
        </li>
        <li>Scale: 0 to {top} check-ins, same for everyone</li>
      </ul>
      <div className={`grid gap-4 ${people.length > 1 ? "sm:grid-cols-2" : ""}`}>
        {people.map((person) => {
          // Rows come newest week first; draw oldest -> newest.
          const weeks = rows.filter((r) => str(r.member) === person).reverse();
          const latest = weeks[weeks.length - 1];
          return (
            <div key={person} className="rounded-md border border-divider p-3">
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium">{person}</span>
                <span className="text-xs text-muted tabular-nums">
                  This week: {num(latest?.checkins)} of {num(latest?.weekly_goal)}
                </span>
              </div>
              <div className="relative" style={{ height: PLOT }}>
                <span className="absolute inset-x-0 bottom-0 h-px" style={{ background: "var(--viz-grid)" }} />
                <div className="absolute inset-0 flex items-end justify-around">
                  {weeks.map((w, i) => {
                    const c = num(w.checkins) ?? 0;
                    const goal = num(w.weekly_goal) ?? 0;
                    return (
                      <Tip
                        key={str(w.week_of)}
                        align={edge(i, weeks.length)}
                        value={`${c} of ${goal} check-ins`}
                        detail={`${person}, week of ${str(w.week_of)}`}
                        className="relative flex h-full w-8 items-end justify-center"
                      >
                        <span
                          className="block w-5 rounded-t"
                          style={{ height: Math.max(h(c), c > 0 ? 2 : 0), background: "var(--viz-1)" }}
                        />
                        {goal > 0 && (
                          <span
                            className="absolute left-0.5 right-0.5 h-0.5"
                            style={{ bottom: h(goal) - 1, background: "var(--viz-ink)" }}
                          />
                        )}
                      </Tip>
                    );
                  })}
                </div>
              </div>
              <div className="mt-1 flex justify-around text-[10px] text-muted" aria-hidden>
                {weeks.map((w) => (
                  <span key={str(w.week_of)} className="w-8 whitespace-nowrap text-center">
                    {str(w.week_of)}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Streaks: a meter per goal. The light track is the longest streak ever; the fill is the
// current streak. Tracks share one scale, so longer records draw longer.
// ------------------------------------------------------------
export function StreakMeters({ rows }: { rows: Row[] }) {
  const top = Math.max(1, ...rows.map((r) => num(r.longest_streak) ?? 0));
  const w = (v: number) => `${(Math.max(0, v) / top) * 100}%`;
  return (
    <div>
      <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted" aria-label="Legend">
        <li className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "var(--viz-1)" }} />
          Current streak
        </li>
        <li className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "var(--viz-track)" }} />
          Longest streak
        </li>
      </ul>
      <ul className="flex flex-col gap-3">
        {rows.map((r) => {
          const current = num(r.current_streak) ?? 0;
          const longest = num(r.longest_streak) ?? 0;
          const name = `${str(r.member)} · ${str(r.goal)}`;
          return (
            <li key={name} className="grid gap-1 sm:grid-cols-[12rem_1fr_6.5rem] sm:items-center sm:gap-3">
              <span className="truncate text-sm">{name}</span>
              <Tip
                align="left"
                value={`${current} day${current === 1 ? "" : "s"} now`}
                detail={`longest ${longest}, ${num(r.total_checkins)} check-ins in all`}
                className="py-1"
              >
                <div className="relative h-2.5">
                  <span
                    className="absolute inset-y-0 left-0 rounded-r"
                    style={{ width: w(longest), background: "var(--viz-track)" }}
                  />
                  <span
                    className="absolute inset-y-0 left-0 rounded-r"
                    style={{ width: w(current), background: "var(--viz-1)" }}
                  />
                </div>
              </Tip>
              <span className="text-xs text-muted tabular-nums sm:text-right">
                {longest === 0 ? "No check-ins yet" : `${current} / ${longest} days`}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ------------------------------------------------------------
// Day of week: 7 columns, Monday -> Sunday, share of all check-ins on each cap.
// ------------------------------------------------------------
const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function WeekdayColumns({ rows }: { rows: Row[] }) {
  // The SQL only returns days that have check-ins; show all seven, with 0 for the rest.
  const days = WEEKDAYS.map((d) => {
    const r = rows.find((x) => str(x.weekday) === d);
    return {
      day: d,
      share: num(r?.share_pct) ?? 0,
      checkins: num(r?.checkins) ?? 0,
      people: num(r?.people) ?? 0,
    };
  });
  const top = niceMax(Math.max(...days.map((d) => d.share)), 5);
  const PLOT = 160;
  const h = (v: number) => (Math.max(0, v) / top) * PLOT;
  return (
    <div>
      <div className="relative" style={{ height: PLOT + 20 }}>
        <span className="absolute inset-x-0 h-px" style={{ bottom: 0, background: "var(--viz-grid)" }} />
        <div className="absolute inset-0 flex items-end justify-around">
          {days.map((d, i) => (
            <Tip
              key={d.day}
              align={edge(i, days.length)}
              value={`${d.share.toFixed(1)}% of check-ins`}
              detail={`${d.day}: ${d.checkins} check-ins by ${d.people} ${d.people === 1 ? "person" : "people"}`}
              className="flex h-full w-10 flex-col items-center justify-end"
            >
              <span className="mb-1 text-[11px] text-muted tabular-nums">
                {d.checkins > 0 ? `${Math.round(d.share)}%` : ""}
              </span>
              <span
                className="block w-6 rounded-t"
                style={{ height: Math.max(h(d.share), d.checkins > 0 ? 2 : 0), background: "var(--viz-1)" }}
              />
            </Tip>
          ))}
        </div>
      </div>
      <div className="mt-1 flex justify-around text-xs text-muted" aria-hidden>
        {days.map((d) => (
          <span key={d.day} className="w-10 text-center">
            {d.day.slice(0, 3)}
          </span>
        ))}
      </div>
    </div>
  );
}
