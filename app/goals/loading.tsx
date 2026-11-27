import { LoadingShell, ProgressSkeleton, line20, line24 } from "@/components/skeletons";
import { Card, PageHeader, Skeleton, titleClass } from "@/components/ui";

// Shown the instant you tap Goals. Same layout as page.tsx: your goals (title, details,
// progress bar, "Change this goal"), the Add a goal button, then the family list.
export default function Loading() {
  return (
    <LoadingShell>
      <PageHeader title="Goals">
        <Skeleton className={`${line20} w-56`} />
      </PageHeader>

      <Card>
        <h2 className={`${titleClass} mb-3`}>Your goals</h2>
        <div className="flex flex-col gap-5">
          {[0, 1].map((i) => (
            <div key={i} className="flex flex-col gap-2">
              <div>
                <Skeleton className={`${line24} w-40`} />
                <Skeleton className={`${line20} w-32`} />
              </div>
              <ProgressSkeleton />
              <div className="flex min-h-11 items-center">
                <Skeleton className="h-3 w-36 rounded-full" />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 border-t border-divider pt-4">
          <Skeleton className="h-12 w-full rounded-full sm:w-32" />
        </div>
      </Card>

      <section className="flex flex-col gap-3">
        <h2 className={titleClass}>Family</h2>
        <Card className="overflow-hidden !p-0">
          <div className="divide-y divide-divider">
            {[0, 1, 2].map((i) => (
              <div key={i} className="p-4 sm:p-5">
                <Skeleton className={`${line24} mb-[1.125rem] w-32`} />
                <div className="flex flex-col gap-2">
                  <div>
                    <Skeleton className={`${line24} w-36`} />
                    <Skeleton className={`${line20} w-28`} />
                  </div>
                  <ProgressSkeleton />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <p className="text-sm text-muted text-pretty">
        Monthly target = times per week × days in the month ÷ 7, rounded. Paused days are left out. The dark mark on each bar
        is where an on-track goal would be after yesterday.
      </p>
    </LoadingShell>
  );
}
