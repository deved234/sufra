"use client";

import { useCallback, useEffect, useState } from "react";

// The seats left per time on one day. They change by the minute, so they come from
// the server fresh instead of being part of the static page. `slots` is null while
// loading, and an answer for another day never shows: it's compared with the request.
export function useAvailability(slug, date) {
  const [attempt, setAttempt] = useState(0);
  const [answer, setAnswer] = useState({});
  const key = `${date}#${attempt}`;

  useEffect(() => {
    if (!date) return;
    const controller = new AbortController();
    fetch(`/api/restaurants/${slug}/availability?date=${date}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Availability answered ${response.status}`);
        return response.json();
      })
      .then(({ slots }) => setAnswer({ key, slots }))
      .catch((error) => {
        if (error.name !== "AbortError") setAnswer({ key, failed: true });
      });
    return () => controller.abort();
  }, [slug, date, key]);

  const current = answer.key === key ? answer : {};
  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  return { slots: current.slots ?? null, failed: Boolean(current.failed), retry };
}
