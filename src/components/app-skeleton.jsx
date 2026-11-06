import Skeleton from "@/components/skeleton";

// What a signed-in page shows until its content arrives. Each folder with a page has
// a loading.js that exports this: on a client navigation only what's below the shared
// segment renders again, so a Suspense higher up never shows, and all these pages wait
// for the session.
export default function AppSkeleton() {
  return (
    <div role="status" className="flex flex-col gap-6">
      <Skeleton className="h-10 w-56" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-36 w-full rounded-lg" />
        <Skeleton className="h-36 w-full rounded-lg" />
      </div>
    </div>
  );
}
