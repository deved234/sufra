"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Link } from "@/i18n/navigation";
import { Field, FormAlert, SubmitButton } from "@/components/form/field";
import GoogleSignIn from "@/components/auth/google-sign-in";
import { useAvailability } from "@/components/booking/use-availability";
import { telHref } from "@/components/site/blocks/block-helpers";
import { useViewer } from "@/components/use-viewer";
import { bookableDates, formatDate } from "@/lib/booking-slots";
import { exceptionFor, formatTime, isBookableDate } from "@/lib/opening-hours";

gsap.registerPlugin(useGSAP);

const STEPS = ["party", "date", "time", "details"];
const QUICK_PARTY = [1, 2, 3, 4, 5, 6];
const DAYS_PER_PAGE = 7;
const MOTION = "(prefers-reduced-motion: no-preference)";
const EVENING_FROM = "17:00";

const choiceClass =
  "relative flex cursor-pointer flex-col items-center justify-center gap-0.5 rounded-md border border-border-strong bg-surface px-2 py-3 text-center transition-colors duration-150 hover:bg-surface-muted has-checked:border-brand has-checked:bg-brand has-checked:text-on-brand has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring has-disabled:cursor-not-allowed has-disabled:opacity-45 has-disabled:hover:bg-surface";

// The choices live in the URL (?step=time&party=2&date=...), which gives three things
// for free: the browser's Back button walks the steps, a refresh loses nothing, and
// the visit survives leaving for sign in, which comes back to this same address.
function useBookingUrl(booking) {
  const params = useSearchParams();
  const dates = useMemo(() => bookableDates(), []);

  const rawParty = Number(params.get("party"));
  const party = Number.isInteger(rawParty) && rawParty >= 1 && rawParty <= booking.maxParty ? rawParty : null;
  const date = dates.includes(params.get("date")) ? params.get("date") : null;
  const time = /^\d{2}:\d{2}$/.test(params.get("time") ?? "") ? params.get("time") : null;

  // A step can't be reached before the choices it depends on, whatever the URL says
  const wanted = STEPS.indexOf(params.get("step"));
  const reachable = !party ? 0 : !date ? 1 : !time ? 2 : 3;
  const step = STEPS[Math.min(Math.max(wanted, 0), reachable)];

  const write = (changes, method) => {
    const next = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) next.delete(key);
      else next.set(key, value);
    }
    window.history[method](null, "", `${window.location.pathname}?${next}`);
  };

  return {
    party,
    date,
    time,
    step,
    dates,
    // Picking within a step replaces the address; moving on adds a Back entry
    choose: (changes) => write(changes, "replaceState"),
    go: (nextStep, changes = {}) => write({ ...changes, step: nextStep }, "pushState"),
  };
}

export default function BookingFlow({ restaurant, googleEnabled, action }) {
  const t = useTranslations("Booking");
  const locale = useLocale();
  const url = useBookingUrl(restaurant.booking);
  const { step, party, date, time } = url;
  const [notice, setNotice] = useState(null);

  const scope = useRef(null);
  const heading = useRef(null);
  const previousStep = useRef(step);

  useGSAP(
    () => {
      if (previousStep.current === step) return;
      previousStep.current = step;
      // Each step's heading takes the focus, so keyboard and screen reader users land
      // on the new content instead of being left on a button that no longer exists
      heading.current?.focus();
      const mm = gsap.matchMedia();
      mm.add(MOTION, () => {
        // Opacity, not autoAlpha: its visibility:hidden would take the focus away again
        gsap.from("[data-step-body]", { opacity: 0, y: 14, duration: 0.35, ease: "power3.out" });
      });
    },
    { scope, dependencies: [step] },
  );

  const stepIndex = STEPS.indexOf(step);

  return (
    <div ref={scope} className="flex flex-col gap-6">
      <ol aria-label={t("stepsLabel")} className="flex items-center gap-2">
        {STEPS.map((name, index) => (
          <li key={name} aria-current={index === stepIndex ? "step" : undefined} className="flex flex-1 flex-col gap-1.5">
            <span aria-hidden className={`h-1.5 rounded-pill transition-colors duration-300 ${index <= stepIndex ? "bg-brand" : "bg-border"}`} />
            <span className={`text-xs font-medium ${index === stepIndex ? "text-foreground" : "text-muted-foreground"}`}>{t(`steps.${name}`)}</span>
          </li>
        ))}
      </ol>

      {stepIndex > 0 && (
        <div className="flex flex-wrap gap-2 text-sm">
          <SummaryChip onClick={() => url.go("party")}>{t("partyCount", { count: party })}</SummaryChip>
          {stepIndex > 1 && <SummaryChip onClick={() => url.go("date")}>{formatDate(date, locale)}</SummaryChip>}
          {stepIndex > 2 && <SummaryChip onClick={() => url.go("time")}>{formatTime(time, locale)}</SummaryChip>}
        </div>
      )}

      <div data-step-body className="flex flex-col gap-5">
        <h2 ref={heading} tabIndex={-1} className="font-display text-h3 font-bold outline-none">
          {t(`${step}Heading`)}
        </h2>
        {step === "party" && <PartyStep url={url} maxParty={restaurant.booking.maxParty} phone={restaurant.phone} />}
        {step === "date" && <DateStep url={url} schedule={restaurant} />}
        {step === "time" && <TimeStep url={url} slug={restaurant.slug} phone={restaurant.phone} notice={notice} clearNotice={() => setNotice(null)} />}
        {step === "details" && (
          <DetailsStep url={url} slug={restaurant.slug} googleEnabled={googleEnabled} action={action} onSlotTaken={() => setNotice("slotTaken")} />
        )}
      </div>
    </div>
  );
}

