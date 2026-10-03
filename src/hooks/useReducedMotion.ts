"use client";

import { useEffect, useState } from "react";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export function useReducedMotion(): boolean {
  // Starts false on the server and on the client's hydration render so both
  // sides produce identical markup. Reading matchMedia in the initializer
  // would make the first client render disagree with the server for visitors
  // who prefer reduced motion, which React reports as a hydration mismatch.
  // The real preference is applied by the effect below.
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);
    const updatePreference = () => setReducedMotion(mediaQuery.matches);

    mediaQuery.addEventListener("change", updatePreference);
    updatePreference();

    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  return reducedMotion;
}