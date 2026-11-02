"use client";

import { useEffect } from "react";
import "./globals.css";

// Replaces the root layout when it crashes, so it brings its own <html>, <body>
// and styles. It can't export metadata, so the title is a plain <title> tag.
export default function GlobalError({ retry }) {
  // The root layout's theme script didn't run, so apply the saved theme here
  useEffect(() => {
    try {
      const saved = localStorage.getItem("theme");
      const dark = saved ? saved === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.dataset.theme = dark ? "dark" : "light";
    } catch {}
  }, []);

  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col items-center justify-center gap-5 px-6 text-center">
        <title>صار خطأ | سُفرة</title>
        <h1 className="font-display text-h2 font-extrabold">صار خطأ غير متوقع</h1>
        <p className="text-muted-foreground">نعتذر منك، جرّب مرة ثانية.</p>
        <button
          type="button"
          onClick={() => retry()}
          className="rounded-pill bg-cta px-6 py-3 font-semibold text-on-cta transition-colors duration-150 hover:bg-cta-hover"
        >
          حاول مرة ثانية
        </button>
      </body>
    </html>
  );
}
