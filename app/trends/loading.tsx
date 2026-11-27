import { LoadingShell, line20 } from "@/components/skeletons";
import { Card, PageHeader, Skeleton } from "@/components/ui";

// Shown the instant you tap Trends. Same layout as page.tsx: the report switcher and
// the person picker, then one card with the chart and the "show as a table" row.
export default function Loading() {
  return (
    <LoadingShell>
      <PageHeader title="Trends">
        Four views of how the family is doing. Pick a report and a person.
      </PageHeader>

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_16rem] md:items-end">
        <Skeleton className="h-[3.25rem] rounded-[26px]" />
        <div className="grid gap-1.5">
          <Skeleton className={`${line20} w-14`} />
          <Skeleton className="h-11 rounded-xl" />
        </div>
      </div>

      <Card>
        <div className="mb-4">
          <Skeleton className="h-7 w-56 rounded-lg sm:h-[1.875rem]" />
          <Skeleton className={`${line20} mt-1 w-full max-w-md`} />
          <Skeleton className={`${line20} w-1/2 sm:hidden`} />
        </div>
        <Skeleton className="h-64 rounded-xl" />
        <div className="mt-5 flex min-h-11 items-center border-t border-divider pt-2">
          <Skeleton className="h-3 w-48 rounded-full" />
        </div>
      </Card>
    </LoadingShell>
  );
}
