"use client";

import { useEffect, useState } from "react";

// Who is visiting, for static pages, which can't read the session cookie while
// rendering. undefined while asking, null when signed out. It's asked again each time
// a component mounts, so signing in or out shows on the next page. Several components
// mounting together share one request.
let pending = null;

function loadViewer() {
  pending ??= fetch("/api/me")
    .then((response) => response.json())
    .then(({ user }) => user)
    // Treated as signed out: the sign in page still gets them through
    .catch(() => null)
    .finally(() => {
      pending = null;
    });
  return pending;
}

export function useViewer() {
  const [viewer, setViewer] = useState();
  useEffect(() => {
    let current = true;
    loadViewer().then((user) => {
      if (current) setViewer(user);
    });
    return () => {
      current = false;
    };
  }, []);
  return viewer;
}
