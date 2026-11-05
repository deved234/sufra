// A calendar file (iCalendar, RFC 5545) for one booking. Every calendar app opens it.

// Commas, semicolons, backslashes and line breaks are special in values
const escapeText = (text) => String(text).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

// 20261110T163000Z
const stamp = (date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

// Lines over 75 bytes continue on the next line, which starts with a space
function fold(line) {
  const parts = [];
  let current = "";
  for (const char of line) {
    if (new TextEncoder().encode(current + char).length > 74) {
      parts.push(current);
      current = "";
    }
    current += char;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

export function buildIcs({ id, startsAt, minutes, title, location, description, now = new Date() }) {
  const start = new Date(startsAt);
  const end = new Date(start.getTime() + minutes * 60 * 1000);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Sufra//Bookings//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${id}@sufra`,
    `DTSTAMP:${stamp(now)}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${escapeText(title)}`,
    `LOCATION:${escapeText(location)}`,
    `DESCRIPTION:${escapeText(description)}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ]
    .map(fold)
    .join("\r\n");
}
