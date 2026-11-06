import { strict as assert } from "node:assert";
import { test } from "node:test";
import { contactEmail } from "@/lib/email/templates";
import { contactSchema } from "@/lib/validation/contact";

const valid = { name: "سارة", email: "Sara@Example.com ", message: "عندي سؤال عن الحجز" };
const firstError = (values) => contactSchema.safeParse(values).error?.issues[0].message;

test("a good message passes, with its email tidied", () => {
  assert.equal(contactSchema.parse(valid).email, "sara@example.com");
});

test("each field says what's wrong with it", () => {
  assert.equal(firstError({ ...valid, name: "   " }), "required");
  assert.equal(firstError({ ...valid, name: "x".repeat(81) }), "tooLong");
  assert.equal(firstError({ ...valid, email: "not-an-email" }), "emailInvalid");
  assert.equal(firstError({ ...valid, message: "" }), "required");
  assert.equal(firstError({ ...valid, message: "short" }), "messageShort");
  assert.equal(firstError({ ...valid, message: "x".repeat(5001) }), "tooLong");
});

test("an email address with a line break in it is refused", () => {
  assert.equal(firstError({ ...valid, email: "a@b.co\r\nBcc: x@y.z" }), "emailInvalid");
});

test("what a visitor writes can't become HTML in the email", () => {
  const { html, text } = contactEmail({ locale: "en", name: "<b>Sam</b>", email: "s@a.co", message: "<script>alert(1)</script> hello there" });
  assert.equal(html.includes("<script>alert"), false);
  assert.equal(html.includes("<b>Sam"), false);
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(text.includes("<script>alert(1)</script>"), "the plain version is plain");
});

test("the visitor's line breaks survive, and the email isn't phrased for its reader's own request", () => {
  const { html, text } = contactEmail({ locale: "ar", name: "سارة", email: "s@a.co", message: "السطر الأول\r\n\r\n  السطر الثاني" });
  assert.ok(html.includes(">السطر الأول</p>"));
  assert.ok(html.includes(">السطر الثاني</p>"));
  assert.equal(text.includes("تجاهل"), false);
  assert.equal(text.includes("http"), false);
});
