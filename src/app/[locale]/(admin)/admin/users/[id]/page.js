import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/auth/dal";
import { confirmUserEmail, endUserSessions, sendUserPasswordLink, suspendUser, unsuspendUser } from "@/lib/admin/actions";
import { getUserDetail } from "@/lib/admin/data";
import { formatDate } from "@/lib/booking-slots";
import { formatTime } from "@/lib/opening-hours";
import { ConfirmAction, ReasonAction } from "@/components/admin/admin-actions";
import { PageTitle, RestaurantStatus, ShortDate } from "@/components/admin/admin-ui";

export default async function AdminUser({ params }) {
  await requireAdmin();
  const { id } = await params;
  const user = await getUserDetail(id);
  if (!user) notFound();
  const [t, statusT, locale] = await Promise.all([getTranslations("Admin"), getTranslations("Booking.status"), getLocale()]);
  const isAdmin = user.role === "admin";

  return (
    <>
      <Link href="/admin/users" className="self-start text-sm font-medium text-muted-foreground hover:text-foreground">
        <span aria-hidden className="inline-block rtl:-scale-x-100">
          ←
        </span>{" "}
        {t("users")}
      </Link>
      <div className="flex flex-col gap-1">
        <PageTitle>{user.name}</PageTitle>
        <p className="text-sm text-muted-foreground">
          <bdi dir="ltr">{user.email}</bdi>
          {user.phone && (
            <>
              {" · "}
              <bdi dir="ltr">{user.phone}</bdi>
            </>
          )}
        </p>
      </div>

      {user.suspended && (
        <p className="rounded-md bg-danger-soft p-3 text-sm text-danger">
          <span className="font-semibold">{t("suspendedReason")}</span> {user.suspendedReason}
        </p>
      )}

      <dl className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-surface p-5 text-sm lg:grid-cols-4">
        <div>
          <dt className="text-muted-foreground">{t("colKind")}</dt>
          <dd className="font-semibold">{isAdmin ? t("type.admin") : user.owned.length > 0 ? t("type.owner") : t("type.customer")}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t("colSignIn")}</dt>
          <dd className="font-semibold">{[user.hasPassword && t("signInPassword"), user.googleLinked && "Google"].filter(Boolean).join(" · ")}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t("colState")}</dt>
          <dd className="font-semibold">{user.verified ? t("verified") : t("type.unverified")}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t("colCreated")}</dt>
          <dd className="font-semibold">
            <ShortDate value={user.createdAt} />
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t("sessions")}</dt>
          <dd className="font-semibold">{user.sessions}</dd>
        </div>
      </dl>

      <section className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5">
        <h2 className="font-display text-h3 font-bold">{t("actionsTitle")}</h2>
        {isAdmin ? (
          <p className="text-sm text-muted-foreground">{t("adminProtected")}</p>
        ) : (
          <div className="flex flex-wrap items-start gap-3">
            {!user.verified && <ConfirmAction action={confirmUserEmail.bind(null, id)} label={t("confirmEmail")} />}
            <ConfirmAction action={sendUserPasswordLink.bind(null, id)} label={t("sendPasswordLink")} doneLabel={t("linkSent")} />
            <ConfirmAction action={endUserSessions.bind(null, id)} label={t("endSessions")} doneLabel={t("sessionsEnded")} />
            {user.suspended ? <ConfirmAction action={unsuspendUser.bind(null, id)} label={t("unsuspendUser")} /> : <ReasonAction action={suspendUser.bind(null, id)} label={t("suspendUser")} />}
          </div>
        )}
      </section>

      {user.owned.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-display text-h3 font-bold">{t("restaurants")}</h2>
          <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface text-sm">
            {user.owned.map((restaurant) => (
              <li key={restaurant.slug} className="flex flex-wrap items-center justify-between gap-2 p-3">
                <Link href={`/admin/restaurants/${restaurant.slug}`} className="font-semibold hover:underline">
                  {restaurant.name[locale]}
                </Link>
                <RestaurantStatus status={restaurant.status} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {user.recent.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-display text-h3 font-bold">{t("recentBookings")}</h2>
          <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface text-sm">
            {user.recent.map((booking) => (
              <li key={booking.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                <span>
                  {booking.restaurantName?.[locale]} · {formatDate(booking.date, locale, { day: "numeric", month: "short" })} · {formatTime(booking.time, locale)}
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
