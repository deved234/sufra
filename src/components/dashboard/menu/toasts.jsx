"use client";

import { useCallback, useRef, useState } from "react";

// Short messages after a save ("Saved", "Not saved: ..."). The region is always in
// the page with aria-live, so screen readers read each new message once.
export function useToasts() {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);

  const toast = useCallback((text, tone = "success") => {
    const id = ++nextId.current;
    setToasts((list) => [...list.slice(-2), { id, text, tone }]);
    setTimeout(() => setToasts((list) => list.filter((item) => item.id !== id)), tone === "error" ? 6000 : 3000);
  }, []);

  return { toasts, toast };
}

export function Toasts({ toasts }) {
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-center gap-2">
      {toasts.map((item) => (
        <p
          key={item.id}
          className={`rounded-pill px-5 py-2.5 text-sm font-medium shadow-lg ${
            item.tone === "error" ? "bg-danger text-background" : "bg-foreground text-background"
          }`}
        >
          {item.text}
        </p>
      ))}
    </div>
  );
}
