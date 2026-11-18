import { signIn } from "@/app/actions";
import { LoginForm } from "@/components/forms";
import { Card, CheckIcon } from "@/components/ui";

// The front door: proxy.ts sends every signed-out visitor here.
// Phones: short intro, then the form (above the fold), then the example board.
// Desktop (lg+): intro and example board on the left, the sign-in card on the right.
export default function LoginPage() {
  return (
    <div className="grid gap-5 sm:py-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:grid-rows-[auto_auto] lg:min-h-[calc(100dvh-12rem)] lg:content-center lg:gap-x-14 lg:gap-y-8 lg:py-6">
      <div className="lg:col-start-1 lg:row-start-1">
        <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl lg:text-4xl">
          Small daily habits, done together.
        </h1>
        <p className="mt-2 max-w-[60ch] text-sm text-muted text-pretty sm:text-base lg:mt-4">
          Everyone sets a daily health goal, checks in each day, and sees the whole
          family&apos;s progress on one board.
        </p>
      </div>

      <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center">
        <Card>
          <h2 className="text-lg font-semibold">Sign in</h2>
          <p className="mt-1 mb-4 text-sm text-muted text-pretty">
            Use the email and password from your family account.
          </p>
          <LoginForm action={signIn} />
          <p className="mt-4 border-t border-divider pt-4 text-sm text-muted text-pretty">
            There&apos;s no sign-up: the family admin makes each account. Ask Nate if you need one.
          </p>
        </Card>
      </div>

      <div className="mt-3 lg:col-start-1 lg:row-start-2 lg:mt-0">
        <ExampleBoard />
        <p className="mt-4 max-w-[60ch] text-sm text-muted text-pretty">
          Each month, the best completion rate wins the family prize. Ties share it.
        </p>
      </div>
    </div>
  );
}

// Decorative only: a made-up week in the app's own day-dot style. No real data.
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const TODAY = 4; // Thursday
// Goal name, then one column per day. Narrower day columns on phones so it fits at 390px,
// with the fifth (TODAY) column a little wider so the "Today" label fits.
const COLS =
  "grid grid-cols-[minmax(0,1fr)_repeat(4,1.75rem)_2.5rem_repeat(2,1.75rem)] items-center gap-x-1 sm:grid-cols-[minmax(0,1fr)_repeat(7,2.25rem)]";

type Mark = "done" | "missed" | "today" | "upcoming";
const d: Mark = "done";
const m: Mark = "missed";
const t: Mark = "today";
const u: Mark = "upcoming";

const ROWS: { label: string; marks: Mark[] }[] = [
  { label: "Walk 30 min", marks: [d, d, m, d, d, u, u] },
  { label: "Weigh-in", marks: [d, d, d, d, t, u, u] },
  { label: "Take meds", marks: [d, d, d, d, d, u, u] },
  { label: "Drink water", marks: [m, d, d, m, t, u, u] },
];

function ExampleBoard() {
  return (
    <div aria-hidden className="select-none">
      <Card>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <p className="text-base font-semibold">This week</p>
          <p className="rounded-full bg-neutral-200/80 px-2 py-0.5 text-xs font-medium text-muted">
            Example
          </p>
        </div>
        <div className={`${COLS} pb-1.5`}>
          <span />
          {WEEKDAYS.map((day, i) => (
            <span
              key={day}
              className={`text-center text-xs ${i === TODAY ? "font-semibold text-foreground" : "text-muted"}`}
            >
              {i === TODAY ? "Today" : day}
            </span>
          ))}
        </div>
        <ul className="divide-y divide-divider">
          {ROWS.map((row) => (
            <li key={row.label} className={`${COLS} min-h-11`}>
              <span className="min-w-0 truncate text-sm font-medium">{row.label}</span>
              {row.marks.map((mark, i) => (
                <span key={i} className="flex justify-center">
                  <Dot mark={mark} />
                </span>
              ))}
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-divider pt-3 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <Dot mark="done" /> Done
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Dot mark="today" /> Today, not yet
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Dot mark="missed" /> Missed
          </span>
        </div>
      </Card>
    </div>
  );
}

// Same marks as DayDots on Today (app/page.tsx).
function Dot({ mark }: { mark: Mark }) {
  return (
    <span className="flex h-6 w-6 items-center justify-center">
      {mark === "done" ? (
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-success-600 text-white">
          <CheckIcon className="h-3.5 w-3.5" />
        </span>
      ) : mark === "today" ? (
        <span className="h-6 w-6 rounded-full border-2 border-accent-600" />
      ) : mark === "missed" ? (
        <span className="h-2 w-2 rounded-full bg-faint" />
      ) : (
        <span className="h-6 w-6 rounded-full border border-dashed border-neutral-300" />
      )}
    </span>
  );
}
