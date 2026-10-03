"use client";

import { useEffect, useState } from "react";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export type ReducedMotionState = {
  readonly reducedMotion: boolean;
  /**
   * False until the media query has actually been read. `reducedMotion` being
   * false does not mean motion is allowed, only that the answer is not known
   * yet. Anything expensive to set up must wait for this rather than mounting
   * once with the wrong value and unmounting a frame later.
   */
  readonly resolved: boolean;
};

export function useReducedMotionState(): ReducedMotionState {
  // Starts false on the server and on the client's hydration render so both
  // sides produce identical markup. Reading matchMedia in the initializer
  // would make the first client render disagree with the server for visitors
  // who prefer reduced motion, which React reports as a hydration mismatch.
  // The real preference is applied by the effect below.
  const [state, setState] = useState<ReducedMotionState>({
    reducedMotion: false,
    resolved: false,
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);
    const updatePreference = () =>
      setState({ reducedMotion: mediaQuery.matches, resolved: true });

    mediaQuery.addEventListener("change", updatePreference);
    updatePreference();

    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  return state;
}

export function useReducedMotion(): boolean {
  return useReducedMotionState().reducedMotion;
}