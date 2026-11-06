import { strict as assert } from "node:assert";
import { test } from "node:test";
import { assertAddress, buildMessage, encodeHeader } from "@/lib/email/mime";

const decodeWords = (header) =>
  header
    .split("\r\n ")
    .map((word) => Buffer.from(word.match(/^=\?UTF-8\?B\?(.*)\?=$/)[1], "base64").toString())
    .join("");

test("addresses that could inject headers or recipients are refused", () => {
  assert.equal(assertAddress("a@b.co"), "a@b.co");
  for (const bad of ["a@b.co\r\nBcc: x@y.z", "a b@c.d", "<a@b.co>", "a@b@c", "no-at", "", null, 'a"@b.co']) {
    assert.throws(() => assertAddress(bad), /Invalid email address/);
  }
});

test("plain ASCII stays as it is in a header", () => {
  assert.equal(encodeHeader("Your booking"), "Your booking");
});

test("Arabic becomes encoded words that decode back exactly", () => {
  const text = "تم تأكيد حجزك في مطعم مشويات الواحة ليوم الثلاثاء الساعة السابعة مساء";
  const encoded = encodeHeader(text);
  assert.match(encoded, /^[\x20-\x7e\r\n]+$/);
  assert.equal(decodeWords(encoded), text);
  for (const line of encoded.split("\r\n ")) assert.ok(line.length <= 75, `a word may be at most 75 characters, got ${line.length}`);
});

test("a line break in a subject can't start a new header", () => {
  const message = buildMessage({ from: { name: "Sufra", address: "a@b.co" }, to: "c@d.co", subject: "Hi\r\nBcc: x@y.z", text: "t", html: "h", language: "en" });
  const headers = message.split("\r\n\r\n")[0].split("\r\n");
  assert.equal(headers.some((line) => line.startsWith("Bcc:")), false);
});

test("a message has both versions, HTML last, with its bodies in base64", () => {
  const message = buildMessage({ from: { name: "سفرة", address: "a@b.co" }, to: "c@d.co", subject: "حجزك", text: "نص", html: "<p>نص</p>", language: "ar", date: new Date("2026-11-04T10:00:00Z") });
  assert.match(message, /Date: Wed, 04 Nov 2026 10:00:00 \+0000\r\n/);
  assert.match(message, /Content-Language: ar\r\n/);
  assert.match(message, /Auto-Submitted: auto-generated\r\n/);
  assert.match(message, /To: <c@d\.co>\r\n/);
  assert.ok(message.indexOf("text/plain") < message.indexOf("text/html"));
  assert.ok(message.includes(Buffer.from("<p>نص</p>").toString("base64")));
  assert.equal(/[^\x00-\x7f]/.test(message), false, "only ASCII on the wire");
});

test("long bodies are wrapped at 76 characters", () => {
  const message = buildMessage({ from: { name: "S", address: "a@b.co" }, to: "c@d.co", subject: "s", text: "x".repeat(1000), html: "h", language: "en" });
  for (const line of message.split("\r\n")) if (!/^(Content-Type|Message-ID)/.test(line)) assert.ok(line.length <= 76, line);
});
