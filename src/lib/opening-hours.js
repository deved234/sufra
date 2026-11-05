// Opening-hours math. Times are "HH:MM" and dates "YYYY-MM-DD", both in Riyadh time,
// which is UTC+3 all year. Plain functions, shared by the browser and the server.
//
// A restaurant has a weekly schedule of up to two periods a day, like 12:00 to 16:00
// and 19:00 to 00:00, and exceptions for date ranges: holidays, days without bookings,
// or different hours such as Ramadan. periodsForDate is the one place that decides
// what a date's hours are.

const DAY_MINUTES = 24 * 60;
const RIYADH_OFFSET_MS = 3 * 60 * 60 * 1000;

export const toMinutes = (time) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

export function riyadhDate(now = new Date()) {
  return new Date(now.getTime() + RIYADH_OFFSET_MS).toISOString().slice(0, 10);
}

export function addDays(date, days) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

// Current minute of the day in Riyadh, whatever the visitor's own timezone is
export function riyadhMinutesNow(date = new Date()) {
  const riyadh = new Date(date.getTime() + RIYADH_OFFSET_MS);
  return riyadh.getUTCHours() * 60 + riyadh.getUTCMinutes();
}

// Minutes after the service day's midnight. Past midnight keeps counting up, so
// 19:00 to 01:00 is 1140 to 1500. The same open and close time means all day.
export function periodBounds({ opens, closes }) {
  const start = toMinutes(opens);
  const end = toMinutes(closes);
  return { start, end: end <= start ? end + DAY_MINUTES : end };
}

// The same hours on all seven days, Sunday first
export const everyDay = (opens, closes) => Array.from({ length: 7 }, () => ({ periods: [{ opens, closes }] }));

export const exceptionFor = (schedule, date) => schedule.exceptions?.find((item) => item.from <= date && date <= item.to) ?? null;

// A date's real hours. Empty means closed. A restaurant from before weekly schedules
// has only opens and closes.
export function periodsForDate(schedule, date) {
  const exception = exceptionFor(schedule, date);
  if (exception?.type === "closed") return [];
  if (exception?.type === "hours") return [{ opens: exception.opens, closes: exception.closes }];
  if (schedule.weeklyHours) return schedule.weeklyHours[new Date(`${date}T00:00:00Z`).getUTCDay()].periods;
  return schedule.opens ? [{ opens: schedule.opens, closes: schedule.closes }] : [];
}

export function isBookableDate(schedule, date) {
  return periodsForDate(schedule, date).length > 0 && exceptionFor(schedule, date)?.type !== "noBooking";
}

// Open now, and until when? If closed, when does it next open? `days` is how many days
// away that is: 0 is later today. Yesterday's last period may still be running.
export function openStateAt(schedule, now = new Date()) {
  const today = riyadhDate(now);
  const minutes = riyadhMinutesNow(now);

  for (const period of periodsForDate(schedule, addDays(today, -1))) {
    if (minutes + DAY_MINUTES < periodBounds(period).end) return { open: true, closes: period.closes };
  }
  const todays = periodsForDate(schedule, today);
  for (const period of todays) {
    const { start, end } = periodBounds(period);
    if (minutes >= start && minutes < end) return { open: true, closes: period.closes };
  }
  const later = todays.find((period) => periodBounds(period).start > minutes);
  if (later) return { open: false, opens: later.opens, days: 0 };
  for (let days = 1; days <= 14; days++) {
    const date = addDays(today, days);
    const [first] = periodsForDate(schedule, date);
    if (first) return { open: false, opens: first.opens, days, date };
  }
  return { open: false };
}

// "13:00" -> "1 م" / "1 PM", "06:30" -> "6:30 ص" / "6:30 AM"
const periods = { ar: ["ص", "م"], en: ["AM", "PM"] };

export function formatTime(time, locale) {
  const [h, m] = time.split(":").map(Number);
  const hour = h % 12 || 12;
  const period = periods[locale][h < 12 ? 0 : 1];
  return m ? `${hour}:${String(m).padStart(2, "0")} ${period}` : `${hour} ${period}`;
}
