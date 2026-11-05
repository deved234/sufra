"use client";

import { useActionState, useOptimistic, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Field, FormAlert, SubmitButton } from "@/components/form/field";
import { Modal, useCloseOnDone } from "@/components/dashboard/menu/menu-dialogs";
import { useAvailability } from "@/components/booking/use-availability";
import { addDays, bookableDates, formatDate } from "@/lib/booking-slots";
import { formatTime } from "@/lib/opening-hours";
import { addManualBooking, setBookingStatus } from "@/lib/booking/actions";

const STATUSES = ["confirmed", "seated", "completed", "noShow", "cancelled"];

const STATUS_COLORS = {
  confirmed: "border-success/40 text-success",
  seated: "border-success bg-success-soft text-success",
  completed: "border-border text-muted-foreground",
  noShow: "border-danger/40 text-danger",
  cancelled: "border-danger/40 text-danger",
};

// One day of a restaurant's bookings. Date and filter live in the URL, so a day can
// be linked from an email and the Back button works.
export default function BookingsBoard({ slug, date, today, status, bookings, seats, slots, capacity, enabled }) {
  const t = useTranslations("Bookings");
  const locale = useLocale();
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState(null);
  const [, startTransition] = useTransition();

  // The new status shows at once. If saving fails, React drops this and the real
  // one comes back by itself.
  const [shown, setShown] = useOptimistic(bookings, (current, { id, next }) =>
    current.map((booking) => (booking.id === id ? { ...booking, status: next } : booking)),
  );

  const change = (id, next) =>
    startTransition(async () => {
      setError(null);
      setShown({ id, next });
      const result = await setBookingStatus(slug, id, next);
      if (result.error) setError(result.error);
    });

  const href = (changes) => ({ pathname: `/dashboard/${slug}/bookings`, query: { date, ...(status && { status }), ...changes } });
  const visible = status ? shown.filter((booking) => booking.status === status) : shown;

  return (
    <div className="flex flex-col gap-6">
      {!enabled && (
        <section className="flex flex-col items-start gap-2 rounded-lg border border-dashed border-border-strong bg-surface p-5">
          <h2 className="font-display text-h3 font-bold">{t("disabledTitle")}</h2>
          <p className="text-muted-foreground">{t("disabledBody")}</p>
          <Link href={`/dashboard/${slug}/settings`} className="font-semibold text-brand-text hover:underline">
            {t("goSettings")}
          </Link>
        </section>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <DayLink href={href({ date: addDays(date, -1) })} label={t("previousDay")} flip />
          <input
            type="date"
            aria-label={t("datePicker")}
            value={date}
            dir="ltr"
            onChange={(event) => event.target.value && router.push(href({ date: event.target.value }))}
            className="rounded-md border border-border-strong bg-surface px-3 py-2 text-sm"
          />
          <DayLink href={href({ date: addDays(date, 1) })} label={t("nextDay")} />
          {date !== today && (
            <Link href={href({ date: today })} className="rounded-pill px-3 py-2 text-sm font-semibold text-brand-text hover:bg-surface-muted">
              {t("today")}
            </Link>
          )}
        </div>
        {enabled && (
          <button type="button" onClick={() => setAdding(true)} className="rounded-pill bg-cta px-5 py-2.5 text-sm font-semibold text-on-cta transition-colors duration-150 hover:bg-cta-hover">
            {t("add")}
          </button>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <h2 className="font-display text-h3 font-bold">{formatDate(date, locale)}</h2>
        <p className="text-sm text-muted-foreground">{t("count", { count: visible.length })}</p>
      </div>

      <Occupancy slots={slots} seats={seats} capacity={capacity} />

      <nav aria-label={t("filter")} className="flex flex-wrap gap-2 text-sm">
        <FilterLink href={href({ status: undefined })} active={!status} label={t("all")} count={shown.length} />
        {STATUSES.map((name) => (
          <FilterLink key={name} href={href({ status: name })} active={status === name} label={<StatusName status={name} />} count={shown.filter((b) => b.status === name).length} />
        ))}
      </nav>

      <FormAlert error={error} />

      {visible.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border-strong p-8 text-center text-muted-foreground">{t("noSeatsYet")}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {visible.map((booking) => (
            <BookingRow key={booking.id} booking={booking} onChange={change} />
          ))}
        </ul>
      )}

      {adding && <AddBooking slug={slug} date={date} onClose={() => setAdding(false)} />}
    </div>
  );
}

function StatusName({ status }) {
  const t = useTranslations("Booking.status");
  return t(status);
}

function DayLink({ href, label, flip }) {
  return (
    <Link href={href} aria-label={label} className="flex size-10 items-center justify-center rounded-pill border border-border-strong bg-surface hover:bg-surface-muted">
      {/* Points the way time moves, which flips with the reading direction */}
      <span aria-hidden className={flip ? "rtl:-scale-x-100" : "-scale-x-100 rtl:scale-x-100"}>
        ←
      </span>
    </Link>
  );
}