function SummaryChip({ onClick, children }) {
  return (
    <button type="button" onClick={onClick} className="rounded-pill border border-border bg-surface px-3 py-1 font-medium transition-colors duration-150 hover:bg-surface-muted">
      {children}
    </button>
  );
}

function StepButtons({ onBack, onNext, nextDisabled }) {
  const t = useTranslations("Booking");
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled}
        className="rounded-pill bg-cta px-8 py-3 font-semibold text-on-cta transition-colors duration-150 hover:bg-cta-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        {t("next")}
      </button>
      {onBack && <BackButton onClick={onBack} />}
    </div>
  );
}

function BackButton({ onClick }) {
  const t = useTranslations("Booking");
  return (
    <button type="button" onClick={onClick} className="rounded-pill px-5 py-3 font-semibold text-muted-foreground transition-colors duration-150 hover:bg-surface-muted hover:text-foreground">
      {t("back")}
    </button>
  );
}

function CallRestaurant({ phone }) {
  const t = useTranslations("Booking");
  return (
    <a href={telHref(phone)} className="font-semibold text-brand-text hover:underline">
      {t("callRestaurant")} <bdi dir="ltr">{phone}</bdi>
    </a>
  );
}

// Why the closed days on the page are closed, where the owner wrote a reason. A closure
// over several days reads as one line.
function closureNotes(schedule, days) {
  const closures = new Map();
  for (const day of days) {
    const exception = exceptionFor(schedule, day);
    if (exception?.note && !isBookableDate(schedule, day)) closures.set(exception, [...(closures.get(exception) ?? []), day]);
  }
  return [...closures].map(([{ note }, closed]) => ({ note, first: closed[0], last: closed.at(-1) }));
}

function PartyStep({ url, maxParty, phone }) {
  const t = useTranslations("Booking");
  const value = url.party ?? Math.min(2, maxParty);
  const set = (count) => url.choose({ party: String(Math.min(Math.max(count, 1), maxParty)) });

  return (
    <>
      <fieldset className="flex flex-col gap-4">
        <legend className="sr-only">{t("partyHeading")}</legend>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {QUICK_PARTY.filter((count) => count <= maxParty).map((count) => (
            <label key={count} className={`${choiceClass} text-lg font-semibold`}>
              <input type="radio" name="party" checked={value === count} onChange={() => set(count)} className="sr-only" aria-label={t("partyCount", { count })} />
              <span aria-hidden>{count}</span>
            </label>
          ))}
        </div>
        {maxParty > QUICK_PARTY.length && (
          <div className="flex items-center gap-3">
            <StepperButton label={t("decrease")} onClick={() => set(value - 1)} disabled={value <= 1}>
              −
            </StepperButton>
            <output className="min-w-24 text-center font-semibold">{t("partyCount", { count: value })}</output>
            <StepperButton label={t("increase")} onClick={() => set(value + 1)} disabled={value >= maxParty}>
              +
            </StepperButton>
          </div>
        )}
        <p className="text-sm text-muted-foreground">
          {t("maxPartyHint", { max: maxParty })} <CallRestaurant phone={phone} />
        </p>
      </fieldset>
      <StepButtons onNext={() => url.go("date", { party: String(value) })} />
    </>
  );
}

function StepperButton({ label, children, ...button }) {
  return (
    <button
      type="button"
      aria-label={label}
      className="flex size-11 items-center justify-center rounded-pill border border-border-strong bg-surface text-xl font-semibold transition-colors duration-150 hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-45"
      {...button}
    >
      <span aria-hidden>{children}</span>
    </button>
  );
}

