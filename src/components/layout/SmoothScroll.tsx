"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import {
  publishSmoothScrollFrame,
  setSmoothScrollActive,
} from "@/lib/smoothScroll";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Scroll damping, in seconds. Deliberately long and deliberately eased out
 * rather than Lenis's default lerp: the default is tight enough that the page
 * tracks the wheel almost exactly, which is the opposite of the intent here.
 */
const SCROLL_DURATION_S = 1.1;

/** easeOutExpo. Fast departure, long tail, so the settle reads as weight. */
function easeOutExpo(time: number): number {
  return time >= 1 ? 1 : 1 - Math.pow(2, -10 * time);
}

/**
 * Owns the Lenis instance.
 *
 * Deliberately mounted in the layout rather than inside the 3D subtree: smooth
 * scroll has to cover the whole document, including before the Three.js bundle
 * has loaded and on a machine where WebGL is unavailable.
 *
 * Reduced motion disables Lenis outright rather than softening it. A visitor who
 * asked for less motion gets the browser's own scrolling, with no interception
 * at all. The preference is read straight from the media query rather than from
 * useReducedMotion, so a reduced-motion visitor never gets an instance created
 * and then immediately destroyed.
 */
export function SmoothScroll() {
  useEffect(() => {
    const motionQuery = window.matchMedia(REDUCED_MOTION_QUERY);
    let lenis: Lenis | null = null;

    const teardown = (): void => {
      if (lenis === null) {
        return;
      }
      lenis.destroy();
      lenis = null;
      setSmoothScrollActive(false);
    };

    const setup = (): void => {
      if (motionQuery.matches) {
        teardown();
        return;
      }
      if (lenis !== null) {
        return;
      }

      const instance = new Lenis({
        duration: SCROLL_DURATION_S,
        easing: easeOutExpo,
        // Native touch scrolling on every device. Lenis only takes the wheel;
        // letting it also take touch would fight the OS momentum curve, which is
        // already tuned per platform. This is a superset of the mobile
        // requirement.
        syncTouch: false,
        // Lenis drives its own rAF loop and keeps emitting scroll frames while the
        // damped tail settles.
        autoRaf: true,
        // Anchor links should glide rather than jump, and stay inside the page.
        anchors: true,
      });

      instance.on("scroll", (source) => {
        publishSmoothScrollFrame({
          progress: source.progress,
          velocity: source.velocity,
        });
      });

      setSmoothScrollActive(true);
      lenis = instance;
    };

    setup();

    const handleMotionChange = (): void => {
      if (motionQuery.matches) {
        teardown();
      } else {
        setup();
      }
    };

    motionQuery.addEventListener("change", handleMotionChange);

    return () => {
      motionQuery.removeEventListener("change", handleMotionChange);
      teardown();
    };
  }, []);

  return null;
}