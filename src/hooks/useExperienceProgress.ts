"use client";

import { useEffect, useRef, useState } from "react";
import {
  applyMeasuredSectionRanges,
  normalizeSectionRanges,
  sections,
  type MeasuredSectionBox,
} from "@/data/sections";

export type ExperienceProgress = {
  readonly value: { current: number };
  readonly activeSectionId: string | null;
};

export const experienceProgressValue = { current: 0 };
export const experienceActiveSectionId: { current: string | null } = {
  current: "intro",
};

const sceneInvalidator: { current: (() => void) | null } = { current: null };

const MEASURE_DEBOUNCE_MS = 150;
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export function registerExperienceSceneInvalidation(
  invalidate: () => void,
): () => void {
  sceneInvalidator.current = invalidate;

  return () => {
    if (sceneInvalidator.current === invalidate) {
      sceneInvalidator.current = null;
    }
  };
}

/**
 * Measures the real position of every section and writes the normalized
 * timeline windows back into the section table. Returns true when a window
 * changed, so callers know the schedule moved.
 *
 * Declared defaults stay authoritative until this succeeds, which keeps the
 * first paint, SSR and no-JS clients on the static schedule.
 */
export function measureSectionTimeline(): boolean {
  const scrollRange = document.documentElement.scrollHeight - window.innerHeight;
  if (scrollRange <= 0) {
    return false;
  }

  const boxes: MeasuredSectionBox[] = [];
  for (const section of sections) {
    const element = document.getElementById(section.id);
    if (!element) {
      continue;
    }
    boxes.push({ id: section.id, top: element.offsetTop, height: element.offsetHeight });
  }

  return applyMeasuredSectionRanges(normalizeSectionRanges(boxes, scrollRange));
}


export function useExperienceProgress(): ExperienceProgress {
  const [activeSectionId, setActiveSectionId] = useState<string | null>(
    experienceActiveSectionId.current,
  );
  const activeSectionIdRef = useRef(experienceActiveSectionId.current);

  useEffect(() => {
    let scheduledFrame: number | null = null;
    let scheduledMeasure: number | null = null;

    const updateProgress = (): void => {
      scheduledFrame = null;
      const maxScroll = Math.max(
        0,
        document.documentElement.scrollHeight - window.innerHeight,
      );
      const progress =
        maxScroll === 0 ? 0 : Math.min(1, Math.max(0, window.scrollY / maxScroll));
      experienceProgressValue.current = progress;

      const markers = document.querySelectorAll<HTMLElement>(
        "[data-experience-section], [data-progress-boundary]",
      );
      const activationLine = window.innerHeight * 0.35;
      let nextSectionId: string | null = null;
      for (const marker of markers) {
        if (marker.getBoundingClientRect().top > activationLine) {
          break;
        }
        nextSectionId = marker.id;
      }
      nextSectionId ??= markers.item(0)?.id ?? null;

      if (nextSectionId !== activeSectionIdRef.current) {
        activeSectionIdRef.current = nextSectionId;
        experienceActiveSectionId.current = nextSectionId;
        setActiveSectionId(nextSectionId);
      }

      sceneInvalidator.current?.();
    };

    const scheduleUpdate = (): void => {
      if (scheduledFrame === null) {
        scheduledFrame = window.requestAnimationFrame(updateProgress);
      }
    };

    /**
     * Re-measures the section geometry. Runs when the layout can have changed:
     * viewport resize, document size changes, and a reduced-motion preference
     * switch. Scroll position alone never triggers it.
     */
    const measure = (): void => {
      if (measureSectionTimeline()) {
        // The schedule moved, so the active section has to be resolved again
        // against the new windows.
        scheduleUpdate();
      }
    };

    const scheduleMeasure = (): void => {
      if (scheduledMeasure !== null) {
        return;
      }
      scheduledMeasure = window.setTimeout(() => {
        scheduledMeasure = null;
        measure();
      }, MEASURE_DEBOUNCE_MS);
    };

    measure();

    const observer =
      typeof ResizeObserver === "function"
        ? new ResizeObserver(scheduleMeasure)
        : null;
    observer?.observe(document.documentElement);

    const motionQuery = window.matchMedia(REDUCED_MOTION_QUERY);
    const handleMotionChange = (): void => scheduleMeasure();

    window.addEventListener("resize", scheduleMeasure, { passive: true });
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    motionQuery.addEventListener("change", handleMotionChange);

    // Measuring the document forces the browser to perform its first full
    // layout synchronously, which costs ~170ms on a throttled mobile CPU and
    // lands inside the window where the intro copy is still waiting to paint.
    // At scroll position zero the answer is already known: progress is 0 and
    // the intro section is active. Only a reload that restores a scroll
    // position needs an immediate measurement.
    if (window.scrollY > 0) {
      scheduleUpdate();
    }

    return () => {
      if (scheduledFrame !== null) {
        window.cancelAnimationFrame(scheduledFrame);
      }
      if (scheduledMeasure !== null) {
        window.clearTimeout(scheduledMeasure);
      }
      observer?.disconnect();
      window.removeEventListener("resize", scheduleMeasure);
      window.removeEventListener("scroll", scheduleUpdate);
      motionQuery.removeEventListener("change", handleMotionChange);
    };
  }, []);

  return { value: experienceProgressValue, activeSectionId };
}
