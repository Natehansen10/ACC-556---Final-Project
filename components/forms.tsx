"use client";

import Form from "next/form";
import { useActionState, useEffect, useRef } from "react";
import type { ActionState } from "@/app/actions";
import { STRAVA_SPORT_TYPES, stravaTypeLabel } from "@/lib/strava-types";
import {
  Alert,
  CheckIcon,
  buttonClass,
  inputClass,
  quietButtonClass,
  secondaryButtonClass,
} from "./ui";

type FormAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;
type ButtonAction = (prev: ActionState) => Promise<ActionState>;

// Clears a form after a successful save, so the next entry starts fresh.
function useResetOnSuccess(state: ActionState) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return ref;
}

export function LoginForm({ action }: { action: FormAction }) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="grid gap-4">
      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">Email</span>
        <input type="email" name="email" required autoComplete="email" className={inputClass} />
      </label>
      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">Password</span>
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          className={inputClass}
        />
      </label>
      <button type="submit" disabled={pending} className={`${buttonClass} mt-1`}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
      {state && !state.ok && <Alert ok={false}>{state.message}</Alert>}
    </form>
  );
}

// Today: one of your goals as one big button. Tap = done for today; tap again = undo.
// The circle flips the moment you tap (before the server answers), and the check mark
// "lands" with a short animation. On page load nothing animates.
export function CheckRow({
  action,
  done,
  title,
  detail,
}: {
  action: ButtonAction;
  done: boolean;
  title: string;
  detail: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const shown = pending ? !done : done;
  const touched = pending || state !== null;

  return (
    <form action={formAction}>
      <button
        type="submit"
        disabled={pending}
        aria-pressed={shown}
        className={`group flex min-h-16 w-full items-center gap-3 rounded-xl border-[1.5px] px-3 py-2.5 text-left press-lg ${
          shown
            ? "border-transparent bg-success-100"
            : "border-divider bg-background hover:border-accent-500 hover:bg-accent-100"
        }`}
      >
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-200 ${
            shown
              ? "border-success-600 bg-success-600 text-white"
              : "border-accent-700 bg-surface text-transparent group-hover:text-accent-200"
          }`}
        >
          <CheckIcon className={`h-5 w-5 ${touched && shown ? "check-pop" : ""}`} />
        </span>
        <span className="min-w-0 flex-1">
          <span className={`block font-semibold text-pretty break-words ${shown ? "text-success-700" : ""}`}>{title}</span>
          <span className="block text-sm text-muted tabular-nums">{detail}</span>
        </span>
        <span
          className={`shrink-0 text-right text-sm font-medium whitespace-nowrap ${
            shown ? "text-success-700" : "text-accent-700"
          }`}
        >
          {shown ? (
            <>
              Done
              <span className="block text-xs font-normal text-muted">tap to undo</span>
            </>
          ) : (
            "Tap when done"
          )}
        </span>
      </button>
      {state && !state.ok && (
        <div className="mt-2">
          <Alert ok={false}>{state.message}</Alert>
        </div>
      )}
    </form>
  );
}

// "Add a note" under an unfinished goal: the note is saved with today's check-in.
export function NoteCheckinForm({ action, goalTitle }: { action: FormAction; goalTitle: string }) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="mt-1 grid gap-2 sm:grid-cols-[1fr_auto]">
      <label className="sr-only" htmlFor={`note-${goalTitle}`}>
        Note for {goalTitle}
      </label>
      <input
        id={`note-${goalTitle}`}
        type="text"
        name="note"
        maxLength={280}
        placeholder="How did it go?"
        className={inputClass}
      />
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Saving…" : "Save note and check in"}
      </button>
      {state && !state.ok && (
        <div className="sm:col-span-2">
          <Alert ok={false}>{state.message}</Alert>
        </div>
      )}
    </form>
  );
}

export function GoalForm({ action, showStrava }: { action: FormAction; showStrava: boolean }) {
  const [state, formAction, pending] = useActionState(action, null);
  const ref = useResetOnSuccess(state);

  return (
    <form ref={ref} action={formAction} className="grid gap-4 sm:grid-cols-2">
      <label className="grid gap-1.5 text-sm sm:col-span-2">
        <span className="font-medium">What&apos;s the goal?</span>
        <input
          type="text"
          name="title"
          required
          minLength={2}
          maxLength={80}
          placeholder="e.g. Walk 20 minutes"
          className={inputClass}
        />
      </label>
      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">Times per week</span>
        <select name="frequency_per_week" defaultValue="3" className={inputClass}>
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <option key={n} value={n}>
              {n === 7 ? "7 (every day)" : n}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">Category</span>
        <select name="category" defaultValue="Fitness" className={inputClass}>
          <option>Fitness</option>
          <option>Nutrition</option>
          <option>Mindfulness</option>
          <option>Sleep</option>
        </select>
      </label>
      {showStrava ? (
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">Counts from Strava</span>
          <StravaTypeOptions defaultValue="" />
        </label>
      ) : (
        <input type="hidden" name="strava_sport_type" value="" />
      )}
      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">
          Unit <span className="font-normal text-muted">(optional)</span>
        </span>
        <input
          type="text"
          name="unit"
          maxLength={30}
          placeholder="e.g. walks, sessions"
          className={inputClass}
        />
      </label>
      <div className="flex flex-col gap-2 sm:col-span-2">
        <button type="submit" disabled={pending} className={buttonClass}>
          {pending ? "Adding…" : "Add goal"}
        </button>
        {state && <Alert ok={state.ok}>{state.message}</Alert>}
      </div>
    </form>
  );
}

// A single-button form (end goal, delete goal, award prize, undo yesterday).
// Shows its own error inline.
export function ActionButton({
  action,
  label,
  pendingLabel,
  confirm,
  variant = "secondary",
  showSuccess = variant === "primary",
  align = "end",
}: {
  action: ButtonAction;
  label: string;
  pendingLabel: string;
  confirm?: string;
  variant?: "primary" | "secondary" | "quiet";
  showSuccess?: boolean; // also show the success message (errors always show)
  align?: "start" | "end";
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const cls =
    variant === "primary" ? buttonClass : variant === "quiet" ? quietButtonClass : secondaryButtonClass;
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
      className={`flex flex-col gap-2 ${align === "end" ? "items-end" : "items-start"}`}
    >
      <button type="submit" disabled={pending} className={cls}>
        {pending ? pendingLabel : label}
      </button>
      {state && !state.ok && <Alert ok={false}>{state.message}</Alert>}
      {state && state.ok && showSuccess && <Alert ok>{state.message}</Alert>}
    </form>
  );
}

// The "Counts from Strava" choices. "" = manual check-ins only.
function StravaTypeOptions({ defaultValue, id }: { defaultValue: string; id?: string }) {
  return (
    <select id={id} name="strava_sport_type" defaultValue={defaultValue} className={inputClass}>
      <option value="">No, I check in myself</option>
      {STRAVA_SPORT_TYPES.map((t) => (
        <option key={t} value={t}>
          {stravaTypeLabel(t)}
        </option>
      ))}
    </select>
  );
}

// Change which Strava activities count for one of your goals (Goals page).
export function StravaTypeForm({
  action,
  value,
  goalId,
}: {
  action: FormAction;
  value: string | null;
  goalId: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="grid gap-2 sm:grid-cols-[auto_minmax(0,14rem)_auto] sm:items-center">
      <label htmlFor={`strava-${goalId}`} className="text-sm text-muted">
        Counts from Strava
      </label>
      <StravaTypeOptions id={`strava-${goalId}`} defaultValue={value ?? ""} />
      <button type="submit" disabled={pending} className={secondaryButtonClass}>
        {pending ? "Saving…" : "Save"}
      </button>
      {state && (
        <p role={state.ok ? "status" : "alert"} className={`text-sm sm:col-span-3 ${state.ok ? "text-success-700" : "text-red-800"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}

// Trends: pick a person. A plain GET form; choosing a name loads that view right away.
export function PersonSelect({
  report,
  value,
  options,
}: {
  report: string;
  value: string;
  options: { value: string; label: string }[];
}) {
  return (
    <Form action="/trends" scroll={false} className="grid gap-1.5 text-sm">
      <input type="hidden" name="report" value={report} />
      <label htmlFor="person" className="font-medium">
        Person
      </label>
      <div className="flex gap-2">
        <select
          id="person"
          name="member"
          defaultValue={value}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
          className={inputClass}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <noscript>
          <button type="submit" className={secondaryButtonClass}>
            Show
          </button>
        </noscript>
      </div>
    </Form>
  );
}
