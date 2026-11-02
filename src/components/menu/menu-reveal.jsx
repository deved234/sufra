"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const MOTION = "(prefers-reduced-motion: no-preference)";

// Cards below the first screen rise into place as they scroll into view.
// Wraps the server-rendered menu sections without making them client code.
// The HTML arrives visible from the server, so cards already on screen are never
// hidden: hiding them after hydration would flash and delay the largest paint.
export default function MenuReveal({ children }) {
  const scope = useRef(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION, () => {
        const below = gsap.utils
          .toArray("[data-dish-card]")
          .filter((card) => card.getBoundingClientRect().top > window.innerHeight);
        if (below.length === 0) return;

        gsap.set(below, { autoAlpha: 0, y: 32 });
        ScrollTrigger.batch(below, {
          start: "top 92%",
          once: true,
          onEnter: (batch) => gsap.to(batch, { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.08, ease: "power3.out" }),
        });
      });
    },
    { scope },
  );

  return (
    <div ref={scope} className="flex flex-col gap-12">
      {children}
    </div>
  );
}
