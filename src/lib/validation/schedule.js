import { z } from "zod";
import { periodBounds } from "@/lib/opening-hours";

// The opening hours forms, checked on the server. Messages are "Form.errors" keys.

const TIME = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

// Up to two periods that don't overlap, in order. Only the last may pass midnight, and
// it must end before the day's first period starts again.
export function periodsProblem(periods) {
  if (periods.some(({ opens, closes }) => !TIME.test(opens) || !TIME.test(closes))) return "timeInvalid";
  if (periods.length < 2) return null;
  const [first, second] = periods.map(periodBounds);
  if (first.end > 24 * 60 || second.start < first.end) return "periodsOverlap";
  if (second.end > 24 * 60 && second.end - 24 * 60 > first.start) return "periodsOverlap";
  return null;
}

// Form fields: day0open, day0opens1, day0closes1, day0second, day0opens2, day0closes2.
// Answers { weeklyHours, errors }, with errors keyed by day.
export function readWeeklyHours(formData) {
  const errors = {};
  const weeklyHours = Array.from({ length: 7 }, (_, day) => {
    if (formData.get(`day${day}open`) !== "on") return { periods: [] };
    const field = (name) => String(formData.get(`day${day}${name}`) ?? "");
    const periods = [{ opens: field("opens1"), closes: field("closes1") }];
    if (formData.get(`day${day}second`) === "on") periods.push({ opens: field("opens2"), closes: field("closes2") });
    const problem = periodsProblem(periods);
    if (problem) errors[`day${day}`] = problem;
    return { periods };
  });
  return { weeklyHours, errors };
}

const date = z.string().regex(DATE, "dateInvalid");
const time = z.string().regex(TIME, "timeInvalid");

export const exceptionSchema = z
  .discriminatedUnion("type", [
    z.object({ type: z.literal("closed"), from: date, to: date, note: z.string().trim().max(80, "tooLong") }),
    z.object({ type: z.literal("noBooking"), from: date, to: date, note: z.string().trim().max(80, "tooLong") }),
    z.object({ type: z.literal("hours"), from: date, to: date, note: z.string().trim().max(80, "tooLong"), opens: time, closes: time }),
  ])
  .refine(({ from, to }) => from <= to, { message: "dateOrder", path: ["to"] });

export function readExceptionForm(formData) {
  const type = formData.get("type") ?? "";
  return {
    type,
    from: formData.get("from") ?? "",
    to: formData.get("to") ?? "",
    note: formData.get("note") ?? "",
    ...(type === "hours" && { opens: formData.get("opens") ?? "", closes: formData.get("closes") ?? "" }),
  };
}
