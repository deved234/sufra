"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

// Marked [data-reveal] items below the first screen rise into place as they scroll into
// view. The HTML arrives visible from the server and what's already on screen is left
// alone, so nothing flashes, and without JavaScript or with reduced motion it all just shows.
export default function Reveal({ children, className }) {
  const scope = useRef(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const below = gsap.utils.toArray("[data-reveal]").filter((item) => item.getBoundingClientRect().top > window.innerHeight);
        if (below.length === 0) return;

        // Opacity, not visibility: a link in here can still be reached by Tab, which
        // scrolls it into view and so reveals it
        gsap.set(below, { opacity: 0, y: 24 });
        ScrollTrigger.batch(below, {
          start: "top 92%",
          once: true,
          onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 0.5, stagger: 0.08, ease: "power3.out" }),
        });
      });
    },
    { scope },
  );

  return (
    <div ref={scope} className={className}>
      {children}
    </div>
  );
}
