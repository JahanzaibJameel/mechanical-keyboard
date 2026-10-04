"use client";

import { sectionCopy } from "@/data/sections";

export function Keycaps() {
  const copy = sectionCopy.keycaps;

  return (
    <section
      id="keycaps"
      data-experience-section
      aria-labelledby="keycaps-title"
      className="relative z-10 grid min-h-dvh items-center px-8 py-24 sm:px-16"
    >
      <div className="ml-auto max-w-2xl">
        <p className="mb-5 text-xs font-medium uppercase tracking-[0.3em] text-white/60">
          {copy.eyebrow}
        </p>
        <h2
          data-reveal="lead"
          id="keycaps-title"
          className="text-4xl font-semibold leading-tight text-white sm:text-6xl"
        >
          {copy.title}
        </h2>
        <p data-reveal="lead" className="mt-6 text-lg leading-relaxed text-white/70">{copy.body}</p>

        <ul className="mt-8 grid gap-6 text-sm text-white/80 sm:grid-cols-2">
          <li>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/50">
              Grid
            </p>
            <p className="mt-1">
              Fifteen columns by five rows on a uniform 0.19 pitch. Every cap is
              the same box, so the field reads as spacing rather than layout.
            </p>
          </li>
          <li>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/50">
              Profile
            </p>
            <p className="mt-1">
              Flat. There is no sculpted row profile here; the caps are plain
              boxes at a single height.
            </p>
          </li>
          <li>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/50">
              Colour
            </p>
            <p className="mt-1">
              Ash, Snow and Signal each repaint all seventy-five caps at once, and
              carry through to the configurator.
            </p>
          </li>
          <li>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/50">
              Legends
            </p>
            <p className="mt-1">
              None. The caps carry no printed or moulded legends. That arrives
              with a real model.
            </p>
          </li>
        </ul>

        <ul className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-sm text-white/80">
          {copy.details.map((detail) => (
            <li data-reveal="detail" key={detail}>{detail}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