function DateStep({ url, schedule }) {
  const t = useTranslations("Booking");
  const locale = useLocale();
  const { dates, date } = url;
  // Opens on the page holding the current choice
  const [page, setPage] = useState(() => Math.floor(Math.max(dates.indexOf(date), 0) / DAYS_PER_PAGE));
  const shown = dates.slice(page * DAYS_PER_PAGE, (page + 1) * DAYS_PER_PAGE);
  const lastPage = Math.ceil(dates.length / DAYS_PER_PAGE) - 1;
  const shortDate = (day) => formatDate(day, locale, { day: "numeric", month: "short" });
  const notes = closureNotes(schedule, shown);

  return (
    <>
      <fieldset className="flex flex-col gap-3">
        <legend className="sr-only">{t("dateHeading")}</legend>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
          {shown.map((day) => {
            const index = dates.indexOf(day);
            const bookable = isBookableDate(schedule, day);
            const relative = index === 0 ? t("today") : index === 1 ? t("tomorrow") : formatDate(day, locale, { weekday: "short" });
            return (
              <label key={day} className={choiceClass}>
                <input type="radio" name="date" checked={date === day} disabled={!bookable} onChange={() => url.choose({ date: day, time: null })} className="sr-only" aria-label={bookable ? formatDate(day, locale) : `${formatDate(day, locale)}: ${t("dayClosed")}`} />
                <span aria-hidden className="text-xs font-medium">
                  {relative}
                </span>
                <span aria-hidden className="text-xl font-bold">
                  {formatDate(day, locale, { day: "numeric" })}
                </span>
                {/* In words, because a tooltip never shows on a phone */}
                <span aria-hidden className="text-xs">
                  {bookable ? formatDate(day, locale, { month: "short" }) : t("dayClosed")}
                </span>
              </label>
            );
          })}
        </div>
        {notes.length > 0 && (
          <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
            {notes.map(({ note, first, last }) => (
              <li key={first}>
                {shortDate(first)}
                {last !== first && ` – ${shortDate(last)}`}: {note}
              </li>
            ))}
          </ul>
        )}
        <div className="flex justify-between gap-2 text-sm">
          <button type="button" disabled={page === 0} onClick={() => setPage(page - 1)} className="rounded-pill px-3 py-1.5 font-semibold text-brand-text hover:bg-surface-muted disabled:invisible">
            {t("earlier")}
          </button>
          <button type="button" disabled={page === lastPage} onClick={() => setPage(page + 1)} className="rounded-pill px-3 py-1.5 font-semibold text-brand-text hover:bg-surface-muted disabled:invisible">
            {t("later")}
          </button>
        </div>
      </fieldset>
      <StepButtons onBack={() => url.go("party")} onNext={() => url.go("time")} nextDisabled={!date || !isBookableDate(schedule, date)} />
    </>
  );
}

function TimeStep({ url, slug, phone, notice, clearNotice }) {
  const t = useTranslations("Booking");
  const { date, party, time } = url;
  const { slots, failed, retry } = useAvailability(slug, date);

  const chosenFits = slots?.some((slot) => slot.time === time && slot.left >= party);
  const hasRoom = slots?.some((slot) => slot.left >= party);
  const groups = [
    ["midday", slots?.filter((slot) => slot.time >= "06:00" && slot.time < EVENING_FROM) ?? []],
    ["evening", slots?.filter((slot) => slot.time >= EVENING_FROM || slot.time < "06:00") ?? []],
  ];

  return (
    <>
      <FormAlert error={notice} />
      {failed ? (
        <div className="flex flex-col items-start gap-3">
          <p role="alert" className="text-danger">
            {t("loadFailed")}
          </p>
          <button type="button" onClick={retry} className="rounded-pill border border-border-strong px-5 py-2 font-semibold hover:bg-surface-muted">
            {t("retry")}
          </button>
        </div>
      ) : !slots ? (
        <div role="status" aria-label={t("loadingTimes")} className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {Array.from({ length: 10 }, (_, i) => (
            <span key={i} className="h-16 animate-pulse rounded-md bg-surface-muted" />
          ))}
        </div>
      ) : !hasRoom ? (
        <div className="flex flex-col items-start gap-3">
          <p>{t("noTimes")}</p>
          <CallRestaurant phone={phone} />
          <button type="button" onClick={() => url.go("date")} className="rounded-pill border border-border-strong px-5 py-2 font-semibold hover:bg-surface-muted">
            {t("chooseOtherDay")}
          </button>
        </div>
      ) : (
        groups.map(
          ([name, group]) =>
            group.length > 0 && <TimeGroup key={name} title={t(name)} slots={group} party={party} time={time} onPick={(value) => {
              clearNotice();
              url.choose({ time: value });
            }} />,
        )
      )}
      <StepButtons onBack={() => url.go("date")} onNext={() => url.go("details")} nextDisabled={!chosenFits} />
    </>
  );
}

