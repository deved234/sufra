import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/auth/dal";
import { restoreRestaurant, suspendRestaurant, transferOwnership, unsuspendRestaurant } from "@/lib/admin/actions";
import { getRestaurantDetail } from "@/lib/admin/data";
import { isPublicStatus } from "@/lib/restaurant-status";
import { formatDate } from "@/lib/booking-slots";
import { formatTime } from "@/lib/opening-hours";
import { ConfirmAction, ReasonAction, TransferForm } from "@/components/admin/admin-actions";
import { PageTitle, RestaurantStatus, ShortDate, Stat } from "@/components/admin/admin-ui";

export default async function AdminRestaurant({ params }) {
  await requireAdmin();
  const { slug } = await params;
  const restaurant = await getRestaurantDetail(slug);
  if (!restaurant) notFound();
  const [t, statusT, locale] = await Promise.all([getTranslations("Admin"), getTranslations("Booking.status"), getLocale()]);
  const { status } = restaurant;

  return (
    <>
      <Link href="/admin/restaurants" className="self-start text-sm font-medium text-muted-foreground hover:text-foreground">
        <span aria-hidden className="inline-block rtl:-scale-x-100">
          ←
        </span>{" "}
        {t("restaurants")}
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <PageTitle>{restaurant.name[locale]}</PageTitle>
        <RestaurantStatus status={status} />
      </div>
      <p className="text-sm text-muted-foreground" dir="ltr">
        /r/{slug}
      </p>

      {status === "suspended" && restaurant.suspendedReason && (
        <p className="rounded-md bg-danger-soft p-3 text-sm text-danger">
          <span className="font-semibold">{t(restaurant.suspendedByAccount ? "suspendedWithAccount" : "suspendedReason")}</span> {restaurant.suspendedReason}
        </p>
      )}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label={t("colDishes")} value={restaurant.dishCount} />
        <Stat label={t("colBookings")} value={restaurant.bookingCount} hint={t(restaurant.bookingEnabled ? "bookingOn" : "bookingOff")} />
        <Stat label={t("colCreated")} value={<span className="text-base font-semibold"><ShortDate value={restaurant.createdAt} /></span>} />
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5">
        <h2 className="font-display text-h3 font-bold">{t("actionsTitle")}</h2>
        <div className="flex flex-wrap items-start gap-3">
          {status !== "deleted" && (
            <Link href={`/dashboard/${slug}`} className="rounded-pill bg-cta px-4 py-2 text-sm font-semibold text-on-cta hover:bg-cta-hover">
              {t("editInDashboard")}
            </Link>
          )}
          {isPublicStatus(status) && (
            <Link href={`/r/${slug}`} className="rounded-pill border border-border-strong px-4 py-2 text-sm font-semibold hover:bg-surface-muted">
              {t("viewSite")}
            </Link>
          )}
          {status === "suspended" && <ConfirmAction action={unsuspendRestaurant.bind(null, slug)} label={t("unsuspend")} />}
          {status === "deleted" && <ConfirmAction action={restoreRestaurant.bind(null, slug)} label={t("restore")} />}
          {!["suspended", "deleted"].includes(status) && <ReasonAction action={suspendRestaurant.bind(null, slug)} label={t("suspend")} />}
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5">
        <h2 className="font-display text-h3 font-bold">{t("ownersTitle")}</h2>
        {restaurant.owners.length === 0 && <p className="text-sm text-muted-foreground">{t("noOwner")}</p>}
        <ul className="flex flex-col gap-1 text-sm">
          {restaurant.owners.map((owner) => (
            <li key={owner.id}>
              <Link href={`/admin/users/${owner.id}`} className="font-semibold hover:underline">
                {owner.name}
              </Link>{" "}
              <bdi dir="ltr" className="text-muted-foreground">
                {owner.email}
              </bdi>
            </li>
          ))}
        </ul>
        {status !== "deleted" && <TransferForm action={transferOwnership.bind(null, slug)} />}
      </section>

      {restaurant.recent.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-display text-h3 font-bold">{t("recentBookings")}</h2>
          <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface text-sm">
            {restaurant.recent.map((booking) => (
              <li key={booking.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                <span>
                  {formatDate(booking.date, locale, { day: "numeric", month: "short" })} · {formatTime(booking.time, locale)} · {booking.name}
                </span>
                <span className="text-muted-foreground">{statusT(booking.status)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
