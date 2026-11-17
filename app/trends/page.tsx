import { MonthBars, StreakMeters, WeekdayColumns, WeeklyMultiples, type MonthProgress } from "@/components/charts";
import { PersonSelect } from "@/components/forms";
import { Card, ChevronIcon, EmptyState, PageHeader, SegmentedNav, summaryClass } from "@/components/ui";
import { requireMember } from "@/lib/auth";
import { formatShortMonth } from "@/lib/format";
import { getFamilyMembers } from "@/lib/queries";
import { REPORTS, findReport, runReport, type ChartKind, type Column } from "@/lib/reports";

// Short labels for the report switcher (four fit side by side on a phone).
const SHORT: Record<string, string> = {
  monthly: "Monthly",
  weekly: "Weekly",
  streaks: "Streaks",
  weekday: "Weekdays",
};

// How each chart maps to the SQL's columns: the bridge between the picture and the query.
const CHART_KEY: Record<ChartKind, string> = {
  monthBars: "Each bar is one row: completion_pct for one person in one month.",
  weeklyMultiples: "Each column is one row: checkins for one person in one week. The dark line is weekly_goal.",
  streakMeters: "Each meter is one row: the fill is current_streak, the outline is longest_streak.",
  weekdayColumns: "Each column is one row: share_pct, that weekday's share of all check-ins.",
};

