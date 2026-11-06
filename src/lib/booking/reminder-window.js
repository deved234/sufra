const HOUR_MS = 60 * 60 * 1000;

// Which bookings a run of the daily job reminds. The job runs once a day, and Vercel's
// free plan may start it any time within the hour, so two runs can be 24 hours and 59
// minutes apart: 25 hours ahead leaves no booking between them. A booking made in the
// last two hours just had its confirmation, so it gets no reminder on top.
export function reminderWindow(now) {
  return {
    after: now,
    until: new Date(now.getTime() + 25 * HOUR_MS),
    madeBefore: new Date(now.getTime() - 2 * HOUR_MS),
  };
}
