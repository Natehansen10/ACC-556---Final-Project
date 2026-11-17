"use client";

import { useActionState, useEffect, useRef } from "react";
import type { ActionState } from "@/app/actions";
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
      <label className="grid gap-1 text-sm sm:col-span-2">
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
}: {
  action: ButtonAction;
  label: string;
  pendingLabel: string;
  confirm?: string;
  primary?: boolean;
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
      {state && state.ok && primary && <Alert ok>{state.message}</Alert>}
    </form>
  );
}
