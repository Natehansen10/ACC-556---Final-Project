import { LoadingShell, line20, line24 } from "@/components/skeletons";
import { Card, PageHeader, Skeleton } from "@/components/ui";

// Shown the instant you tap Leaderboard. Same layout as page.tsx: the month switcher,
// then one card of ranked rows (place badge, name, rate, progress bar, goal lines).
export default function Loading() {
  return (
    <LoadingShell>
      <PageHeader title="Leaderboard">
        Everyone&apos;s check-ins against their monthly target. The highest completion rate wins the
        month&apos;s prize, and ties share it.
      </PageHeader>

      <Skeleton className="h-[3.25rem] rounded-[26px]" />

      <Card>
        <div className="mb-4">
          <Skeleton className="h-7 w-44 rounded-lg sm:h-[1.875rem]" />
          {/* The line under the month wraps to three lines on phones, one on desktop. */}
          <Skeleton className={`${line20} mt-1 w-full max-w-[17rem] sm:max-w-xl`} />
          <Skeleton className={`${line20} w-full max-w-[17rem] sm:hidden`} />
          <Skeleton className={`${line20} w-2/3 max-w-[11rem] sm:hidden`} />
        </div>
        <div className="flex flex-col divide-y divide-divider">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-3 py-4 first:pt-0 last:pb-0">
              <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-x-3">
                  <Skeleton className={`${line24} w-32`} />
                  <Skeleton className={`${line20} w-24`} />
                </div>
                <Skeleton className="mt-2 h-2.5 rounded-full" />
                <div className="mt-2 flex flex-col gap-0.5">
                  <div className="flex justify-between gap-3">
                    <Skeleton className={`${line20} w-36`} />
                    <Skeleton className={`${line20} w-12`} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </LoadingShell>
  );
}
