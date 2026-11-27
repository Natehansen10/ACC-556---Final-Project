import type { ReactNode } from "react";
import { Skeleton } from "./ui";

// Shared pieces for the loading screens (app/**/loading.tsx). Each loading screen copies its
// page's layout (same titles, same card shapes, same row heights) so nothing jumps when the
// real page arrives. The blocks are decoration; a screen reader just hears "Loading".

export function LoadingShell({ children }: { children: ReactNode }) {
  return (
    <div role="status" className="flex flex-col gap-6">
      <span className="sr-only">Loading</span>
      {children}
    </div>
  );
}

// A stand-in for one line of text: a 12px bar centered in a box as tall as the line it replaces,
// so the layout is the same height as the real text. (The space above and below the bar is a
// transparent border, not a margin: margins can collapse and change the height.)
// line20 = 14px text (most text), line24 = 16px text (names, goal titles), line16 = 12px labels.
const bar = "rounded-full border-transparent bg-clip-padding";
export const line20 = `h-5 border-y-4 ${bar}`;
export const line24 = `h-6 border-y-[6px] ${bar}`;
export const line16 = `h-4 border-y-2 ${bar}`;

// The week of day dots: seven 36px columns, a label over a 24px circle (44px tall, as on Today).
export function DayDotsSkeleton() {
  return (
    <div className="flex shrink-0 gap-1">
      {Array.from({ length: 7 }, (_, i) => (
        <span key={i} className="flex w-9 flex-col items-center gap-1">
          <Skeleton className={`${line16} w-6`} />
          <Skeleton className="h-6 w-6 rounded-full" />
        </span>
      ))}
    </div>
  );
}

// A progress bar with its "x of y check-ins" line under it.
export function ProgressSkeleton() {
  return (
    <div className="flex flex-col gap-1.5">
      <Skeleton className="h-2.5 rounded-full" />
      <Skeleton className={`${line20} w-44`} />
    </div>
  );
}
