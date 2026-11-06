import { strict as assert } from "node:assert";
import { test } from "node:test";
import { reminderWindow } from "@/lib/booking/reminder-window";
import { slotStart } from "@/lib/booking-slots";
import { bookingReminderEmail } from "@/lib/email/templates";

const HOUR = 60 * 60 * 1000;
const at = (iso) => new Date(iso);
const covers = (now, startsAt) => {
  const { after, until } = reminderWindow(now);
  return startsAt > after && startsAt <= until;
};

test("the window is the next 25 hours, for bookings made over two hours ago", () => {
  const now = at("2026-11-10T06:00:00Z");
  assert.deepEqual(reminderWindow(now), { after: now, until: at("2026-11-11T07:00:00Z"), madeBefore: at("2026-11-10T04:00:00Z") });
});

test("a booking past midnight belongs to the time it really starts, not its service day", () => {
  const night = [{ opens: "13:00", closes: "02:00" }];
  // 00:30 on the service day of the 10th is 00:30 on the 11th in Riyadh
  const startsAt = slotStart("2026-11-10", "00:30", night);
  assert.equal(startsAt.toISOString(), "2026-11-10T21:30:00.000Z");
  // 9 am on the 10th, the morning before: it's reminded then, and not a day early
  assert.equal(covers(at("2026-11-10T06:00:00Z"), startsAt), true);
  assert.equal(covers(at("2026-11-09T06:00:00Z"), startsAt), false);
});

test("however late in its hour each run starts, no booking falls between two runs", () => {
  // Vercel's free plan starts a 06:00 job any time up to 06:59, on any day
  for (const [today, tomorrow] of [["06:00", "06:59"], ["06:59", "06:00"], ["06:00", "06:00"], ["06:59", "06:59"]]) {
    const first = at(`2026-11-10T${today}:00Z`);
    const second = at(`2026-11-11T${tomorrow}:00Z`);
    for (let minutes = 1; minutes < 24 * 60; minutes += 7) {
      const startsAt = new Date(second.getTime() + minutes * 60_000 - 24 * HOUR);
      if (startsAt <= first) continue;
      assert.ok(covers(first, startsAt) || covers(second, startsAt), `${startsAt.toISOString()} missed by runs at ${today} and ${tomorrow}`);
    }
  }
});

test("the reminder is in the booking's language, with its details and a way to cancel", () => {
  const booking = { name: "Sarah", code: "7K2M9Q", phone: "0512345678", date: "2026-11-10", time: "19:30", party: 4 };
  const url = "https://example.com/account/bookings/abc";
  const en = bookingReminderEmail({ locale: "en", booking, restaurantName: "Al Waha", url });
  assert.ok(en.subject.includes("Al Waha"));
  assert.ok(en.text.includes("7K2M9Q"));
  assert.ok(en.text.includes(url));
  const ar = bookingReminderEmail({ locale: "ar", booking, restaurantName: "الواحة", url });
  assert.ok(ar.subject.includes("تذكير"));
  assert.ok(ar.html.includes('dir="rtl"'));
});
