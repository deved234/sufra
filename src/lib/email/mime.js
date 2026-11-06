import { randomBytes, randomUUID } from "node:crypto";

// Builds the raw text of an email (RFC 5322 headers, RFC 2045/2046 MIME body).
// Mail is a text protocol: headers must be plain ASCII, so anything else (Arabic
// subjects and names) is wrapped in "encoded words" (RFC 2047), and the bodies are
// sent as base64 so their UTF-8 bytes and long lines survive every mail server.

const CRLF = "\r\n";

// Mail addresses go between <...> in headers and SMTP commands. Line breaks or
// angle brackets in one would let it inject extra headers or recipients.
export function assertAddress(address) {
  if (typeof address !== "string" || !/^[^\s<>@"]+@[^\s<>@"]+$/.test(address)) {
    throw new Error("Invalid email address");
  }
  return address;
}

// "=?UTF-8?B?...?=" words for non-ASCII header text. A single encoded word may be
// at most 75 characters, so long text is split into several, never in the middle
// of a character (each word must decode on its own).
export function encodeHeader(text) {
  if (/^[\x20-\x7e]*$/.test(text)) return text;
  const words = [];
  let chunk = "";
  for (const char of text) {
    // 45 bytes of UTF-8 become 60 characters of base64, plus 12 for "=?UTF-8?B?" and "?="
    if (Buffer.byteLength(chunk + char) > 45) {
      words.push(chunk);
      chunk = "";
    }
    chunk += char;
  }
  words.push(chunk);
  // Words are folded onto continuation lines (a line starting with a space)
  return words.map((word) => `=?UTF-8?B?${Buffer.from(word).toString("base64")}?=`).join(`${CRLF} `);
}

// base64 in lines of 76 characters, the MIME maximum
function base64Lines(text) {
  return Buffer.from(text).toString("base64").replace(/.{76}(?=.)/g, `$&${CRLF}`);
}

// "Wed, 04 Nov 2026 10:00:00 +0000"
function mailDate(date) {
  return date.toUTCString().replace("GMT", "+0000");
}

function part(type, content) {
  return [`Content-Type: ${type}; charset=UTF-8`, "Content-Transfer-Encoding: base64", "", base64Lines(content)].join(CRLF);
}

// A message with a plain text and an HTML version (multipart/alternative): the mail
// app shows the last one it can display, so HTML goes last
export function buildMessage({ from, to, replyTo, subject, text, html, language, date = new Date() }) {
  const boundary = `sufra-${randomBytes(8).toString("hex")}`;
  const domain = assertAddress(from.address).split("@")[1];
  const headers = [
    `From: ${encodeHeader(from.name)} <${from.address}>`,
    `To: <${assertAddress(to)}>`,
    ...(replyTo ? [`Reply-To: <${assertAddress(replyTo)}>`] : []),
    `Subject: ${encodeHeader(subject)}`,
    `Date: ${mailDate(date)}`,
    `Message-ID: <${randomUUID()}@${domain}>`,
    `Content-Language: ${language}`,
    // RFC 3834: sent by a machine, so out-of-office replies shouldn't answer it
    "Auto-Submitted: auto-generated",
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ];
  return [
    ...headers,
    "",
    `--${boundary}`,
    part("text/plain", text),
    `--${boundary}`,
    part("text/html", html),
    `--${boundary}--`,
    "",
  ].join(CRLF);
}
