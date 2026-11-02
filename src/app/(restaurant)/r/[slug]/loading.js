import Skeleton from "@/components/skeleton";

// Next.js wraps page.js in <Suspense fallback={<Loading />}>.
// The blocks match the real page's layout so nothing jumps when it arrives.
export default function Loading() {
  return (
    <div role="status" aria-label="جاري التحميل">
      <section className="bg-surface-tint">
        <div className="mx-auto flex max-w-5xl flex-col gap-5 px-6 py-16 md:py-24">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-14 w-72 max-w-full md:h-20" />
          <Skeleton className="h-6 w-full max-w-xl" />
          <Skeleton className="h-4 w-48" />
          <div className="flex gap-3">
            <Skeleton className="h-12 w-32 rounded-pill" />
            <Skeleton className="h-12 w-32 rounded-pill" />
          </div>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-16">
        <Skeleton className="h-10 w-28" />
        <Skeleton className="h-7 w-40" />
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5">
              <div className="flex justify-between gap-3">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-14" />
              </div>
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
