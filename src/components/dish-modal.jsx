"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

const MOTION = "(prefers-reduced-motion: no-preference)";

// The dish opened over the menu. A native <dialog> opened with showModal() keeps
// focus inside, hides the page behind from screen readers and handles Escape.
// Closing goes back in history, so Back, Escape, ✕ and the backdrop all agree.
export default function DishModal({ children, labelledBy }) {
  const t = useTranslations("Dish");
  const router = useRouter();
  const dialogRef = useRef(null);
  const backdropRef = useRef(null);
  const panelRef = useRef(null);
  const closing = useRef(false);

  // Runs each time the modal shows. After Back, Next.js keeps the route hidden in
  // memory (React <Activity>) instead of unmounting it, and Forward shows it again.
  // So the cleanup must really close the dialog, or the page behind stays inert.
  useEffect(() => {
    const dialog = dialogRef.current;
    // The card that opened the modal gets focus back when it closes
    const opener = document.activeElement;
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;

    closing.current = false;
    dialog.showModal();
    root.style.overflow = "hidden"; // the menu behind stays still

    return () => {
      dialog.close();
      root.style.overflow = previousOverflow;
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  // Opening: the backdrop fades in, the panel slides up (a bottom sheet on phones)
  // or grows slightly (centered on larger screens). Nothing moves for reduced motion.
  useGSAP(
    () => {
      // Shown again with Forward: drop what the closing animation left behind
      gsap.set([backdropRef.current, panelRef.current], { clearProps: "all" });

      const mm = gsap.matchMedia();
      mm.add({ motion: MOTION, phone: "(max-width: 639px)" }, ({ conditions }) => {
        if (!conditions.motion) return;
        gsap.from(backdropRef.current, { autoAlpha: 0, duration: 0.25, ease: "power1.out" });
        gsap.from(
          panelRef.current,
          conditions.phone
            ? { yPercent: 100, duration: 0.45, ease: "power3.out" }
            : { autoAlpha: 0, y: 24, scale: 0.97, duration: 0.35, ease: "power3.out" },
        );
      });
    },
    { scope: dialogRef },
  );

  // Closing plays the opening backwards first, then leaves the route.
  // Not cleaned up by useGSAP: the modal unmounts right after it ends.
  function close() {
    if (closing.current) return;
    closing.current = true;

    if (!window.matchMedia(MOTION).matches) {
      router.back();
      return;
    }
    // Animation frames pause in background tabs, so the timeline might never end.
    // Whichever comes first, the animation or this timer, closes the modal once.
    let left = false;
    const leave = () => {
      if (left) return;
      left = true;
      router.back();
    };
    setTimeout(leave, 600);

    const phone = window.matchMedia("(max-width: 639px)").matches;
    gsap
      .timeline({ onComplete: leave })
      .to(panelRef.current, phone ? { yPercent: 100, duration: 0.3, ease: "power2.in" } : { autoAlpha: 0, y: 16, scale: 0.97, duration: 0.2, ease: "power2.in" })
      .to(backdropRef.current, { autoAlpha: 0, duration: 0.2 }, "<0.05");
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={labelledBy}
      // Escape fires "cancel": run our closing animation instead of the instant close
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none items-end justify-center bg-transparent p-0 open:flex backdrop:bg-transparent sm:items-center sm:p-6"
    >
      <div ref={backdropRef} aria-hidden className="absolute inset-0 bg-black/55" onClick={close} />
      <div
        ref={panelRef}
        className="relative max-h-[90dvh] w-full overflow-y-auto rounded-t-lg bg-surface text-foreground shadow-lg sm:max-w-xl sm:rounded-lg"
      >
        <button
          type="button"
          onClick={close}
          aria-label={t("close")}
          className="absolute end-3 top-3 z-10 flex size-10 items-center justify-center rounded-pill bg-surface/90 shadow-sm backdrop-blur-sm transition-colors duration-150 hover:bg-surface-muted"
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        {children}
      </div>
    </dialog>
  );
}