function FilterLink({ href, active, label, count }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-pill border px-3 py-1.5 font-medium transition-colors duration-150 ${active ? "border-brand bg-brand text-on-brand" : "border-border bg-surface hover:bg-surface-muted"}`}
    >
      {label} <span className="opacity-75">{count}</span>
    </Link>
  );
}

// A small bar chart of the day: how full the restaurant is, per half hour
function Occupancy({ slots, seats, capacity }) {
  const t = useTranslations("Bookings");
  const locale = useLocale();
  const busy = slots.some((slot) => seats[slot]);
  if (!busy) return null;

  return (
    <figure className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4">
      <figcaption className="text-sm font-semibold">{t("occupancy")}</figcaption>
      <ul className="flex h-20 items-end gap-0.5">
        {slots.map((slot) => {
          const taken = seats[slot] ?? 0;
          const label = t("occupancyOf", { taken, capacity, time: formatTime(slot, locale) });
          const ratio = Math.min(taken / capacity, 1);
          return (
            <li key={slot} title={label} className="flex h-full min-w-0 flex-1 items-end rounded-sm bg-surface-muted">
              <span className="sr-only">{label}</span>
              <span aria-hidden style={{ height: `${ratio * 100}%` }} className={`w-full rounded-sm ${ratio >= 1 ? "bg-danger" : "bg-brand"}`} />
            </li>
          );
        })}
      </ul>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{formatTime(slots[0], locale)}</span>
        <span>{formatTime(slots.at(-1), locale)}</span>
      </div>
    </figure>
  );
}

function BookingRow({ booking, onChange }) {
  const t = useTranslations("Bookings");
  const statusT = useTranslations("Booking.status");
  const locale = useLocale();
  const cancelled = booking.status === "cancelled";

  return (
    <li className={`flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 sm:flex-row sm:items-center ${cancelled ? "opacity-60" : ""}`}>
      <div className="w-20 shrink-0 font-display text-lg font-bold">{formatTime(booking.time, locale)}</div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="font-semibold">
          {booking.name} <span className="font-normal text-muted-foreground">· {t("guests", { count: booking.party })}</span>
          {booking.source === "owner" && <span className="ms-2 rounded-pill bg-surface-muted px-2 py-0.5 text-xs font-medium">{t("manual")}</span>}
        </p>
        <p className="text-sm text-muted-foreground">
          <bdi dir="ltr" className="font-mono">
            {booking.code}
          </bdi>
        </p>
        {booking.note && <p className="text-sm">{booking.note}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <a href={`tel:${booking.phone.replaceAll(" ", "")}`} className="rounded-pill border border-border-strong px-4 py-2 text-sm font-semibold hover:bg-surface-muted">
          {t("call")}
        </a>
        <select
          aria-label={t("statusLabel", { name: booking.name })}
          value={booking.status}
          disabled={cancelled}
          onChange={(event) => onChange(booking.id, event.target.value)}
          className={`rounded-pill border bg-surface px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed ${STATUS_COLORS[booking.status]}`}
        >
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {statusT(status)}
            </option>
          ))}
        </select>
      </div>
    </li>
  );
}

function AddBooking({ slug, date, onClose }) {
  const t = useTranslations("Bookings");
  const locale = useLocale();
  const [state, action] = useActionState(addManualBooking.bind(null, slug), {});
  useCloseOnDone(state, onClose);
  const errors = state.errors ?? {};

  const [dates] = useState(() => bookableDates());
  const [day, setDay] = useState(state.values?.date ?? (dates.includes(date) ? date : dates[0]));
  const { slots } = useAvailability(slug, day);
  const [party, setParty] = useState(2);
  const open = slots?.filter((slot) => slot.left >= party);

  return (
    <Modal title={t("addTitle")} onClose={onClose}>
      <form action={action} noValidate className="flex flex-col gap-4">
        <input type="hidden" name="locale" value={locale} />
        <FormAlert error={state.error} />
        <Field label={t("name")} name="name" required maxLength={80} defaultValue={state.values?.name} error={errors.name} />
        <Field label={t("phone")} name="phone" type="tel" dir="ltr" required placeholder="0512345678" defaultValue={state.values?.phone} error={errors.phone} />
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={t("party")} name="party" type="number" min={1} dir="ltr" value={party} onChange={(event) => setParty(Number(event.target.value))} error={errors.party} />
          <Field label={t("date")} name="date" type="date" dir="ltr" min={dates[0]} max={dates.at(-1)} value={day} onChange={(event) => event.target.value && setDay(event.target.value)} error={errors.date} />
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            {t("time")}
            <select name="time" required disabled={!open?.length} className="w-full rounded-md border border-border-strong bg-surface px-3 py-2.5 font-normal text-foreground focus-visible:border-ring">
              {!open?.length && <option value="">{slots ? t("noTimes") : t("pickTime")}</option>}
              {open?.map((slot) => (
                <option key={slot.time} value={slot.time}>
                  {formatTime(slot.time, locale)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <Field as="textarea" rows={2} label={t("note")} name="note" maxLength={200} defaultValue={state.values?.note} error={errors.note} />
        <SubmitButton pendingLabel={t("saving")} className="self-start">
          {t("save")}
        </SubmitButton>
      </form>
    </Modal>
  );
}