// Trends: pick a report and a person. Each report is one SQL query (lib/reports.ts);
// the page shows the chart, how the SQL builds it, the rows, and the exact SQL.
export default async function TrendsPage({
  searchParams,
}: {
  searchParams: Promise<{ report?: string; member?: string }>;
}) {
  const me = await requireMember();
  const params = await searchParams;
  const members = await getFamilyMembers(me.family_id);

  const report = findReport(params.report);
  // Only accept a person from your own family; anything else means "everyone".
  const member = members.find((m) => m.id === params.member) ?? null;

  const { rows, ms } = await runReport(report, me.family_id, member?.id ?? null, me.today);

  // The month in progress (for the Monthly report's pace mark). Plain date math on "today".
  const [y, mo, d] = me.today.split("-").map(Number);
  const progress: MonthProgress = {
    label: formatShortMonth(me.month),
    day: d - 1, // complete days so far (today isn't over yet)
    daysInMonth: new Date(Date.UTC(y, mo, 0)).getUTCDate(),
  };

  const href = (r: string, m: string | null) => `/trends?report=${r}${m ? `&member=${m}` : ""}`;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Trends">
        Four reports. Each one is a single SQL query, shown in full at the bottom.
      </PageHeader>

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_16rem] md:items-end">
        <SegmentedNav
          label="Report"
          columns={4}
          items={REPORTS.map((r) => ({
            href: href(r.key, member?.id ?? null),
            label: SHORT[r.key] ?? r.title,
            active: r.key === report.key,
          }))}
        />
        <div>
          <PersonSelect
            report={report.key}
            value={member?.id ?? ""}
            options={[
              { value: "", label: "Everyone" },
              ...members.map((m) => ({
                value: m.id,
                label: m.id === me.id ? `${m.full_name} (you)` : m.full_name,
              })),
            ]}
          />
        </div>
      </div>

      <Card>
        <div className="mb-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <h2 className="text-lg font-semibold">{report.title}</h2>
            <p className="text-xs text-muted tabular-nums">
              {rows.length} row{rows.length === 1 ? "" : "s"} · {ms} ms
            </p>
          </div>
          <p className="mt-1 max-w-[60ch] text-sm text-muted text-pretty">{report.question}</p>
          {report.chart === "monthBars" && rows.length > 0 && (
            <p className="mt-2 max-w-[60ch] text-sm text-pretty">
              {progress.label}{" "}is in progress. Its rate counts against the whole month&apos;s target, so it
              climbs as the month goes on. The dark mark is where an on-track rate would be after{" "}
              {progress.day} of {progress.daysInMonth} days.
            </p>
          )}
        </div>

        {rows.length === 0 ? (
          <EmptyState
            title="Nothing to show yet"
            description={
              member
                ? `${member.full_name} has no check-ins for this report yet. Pick "Everyone" to see the whole family.`
                : "This report fills in as the family checks in."
            }
          />
        ) : (
          <>
            <Chart kind={report.chart} rows={rows} progress={progress} />

            <div className="mt-5 border-t border-divider pt-4">
              <h3 className="text-sm font-semibold">How the SQL builds this chart</h3>
              <p className="mt-1 max-w-[60ch] text-sm text-pretty">{CHART_KEY[report.chart]}</p>
              <ol className="mt-2 max-w-[60ch] list-decimal space-y-1 pl-5 text-sm text-muted marker:text-muted">
                {report.explain.map((line) => (
                  <li key={line} className="text-pretty">
                    {line}
                  </li>
                ))}
              </ol>
            </div>

            <details className="mt-4 border-t border-divider pt-2">
              <summary className={summaryClass}>
                <ChevronIcon />
                Show the {rows.length} row{rows.length === 1 ? "" : "s"} as a table
              </summary>
              <p className="mt-1 text-xs text-muted sm:hidden">Scroll the table sideways to see every column.</p>
              <div className="-mx-4 mt-2 overflow-x-auto sm:mx-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-divider text-left text-xs text-muted">
                      {report.columns.map((c, i) => (
                        <th
                          key={c.key}
                          scope="col"
                          className={`py-2 pr-4 font-medium whitespace-nowrap ${c.format === "text" ? "" : "text-right"} ${
                            i === 0 ? "sticky left-0 bg-surface pl-4 sm:pl-0" : ""
                          }`}
                        >
                          {c.label}
                          <span className="block font-mono font-normal">{c.key}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={i} className="border-b border-divider last:border-0">
                        {report.columns.map((c, j) => (
                          <td
                            key={c.key}
                            className={`py-2 pr-4 whitespace-nowrap ${c.format === "text" ? "" : "text-right tabular-nums"} ${
                              j === 0 ? "sticky left-0 bg-surface pl-4 sm:pl-0" : ""
                            }`}
                          >
                            <Cell value={row[c.key]} column={c} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </>
        )}
      </Card>

      <Card>
        <h2 className="text-lg font-semibold">The SQL behind this chart</h2>
        <p className="mt-1 text-sm text-muted text-pretty">
          This exact text is what ran. The values are passed separately, never pasted into the SQL.
        </p>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          <dt><code className="font-mono text-accent-800">$1</code></dt>
          <dd className="text-muted">your family ({me.family_name})</dd>
          <dt><code className="font-mono text-accent-800">$2</code></dt>
          <dd className="text-muted">{member ? member.full_name : "NULL (everyone)"}</dd>
          {report.usesToday && (
            <>
              <dt><code className="font-mono text-accent-800">$3</code></dt>
              <dd className="text-muted">today ({me.today})</dd>
            </>
          )}
        </dl>
        <pre className="mt-4 overflow-x-auto rounded-lg bg-neutral-900 p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap text-neutral-100 sm:whitespace-pre">
          {report.sql}
        </pre>
      </Card>
    </div>
  );
}

// One chart per report; each draws from the same rows as the table.
function Chart({
  kind,
  rows,
  progress,
}: {
  kind: ChartKind;
  rows: Record<string, unknown>[];
  progress: MonthProgress;
}) {
  switch (kind) {
    case "monthBars":
      return <MonthBars rows={rows} progress={progress} />;
    case "weeklyMultiples":
      return <WeeklyMultiples rows={rows} />;
    case "streakMeters":
      return <StreakMeters rows={rows} />;
    case "weekdayColumns":
      return <WeekdayColumns rows={rows} />;
  }
}

// Postgres returns counts and decimals as text; format them for reading.
function Cell({ value, column }: { value: unknown; column: Column }) {
  if (value === null || value === undefined) return <span className="text-muted">–</span>;
  if (column.format === "text") return <>{String(value)}</>;
  const n = Number(value);
  if (Number.isNaN(n)) return <>{String(value)}</>;
  if (column.format === "pct") return <>{n.toFixed(1)}%</>;
  if (column.format === "change") {
    // The table shows the raw rows, so no red/green here: the sign carries the direction.
    const sign = n > 0 ? "+" : n < 0 ? "−" : "";
    return <>{`${sign}${Math.abs(n).toFixed(1)} pts`}</>;
  }
  return <>{n.toLocaleString("en-US")}</>;
}
