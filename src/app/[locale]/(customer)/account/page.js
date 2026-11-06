import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireUser } from "@/lib/auth/dal";
import { countMyPendingProposals, getMyBookings } from "@/lib/booking/data";
import MyBookingList, { upcomingBookings } from "@/components/booking/my-booking-list";

const HOME_BOOKINGS = 3;

export async function generateMetadata() {
  const t = await getTranslations("Dashboard");
  return { title: t("account") };
}

// The account's home: what's coming up, and what's waiting for an answer
export default async function AccountHome() {
  const user = await requireUser("/account");
  const [bookings, pending, t, bookingsT] = await Promise.all([getMyBookings(user.id), countMyPendingProposals(user.id), getTranslations("Dashboard"), getTranslations("Bookings")]);
  const upcoming = upcomingBookings(bookings);

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-display text-h2 font-extrabold">{t("hello", { name: user.name })}</h1>

      {pending > 0 && (
        <Link href="/account/bookings" className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-brand-soft p-4 font-semibold text-on-brand-soft">
          {bookingsT("pendingNotice", { count: pending })}
          <span className="underline">{bookingsT("pendingOpen")}</span>
        </Link>
      )}

      {upcoming.length > 0 ? (
        <div className="flex flex-col gap-3">
          <MyBookingList title={bookingsT("upcoming")} bookings={upcoming.slice(0, HOME_BOOKINGS)} />
          {upcoming.length > HOME_BOOKINGS && (
            <Link href="/account/bookings" className="self-start font-semibold text-brand-text hover:underline">
              {bookingsT("allMyBookings")}
            </Link>
          )}
        </div>
      ) : (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-border-strong bg-surface p-5">
          <div className="flex flex-col gap-1">
            <h2 className="font-semibold">{bookingsT("emptyTitle")}</h2>
            <p className="text-sm text-muted-foreground">{bookingsT("emptyBody")}</p>
          </div>
          <Link href="/explore" className="rounded-pill bg-cta px-5 py-2.5 text-sm font-semibold text-on-cta transition-colors duration-150 hover:bg-cta-hover">
            {bookingsT("browseRestaurants")}
          </Link>
        </section>
      )}
    </div>
  );
}
