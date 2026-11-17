import { MonthBars, StreakMeters, WeekdayColumns, WeeklyMultiples } from "@/components/charts";
import { Card, EmptyState, PillNav, SectionTitle } from "@/components/ui";
import { requireMember } from "@/lib/auth";
import { getFamilyMembers } from "@/lib/queries";
import { REPORTS, findReport, runReport, type ChartKind, type Column } from "@/lib/reports";

// Trends: pick a report and a person. Each report is one SQL query (lib/reports.ts);
// the page shows the result table and, below it, the exact SQL that produced it.
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

  const href = (r: string, m: string | null) =>
    `/trends?report=${r}${m ? `&member=${m}` : ""}`;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Trends</h1>
        <p className="mt-1 text-sm text-muted">
          Pick a report and a person. Each chart is drawn from one SQL query, shown at the bottom. Hover or tab to a bar for its numbers.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <PillNav
          label="Report"
          items={REPORTS.map((r) => ({
            href: href(r.key, member?.id ?? null),
            label: r.title,
            active: r.key === report.key,
          }))}
        />
        <PillNav
          label="Person"
          items={[
            { href: href(report.key, null), label: "Everyone", active: member === null },
            ...members.map((m) => ({
              href: href(report.key, m.id),
              label: m.id === me.id ? `${m.full_name} (you)` : m.full_name,
              active: member?.id === m.id,
            })),
          ]}
        />
      </div>

      <Card>
        <SectionTitle hint={`${rows.length} row${rows.length === 1 ? "" : "s"} · ${ms} ms`}>
          {report.question}
        </SectionTitle>
        {rows.length === 0 ? (
          <EmptyState
            title="Nothing to show yet"
            description={
              member
                ? `${member.full_name} has no check-ins for this report yet.`
                : "This report fills in as the family checks in."
            }
          />
        ) : (
          <>
            <Chart kind={report.chart} rows={rows} />
            <details className="mt-4 border-t border-divider pt-3">
              <summary className="cursor-pointer text-sm font-medium text-accent-700">
                Show as table (the rows the SQL returned)
              </summary>
              <div className="-mx-4 mt-3 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-divider text-left text-xs uppercase tracking-wide text-muted">
                      {report.columns.map((c) => (
                        <th
                          key={c.key}
                          className={`whitespace-nowrap py-2 pr-4 font-medium ${c.format === "text" ? "" : "text-right"}`}
                        >
                          {c.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={i} className="border-b border-divider last:border-0">
                        {report.columns.map((c) => (
                          <td
                            key={c.key}
                            className={`whitespace-nowrap py-2 pr-4 ${c.format === "text" ? "" : "text-right tabular-nums"}`}
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
        <SectionTitle>The SQL behind this table</SectionTitle>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
          {report.explain.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted">
          Parameters (passed separately, never pasted into the SQL):{" "}
          <code>$1</code> = your family ({me.family_name}) · <code>$2</code> ={" "}
          {member ? member.full_name : "NULL (everyone)"}
          {report.usesToday && (
            <>
              {" "}
              · <code>$3</code> = today ({me.today})
            </>
          )}
        </p>
        <pre className="mt-3 overflow-x-auto rounded-md bg-neutral-900 p-3 font-mono text-xs leading-relaxed text-neutral-100">
          {report.sql}
        </pre>
      </Card>
    </div>
  );
}

// One chart per report; each draws from the same rows as the table.
function Chart({ kind, rows }: { kind: ChartKind; rows: Record<string, unknown>[] }) {
  switch (kind) {
    case "monthBars":
      return <MonthBars rows={rows} />;
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
    const sign = n > 0 ? "+" : n < 0 ? "−" : "";
    const color = n > 0 ? "text-success-700" : n < 0 ? "text-red-700" : "text-muted";
    return <span className={color}>{`${sign}${Math.abs(n).toFixed(1)} pts`}</span>;
  }
  return <>{n.toLocaleString("en-US")}</>;
}
