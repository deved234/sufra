import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireUser } from "@/lib/auth/dal";
import { isPublicStatus } from "@/lib/restaurant-status";
import { getMyBooking } from "@/lib/booking/data";
import { formatDate, SLOT_MINUTES } from "@/lib/booking-slots";
import { formatTime } from "@/lib/opening-hours";
import { AddToCalendar, CancelBooking, RespondToProposal } from "@/components/booking/booking-actions";
import { RequestChange, WithdrawRequest } from "@/components/booking/request-change";
import StatusBadge from "@/components/booking/status-badge";
import { mapHref, telHref } from "@/components/site/blocks/block-helpers";

export async function generateMetadata() {
  const t = await getTranslations("Booking");
  return { title: t("detailsTitle"), robots: { index: false } };
}

// One customer's booking: the confirmation right after booking, and the page to
// manage it later
export default async function BookingPage({ params, searchParams }) {
  const { id } = await params;
  const { new: isNew } = await searchParams;
  const user = await requireUser(`/account/bookings/${id}`);
  const [booking, t, bookings, place, locale] = await Promise.all([getMyBooking(id, user.id), getTranslations("Booking"), getTranslations("Bookings"), getTranslations("Restaurant"), getLocale()]);
  if (!booking) notFound();

  const { restaurant } = booking;
  const name = restaurant.name[locale];
  const active = booking.status === "confirmed" && new Date(booking.startsAt) > new Date();
  const open = booking.proposal && !booking.proposal.expired ? booking.proposal : null;
  const { lastProposal } = booking;
  const canRequest = active && !open && restaurant.booking?.enabled;
  // How to get there and who to call, while they still need to
  const stillOn = booking.status === "confirmed" || booking.status === "seated";
  const address = `${restaurant.address[locale]}${locale === "ar" ? "، " : ", "}${restaurant.city[locale]}`;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Link href="/account/bookings" className="self-start text-sm font-medium text-muted-foreground hover:text-foreground">
        <span aria-hidden className="inline-block rtl:-scale-x-100">
          ←
        </span>{" "}
        {bookings("myTitle")}
      </Link>
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-h2 font-extrabold">{t(isNew && active ? "confirmedTitle" : "detailsTitle")}</h1>
        {isNew && active && <p className="text-muted-foreground">{t("confirmedBody")}</p>}
      </div>

      {active && open?.by === "customer" && (
        <section className="flex flex-col gap-2 rounded-lg border border-border bg-brand-soft p-5 text-on-brand-soft">
          <h2 className="font-semibold">{t("requestWaiting")}</h2>
          <p>
            {formatDate(open.date, locale)} · {formatTime(open.time, locale)} · {t("partyCount", { count: open.party })}
          </p>
          <WithdrawRequest id={booking.id} />
        </section>
      )}
      {!open && lastProposal?.by === "customer" && (
        <p role="status" className={`rounded-md p-4 text-sm font-medium ${lastProposal.outcome === "accepted" ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}>
          {t(lastProposal.outcome === "accepted" ? "requestAccepted" : "requestDeclined")}
        </p>
      )}

      {active && open?.by === "owner" && (
        <section className="flex flex-col gap-3 rounded-lg border border-brand bg-brand-soft p-5 text-on-brand-soft">
          <h2 className="font-display text-h3 font-bold">{t("proposalTitle", { restaurant: name })}</h2>
          <p>
            <span className="font-semibold">{t("proposalNewTime")}</span> {formatDate(booking.proposal.date, locale)} · {formatTime(booking.proposal.time, locale)} · {t("partyCount", { count: booking.proposal.party })}
          </p>
          <p>
            <span className="font-semibold">{t("proposalReason")}</span> {booking.proposal.reason}
          </p>
          <p className="text-sm">{t("proposalKeep")}</p>
          <RespondToProposal id={booking.id} />
        </section>
      )}

      <dl className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
        <Row label={t("code")}>
          <bdi dir="ltr" className="font-mono text-lg font-bold tracking-widest">
            {booking.code}
          </bdi>
          <StatusBadge status={booking.status} />
        </Row>
        <Row label={t("restaurant")}>{name}</Row>
        {stillOn && (
          <>
            <Row label={place("addressLabel")}>
              <span>{address}</span>
              <a href={mapHref(address)} target="_blank" rel="noreferrer" className="text-sm text-brand-text hover:underline">
                {place("openMap")}
              </a>
            </Row>
            <Row label={place("phoneLabel")}>
              <a href={telHref(restaurant.phone)} className="text-brand-text hover:underline">
                <bdi dir="ltr">{restaurant.phone}</bdi>
              </a>
            </Row>
          </>
        )}
        <Row label={t("when")}>
          {formatDate(booking.date, locale)} · {formatTime(booking.time, locale)}
        </Row>
        <Row label={t("guests")}>{t("partyCount", { count: booking.party })}</Row>
        {booking.note && <Row label={t("notFromYou")}>{booking.note}</Row>}
        {booking.cancelReason && <Row label={t("cancelReason")}>{booking.cancelReason}</Row>}
      </dl>

      {active && (
        <div className="flex flex-wrap items-start gap-3">
          <AddToCalendar
            calendar={{
              id: booking.id,
              startsAt: booking.startsAt,
              minutes: booking.slots.length * SLOT_MINUTES,
              title: t("calendarTitle", { name }),
              location: `${restaurant.address[locale]}, ${restaurant.city[locale]}`,
              description: `${t("code")}: ${booking.code}`,
            }}
          />
          {canRequest && <RequestChange booking={booking} restaurant={{ slug: restaurant.slug, opens: restaurant.opens, closes: restaurant.closes, weeklyHours: restaurant.weeklyHours, exceptions: restaurant.exceptions, booking: restaurant.booking }} />}
          <CancelBooking id={booking.id} />
        </div>
      )}

      {isPublicStatus(restaurant.status) && (
        <Link href={`/r/${restaurant.slug}`} className="self-start font-semibold text-brand-text hover:underline">
          {t("backToRestaurant")}
        </Link>
      )}
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 px-5 py-3.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="flex flex-wrap items-center gap-x-3 gap-y-1 font-semibold">{children}</dd>
    </div>
  );
}
