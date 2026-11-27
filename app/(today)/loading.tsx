import { DayDotsSkeleton, LoadingShell, line20, line24 } from "@/components/skeletons";
import { Card, PageHeader, Skeleton, titleClass } from "@/components/ui";

// Shown the instant you tap Today, while the page's queries (and the Strava check) run.
// Same layout as page.tsx: two 64px check-in rows with their day dots, then the family list.
// This file lives in the (today) folder so it covers only "/", not every page under it.
// (A folder name in parentheses groups files without changing the URL.)
export default function Loading() {
  return (
    <LoadingShell>
      <PageHeader title="Today">
        <Skeleton className={`${line20} w-28`} />
      </PageHeader>

      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <h2 className={titleClass}>Your goals</h2>
          <Skeleton className={`${line20} w-28`} />
        </div>
        <div className="flex flex-col gap-4">
          {[0, 1].map((i) => (
            <div key={i} className="flex flex-col gap-2">
              {/* The check-in row: 64px plus its border and text comes to 66px. */}
              <Skeleton className="h-[66px] rounded-xl" />
              <div className="flex flex-wrap items-end gap-x-4 gap-y-1 px-1">
                <DayDotsSkeleton />
                <Skeleton className={`${line20} mb-0.5 w-24`} />
              </div>
              <div className="flex min-h-11 items-center px-3">
                <Skeleton className="h-3 w-32 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <section className="flex flex-col gap-3">
        <h2 className={titleClass}>Family</h2>
        <Card className="overflow-hidden !p-0">
          <div className="divide-y divide-divider">
            {[0, 1, 2].map((i) => (
              <div key={i} className="p-4 sm:p-5">
                <div className="flex items-baseline justify-between gap-x-3">
                  <Skeleton className={`${line24} w-32`} />
                  <Skeleton className={`${line20} w-24`} />
                </div>
                <div className="mt-3 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <div>
                    <Skeleton className={`${line24} w-36`} />
                    <Skeleton className={`${line20} w-44`} />
                  </div>
                  <DayDotsSkeleton />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </LoadingShell>
  );
}
