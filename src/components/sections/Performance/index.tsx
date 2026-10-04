"use client";

import { useEffect, useRef, useState } from "react";
import { SpecTable } from "@/components/sections/Performance/SpecTable";
import { useReducedMotion } from "@/hooks/useReducedMotion";

type CounterProps = {
  readonly target: number;
  readonly suffix: string;
  readonly label: string;
  readonly reducedMotion: boolean;
};

const COUNTER_DURATION_MS = 1500;

function formatNumber(value: number): string {
  if (value >= 1000) {
    return `${Math.round(value).toLocaleString("en-US")}`;
  }
  if (value >= 100) {
    return `${Math.round(value)}`;
  }
  return `${value.toFixed(1)}`;
}

function Counter({ target, suffix, label, reducedMotion }: CounterProps) {
  // Eased 0..1 counter position rather than the value itself, so the rendered
  // number can be derived. With motion suppressed the position stays 0 and the
  // final value is read straight from `target`, which needs no animation frame
  // and no state write to get there.
  const [progress, setProgress] = useState(0);
  const [inView, setInView] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reducedMotion) {
      return;
    }

    const node = sectionRef.current;
    if (!node) {
      return;
    }

    let frame = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) {
            continue;
          }

          observer.disconnect();
          setInView(true);

          const start = performance.now();
          const tick = (now: number): void => {
            const elapsed = Math.min(1, (now - start) / COUNTER_DURATION_MS);
            setProgress(1 - Math.pow(1 - elapsed, 3));
            if (elapsed < 1) {
              frame = requestAnimationFrame(tick);
            }
          };
          frame = requestAnimationFrame(tick);
        }
      },
      { threshold: 0.4 },
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [target, reducedMotion]);

  const shown = reducedMotion ? target : target * progress;

  return (
    <div
      ref={sectionRef}
      className={`transition-opacity duration-700 motion-reduce:transition-none ${
        inView || reducedMotion ? "opacity-100" : "opacity-0"
      }`}
    >
      <p className="text-5xl font-semibold tracking-tight text-white sm:text-6xl">
        {formatNumber(shown)}
        <span className="ml-2 text-2xl text-white/70">{suffix}</span>
      </p>
      <p className="mt-2 text-sm font-medium uppercase tracking-[0.2em] text-white/60">
        {label}
      </p>
    </div>
  );
}

export function Performance() {
  const reducedMotion = useReducedMotion();

  return (
    <section
      id="performance"
      data-experience-section
      aria-labelledby="performance-title"
      className="relative z-10 grid min-h-dvh items-center px-8 py-24 sm:px-16"
    >
      <div className="ml-auto max-w-3xl">
        <p className="mb-5 text-xs font-medium uppercase tracking-[0.3em] text-white/60">
          09 / PERFORMANCE
        </p>
        <h2
          data-reveal="lead"
          id="performance-title"
          className="text-4xl font-semibold leading-tight text-white sm:text-6xl"
        >
          Ready when you are.
        </h2>
        <p data-reveal="lead" className="mt-6 text-lg leading-relaxed text-white/70">
          Responsive polling, low-latency wireless and a long-lasting battery
          support focused work.
        </p>
        <ul className="mt-9 grid gap-8 text-lg font-medium text-white sm:grid-cols-3">
          <li>
            <Counter
              target={1000}
              suffix="Hz"
              label="Polling"
              reducedMotion={reducedMotion}
            />
          </li>
          <li>
            <Counter
              target={2.4}
              suffix="GHz"
              label="Wireless"
              reducedMotion={reducedMotion}
            />
          </li>
          <li>
            <Counter
              target={4000}
              suffix="mAh"
              label="Battery"
              reducedMotion={reducedMotion}
            />
          </li>
        </ul>

        <SpecTable />
      </div>
    </section>
  );
}
