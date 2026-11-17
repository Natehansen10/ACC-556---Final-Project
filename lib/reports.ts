import "server-only";
import { connection } from "next/server";
import { sql } from "./db";

// The Trends page. Each report is ONE SQL query, stored here as plain text.
// The page shows this exact text and runs this exact text, so what you read is what ran.
//
// Parameters are passed separately ($1, $2, $3), never pasted into the SQL string, so a
// value can't change the query (no SQL injection):
//   $1 = the logged-in person's family_id   (every report is limited to your own family)
//   $2 = the person picked in the filter     (NULL = everyone)
//   $3 = today's date in your timezone       (only reports that need it)

export type Column = {
  key: string;
  label: string;
  format?: "pct" | "change" | "number" | "text";
};

export type ChartKind = "monthBars" | "weeklyMultiples" | "streakMeters" | "weekdayColumns";

export type Report = {
  key: string;
  chart: ChartKind;
  title: string;
  question: string; // the question the table answers
  explain: string[]; // how the SQL works, in plain words
  usesToday: boolean;
  columns: Column[];
  sql: string;
};

export const REPORTS: Report[] = [
  {
    key: "monthly",
    chart: "monthBars",
    title: "Month over month",
    question: "How did each person do each month, where did they place, and did they improve?",
    explain: [
      "goal_month: one row per goal per month. The target comes from the view v_goal_monthly_targets; LEFT JOIN keeps goals with zero check-ins, so skipping a goal still counts against you.",
      "member_month: adds each person's goals together for each month.",
      "RANK() numbers people inside each month by completion rate. Ties share a place.",
      "LAG() reads the same person's rate from the month before. The change is this month's % minus last month's %: 70% then 47% is \"down 23\".",
    ],
    usesToday: false,
    columns: [
      { key: "month_label", label: "Month", format: "text" },
      { key: "member", label: "Person", format: "text" },
      { key: "checkins", label: "Check-ins", format: "number" },
      { key: "target", label: "Target", format: "number" },
      { key: "completion_pct", label: "Completion", format: "pct" },
      { key: "place", label: "Place", format: "number" },
      { key: "change_vs_last_month", label: "Vs last month", format: "change" },
    ],
    sql: `WITH goal_month AS (
    SELECT g.user_id,
           t.goal_id,
           t.month,
           t.target,
           COUNT(c.id) AS checkins
    FROM public.v_goal_monthly_targets t
    JOIN public.goals g ON g.id = t.goal_id
    LEFT JOIN public.checkins c
           ON c.goal_id = t.goal_id
          AND c.checkin_date >= t.month
          AND c.checkin_date <  (t.month + INTERVAL '1 month')::date
    GROUP BY g.user_id, t.goal_id, t.month, t.target
),
member_month AS (
    SELECT p.id AS user_id,
           p.full_name,
           gm.month,
           SUM(gm.checkins) AS checkins,
           SUM(gm.target)   AS target,
           ROUND(100.0 * SUM(gm.checkins) / NULLIF(SUM(gm.target), 0), 1) AS completion_pct
    FROM goal_month gm
    JOIN public.profiles p ON p.id = gm.user_id
    WHERE p.family_id = $1
      AND ($2::uuid IS NULL OR p.id = $2::uuid)
    GROUP BY p.id, p.full_name, gm.month
)
SELECT to_char(month, 'Mon YYYY') AS month_label,
       full_name                  AS member,
       checkins,
       target,
       completion_pct,
       RANK() OVER (PARTITION BY month ORDER BY completion_pct DESC NULLS LAST) AS place,
       completion_pct - LAG(completion_pct) OVER (PARTITION BY user_id ORDER BY month) AS change_vs_last_month
FROM member_month
ORDER BY month DESC, place, member;`,
  },
  {
    key: "weekly",
    chart: "weeklyMultiples",
    title: "Weekly",
    question: "How many check-ins did each person log each week, compared with their weekly goal?",
    explain: [
      "weeks: generate_series makes one row per week (Monday start) for the last 6 weeks, so a week with no check-ins still shows up as 0.",
      "CROSS JOIN pairs every week with every person; LEFT JOIN brings in their goals and that week's check-ins.",
      "weekly_goal is a correlated subquery: for each person and week, it adds up the times-per-week of the goals that were running that week.",
      "The final WHERE drops people who had no goal that week, so the table only shows people with something to track.",
    ],
    usesToday: true,
    columns: [
      { key: "week_of", label: "Week of", format: "text" },
      { key: "member", label: "Person", format: "text" },
      { key: "checkins", label: "Check-ins", format: "number" },
      { key: "weekly_goal", label: "Weekly goal", format: "number" },
      { key: "pct_of_goal", label: "Of goal", format: "pct" },
    ],
    sql: `WITH weeks AS (
    SELECT generate_series(date_trunc('week', $3::date) - INTERVAL '5 weeks',
                           date_trunc('week', $3::date),
                           INTERVAL '1 week')::date AS week_start
),
member_week AS (
    SELECT w.week_start,
           p.full_name,
           COUNT(c.id) AS checkins,
           (SELECT COALESCE(SUM(g2.frequency_per_week), 0)
            FROM public.goals g2
            WHERE g2.user_id = p.id
              AND g2.start_date <= w.week_start + 6
              AND (g2.end_date IS NULL OR g2.end_date >= w.week_start)) AS weekly_goal
    FROM weeks w
    CROSS JOIN public.profiles p
    LEFT JOIN public.goals g ON g.user_id = p.id
    LEFT JOIN public.checkins c
           ON c.goal_id = g.id
          AND c.checkin_date >= w.week_start
          AND c.checkin_date <  w.week_start + 7
    WHERE p.family_id = $1
      AND ($2::uuid IS NULL OR p.id = $2::uuid)
    GROUP BY w.week_start, p.id, p.full_name
)
SELECT to_char(week_start, 'Mon FMDD') AS week_of,
       full_name                     AS member,
       checkins,
       weekly_goal,
       ROUND(100.0 * checkins / NULLIF(weekly_goal, 0), 1) AS pct_of_goal
FROM member_week
WHERE weekly_goal > 0 OR checkins > 0      -- skip people with no goal that week
ORDER BY week_start DESC, member;`,
  },
  {
    key: "streaks",
    chart: "streakMeters",
    title: "Streaks",
    question: "What is each goal's current run of days in a row, and its longest ever?",
    explain: [
      "The trick (\"gaps and islands\"): number each goal's check-in dates 1, 2, 3 with ROW_NUMBER(), then subtract that number from the date. Days in a row all give the same answer, so that answer labels the streak.",
      "streaks: GROUP BY that label gives each streak's first day, last day, and length.",
      "longest = the biggest streak. current = the streak whose last day is today or yesterday (FILTER), otherwise 0.",
    ],
    usesToday: true,
    columns: [
      { key: "member", label: "Person", format: "text" },
      { key: "goal", label: "Goal", format: "text" },
      { key: "current_streak", label: "Current streak (days)", format: "number" },
      { key: "longest_streak", label: "Longest (days)", format: "number" },
      { key: "total_checkins", label: "All check-ins", format: "number" },
    ],
    sql: `WITH days AS (
    SELECT c.goal_id,
           c.checkin_date,
           c.checkin_date - (ROW_NUMBER() OVER (PARTITION BY c.goal_id
                                                ORDER BY c.checkin_date))::int AS streak_label
    FROM public.checkins c
    JOIN public.goals g    ON g.id = c.goal_id
    JOIN public.profiles p ON p.id = g.user_id
    WHERE p.family_id = $1
      AND ($2::uuid IS NULL OR p.id = $2::uuid)
),
streaks AS (
    SELECT goal_id,
           MAX(checkin_date) AS last_day,
           COUNT(*)          AS days
    FROM days
    GROUP BY goal_id, streak_label
)
SELECT p.full_name AS member,
       g.title     AS goal,
       COALESCE(MAX(s.days) FILTER (WHERE s.last_day >= $3::date - 1), 0) AS current_streak,
       COALESCE(MAX(s.days), 0) AS longest_streak,
       COALESCE(SUM(s.days), 0) AS total_checkins
FROM public.goals g
JOIN public.profiles p ON p.id = g.user_id
LEFT JOIN streaks s    ON s.goal_id = g.id
WHERE p.family_id = $1
  AND ($2::uuid IS NULL OR p.id = $2::uuid)
  AND g.end_date IS NULL
GROUP BY p.full_name, g.title
ORDER BY current_streak DESC, longest_streak DESC, member, goal;`,
  },
  {
    key: "weekday",
    chart: "weekdayColumns",
    title: "Day of week",
    question: "Which days of the week does the family check in most?",
    explain: [
      "GROUP BY the day of the week (ISODOW: Monday = 1 ... Sunday = 7) counts check-ins per weekday.",
      "COUNT(DISTINCT g.user_id) counts how many different people checked in on that weekday.",
      "SUM(COUNT(*)) OVER () is a window over the grouped rows: the total of all weekdays, so each day's share = its count / that total.",
    ],
    usesToday: false,
    columns: [
      { key: "weekday", label: "Day", format: "text" },
      { key: "checkins", label: "Check-ins", format: "number" },
      { key: "people", label: "People", format: "number" },
      { key: "share_pct", label: "Share", format: "pct" },
    ],
    sql: `SELECT to_char(c.checkin_date, 'FMDay') AS weekday,
       COUNT(*)                         AS checkins,
       COUNT(DISTINCT g.user_id)        AS people,
       ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS share_pct
FROM public.checkins c
JOIN public.goals g    ON g.id = c.goal_id
JOIN public.profiles p ON p.id = g.user_id
WHERE p.family_id = $1
  AND ($2::uuid IS NULL OR p.id = $2::uuid)
GROUP BY EXTRACT(ISODOW FROM c.checkin_date), to_char(c.checkin_date, 'FMDay')
ORDER BY EXTRACT(ISODOW FROM c.checkin_date);`,
  },
];

export function findReport(key: string | undefined): Report {
  return REPORTS.find((r) => r.key === key) ?? REPORTS[0];
}

// Runs the report's SQL text exactly as shown on the page. sql.unsafe() takes a plain string,
// which is safe here because the strings are fixed in this file and every value is a $ parameter.
export async function runReport(
  report: Report,
  familyId: string,
  memberId: string | null,
  today: string,
): Promise<{ rows: Record<string, unknown>[]; ms: number }> {
  await connection();
  const params: (string | null)[] = [familyId, memberId];
  if (report.usesToday) params.push(today);
  const started = performance.now();
  const rows = await sql.unsafe(report.sql, params);
  return {
    rows: rows as unknown as Record<string, unknown>[],
    ms: Math.round(performance.now() - started),
  };
}
