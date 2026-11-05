"use client";

import { useActionState, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Field, FormAlert, SubmitButton } from "@/components/form/field";
import { Modal, useCloseOnDone } from "@/components/dashboard/menu/menu-dialogs";
import { TimeSelect, useOpenTimes } from "@/components/booking/booking-time-fields";
import { requestBookingChange, withdrawMyRequest } from "@/lib/booking/actions";
import { bookableDates } from "@/lib/booking-slots";

// The customer asks the restaurant to change the booking. Nothing moves until the
// restaurant accepts, the same as when it's the restaurant asking.
export function RequestChange({ booking, restaurant }) {
  const t = useTranslations("Booking");
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="rounded-pill border border-border-strong bg-surface px-6 py-3 font-semibold transition-colors duration-150 hover:bg-surface-muted">
        {t("requestChange")}
      </button>
      {open && <RequestDialog booking={booking} restaurant={restaurant} onClose={() => setOpen(false)} />}
    </>
  );
}

function RequestDialog({ booking, restaurant, onClose }) {
  const t = useTranslations("Booking");
  const bookings = useTranslations("Bookings");
  const locale = useLocale();
  const [state, action] = useActionState(requestBookingChange.bind(null, booking.id), {});
  useCloseOnDone(state, onClose);
  const errors = state.errors ?? {};

  const [dates] = useState(() => bookableDates());
  const [day, setDay] = useState(state.values?.date ?? (dates.includes(booking.date) ? booking.date : dates[0]));
  const [party, setParty] = useState(booking.party);
  const open = useOpenTimes(restaurant.slug, day, party, restaurant, booking);

  return (
    <Modal title={t("requestChange")} onClose={onClose}>
      <form action={action} noValidate className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">{t("requestLead")}</p>
        <FormAlert error={state.error} />
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={bookings("party")} name="party" type="number" min={1} max={restaurant.booking.maxParty} dir="ltr" value={party} onChange={(event) => setParty(Number(event.target.value))} error={errors.party} />
          <Field label={bookings("date")} name="date" type="date" dir="ltr" min={dates[0]} max={dates.at(-1)} value={day} onChange={(event) => event.target.value && setDay(event.target.value)} error={errors.date} />
          <TimeSelect open={open} defaultTime={state.values?.time ?? booking.time} locale={locale} />
        </div>
        <Field as="textarea" rows={3} label={bookings("reason")} name="reason" required maxLength={200} placeholder={t("requestReasonPlaceholder")} defaultValue={state.values?.reason} error={errors.reason} />
        <SubmitButton pendingLabel={bookings("saving")} className="self-start">
          {bookings("sendProposal")}
        </SubmitButton>
      </form>
    </Modal>
  );
}

export function WithdrawRequest({ id }) {
  const t = useTranslations("Booking");
  const [error, setError] = useState(null);
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex flex-col items-start gap-2">
      <FormAlert error={error} />
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await withdrawMyRequest(id);
            if (result.error) setError(result.error);
          })
        }
        className="font-semibold underline disabled:opacity-70"
      >
        {t("requestWithdraw")}
      </button>
    </div>
  );
}
