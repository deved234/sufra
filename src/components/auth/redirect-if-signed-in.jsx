"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { safeNext } from "@/lib/auth/next-path";
import { useViewer } from "@/components/use-viewer";

// Sign in and sign up are static pages, so the browser checks: someone already
// signed in has no use for them, and goes where they were heading.
export default function RedirectIfSignedIn() {
  const viewer = useViewer();
  const router = useRouter();
  const next = useSearchParams().get("next");

  useEffect(() => {
    if (viewer) router.replace(safeNext(next));
  }, [viewer, next, router]);

  return null;
}
