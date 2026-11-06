import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireUser } from "@/lib/auth/dal";
import { getMyBookings } from "@/lib/booking/data";
import MyBookingList, { upcomingBookings } from "@/components/booking/my-booking-list";

export async function generateMetadata() {
  const t = await getTranslations("Bookings");
  return { title: t("myTitle") };
}

// A customer's own bookings, at every restaurant
export default async function MyBookings() {
  const user = await requireUser("/account/bookings");
  const [bookings, t] = await Promise.all([getMyBookings(user.id), getTranslations("Bookings")]);

  const upcoming = upcomingBookings(bookings);
  const upcomingIds = new Set(upcoming.map((booking) => booking.id));
  const past = bookings.filter((booking) => !upcomingIds.has(booking.id));

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-display text-h2 font-extrabold">{t("myTitle")}</h1>
      {bookings.length === 0 ? (
        <section className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-border-strong bg-surface p-8">
          <h2 className="font-display text-h3 font-bold">{t("emptyTitle")}</h2>
          <p className="max-w-md text-muted-foreground">{t("emptyBody")}</p>
          <Link href="/explore" className="rounded-pill bg-cta px-6 py-3 font-semibold text-on-cta transition-colors duration-150 hover:bg-cta-hover">
            {t("browseRestaurants")}
          </Link>
        </section>
      ) : (
        <>
          <MyBookingList title={t("upcoming")} bookings={upcoming} />
          <MyBookingList title={t("past")} bookings={past} rebook />
        </>
      )}
    </div>
  );
}
