"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { safeNext } from "@/lib/auth/next-path";
import { useViewer } from "@/components/use-viewer";

// Sign in and sign up are static pages, so the browser checks: someone already
// signed in has no use for them, and goes where they were heading.
// fixedNext: the page's own destination, when it isn't in the URL
export default function RedirectIfSignedIn({ next: fixedNext }) {
  const viewer = useViewer();
  const router = useRouter();
  const fromUrl = useSearchParams().get("next");
  const next = fixedNext ?? fromUrl;

  useEffect(() => {
    if (viewer) router.replace(safeNext(next));
  }, [viewer, next, router]);

  return null;
}
