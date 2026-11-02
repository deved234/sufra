// Opening-hours math. Times are "HH:MM" strings in Riyadh time.

const toMinutes = (time) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

// Current minute of the day in Riyadh, whatever the visitor's own timezone is
export function riyadhMinutesNow(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Riyadh",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type) => Number(parts.find((p) => p.type === type).value);
  return get("hour") * 60 + get("minute");
}

// Handles hours that pass midnight, e.g. 13:00 to 01:00
export function isOpenAt(minutes, opens, closes) {
  const start = toMinutes(opens);
  const end = toMinutes(closes);
  if (end <= start) return minutes >= start || minutes < end;
  return minutes >= start && minutes < end;
}

// "13:00" -> "1 م", "06:30" -> "6:30 ص"
export function formatTime(time) {
  const [h, m] = time.split(":").map(Number);
  const hour = h % 12 || 12;
  const period = h < 12 ? "ص" : "م";
  return m ? `${hour}:${String(m).padStart(2, "0")} ${period}` : `${hour} ${period}`;
}
