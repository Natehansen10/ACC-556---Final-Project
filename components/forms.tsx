"use client";

import { useActionState, useEffect, useRef } from "react";
import type { ActionState } from "@/app/actions";
import { STRAVA_SPORT_TYPES, stravaTypeLabel } from "@/lib/strava-types";
import { Alert, buttonClass, inputClass, secondaryButtonClass } from "./ui";

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
    <form action={formAction} className="grid gap-3">
      <label className="grid gap-1 text-sm">
        <span className="font-medium">Email</span>
        <input type="email" name="email" required autoComplete="email" className={inputClass} />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="font-medium">Password</span>
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          className={inputClass}
        />
      </label>
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
      {state && !state.ok && <Alert ok={false}>{state.message}</Alert>}
    </form>
  );
}

// One day on the Today page. On your own goals, yesterday and today are
// buttons: tap to check in, tap again to undo. Every other day is display-only.
export function CheckDot({
  action,
  done,
  label,
}: {
  action: ButtonAction;
  done: boolean;
  label: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="flex flex-col items-center">
      <button
        type="submit"
        disabled={pending}
        aria-label={label}
        title={label}
        className={`h-7 w-7 rounded-full border-2 transition ${
          done
            ? "border-success-500 bg-success-500 text-white"
            : "border-accent-600 bg-white hover:bg-accent-100"
        } ${pending ? "opacity-50" : ""}`}
      >
        {done ? "✓" : ""}
      </button>
      {state && !state.ok && (
        <span role="alert" className="mt-1 max-w-24 text-center text-[11px] leading-tight text-red-700">
          {state.message}
        </span>
      )}
    </form>
  );
}

// "Done today" with an optional note, under each of your own unfinished goals.
export function DoneTodayForm({ action }: { action: FormAction }) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="mt-2 flex flex-col gap-1.5 sm:flex-row sm:items-center">
      <input
        type="text"
        name="note"
        maxLength={280}
        placeholder="Note (optional), e.g. BP 128/82"
        aria-label="Note for today"
        className={`${inputClass} sm:flex-1`}
      />
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Saving…" : "Done today"}
      </button>
      {state && !state.ok && <Alert ok={false}>{state.message}</Alert>}
    </form>
  );
}

export function GoalForm({ action }: { action: FormAction }) {
  const [state, formAction, pending] = useActionState(action, null);
  const ref = useResetOnSuccess(state);

  return (
    <form ref={ref} action={formAction} className="grid gap-3 sm:grid-cols-2">
      <label className="grid gap-1 text-sm sm:col-span-2">
        <span className="font-medium">Goal</span>
        <input
          type="text"
          name="title"
          required
          minLength={2}
          maxLength={80}
          placeholder="e.g. Stretch after work"
          className={inputClass}
        />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="font-medium">Times per week</span>
        <select name="frequency_per_week" defaultValue="3" className={inputClass}>
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        <span className="font-medium">Category</span>
        <select name="category" defaultValue="Fitness" className={inputClass}>
          <option>Fitness</option>
          <option>Nutrition</option>
          <option>Mindfulness</option>
          <option>Sleep</option>
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        <span className="font-medium">Counts from Strava</span>
        <StravaTypeOptions defaultValue="" />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="font-medium">
          Unit <span className="font-normal text-muted">(optional)</span>
        </span>
        <input
          type="text"
          name="unit"
          maxLength={30}
          placeholder="sessions, walks, days"
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

// A single-button form (end goal, delete goal, award prize). Shows its own error inline.
export function ActionButton({
  action,
  label,
  pendingLabel,
  confirm,
  primary = false,
  showSuccess = primary,
}: {
  action: ButtonAction;
  label: string;
  pendingLabel: string;
  confirm?: string;
  primary?: boolean;
  showSuccess?: boolean; // also show the success message (errors always show)
}) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
      className="flex flex-col items-end gap-2"
    >
      <button
        type="submit"
        disabled={pending}
        className={primary ? buttonClass : secondaryButtonClass}
      >
        {pending ? pendingLabel : label}
      </button>
      {state && !state.ok && <Alert ok={false}>{state.message}</Alert>}
      {state && state.ok && showSuccess && <Alert ok>{state.message}</Alert>}
    </form>
  );
}

// The "Counts from Strava" choices. "" = manual check-ins only.
function StravaTypeOptions({ defaultValue }: { defaultValue: string }) {
  return (
    <select name="strava_sport_type" defaultValue={defaultValue} className={inputClass}>
      <option value="">No, manual only</option>
      {STRAVA_SPORT_TYPES.map((t) => (
        <option key={t} value={t}>
          {stravaTypeLabel(t)}
        </option>
      ))}
    </select>
  );
}

// Change which Strava activities count for one of your goals (Goals page).
export function StravaTypeForm({ action, value }: { action: FormAction; value: string | null }) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2 text-xs">
      <span className="text-muted">Counts from Strava:</span>
      <div className="w-40">
        <StravaTypeOptions defaultValue={value ?? ""} />
      </div>
      <button type="submit" disabled={pending} className={secondaryButtonClass}>
        {pending ? "Saving…" : "Save"}
      </button>
      {state && <span className={state.ok ? "text-success-700" : "text-red-700"}>{state.message}</span>}
    </form>
  );
}
