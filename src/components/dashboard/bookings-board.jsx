"use client";

import { useActionState, useEffect, useOptimistic, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Field, FormAlert, SubmitButton } from "@/components/form/field";
import { Modal, useCloseOnDone } from "@/components/dashboard/menu/menu-dialogs";
import { TimeSelect, useOpenTimes } from "@/components/booking/booking-time-fields";
import { useAvailability } from "@/components/booking/use-availability";
import { addDays, bookableDates, formatDate } from "@/lib/booking-slots";
import { formatTime } from "@/lib/opening-hours";
import { addManualBooking, markBookingsSeen, proposeBookingChange, respondToCustomerRequest, setBookingStatus, withdrawProposal } from "@/lib/booking/actions";

const STATUSES = ["confirmed", "seated", "completed", "noShow", "cancelled"];
const REFRESH_MS = 60_000;

const STATUS_COLORS = {
  confirmed: "border-success/40 text-success",
  seated: "border-success bg-success-soft text-success",
  completed: "border-border text-muted-foreground",
  noShow: "border-danger/40 text-danger",
  cancelled: "border-danger/40 text-danger",
};

// New bookings show up by themselves: the page reloads its data every minute, and as
// soon as the owner comes back to this tab
function useLiveData() {
  const router = useRouter();
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const timer = setInterval(refresh, REFRESH_MS);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router]);
}

// One day of a restaurant's bookings. Date, filter and search live in the URL, so a day
// can be linked from an email and the Back button works.
export default function BookingsBoard({ slug, date, today, status, search, results, bookings, seats, slots, restaurant, seenAt, unseen, week }) {
  const t = useTranslations("Bookings");
  const locale = useLocale();
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [changing, setChanging] = useState(null);
  const [error, setError] = useState(null);
  const [, startTransition] = useTransition();
  const { booking: config } = restaurant;
  const enabled = Boolean(config?.enabled);

  useLiveData();

  // What was new when this page opened stays marked while it's open, even though
  // opening it clears the count on the tab
  const [newSince] = useState(seenAt);
  useEffect(() => {
    if (unseen > 0) markBookingsSeen(slug);
  }, [slug, unseen]);

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

  const withdraw = (id) =>
    startTransition(async () => {
      setError(null);
      const result = await withdrawProposal(slug, id);
      if (result.error) setError(result.error);
    });

  const answer = (id, accept) =>
    startTransition(async () => {
      setError(null);
      const result = await respondToCustomerRequest(slug, id, accept);
      if (result.error) setError(result.error);
    });

  const href = (changes) => ({ pathname: `/dashboard/${slug}/bookings`, query: { date, ...(status && { status }), ...changes } });
  const visible = status ? shown.filter((booking) => booking.status === status) : shown;
  const isNew = (booking) => booking.customerActionAt && (!newSince || booking.customerActionAt > newSince);
  const row = { onChange: change, onPropose: setChanging, onWithdraw: withdraw, onAnswer: answer, isNew, canPropose: enabled };
  const live = shown.filter((booking) => booking.status !== "cancelled" && booking.status !== "noShow");

  return (
    <div className="flex flex-col gap-6">
      {!enabled && (
        <section className="flex flex-col items-start gap-2 rounded-lg border border-dashed border-border-strong bg-surface p-5">
          <h2 className="font-display text-h3 font-bold">{t("disabledTitle")}</h2>
          <p className="text-muted-foreground">{t("disabledBody")}</p>
          <Link href={`/dashboard/${slug}/settings#booking`} className="font-semibold text-brand-text hover:underline">
            {t("goSettings")}
          </Link>
        </section>
      )}

      <form
        role="search"
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const q = new FormData(event.currentTarget).get("q").trim();
          router.push({ pathname: `/dashboard/${slug}/bookings`, query: { date, ...(q && { q }) } });
        }}
      >
        <input
          key={search}
          type="search"
          name="q"
          defaultValue={search}
          aria-label={t("searchLabel")}
          placeholder={t("searchPlaceholder")}
          className="min-w-0 flex-1 rounded-md border border-border-strong bg-surface px-3 py-2.5 placeholder:text-muted-foreground focus-visible:border-ring"
        />
        <button type="submit" className="rounded-pill border border-border-strong px-5 py-2.5 text-sm font-semibold hover:bg-surface-muted">
          {t("searchButton")}
        </button>
      </form>

      <FormAlert error={error} />

      {results ? (
        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-h3 font-bold">{t("searchResults", { query: search })}</h2>
            <Link href={{ pathname: `/dashboard/${slug}/bookings`, query: { date } }} className="font-semibold text-brand-text hover:underline">
              {t("clearSearch")}
            </Link>
          </div>
          {results.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border-strong p-8 text-center text-muted-foreground">{t("noSearchResults")}</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {results.map((booking) => (
                <BookingRow key={booking.id} booking={booking} showDate {...row} />
              ))}
            </ul>
          )}
        </section>
      ) : (
        <>
          {week}

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
            <p className="text-sm text-muted-foreground">
              {t("count", { count: live.length })} · {t("guests", { count: live.reduce((sum, booking) => sum + booking.party, 0) })}
            </p>
          </div>

          {config && <SeatTable slots={slots} seats={seats} capacity={config.capacity} />}

          <nav aria-label={t("filter")} className="flex flex-wrap gap-2 text-sm">
            <FilterLink href={href({ status: undefined })} active={!status} label={t("all")} count={shown.length} />
            {STATUSES.map((name) => (
              <FilterLink key={name} href={href({ status: name })} active={status === name} label={<StatusName status={name} />} count={shown.filter((b) => b.status === name).length} />
            ))}
          </nav>

          {visible.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border-strong p-8 text-center text-muted-foreground">{t("noSeatsYet")}</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {visible.map((booking) => (
                <BookingRow key={booking.id} booking={booking} {...row} />
              ))}
            </ul>
          )}
        </>
      )}

      {adding && <AddBooking slug={slug} date={date} onClose={() => setAdding(false)} />}
      {changing && <ChangeBooking key={changing.id} slug={slug} booking={changing} restaurant={restaurant} onClose={() => setChanging(null)} />}
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

