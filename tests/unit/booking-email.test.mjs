import { strict as assert } from "node:assert";
import { test } from "node:test";
import { bookingCancelledEmail } from "@/lib/email/templates";

const args = { locale: "en", booking: { name: "Sara", code: "ABC234", phone: "0512345678", date: "2031-03-10", time: "19:00", party: 2 }, restaurantName: "Place", url: "https://example.com" };

test("a cancellation email shows the reason on its own line, escaped", () => {
  const { html, text } = bookingCancelledEmail({ ...args, reason: "Closed <today>" });
  assert.match(text, /Reason: Closed <today>/);
  assert.match(html, /Reason: Closed &lt;today&gt;/);
});

test("a cancellation email with no reason has no empty line for one", () => {
  const { text } = bookingCancelledEmail(args);
  assert.doesNotMatch(text, /Reason:/);
});
