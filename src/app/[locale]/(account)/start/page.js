import { Suspense } from "react";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireUser } from "@/lib/auth/dal";
import { homeFor } from "@/lib/auth/home-path";
import Skeleton from "@/components/skeleton";

export const metadata = {
  robots: { index: false, follow: false },
};

// Where sign-in, Google and email links land when nothing else asked for a page, so
// one place decides where each account belongs. There's nothing to see here.
export default function StartPage({ searchParams }) {
  return (
    <Suspense fallback={<Skeleton className="h-28 w-full max-w-md" />}>
      <Forward searchParams={searchParams} />
    </Suspense>
  );
}

async function Forward({ searchParams }) {
  const { as } = await searchParams;
  const asOwner = as === "owner";
  const user = await requireUser(asOwner ? "/start?as=owner" : "/start");
  const [href, locale] = await Promise.all([homeFor(user, { asOwner }), getLocale()]);
  redirect({ href, locale });
}