function TimeGroup({ title, slots, party, time, onPick }) {
  const t = useTranslations("Booking");
  const locale = useLocale();
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-semibold text-muted-foreground">{title}</legend>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {slots.map((slot) => {
          const full = slot.left < party;
          return (
            <label key={slot.time} className={choiceClass}>
              <input type="radio" name="time" checked={time === slot.time} disabled={full} onChange={() => onPick(slot.time)} className="sr-only" />
              <span className="font-semibold">{formatTime(slot.time, locale)}</span>
              {/* Only when it's getting tight: a full list of numbers is just noise */}
              {!full && slot.left <= party + 4 && <span className="text-xs">{t("seatsLeft", { count: slot.left })}</span>}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function DetailsStep({ url, slug, googleEnabled, action, onSlotTaken }) {
  const t = useTranslations("Booking");
  const viewer = useViewer();
  // Where sign in comes back to: this step, with every choice in the address
  const back = `/r/${slug}/book?${useSearchParams()}`;

  if (viewer === undefined) {
    return <span role="status" aria-label={t("loadingDetails")} className="h-52 animate-pulse rounded-lg bg-surface-muted" />;
  }
  if (!viewer) return <SignInGate next={back} googleEnabled={googleEnabled} onBack={() => url.go("time")} />;
  if (!viewer.verified) return <VerifyGate next={back} email={viewer.email} />;
  return <DetailsForm url={url} viewer={viewer} action={action} onSlotTaken={onSlotTaken} />;
}

function SignInGate({ next, googleEnabled, onBack }) {
  const t = useTranslations("Booking");
  return (
    <div className="flex flex-col gap-5 rounded-lg border border-border bg-surface p-5 sm:p-6">
      <div className="flex flex-col gap-1">
        <p className="font-semibold">{t("gateTitle")}</p>
        <p className="text-sm text-muted-foreground">{t("gateBody")}</p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href={{ pathname: "/sign-in", query: { next } }} className="flex-1 rounded-pill bg-cta px-6 py-3 text-center font-semibold text-on-cta transition-colors duration-150 hover:bg-cta-hover">
          {t("gateSignIn")}
        </Link>
        <Link href={{ pathname: "/sign-up", query: { next } }} className="flex-1 rounded-pill border border-border-strong px-6 py-3 text-center font-semibold transition-colors duration-150 hover:bg-surface-muted">
          {t("gateSignUp")}
        </Link>
      </div>
      {googleEnabled && <GoogleSignIn next={next} />}
      <div>
        <BackButton onClick={onBack} />
      </div>
    </div>
  );
}

function VerifyGate({ next, email }) {
  const t = useTranslations("Booking");
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-border bg-surface p-5 sm:p-6">
      <p className="font-semibold">{t("verifyTitle")}</p>
      <p className="text-sm text-muted-foreground">{t("verifyBody", { email })}</p>
      <Link href={{ pathname: "/verify-email", query: { next } }} className="font-semibold text-brand-text hover:underline">
        {t("verifyLink")}
      </Link>
    </div>
  );
}

function DetailsForm({ url, viewer, action, onSlotTaken }) {
  const t = useTranslations("Booking");
  const locale = useLocale();
  const [state, formAction] = useActionState(async (previous, formData) => {
    const result = await action(previous, formData);
    // Someone took the time meanwhile: back to the times, saying why
    if (result?.error === "slotTaken") {
      onSlotTaken();
      url.go("time", { time: null });
    }
    return result;
  }, {});
  const errors = state.errors ?? {};

  return (
    <form action={formAction} noValidate className="flex flex-col gap-5">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="party" value={url.party} />
      <input type="hidden" name="date" value={url.date} />
      <input type="hidden" name="time" value={url.time} />
      {state.error !== "slotTaken" && <FormAlert error={state.error} />}
      <div className="rounded-md bg-surface-muted px-4 py-3 text-sm">
        <span className="text-muted-foreground">{t("bookingAs")} </span>
        <span className="font-semibold">{viewer.name}</span> · <bdi dir="ltr">{viewer.email}</bdi>
      </div>
      <Field
        label={t("phone")}
        name="phone"
        type="tel"
        dir="ltr"
        autoComplete="tel"
        required
        placeholder="0512345678"
        hint={t("phoneHint")}
        defaultValue={state.values?.phone ?? viewer.phone}
        error={errors.phone}
      />
      <Field as="textarea" rows={3} label={t("note")} name="note" maxLength={200} placeholder={t("notePlaceholder")} defaultValue={state.values?.note} error={errors.note} />
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton pendingLabel={t("confirming")}>{t("confirm")}</SubmitButton>
        <BackButton onClick={() => url.go("time")} />
      </div>
    </form>
  );
}
