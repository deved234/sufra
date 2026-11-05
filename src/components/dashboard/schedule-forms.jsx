"use client";

import { useActionState, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Field, FormAlert, SubmitButton } from "@/components/form/field";
import { formatDate } from "@/lib/booking-slots";
import { addException, removeException, saveWeeklyHours } from "@/lib/dashboard/schedule-actions";
import { formatTime } from "@/lib/opening-hours";

// A known Sunday, to get weekday names in the reader's language
const weekdayName = (day, locale) => formatDate(`2026-11-0${day + 1}`, locale, { weekday: "long" });

function Card({ title, lead, children }) {
  return (
    <fieldset className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5 sm:p-6">
      <legend className="px-1 font-display text-h3 font-bold">{title}</legend>
      {lead && <p className="-mt-1 text-sm text-muted-foreground">{lead}</p>}
      {children}
    </fieldset>
  );
}

// Coming bookings the change affects. Nothing is cancelled; the owner decides.
function AffectedBookings({ slug, affected }) {
  const t = useTranslations("Schedule");
  const locale = useLocale();
  if (!affected?.length) return null;
  return (
    <div role="alert" className="flex flex-col gap-2 rounded-md bg-danger-soft p-4 text-sm text-danger">
      <p className="font-semibold">{t("affectedTitle", { count: affected.length })}</p>
      <ul className="flex flex-col gap-1">
        {affected.map((booking) => (
          <li key={`${booking.date}${booking.time}${booking.name}`}>
            <Link href={{ pathname: `/dashboard/${slug}/bookings`, query: { date: booking.date } }} className="underline">
              {formatDate(booking.date, locale, { weekday: "short", day: "numeric", month: "short" })} · {formatTime(booking.time, locale)} · {booking.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

const fallback = { opens: "12:00", closes: "23:00" };

// One row per day. Rows keep their own state so a second period can be opened and
// closed before saving, and "apply to all" can copy the first open day.
export function WeeklyHoursForm({ slug, initial }) {
  const t = useTranslations("Schedule");
  const locale = useLocale();
  const [state, action, pending] = useActionState(saveWeeklyHours.bind(null, slug), {});
  const [, startTransition] = useTransition();
  const [days, setDays] = useState(initial);
  const errors = state.errors ?? {};
  const form = useTranslations("Form.errors");

  const update = (day, change) => setDays(days.map((item, index) => (index === day ? change(item) : item)));
  const setPeriod = (day, index, field, value) =>
    update(day, (item) => ({ periods: item.periods.map((period, i) => (i === index ? { ...period, [field]: value } : period)) }));
  const applyToAll = () => {
    const source = days.find((item) => item.periods.length > 0);
    if (source) setDays(days.map(() => source));
  };

  return (
    // Sent by hand, not through the form's action prop: React resets a form after an
    // action, which would put the boxes back to how the page loaded while the rows
    // below still show the owner's edits
    <form
      id="hours"
      noValidate
      className="scroll-mt-24"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        startTransition(() => action(data));
      }}
    >
      <Card title={t("title")} lead={t("lead")}>
        <FormAlert error={state.error} />
        {state.saved && (
          <p role="status" className="rounded-md bg-success-soft px-4 py-3 text-sm font-medium text-success">
            {t("saved")}
          </p>
        )}
        <AffectedBookings slug={slug} affected={state.affected} />
        <ul className="flex flex-col divide-y divide-border">
          {days.map(({ periods }, day) => (
            <li key={day} className="flex flex-col gap-2 py-3">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <label className="flex w-32 items-center gap-2 font-semibold">
                  <input
                    type="checkbox"
                    name={`day${day}open`}
                    aria-label={t("openOn", { day: weekdayName(day, locale) })}
                    checked={periods.length > 0}
                    onChange={(event) => update(day, () => ({ periods: event.target.checked ? [fallback] : [] }))}
                    className="size-4 accent-brand"
                  />
                  {weekdayName(day, locale)}
                </label>
                {periods.length === 0 ? (
                  <span className="text-sm text-muted-foreground">{t("closed")}</span>
                ) : (
                  periods.map((period, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <TimeInput name={`day${day}opens${index + 1}`} label={t("opens")} value={period.opens} onChange={(value) => setPeriod(day, index, "opens", value)} />
                      <span aria-hidden>–</span>
                      <TimeInput name={`day${day}closes${index + 1}`} label={t("closes")} value={period.closes} onChange={(value) => setPeriod(day, index, "closes", value)} />
                    </div>
                  ))
                )}
                {periods.length > 0 && (
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name={`day${day}second`}
                      checked={periods.length === 2}
                      onChange={(event) => update(day, (item) => ({ periods: event.target.checked ? [item.periods[0], { opens: "19:00", closes: "23:00" }] : [item.periods[0]] }))}
                      className="size-4 accent-brand"
                    />
                    {t("secondPeriod")}
                  </label>
                )}
              </div>
              {errors[`day${day}`] && <p className="text-sm font-medium text-danger">{form(errors[`day${day}`])}</p>}
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">{t("midnightHint")}</p>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={pending} className="rounded-pill bg-cta px-6 py-3 font-semibold text-on-cta transition-colors duration-150 hover:bg-cta-hover disabled:cursor-wait disabled:opacity-70">
            {pending ? t("saving") : t("save")}
          </button>
          <button type="button" onClick={applyToAll} className="rounded-pill border border-border-strong px-5 py-3 font-semibold hover:bg-surface-muted">
            {t("applyToAll")}
          </button>
        </div>
      </Card>
    </form>
  );
}

function TimeInput({ name, label, value, onChange }) {
  return <input type="time" name={name} aria-label={label} dir="ltr" value={value} onChange={(event) => onChange(event.target.value)} className="rounded-md border border-border-strong bg-surface px-2 py-1.5 focus-visible:border-ring" />;
}

const today = () => new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString().slice(0, 10);

export function ExceptionsForm({ slug, exceptions }) {
  const t = useTranslations("Schedule");
  const locale = useLocale();
  const [state, action] = useActionState(addException.bind(null, slug), {});
  const [type, setType] = useState("closed");
  const [error, setError] = useState(null);
  const [, startTransition] = useTransition();
  const [min] = useState(today);
  const errors = state.errors ?? {};
  const values = state.done ? {} : (state.values ?? {});
  const coming = exceptions.filter((item) => item.to >= min);
  const range = ({ from, to }) => {
    const options = { weekday: "short", day: "numeric", month: "short" };
    return from === to ? formatDate(from, locale, options) : `${formatDate(from, locale, options)} – ${formatDate(to, locale, options)}`;
  };

  return (
    <Card title={t("exceptionsTitle")} lead={t("exceptionsLead")}>
      <FormAlert error={error} />
      {coming.length > 0 && (
        <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
          {coming.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
              <div>
                <p className="font-semibold">
                  {range(item)} · {t(`type.${item.type}`)}
                  {item.type === "hours" && ` · ${formatTime(item.opens, locale)} – ${formatTime(item.closes, locale)}`}
                </p>
                {item.note && <p className="text-muted-foreground">{item.note}</p>}
              </div>
              <button
                type="button"
                onClick={() =>
                  startTransition(async () => {
                    const result = await removeException(slug, item.id);
                    setError(result.error ?? null);
                  })
                }
                className="font-semibold text-danger hover:underline"
              >
                {t("remove")}
              </button>
            </li>
          ))}
        </ul>
      )}
      <form key={state.done ?? "form"} action={action} noValidate className="flex flex-col gap-4">
        <FormAlert error={state.error} />
        <AffectedBookings slug={slug} affected={state.affected} />
        <div className="grid items-start gap-4 sm:grid-cols-3">
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            {t("exceptionType")}
            <select name="type" value={type} onChange={(event) => setType(event.target.value)} className="w-full rounded-md border border-border-strong bg-surface px-3 py-2.5 font-normal focus-visible:border-ring">
              {["closed", "noBooking", "hours"].map((name) => (
                <option key={name} value={name}>
                  {t(`type.${name}`)}
                </option>
              ))}
            </select>
          </label>
          <Field label={t("from")} name="from" type="date" dir="ltr" min={min} defaultValue={values.from} error={errors.from} />
          <Field label={t("to")} name="to" type="date" dir="ltr" min={min} defaultValue={values.to} error={errors.to} />
        </div>
        {type === "hours" && (
          <div className="grid items-start gap-4 sm:grid-cols-2">
            <Field label={t("opens")} name="opens" type="time" dir="ltr" defaultValue={values.opens} error={errors.opens} />
            <Field label={t("closes")} name="closes" type="time" dir="ltr" defaultValue={values.closes} error={errors.closes} />
          </div>
        )}
        <Field label={t("note")} name="note" maxLength={80} placeholder={t("notePlaceholder")} defaultValue={values.note} error={errors.note} />
        <SubmitButton pendingLabel={t("saving")} className="self-start">
          {t("addException")}
        </SubmitButton>
      </form>
    </Card>
  );
}
