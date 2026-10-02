"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

type CounterProps = {
  readonly target: number;
  readonly suffix: string;
  readonly label: string;
  readonly reducedMotion: boolean;
};

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
  const [display, setDisplay] = useState(reducedMotion ? target : 0);
  const [visible, setVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (reducedMotion) {
      setDisplay(target);
      setVisible(true);
      return;
    }

    const node = sectionRef.current;
    if (!node) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !startedRef.current) {
            startedRef.current = true;
            setVisible(true);
            animateCounter();
            observer.disconnect();
          }
        }
      },
      { threshold: 0.4 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [target, reducedMotion]);

  const animateCounter = () => {
    const duration = 1500;
    const start = performance.now();
    const from = 0;

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = from + (target - from) * eased;
      setDisplay(value);

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        setDisplay(target);
      }
    };

    requestAnimationFrame(tick);
  };

  return (
    <div
      ref={sectionRef}
      className={`transition-opacity duration-700 motion-reduce:transition-none ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <p className="text-5xl font-semibold tracking-tight text-white sm:text-6xl">
        {formatNumber(display)}
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
          id="performance-title"
          className="text-4xl font-semibold leading-tight text-white sm:text-6xl"
        >
          Ready when you are.
        </h2>
        <p className="mt-6 text-lg leading-relaxed text-white/70">
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
      </div>
    </section>
  );
}
