import type { ReactNode } from "react";

// Trends charts. Plain HTML/CSS bars drawn on the server from the rows the report's SQL returned:
// no chart library and no browser JavaScript. Every mark is focusable; hover, tap, or keyboard
// focus shows a tooltip with the numbers. The same numbers are always in the table under the chart.
//
// Colors are CSS variables from app/globals.css (--viz-*). Text never uses the series color.

type Row = Record<string, unknown>;

// The month in progress, so its partial rate isn't read as a drop.
export type MonthProgress = { label: string; day: number; daysInMonth: number };

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

// A focusable hit area with a tooltip. The value leads, the detail follows.
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
      className={`group relative rounded-md outline-none focus-visible:ring-2 focus-visible:ring-focus ${className}`}
    >
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute bottom-full z-20 mb-1.5 hidden w-max max-w-[16rem] rounded-lg bg-accent-900 px-2.5 py-1.5 text-xs leading-snug text-white shadow-[0_4px_12px_rgb(28_27_26/0.08)] group-hover:block group-focus:block ${
          align === "left" ? "left-0" : align === "right" ? "right-0" : "left-1/2 -translate-x-1/2"
        }`}
      >
        <span className="font-semibold">{value}</span>
        <span className="text-white/80"> · {detail}</span>
      </span>
    </div>
  );
}

function Legend({ children }: { children: ReactNode }) {
  return (
    <ul className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted" aria-label="Legend">
      {children}
    </ul>
  );
}

function Swatch({ color, label, outline }: { color: string; label: string; outline?: string }) {
  return (
    <li className="flex items-center gap-1.5">
      <span
        className="inline-block h-2.5 w-3.5 rounded-sm"
        style={{ background: color, boxShadow: outline ? `inset 0 0 0 1px ${outline}` : undefined }}
      />
      {label}
    </li>
  );
}

// ------------------------------------------------------------
// Month over month: one block per person, one labeled bar per month (last 3), 0..max% axis.
// The month in progress gets a pace mark and "on pace / behind pace" instead of a red drop.
// ------------------------------------------------------------
const MONTH_COLORS = ["var(--viz-month-1)", "var(--viz-month-2)", "var(--viz-month-3)"];

export function MonthBars({ rows, progress }: { rows: Row[]; progress: MonthProgress }) {
  // Rows arrive newest month first; keep the last three months, oldest -> newest.
  const allMonths = [...new Set(rows.map((r) => str(r.month_label)))];
  const months = allMonths.slice(0, 3).reverse();
  const newest = months[months.length - 1];
  const colors = MONTH_COLORS.slice(MONTH_COLORS.length - months.length);
  const pace = (100 * progress.day) / progress.daysInMonth;
  const isCurrent = (m: string) => m === progress.label;
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
      <Legend>
        {months.map((m, i) => (
          <Swatch key={m} color={colors[i]} label={isCurrent(m) ? `${m} (so far)` : m} />
        ))}
        {months.some(isCurrent) && (
          <li className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-0.5 rounded-full bg-foreground/70" />
            On-track pace ({progress.day} of {progress.daysInMonth} days)
          </li>
        )}
      </Legend>
      <ul className="flex flex-col divide-y divide-divider">
        {people.map((person) => {
          const latest = find(person, newest);
          const latestPct = num(latest?.completion_pct);
          const change = num(latest?.change_vs_last_month);
          const current = isCurrent(newest);
          // The month LAG() compared against: this person's next-older row (rows are newest first).
          const mine = rows.filter((r) => str(r.member) === person);
          const prev = latest && mine[0] === latest ? mine[1] : undefined;
          const prevPct = num(prev?.completion_pct);
          return (
            <li key={person} className="py-3 first:pt-0">
              <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="min-w-0 font-medium break-words">{person}</span>
                <span className="text-sm text-muted tabular-nums">
                  {latestPct === null ? (
                    `No goals in ${newest}`
                  ) : current ? (
                    <>
                      <span className="font-semibold text-foreground">{latestPct.toFixed(1)}%</span> so far ·{" "}
                      {latestPct >= pace ? "on pace" : "behind pace"}
                    </>
                  ) : (
                    <>
                      <span className="font-semibold text-foreground">{latestPct.toFixed(1)}%</span>
                      {/* Compared in words with the month before (the LAG() value). */}
                      {change !== null && prevPct !== null && (
                        <span className={change > 0 ? "text-success-700" : change < 0 ? "text-red-800" : ""}>
                          {change === 0
                            ? `, same as ${str(prev?.month_label)}`
                            : `, ${change > 0 ? "up" : "down"} from ${prevPct.toFixed(1)}% in ${str(prev?.month_label)}`}
                        </span>
                      )}
                    </>
                  )}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                {months.map((m, i) => {
                  const r = find(person, m);
                  const pct = num(r?.completion_pct);
                  return (
                    <div key={m} className="grid grid-cols-[2.25rem_1fr] items-center gap-2">
                      <span className="text-xs text-muted">{m.slice(0, 3)}</span>
                      <div className="relative">
                        <Grid ticks={ticks} x={x} highlight={100} />
                        {pct === null ? (
                          <div className="relative flex h-11 items-center text-xs text-muted">No goals</div>
                        ) : (
                          <Tip
                            align="left"
                            value={`${pct.toFixed(1)}%`}
                            detail={`${person}, ${m}${isCurrent(m) ? " so far" : ""}: ${num(r?.checkins)} of ${num(r?.target)} check-ins`}
                            className="relative flex h-11 items-center"
                          >
                            <span
                              className="block h-3 rounded-r"
                              style={{ width: `max(${x(pct)}, 3px)`, background: colors[i] }}
                            />
                            {isCurrent(m) && (
                              <span
                                aria-hidden
                                className="absolute top-2.5 bottom-2.5 w-0.5 -translate-x-1/2 rounded-full bg-foreground/70 outline-1 outline-surface"
                                style={{ left: x(pace) }}
                              />
                            )}
                          </Tip>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ul>
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
          className="absolute inset-y-1.5 w-px"
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
    <div className="grid grid-cols-[2.25rem_1fr] gap-2" aria-hidden>
      <span />
      <div className="relative h-5 text-xs text-muted tabular-nums">
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
// Weekly: small multiples, one mini column chart per person, all on the same scale and the
// same week slots (so a week lines up across people). A dark tick marks that week's goal.
// ------------------------------------------------------------
export function WeeklyMultiples({ rows }: { rows: Row[] }) {
  const people = [...new Set(rows.map((r) => str(r.member)))].sort();
  // Rows come newest week first; every chart uses the same slots, oldest -> newest.
  const weeks = [...new Set(rows.map((r) => str(r.week_of)))].reverse();
  const top = niceMax(
    Math.max(...rows.map((r) => Math.max(num(r.checkins) ?? 0, num(r.weekly_goal) ?? 0))),
    5,
  );
  const PLOT = 112; // px
  const h = (v: number) => (Math.max(0, v) / top) * PLOT;

  return (
    <div>
      <Legend>
        <Swatch color="var(--viz-1)" label="Check-ins that week" />
        <li className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-3.5" style={{ background: "var(--viz-ink)" }} />
          Weekly goal
        </li>
        <li>Same scale for everyone: 0 to {top}</li>
      </Legend>
      <div className={`grid gap-x-8 ${people.length > 1 ? "sm:grid-cols-2" : ""}`}>
        {people.map((person) => {
          const mine = rows.filter((r) => str(r.member) === person);
          const byWeek = (w: string) => mine.find((r) => str(r.week_of) === w);
          const latest = byWeek(weeks[weeks.length - 1]);
          const met = mine.filter((r) => (num(r.weekly_goal) ?? 0) > 0 && (num(r.checkins) ?? 0) >= (num(r.weekly_goal) ?? 0)).length;
          return (
            <section key={person} className="border-t border-divider py-4">
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3">
                <h3 className="min-w-0 font-medium break-words">{person}</h3>
                <span className="text-xs text-muted tabular-nums">
                  {latest ? `This week: ${num(latest.checkins)} of ${num(latest.weekly_goal)}` : "No goal this week"} · goal met{" "}
                  {met} of {mine.length} weeks
                </span>
              </div>
              <div className="relative" style={{ height: PLOT }}>
                <span className="absolute inset-x-0 bottom-0 h-px" style={{ background: "var(--viz-grid)" }} />
                <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))` }}>
                  {weeks.map((wk, i) => {
                    const w = byWeek(wk);
                    if (!w) return <span key={wk} />;
                    const c = num(w.checkins) ?? 0;
                    const goal = num(w.weekly_goal) ?? 0;
                    return (
                      <Tip
                        key={wk}
                        align={edge(i, weeks.length)}
                        value={`${c} of ${goal} check-ins`}
                        detail={`${person}, week of ${wk}`}
                        className="relative mx-auto flex h-full w-11 items-end justify-center"
                      >
                        <span
                          className="block w-5 rounded-t"
                          style={{ height: Math.max(h(c), c > 0 ? 2 : 0), background: "var(--viz-1)" }}
                        />
                        {goal > 0 && (
                          <span
                            className="absolute left-2 right-2 h-0.5"
                            style={{ bottom: h(goal) - 1, background: "var(--viz-ink)" }}
                          />
                        )}
                      </Tip>
                    );
                  })}
                </div>
              </div>
              <div
                className="mt-1 grid text-xs text-muted"
                style={{ gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))` }}
                aria-hidden
              >
                {weeks.map((w) => (
                  <span key={w} className="text-center whitespace-nowrap">
                    {w}
                  </span>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Streaks: a meter per goal. The outlined track is the longest streak ever; the fill is the
// current streak. Tracks share one scale, so longer records draw longer.
// ------------------------------------------------------------
export function StreakMeters({ rows }: { rows: Row[] }) {
  const top = Math.max(1, ...rows.map((r) => num(r.longest_streak) ?? 0));
  const w = (v: number) => `${(Math.max(0, v) / top) * 100}%`;
  return (
    <div>
      <Legend>
        <Swatch color="var(--viz-1)" label="Current streak" />
        <Swatch color="var(--viz-track)" outline="var(--viz-track-edge)" label="Longest streak" />
      </Legend>
      <ul className="flex flex-col divide-y divide-divider">
        {rows.map((r) => {
          const current = num(r.current_streak) ?? 0;
          const longest = num(r.longest_streak) ?? 0;
          const name = `${str(r.member)} · ${str(r.goal)}`;
          return (
            <li key={name} className="py-2 first:pt-0">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="min-w-0 text-sm font-medium break-words">{name}</span>
                <span className="text-sm text-muted tabular-nums">
                  {longest === 0 ? "No check-ins yet" : `${current} now · best ${longest} days`}
                </span>
              </div>
              {longest > 0 && (
                <Tip
                  align="left"
                  value={`${current} day${current === 1 ? "" : "s"} now`}
                  detail={`longest ${longest}, ${num(r.total_checkins)} check-ins in all`}
                  className="flex h-11 items-center"
                >
                  <div className="relative h-3 w-full">
                    <span
                      className="absolute inset-y-0 left-0 rounded-r"
                      style={{ width: w(longest), background: "var(--viz-track)", boxShadow: "inset 0 0 0 1px var(--viz-track-edge)" }}
                    />
                    <span
                      className="absolute inset-y-0 left-0 rounded-r"
                      style={{ width: w(current), background: "var(--viz-1)" }}
                    />
                  </div>
                </Tip>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ------------------------------------------------------------
// Day of week: 7 columns, Sunday -> Saturday, share of all check-ins on each cap.
// ------------------------------------------------------------
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

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
  const best = days.reduce((a, b) => (b.share > a.share ? b : a));
  const worst = days.reduce((a, b) => (b.share < a.share ? b : a));
  return (
    <div>
      <p className="mb-4 text-sm text-pretty">
        {best.share - worst.share < 3 ? (
          <>Check-ins are spread evenly across the week: every day is within 3 points of the others.</>
        ) : (
          <>
            Most check-ins land on <span className="font-semibold">{best.day}</span> ({best.share.toFixed(0)}%),
            the fewest on <span className="font-semibold">{worst.day}</span> ({worst.share.toFixed(0)}%).
          </>
        )}
      </p>
      <div className="relative" style={{ height: PLOT + 20 }}>
        <span className="absolute inset-x-0 h-px" style={{ bottom: 0, background: "var(--viz-grid)" }} />
        <div className="absolute inset-0 grid grid-cols-7">
          {days.map((d, i) => (
            <Tip
              key={d.day}
              align={edge(i, days.length)}
              value={`${d.share.toFixed(1)}% of check-ins`}
              detail={`${d.day}: ${d.checkins} check-ins by ${d.people} ${d.people === 1 ? "person" : "people"}`}
              className="mx-auto flex h-full w-11 flex-col items-center justify-end"
            >
              <span className="mb-1 text-xs text-muted tabular-nums">
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
      <div className="mt-1 grid grid-cols-7 text-xs text-muted" aria-hidden>
        {days.map((d) => (
          <span key={d.day} className="text-center">
            {d.day.slice(0, 3)}
          </span>
        ))}
      </div>
    </div>
  );
}