// Seats per half hour, as written numbers: taken and left, readable on any screen.
// Only the booked times at first, so the bookings themselves stay near the top.
function SeatTable({ slots, seats, capacity }) {
  const t = useTranslations("Bookings");
  const locale = useLocale();
  const [showAll, setShowAll] = useState(false);
  const booked = slots.filter((slot) => seats[slot]);
  const listed = showAll ? slots : booked;

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{t("seatsTitle", { capacity })}</h3>
        <button type="button" onClick={() => setShowAll(!showAll)} aria-expanded={showAll} className="text-sm font-semibold text-brand-text hover:underline">
          {t(showAll ? "showBooked" : "showAllTimes")}
        </button>
      </div>
      {listed.length === 0 && <p className="text-sm text-muted-foreground">{t("allFree", { capacity })}</p>}
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {listed.map((slot) => {
          const taken = seats[slot] ?? 0;
          const ratio = Math.min(taken / capacity, 1);
          return (
            <li key={slot} className="flex flex-col gap-1 rounded-md border border-border p-2 text-xs">
              <span className="text-sm font-semibold">{formatTime(slot, locale)}</span>
              <span className={taken >= capacity ? "font-semibold text-danger" : "text-muted-foreground"}>{t("seatsLine", { taken, left: Math.max(capacity - taken, 0) })}</span>
              <span aria-hidden className="h-1 overflow-hidden rounded-pill bg-surface-muted">
                <span style={{ width: `${ratio * 100}%` }} className={`block h-full ${ratio >= 1 ? "bg-danger" : "bg-brand"}`} />
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function BookingRow({ booking, showDate, onChange, onPropose, onWithdraw, onAnswer, isNew, canPropose }) {
  const t = useTranslations("Bookings");
  const statusT = useTranslations("Booking.status");
  const locale = useLocale();
  const { status, proposal, lastProposal } = booking;
  const cancelled = status === "cancelled";
  const upcoming = status === "confirmed" && new Date(booking.startsAt) > new Date();
  const when = (item) => `${formatDate(item.date, locale, { weekday: "short", day: "numeric", month: "short" })} · ${formatTime(item.time, locale)} · ${t("guests", { count: item.party })}`;

  const customerAsks = proposal?.by === "customer" && !proposal.expired;
  const lastMessage =
    lastProposal && (lastProposal.by === "customer" ? (lastProposal.outcome === "accepted" ? "requestAccepted" : "requestDeclined") : lastProposal.outcome === "accepted" ? "proposalAccepted" : "proposalDeclined");

  const quick = status === "confirmed" ? [["seated", "markSeated"], ["noShow", "markNoShow"]] : status === "seated" ? [["completed", "markCompleted"]] : [];

  return (
    <li className={`flex flex-col gap-3 rounded-lg border bg-surface p-4 ${isNew(booking) ? "border-brand" : "border-border"} ${cancelled ? "opacity-60" : ""}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="shrink-0 sm:w-24">
          <p className="font-display text-lg font-bold">{formatTime(booking.time, locale)}</p>
          {showDate && <p className="text-xs text-muted-foreground">{formatDate(booking.date, locale, { day: "numeric", month: "short" })}</p>}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="font-semibold">
            {booking.name} <span className="font-normal text-muted-foreground">· {t("guests", { count: booking.party })}</span>
            {isNew(booking) && <span className="ms-2 rounded-pill bg-brand px-2 py-0.5 text-xs font-semibold text-on-brand">{t("newBadge")}</span>}
            {booking.source === "owner" && <span className="ms-2 rounded-pill bg-surface-muted px-2 py-0.5 text-xs font-medium">{t("manual")}</span>}
          </p>
          <p className="text-sm text-muted-foreground">
            <bdi dir="ltr" className="font-mono">
              {booking.code}
            </bdi>
          </p>
          {booking.note && <p className="text-sm">{booking.note}</p>}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {quick.map(([next, label]) => (
            <button key={next} type="button" onClick={() => onChange(booking.id, next)} className="rounded-pill bg-surface-muted px-3 py-2 text-sm font-semibold hover:bg-border">
              {t(label)}
            </button>
          ))}
          {booking.phone && (
            <a href={`tel:${booking.phone.replaceAll(" ", "")}`} className="rounded-pill border border-border-strong px-3 py-2 text-sm font-semibold hover:bg-surface-muted">
              {t("call")}
            </a>
          )}
          <select
            aria-label={t("statusLabel", { name: booking.name })}
            value={status}
            disabled={cancelled}
            onChange={(event) => onChange(booking.id, event.target.value)}
            className={`rounded-pill border bg-surface px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed ${STATUS_COLORS[status]}`}
          >
            {STATUSES.map((name) => (
              <option key={name} value={name}>
                {statusT(name)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {customerAsks && (
        <div className="flex flex-col gap-2 rounded-md bg-brand-soft p-3 text-sm text-on-brand-soft">
          <p>
            <span className="font-semibold">{t("requestWaiting")}</span> {when(proposal)}
          </p>
          <p>
            <span className="font-semibold">{t("reason")}:</span> {proposal.reason}
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => onAnswer(booking.id, true)} className="rounded-pill bg-cta px-4 py-2 font-semibold text-on-cta hover:bg-cta-hover">
              {t("requestAccept")}
            </button>
            <button type="button" onClick={() => onAnswer(booking.id, false)} className="rounded-pill border border-border-strong bg-surface px-4 py-2 font-semibold text-foreground hover:bg-surface-muted">
              {t("requestDecline")}
            </button>
          </div>
        </div>
      )}
      {proposal && !customerAsks && (
        <div className={`flex flex-wrap items-center justify-between gap-2 rounded-md p-3 text-sm ${proposal.expired ? "bg-surface-muted" : "bg-brand-soft text-on-brand-soft"}`}>
          <p>
            <span className="font-semibold">{t(proposal.by === "customer" ? "requestExpired" : proposal.expired ? "proposalExpired" : "proposalWaiting")}</span> {when(proposal)}
          </p>
          {proposal.by !== "customer" && (
            <button type="button" onClick={() => onWithdraw(booking.id)} className="font-semibold underline">
              {t("withdraw")}
            </button>
          )}
        </div>
      )}
      {!proposal && lastProposal && (
        <p className={`rounded-md p-3 text-sm ${lastProposal.outcome === "accepted" ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}>
          <span className="font-semibold">{t(lastMessage)}</span> {when(lastProposal)}
        </p>
      )}
      {upcoming && canPropose && !customerAsks && (
        <button type="button" onClick={() => onPropose(booking)} className="self-start text-sm font-semibold text-brand-text hover:underline">
          {t(booking.source === "owner" ? "editBooking" : proposal ? "proposeAgain" : "proposeChange")}
        </button>
      )}
    </li>
  );
}

function ChangeBooking({ slug, booking, restaurant, onClose }) {
  const t = useTranslations("Bookings");
  const locale = useLocale();
  const [state, action] = useActionState(proposeBookingChange.bind(null, slug, booking.id), {});
  useCloseOnDone(state, onClose);
  const errors = state.errors ?? {};
  const asksCustomer = booking.source !== "owner";

  const [dates] = useState(() => bookableDates());
  const [day, setDay] = useState(state.values?.date ?? (dates.includes(booking.date) ? booking.date : dates[0]));
  const [party, setParty] = useState(booking.party);
  const open = useOpenTimes(slug, day, party, restaurant, booking);

  return (
    <Modal title={t(asksCustomer ? "proposeTitle" : "editBooking")} onClose={onClose}>
      <form action={action} noValidate className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">{t(asksCustomer ? "proposeLead" : "editLead", { name: booking.name })}</p>
        <FormAlert error={state.error} />
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={t("party")} name="party" type="number" min={1} max={restaurant.booking.maxParty} dir="ltr" value={party} onChange={(event) => setParty(Number(event.target.value))} error={errors.party} />
          <Field label={t("date")} name="date" type="date" dir="ltr" min={dates[0]} max={dates.at(-1)} value={day} onChange={(event) => event.target.value && setDay(event.target.value)} error={errors.date} />
          <TimeSelect open={open} defaultTime={state.values?.time ?? booking.time} locale={locale} />
        </div>
        {asksCustomer && (
          <Field as="textarea" rows={3} label={t("reason")} name="reason" required maxLength={200} placeholder={t("reasonPlaceholder")} defaultValue={state.values?.reason} error={errors.reason} />
        )}
        <SubmitButton pendingLabel={t("saving")} className="self-start">
          {t(asksCustomer ? "sendProposal" : "save")}
        </SubmitButton>
      </form>
    </Modal>
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
          <TimeSelect open={open} defaultTime={state.values?.time} locale={locale} />
        </div>
        <Field as="textarea" rows={2} label={t("note")} name="note" maxLength={200} defaultValue={state.values?.note} error={errors.note} />
        <SubmitButton pendingLabel={t("saving")} className="self-start">
          {t("save")}
        </SubmitButton>
      </form>
    </Modal>
  );
}
