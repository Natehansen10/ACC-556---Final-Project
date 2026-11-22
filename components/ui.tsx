import Link from "next/link";
import type { ReactNode } from "react";

// Serif titles (Instrument Serif, never bold, never under 20px).
export const pageTitleClass =
  "font-display text-[2.5rem] leading-[1.05] tracking-[-0.01em] text-balance sm:text-[2.75rem]";
export const titleClass = "font-display text-2xl leading-[1.15] text-balance sm:text-[1.625rem]";

// Flat: a hairline border on the cream surface, no shadow. Never nest cards.
export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-lg border border-divider bg-surface p-4 sm:p-5 ${className}`}
    >
      {children}
    </section>
  );
}

// Page title plus one short line under it. Same on every screen.
export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div>
      <h1 className={pageTitleClass}>{title}</h1>
      {children && <p className="mt-2 text-sm text-muted text-pretty">{children}</p>}
    </div>
  );
}

export function SectionTitle({
  children,
  hint,
  as: Tag = "h2",
}: {
  children: ReactNode;
  hint?: ReactNode;
  as?: "h2" | "h3";
}) {
  return (
    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <Tag className={titleClass}>{children}</Tag>
      {hint && <p className="text-sm text-muted tabular-nums">{hint}</p>}
    </div>
  );
}

// "Nothing here" block. Says what's missing and, where there is one, what to do.
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-dashed border-upcoming px-6 py-8 text-center">
      <p className="font-semibold">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted text-pretty">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Alert({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <p
      role={ok ? "status" : "alert"}
      aria-live={ok ? "polite" : "assertive"}
      className={`rounded-lg border px-3 py-2 text-sm ${
        ok
          ? "border-success-500/40 bg-success-100 text-success-700"
          : "border-red-300 bg-red-50 text-red-800"
      }`}
    >
      {children}
    </p>
  );
}

// `pace` (0-100) draws a thin mark: where you'd be today if you were exactly on track.
export function ProgressBar({
  value,
  pace,
  label,
}: {
  value: number | null;
  pace?: number;
  label?: string;
}) {
  const width = Math.max(0, Math.min(100, value ?? 0));
  const done = (value ?? 0) >= 100;
  return (
    <div className="relative">
      <div
        className="h-2.5 w-full overflow-hidden rounded-full bg-accent-200"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(width)}
      >
        <div
          className={`h-full rounded-full ${done ? "bg-success-600" : "bg-accent-700"}`}
          style={{ width: `${width}%` }}
        />
      </div>
      {pace !== undefined && pace > 0 && pace < 100 && (
        <span
          aria-hidden
          className="absolute -top-1 -bottom-1 w-0.5 -translate-x-1/2 rounded-full bg-foreground/70"
          style={{ left: `${pace}%` }}
        />
      )}
    </div>
  );
}

export function CheckIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M4.5 10.5l3.5 3.5 7.5-8" />
    </svg>
  );
}

export function ChevronIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M7.5 5l5 5-5 5" />
    </svg>
  );
}

// All controls are at least 44px tall (min-h-11) for phones. Buttons are pills.
// Primary is the one filled action color (charcoal), 48px tall.
export const buttonClass =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-accent-800 px-5 text-sm font-semibold text-white transition-colors hover:bg-accent-900 disabled:cursor-not-allowed disabled:opacity-60";

export const secondaryButtonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-accent-700 bg-transparent px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent-100 disabled:cursor-not-allowed disabled:opacity-60";

// Text-only action (e.g. "Sign out", "Undo yesterday"), still a 44px tap target.
export const quietButtonClass =
  "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-medium text-accent-700 transition-colors hover:bg-accent-100 disabled:cursor-not-allowed disabled:opacity-60";

// 16px text on phones so iOS doesn't zoom in when the field is focused.
export const inputClass =
  "w-full min-h-11 rounded-xl border border-accent-700 bg-surface px-3 text-base text-foreground placeholder:text-muted focus:border-foreground focus:outline-2 focus:outline-offset-0 focus:outline-focus sm:text-sm";

// Disclosure toggle for every <details>: a 44px row with a chevron that turns when open.
export const summaryClass =
  "inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg pr-2 text-sm font-medium text-accent-700 select-none hover:text-accent-900 [&>svg]:transition-transform [details[open]>&>svg]:rotate-90";

// One-of-several switcher (report, month): a pill track with pill segments. The active
// segment is a surface step with a hairline, not a shadow. Links, so every choice is a shareable URL.
export function SegmentedNav({
  items,
  label,
  columns,
}: {
  items: { href: string; label: string; active: boolean }[];
  label: string;
  columns?: number; // fixed columns; otherwise the items wrap
}) {
  return (
    <nav aria-label={label}>
      <ul
        className={`gap-1 rounded-full bg-track p-1 ${columns ? "grid" : "flex flex-wrap"}`}
        style={columns ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` } : undefined}
      >
        {items.map((item) => (
          <li key={item.href} className={columns ? "min-w-0" : "flex-1"}>
            <Link
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              scroll={false}
              className={`flex min-h-11 items-center justify-center rounded-full border px-2 text-center text-sm whitespace-nowrap transition-colors ${
                item.active
                  ? "border-divider bg-surface font-semibold text-foreground"
                  : "border-transparent font-medium text-muted hover:bg-surface/60 hover:text-foreground"
              }`}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
